import { NextResponse } from 'next/server';
import crypto from 'crypto';
import admin, { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../../_utils/admin-auth';
import { sendInvitationEmail } from '@/actions/email';
import { dedupeTeamKeys, defaultTeamsForRole, type OrganisationTeamKey } from '@/lib/team-roles';

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
} as const;

type RoleKey = keyof typeof ROLE_LABELS;

type MemberSummary = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  teamKeys: OrganisationTeamKey[];
};

type OrgUserDocSnapshot = FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
type OrgUserQuerySnapshot = FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

function toIso(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

async function mapMemberDoc(docSnap: OrgUserDocSnapshot | OrgUserQuerySnapshot): Promise<MemberSummary> {
  const data = docSnap.data() as Record<string, any>;
  let email = typeof data?.email === 'string' ? data.email : null;
  let name = typeof data?.name === 'string' ? data.name : null;
  if (!email || !name) {
    try {
      const userSnap = await adminDb.collection('users').doc(docSnap.id).get();
      if (userSnap.exists) {
        const userData = userSnap.data() as Record<string, any>;
        if (!email && typeof userData?.email === 'string') email = userData.email;
        if (!name && typeof userData?.name === 'string') name = userData.name;
      }
    } catch (err) {
      console.warn('[admin organisation members] failed to load user profile', docSnap.id, err);
    }
  }

  const teamKeys = dedupeTeamKeys([
    ...(Array.isArray(data?.teamKeys) ? data.teamKeys : []),
    ...(Array.isArray(data?.teams) ? data.teams : []),
    ...(data?.teamAssignments && typeof data.teamAssignments === 'object' ? Object.keys(data.teamAssignments) : []),
  ]);

  return {
    id: docSnap.id,
    email,
    name,
    role: data?.role ?? null,
    status: data?.status ?? 'active',
    createdAt: toIso(data?.createdAt) ?? null,
    updatedAt: toIso(data?.updatedAt) ?? null,
    teamKeys,
  };
}

export async function GET(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = (await Promise.resolve(context.params)).organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const snapshot = await adminDb.collection(`organisations/${organisationId}/users`).get();
    const members = await Promise.all(snapshot.docs.map((docSnap: OrgUserQuerySnapshot) => mapMemberDoc(docSnap)));

    return NextResponse.json({ members });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation members] GET failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to load members' }, { status });
  }
}

type CreateMemberPayload = {
  email?: string;
  name?: string;
  role?: RoleKey | string;
  workspaceIds?: string[];
  sendPasswordEmail?: boolean;
  generateInviteLink?: boolean;
  teamKeys?: unknown;
};

type UpdateMemberPayload = {
  role?: RoleKey | string;
  status?: string;
  workspaceIds?: string[];
  teamKeys?: unknown;
};

function normaliseRole(role?: RoleKey | string | null): RoleKey | null {
  if (!role) return null;
  const key = role.toString().toLowerCase() as RoleKey;
  return ROLE_LABELS[key] ? key : null;
}

async function syncCustomClaims(uid: string, role: RoleKey) {
  try {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    const isOwner = role === 'owner';
    const isAdmin = role === 'owner' || role === 'admin';
    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, owner: isOwner, admin: isAdmin });

    const ownersCollection = adminDb.collection('owners');
    const ownerDocId = (userRecord.email || '').toLowerCase() || uid;
    if (isOwner) {
      await ownersCollection.doc(ownerDocId).set({
        email: userRecord.email ?? null,
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await ownersCollection.doc(ownerDocId).delete().catch(() => undefined);
    }
  } catch (err) {
    console.warn('[admin organisation members] failed to sync custom claims', err);
  }
}

async function syncWorkspaceMemberships(organisationId: string, uid: string, workspaceIds?: string[]) {
  if (!Array.isArray(workspaceIds)) return;
  const targetSet = new Set(workspaceIds);
  const snapshot = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
  await Promise.all(
    snapshot.docs.map(async (docSnap: OrgUserQuerySnapshot) => {
      const data = docSnap.data() as Record<string, any>;
      const members = Array.isArray(data?.members) ? new Set<string>(data.members) : new Set<string>();
      const shouldBeMember = targetSet.has(docSnap.id);
      const currentlyMember = members.has(uid);

      if (shouldBeMember && !currentlyMember) {
        await docSnap.ref.update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
      }
      if (!shouldBeMember && currentlyMember) {
        await docSnap.ref.update({ members: admin.firestore.FieldValue.arrayRemove(uid) });
      }
    })
  );
}

async function syncTeamKeysToWorkspaceStaff(organisationId: string, uid: string, teamKeys: OrganisationTeamKey[]) {
  // Map organisation team keys to workspace staff arrays
  const teamToStaffField: Record<OrganisationTeamKey, string> = {
    management: 'managers',
    admin: 'admins',
    nurses: 'nurses',
    carers: 'carers',
    ctm: 'ctms',
    domestic: 'domestics',
    maintenance: 'maintenances',
    kitchen: 'kitchens',
    activities: 'activities',
    inspection: 'inspection', // Note: inspection might not have a direct staff array
    staff: 'staff', // Note: staff might not have a direct staff array
  };

  // Get all workspaces for this organisation
  const workspacesSnap = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
  
  await Promise.all(
    workspacesSnap.docs.map(async (workspaceDoc: OrgUserQuerySnapshot) => {
      const workspaceId = workspaceDoc.id;
      const workspaceRef = adminDb.collection(`organisations/${organisationId}/workspaces`).doc(workspaceId);
      
      // Get current workspace data
      const workspaceSnap = await workspaceRef.get();
      if (!workspaceSnap.exists) return;
      
      const workspaceData = workspaceSnap.data() as Record<string, any>;
      
      // For each team key, ensure the user is in the corresponding staff array
      for (const teamKey of teamKeys) {
        const staffField = teamToStaffField[teamKey];
        if (!staffField) continue; // Skip team keys that don't map to staff arrays
        
        const currentStaff = Array.isArray(workspaceData[staffField]) ? workspaceData[staffField] : [];
        const staffIds = currentStaff.map((staff: any) => typeof staff === 'string' ? staff : staff.id).filter(Boolean);
        
        // Check if user is already in this staff array
        if (!staffIds.includes(uid)) {
          // Create a basic staff object for the user
          const userDoc = await adminDb.collection('users').doc(uid).get();
          const userData = userDoc.data() as Record<string, any>;
          
          const staffMember = {
            id: uid,
            name: userData?.name || userData?.displayName || 'Unknown',
            email: userData?.email || '',
            phone: userData?.phone || '',
            roles: teamKey, // Use team key as role
            contractedHours: 40,
            hoursType: 'weekly',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await workspaceRef.update({
            [staffField]: admin.firestore.FieldValue.arrayUnion(staffMember)
          });
        }
      }
    })
  );
}

async function removeUserFromWorkspaceStaff(organisationId: string, uid: string) {
  // Map organisation team keys to workspace staff arrays
  const staffFields = [
    'managers', 'admins', 'nurses', 'carers', 'ctms', 
    'domestics', 'maintenances', 'kitchens', 'activities'
  ];

  // Get all workspaces for this organisation
  const workspacesSnap = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
  
  await Promise.all(
    workspacesSnap.docs.map(async (workspaceDoc: OrgUserQuerySnapshot) => {
      const workspaceRef = adminDb.collection(`organisations/${organisationId}/workspaces`).doc(workspaceDoc.id);
      
      // Remove user from all staff arrays
      const updates: Record<string, any> = {};
      for (const staffField of staffFields) {
        // Create a filter to remove staff members with this uid
        updates[staffField] = admin.firestore.FieldValue.arrayRemove({ id: uid });
      }
      
      await workspaceRef.update(updates);
    })
  );
}

export async function POST(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = (await Promise.resolve(context.params)).organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as CreateMemberPayload;
    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const name = (body.name || '').trim() || null;
    const roleKey = normaliseRole(body.role) ?? 'member';
    const roleLabel = ROLE_LABELS[roleKey];
    const requestedTeamKeys = Array.isArray(body.teamKeys) ? body.teamKeys : [];
    const teamKeys = dedupeTeamKeys(requestedTeamKeys.length > 0 ? requestedTeamKeys : defaultTeamsForRole(roleKey));

    let userRecord;
    let userCreated = false;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        const tempPassword = Math.random().toString(36).slice(2) + 'Aa1!';
        userRecord = await adminAuth.createUser({ email, password: tempPassword, displayName: name ?? undefined, emailVerified: false });
        userCreated = true;
      } else {
        throw err;
      }
    }

    const uid = userRecord.uid;
    if (name && userRecord.displayName !== name) {
      await adminAuth.updateUser(uid, { displayName: name });
    }

    await syncCustomClaims(uid, roleKey);

    const now = admin.firestore.FieldValue.serverTimestamp();
    await adminDb.collection('users').doc(uid).set({
      id: uid,
      email,
      name,
      organisationId,
      role: roleLabel,
      teamKeys,
      updatedAt: now,
    }, { merge: true });

    await adminDb.collection(`organisations/${organisationId}/users`).doc(uid).set({
      id: uid,
      email,
      name,
      organisationId,
      role: roleLabel,
      status: 'active',
      teamKeys,
      updatedAt: now,
      createdAt: userCreated ? now : admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await syncWorkspaceMemberships(organisationId, uid, body.workspaceIds);

    // Sync team keys to workspace staff arrays
    await syncTeamKeysToWorkspaceStaff(organisationId, uid, teamKeys);

    let passwordLink: string | null = null;
    let inviteUrl: string | null = null;

    if (body.generateInviteLink) {
      // Generate a direct invite token for password setting
      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const tokenPayload = {
        email,
        type: 'member-invite',
        organisationId,
        userId: uid,
        role: roleLabel,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy: ctx.uid ?? 'owner-console',
      };

      await adminDb.collection('loginTokens').doc(token).set(tokenPayload);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://cg360.co.uk';
      inviteUrl = `${baseUrl.replace(/\/$/, '')}/accept-invite?token=${token}`;
    } else if (userCreated || body.sendPasswordEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://cg360.co.uk';
        passwordLink = await adminAuth.generatePasswordResetLink(email, { url: `${baseUrl.replace(/\/$/, '')}/set-password` });
      } catch (err) {
        console.warn('[admin organisation members] failed to generate password link', err);
      }
    }

    // Send invitation email if password link was generated successfully and not generating invite link
    let emailSent = false;
    if (passwordLink && !body.generateInviteLink) {
      try {
        // Get organization name
        const orgDoc = await adminDb.collection('organisations').doc(organisationId).get();
        const orgData = orgDoc.data() as Record<string, any>;
        const organisationName = orgData?.name || 'Your Organization';

        // Get inviter name (current admin user)
        let inviterName = 'CG360 Admin';
        if (ctx.uid) {
          try {
            const inviterRecord = await adminAuth.getUser(ctx.uid);
            inviterName = inviterRecord.displayName || inviterRecord.email || 'CG360 Admin';
          } catch (err) {
            console.warn('[admin organisation members] failed to get inviter info', err);
          }
        }

        await sendInvitationEmail({
          recipientEmail: email,
          organisationName,
          inviterName,
          passwordResetLink: passwordLink,
          role: roleLabel,
        });
        emailSent = true;
      } catch (emailError) {
        console.warn('[admin organisation members] failed to send invitation email', emailError);
        // Don't fail the entire operation if email fails
      }
    }

    const member = await mapMemberDoc(await adminDb.collection(`organisations/${organisationId}/users`).doc(uid).get());

    return NextResponse.json({ ok: true, member, passwordLink, inviteUrl, userCreated, emailSent });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation members] POST failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to invite member' }, { status });
  }
}

export async function DELETE(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = (await Promise.resolve(context.params)).organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const userId = typeof body?.userId === 'string' ? body.userId : null;
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const memberRef = adminDb.collection(`organisations/${organisationId}/users`).doc(userId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Remove from all workspace memberships
    const workspacesSnap = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
    await Promise.all(
      workspacesSnap.docs.map((docSnap: OrgUserQuerySnapshot) =>
        docSnap.ref.update({ members: admin.firestore.FieldValue.arrayRemove(userId) })
      )
    );

    // Remove from workspace staff arrays
    await removeUserFromWorkspaceStaff(organisationId, userId);

    // Remove from organisation users collection
    await memberRef.delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation members] DELETE failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to remove member' }, { status });
  }
}
