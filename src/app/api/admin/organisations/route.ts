import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../_utils/admin-auth';
import { ensureProtectedFolders } from '../_utils/workspaces';
import { randomBytes } from 'crypto';
import type { UserRecord } from 'firebase-admin/auth';
import { sendWelcomeEmail, sendInvitationEmail } from '@/actions/email';
import { workspaceCollectionPath } from '@/lib/paths';

function toIso(value: any): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return null;
  } catch (error) {
    console.warn('[admin organisations] failed to format timestamp', error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('organisations').orderBy('createdAt', 'desc').get();
    const organisations = await Promise.all(
  snapshot.docs.map(async (docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = docSnap.data() as Record<string, any>;
        const workspacesSnap = await adminDb.collection(`organisations/${docSnap.id}/workspaces`).get();
        const membersSnap = await adminDb.collection(`organisations/${docSnap.id}/users`).get().catch(() => ({ size: 0 }));
        return {
          id: docSnap.id,
          name: data?.name || 'Untitled organisation',
          ownerId: data?.ownerId ?? null,
          createdAt: toIso(data?.createdAt) || null,
          workspaceLimit: typeof data?.workspaceLimit === 'number' ? data.workspaceLimit : null,
          workspaceCount: workspacesSnap.size,
          memberCount: membersSnap.size || 0,
        };
      })
    );

    return NextResponse.json({ organisations });
  } catch (error) {
    console.error('[admin organisations] GET failed', error);
    return NextResponse.json({ error: 'Failed to load organisations' }, { status: 500 });
  }
}

type ProvisionPayload = {
  organisationName?: string;
  organisationSlug?: string | null;
  workspaceLimit?: number | null;
  ownerEmail?: string;
  ownerName?: string | null;
  workspaceName?: string | null;
  workspaceNames?: Array<string | null> | null;
  workspaces?: Array<string | { name?: string | null }> | null;
  workspaceCount?: number | null;
  sendPasswordEmail?: boolean;
  serviceProfile?: {
    serviceType?: string | null;
    cqcRegistrationNumber?: string | null;
    registeredLocations?: number | null;
  } | null;
  timezone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  primaryContact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  initialMembers?: Array<{
    name?: string | null;
    email?: string | null;
    role?: string | null;
    workspaceIndices?: number[] | null;
    teamKeys?: string[] | null;
    sendInvite?: boolean | null;
  }> | null;
};

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
} as const;

type RoleKey = keyof typeof ROLE_LABELS;

const TEAM_LABELS = {
  admin: 'Admin',
  staff: 'Staff',
  inspection: 'Inspection',
  management: 'Management',
  nurses: 'Nurses',
  carers: 'Carers',
  ctm: 'CTM',
  domestic: 'Domestic',
  maintenance: 'Maintenance',
  kitchen: 'Kitchen',
  activities: 'Activities',
} as const;

type TeamKey = keyof typeof TEAM_LABELS;

type SeededMemberResult = {
  id: string | null;
  email: string;
  role: string | null;
  workspaceIds: string[];
  teamAssignments: Record<string, string[]>;
  userCreated: boolean;
  emailSent: boolean;
  error?: string | null;
};

function normaliseRole(role?: string | null): RoleKey {
  if (!role) return 'member';
  const key = role.toString().toLowerCase() as RoleKey;
  return ROLE_LABELS[key] ? key : 'member';
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
      await ownersCollection.doc(ownerDocId).set(
        {
          email: userRecord.email ?? null,
          uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await ownersCollection.doc(ownerDocId).delete().catch(() => undefined);
    }
  } catch (err) {
    console.warn('[admin organisations] failed to sync custom claims', err);
  }
}

async function ensureDefaultTeams(workspaceId: string, organisationId: string) {
  const teamsPath = workspaceCollectionPath(workspaceId, 'teams', organisationId);
  if (!teamsPath) return;

  const teamsCollection = adminDb.collection(teamsPath);
  await Promise.all(
    (Object.entries(TEAM_LABELS) as Array<[TeamKey, string]>).map(async ([teamKey, teamName]) => {
      const teamId = `${teamKey}-${workspaceId}`;
      const teamRef = teamsCollection.doc(teamId);
      const snapshot = await teamRef.get();
      if (!snapshot.exists) {
        await teamRef.set({
          id: teamId,
          name: teamName,
          members: [],
          folderCount: 0,
          accessibleFolderIds: [],
          emails: [],
          workspaceId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    })
  );
}

async function assignMemberToTeam(options: {
  organisationId: string;
  workspaceId: string;
  teamKey: TeamKey;
  member: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  };
}): Promise<boolean> {
  const { organisationId, workspaceId, teamKey, member } = options;
  const teamsPath = workspaceCollectionPath(workspaceId, 'teams', organisationId);
  if (!teamsPath) return false;

  const teamName = TEAM_LABELS[teamKey];
  const teamId = `${teamKey}-${workspaceId}`;
  const teamRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> = adminDb.doc(`${teamsPath}/${teamId}`);
  let added = false;

  await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
    const snap = await transaction.get(teamRef);
    const data = snap.exists ? ((snap.data() as Record<string, any>) ?? {}) : {};
    const currentMembers = Array.isArray(data?.members) ? [...data.members] : [];
    const targetEmail = member.email ? member.email.toLowerCase() : null;

    let updated = false;
    const nextMembers = currentMembers.map((existing: any) => {
      const existingEmail = typeof existing?.email === 'string' ? existing.email.toLowerCase() : null;
      const matchesId = typeof existing?.id === 'string' && existing.id === member.id;
      const matchesEmail = targetEmail && existingEmail === targetEmail;
      if (matchesId || matchesEmail) {
        updated = true;
        return {
          ...existing,
          id: member.id,
          name: member.name ?? existing?.name ?? member.email ?? member.id,
          email: member.email ?? existing?.email ?? null,
          role: member.role ?? existing?.role ?? null,
          organisationId,
          avatarUrl: existing?.avatarUrl ?? null,
        };
      }
      return existing;
    });

    if (!updated) {
      nextMembers.push({
        id: member.id,
        name: member.name ?? member.email ?? member.id,
        email: member.email ?? null,
        role: member.role ?? null,
        organisationId,
        avatarUrl: null,
      });
      added = true;
    }

    const payload: Record<string, any> = {
      id: teamId,
      name: teamName,
      workspaceId,
      members: nextMembers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!snap.exists) {
      payload.folderCount = 0;
      payload.accessibleFolderIds = [];
      payload.emails = [];
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    transaction.set(teamRef, payload, { merge: true });
  });

  return added;
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as ProvisionPayload;
    const seededMembers: SeededMemberResult[] = [];
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.docuflow.ai').replace(/\/$/, '');
    const organisationName = (body.organisationName || '').trim();
    const ownerEmail = (body.ownerEmail || '').trim().toLowerCase();
    const ownerName = (body.ownerName || '').trim();
    const workspaceName = (body.workspaceName || '').trim();
    const workspaceNamesList = Array.isArray(body.workspaceNames) ? body.workspaceNames : [];
    const workspaceInputs = Array.isArray(body.workspaces) ? body.workspaces : [];

    const inferredWorkspaceNames: string[] = [];

    for (const entry of workspaceInputs) {
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (trimmed) inferredWorkspaceNames.push(trimmed);
        continue;
      }
      if (entry && typeof entry === 'object' && 'name' in entry) {
        const value = (entry as { name?: string | null }).name;
        if (typeof value === 'string' && value.trim()) {
          inferredWorkspaceNames.push(value.trim());
        }
      }
    }

    for (const value of workspaceNamesList) {
      if (typeof value === 'string' && value.trim()) {
        inferredWorkspaceNames.push(value.trim());
      }
    }

    if (workspaceName) {
      inferredWorkspaceNames.unshift(workspaceName);
    }

    const MAX_WORKSPACES = 10;
    const requestedWorkspaceCountRaw = typeof body.workspaceCount === 'number' ? Math.floor(body.workspaceCount) : null;
    const requestedWorkspaceCount = requestedWorkspaceCountRaw && requestedWorkspaceCountRaw > 0
      ? Math.min(requestedWorkspaceCountRaw, MAX_WORKSPACES)
      : Math.min(Math.max(inferredWorkspaceNames.length || 1, 1), MAX_WORKSPACES);

    const workspaceNames: string[] = inferredWorkspaceNames.slice(0, requestedWorkspaceCount);
    const baseWorkspaceName = organisationName || 'Workspace';
    while (workspaceNames.length < requestedWorkspaceCount) {
      const ordinal = workspaceNames.length + 1;
      const fallbackName = ordinal === 1 ? `${baseWorkspaceName} Workspace` : `${baseWorkspaceName} Workspace ${ordinal}`;
      workspaceNames.push(fallbackName);
    }

    if (!organisationName) {
      return NextResponse.json({ error: 'organisationName is required' }, { status: 400 });
    }
    if (!ownerEmail) {
      return NextResponse.json({ error: 'ownerEmail is required' }, { status: 400 });
    }

  let ownerRecord: UserRecord | null = null;
    let userCreated = false;

    try {
      ownerRecord = await adminAuth.getUserByEmail(ownerEmail);
      if (ownerRecord && ownerName && ownerRecord.displayName !== ownerName) {
        await adminAuth.updateUser(ownerRecord.uid, { displayName: ownerName });
        ownerRecord = await adminAuth.getUser(ownerRecord.uid);
      }
    } catch (error) {
      if ((error as any)?.code === 'auth/user-not-found') {
        const fallbackName = ownerName || ownerEmail.split('@')[0];
        const tempSecret = randomBytes(12).toString('base64url');
        const createdRecord = await adminAuth.createUser({
          email: ownerEmail,
          password: `${tempSecret}Aa1!`,
          displayName: fallbackName,
          emailVerified: false,
        });
        ownerRecord = createdRecord;
        if (ownerName && ownerName !== fallbackName) {
          await adminAuth.updateUser(createdRecord.uid, { displayName: ownerName });
          ownerRecord = await adminAuth.getUser(createdRecord.uid);
        }
        userCreated = true;
      } else {
        throw error;
      }
    }

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Failed to resolve owner user' }, { status: 500 });
    }

    const ownerId = ownerRecord.uid;
    const existingClaims = ownerRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, owner: true };
    if (body.sendPasswordEmail) {
      // no-op — kept for future use so we can hook additional claims if needed
    }
    try {
      await adminAuth.setCustomUserClaims(ownerId, updatedClaims);
    } catch (claimsError) {
      console.warn('[admin organisations] failed to set owner custom claims', claimsError);
    }

    const orgRef = adminDb.collection('organisations').doc();
    const organisationPayload: Record<string, any> = {
      name: organisationName,
      ownerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body.organisationSlug) organisationPayload.slug = body.organisationSlug;
    if (typeof body.workspaceLimit === 'number') organisationPayload.workspaceLimit = body.workspaceLimit;

    const serviceProfileRaw = body.serviceProfile && typeof body.serviceProfile === 'object' ? body.serviceProfile : null;
    if (serviceProfileRaw) {
      const registeredLocationsValue = typeof serviceProfileRaw.registeredLocations === 'number'
        ? serviceProfileRaw.registeredLocations
        : Number.isFinite(Number.parseInt(String((serviceProfileRaw as any)?.registeredLocations ?? ''), 10))
          ? Number.parseInt(String((serviceProfileRaw as any)?.registeredLocations ?? ''), 10)
          : null;
      const serviceProfile = {
        serviceType:
          typeof serviceProfileRaw.serviceType === 'string' && serviceProfileRaw.serviceType.trim()
            ? serviceProfileRaw.serviceType.trim()
            : null,
        cqcRegistrationNumber:
          typeof serviceProfileRaw.cqcRegistrationNumber === 'string' && serviceProfileRaw.cqcRegistrationNumber.trim()
            ? serviceProfileRaw.cqcRegistrationNumber.trim()
            : null,
        registeredLocations:
          typeof registeredLocationsValue === 'number' && !Number.isNaN(registeredLocationsValue)
            ? registeredLocationsValue
            : null,
      };
      if (
        serviceProfile.serviceType ||
        serviceProfile.cqcRegistrationNumber ||
        serviceProfile.registeredLocations !== null
      ) {
        organisationPayload.serviceProfile = serviceProfile;
      }
    }

    const timezoneValue = typeof body.timezone === 'string' ? body.timezone.trim() : '';
    if (timezoneValue) {
      organisationPayload.timezone = timezoneValue;
    }

    const addressRaw = body.address && typeof body.address === 'object' ? body.address : null;
    if (addressRaw) {
      const line1 = typeof addressRaw.line1 === 'string' ? addressRaw.line1.trim() : '';
      const line2 = typeof addressRaw.line2 === 'string' ? addressRaw.line2.trim() : '';
      const city = typeof addressRaw.city === 'string' ? addressRaw.city.trim() : '';
      const postcode = typeof addressRaw.postcode === 'string' ? addressRaw.postcode.trim() : '';
      const country = typeof addressRaw.country === 'string' ? addressRaw.country.trim() : '';
      if (line1 || line2 || city || postcode || country) {
        organisationPayload.address = {
          line1: line1 || null,
          line2: line2 || null,
          city: city || null,
          postcode: postcode || null,
          country: country || null,
        };
      }
    }

    const primaryContactRaw = body.primaryContact && typeof body.primaryContact === 'object' ? body.primaryContact : null;
    if (primaryContactRaw) {
      const contactName = typeof primaryContactRaw.name === 'string' ? primaryContactRaw.name.trim() : '';
      const contactEmail = typeof primaryContactRaw.email === 'string' ? primaryContactRaw.email.trim() : '';
      const contactPhone = typeof primaryContactRaw.phone === 'string' ? primaryContactRaw.phone.trim() : '';
      if (contactName || contactEmail || contactPhone) {
        organisationPayload.primaryContact = {
          name: contactName || null,
          email: contactEmail || null,
          phone: contactPhone || null,
        };
      }
    }

    await orgRef.set(organisationPayload);

    const userDocRef = adminDb.collection('users').doc(ownerId);
    await userDocRef.set(
      {
        id: ownerId,
        name: ownerName || ownerRecord.displayName || null,
        email: ownerEmail,
        organisationId: orgRef.id,
        role: 'Owner',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const orgUserRef = adminDb.doc(`organisations/${orgRef.id}/users/${ownerId}`);
    await orgUserRef.set(
      {
        id: ownerId,
        name: ownerName || ownerRecord.displayName || null,
        email: ownerEmail,
        organisationId: orgRef.id,
        role: 'Owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const createdWorkspaces: Array<{ id: string; name: string }> = [];
    const workspaceCollection = adminDb.collection(`organisations/${orgRef.id}/workspaces`);

    for (const [index, name] of workspaceNames.entries()) {
      const workspaceRef = workspaceCollection.doc();
      await workspaceRef.set({
        name,
        ownerId,
        members: [ownerId],
        organisationId: orgRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        provisionedBy: ctx.uid || 'admin-console',
        order: index,
      });

      createdWorkspaces.push({ id: workspaceRef.id, name });

      try {
        await ensureProtectedFolders(workspaceRef.id, orgRef.id);
      } catch (foldersError) {
        console.warn('[admin organisations] failed to set protected folders', foldersError);
      }
    }

    await Promise.all(createdWorkspaces.map((workspace) => ensureDefaultTeams(workspace.id, orgRef.id)));

    const initialMembers = Array.isArray(body.initialMembers) ? body.initialMembers : [];
    if (initialMembers.length > 0) {
      const workspaceNameMap = new Map<string, string>(createdWorkspaces.map((workspace) => [workspace.id, workspace.name]));
      let inviterName = 'CG360 Admin';
      if (ctx.uid) {
        try {
          const inviterRecord = await adminAuth.getUser(ctx.uid);
          inviterName = inviterRecord.displayName || inviterRecord.email || 'CG360 Admin';
        } catch (inviterErr) {
          console.warn('[admin organisations] failed to resolve inviter info', inviterErr);
        }
      }

      for (const memberPayload of initialMembers) {
        const email = typeof memberPayload?.email === 'string' ? memberPayload.email.trim().toLowerCase() : '';
        const memberSummary: SeededMemberResult = {
          id: null,
          email,
          role: null,
          workspaceIds: [],
          teamAssignments: {},
          userCreated: false,
          emailSent: false,
        };

        if (!email) {
          memberSummary.error = 'Email is required';
          seededMembers.push(memberSummary);
          continue;
        }

        if (email === ownerEmail) {
          memberSummary.error = 'Email matches the owner account';
          seededMembers.push(memberSummary);
          continue;
        }

        const name = typeof memberPayload?.name === 'string' ? memberPayload.name.trim() : '';
        const roleKey = normaliseRole(memberPayload?.role ?? null);
        const roleLabel = ROLE_LABELS[roleKey];
        memberSummary.role = roleLabel;

        const workspaceIndices = Array.isArray(memberPayload?.workspaceIndices)
          ? memberPayload.workspaceIndices.filter((value) => Number.isInteger(value))
          : [];
        const workspaceIds = Array.from(
          new Set(
            workspaceIndices
              .map((index) => {
                const entry = createdWorkspaces[index];
                return entry ? entry.id : null;
              })
              .filter((value): value is string => Boolean(value))
          )
        );
        if (workspaceIds.length === 0 && createdWorkspaces[0]) {
          workspaceIds.push(createdWorkspaces[0].id);
        }
        memberSummary.workspaceIds = workspaceIds;

        const teamKeys = Array.from(
          new Set(
            (Array.isArray(memberPayload?.teamKeys) ? memberPayload.teamKeys : [])
              .map((key) => (typeof key === 'string' ? key.toLowerCase() : ''))
              .filter((key): key is TeamKey => key === 'admin' || key === 'staff' || key === 'inspection')
          )
        );

        try {
          let memberRecord: UserRecord;
          let memberCreated = false;
          try {
            memberRecord = await adminAuth.getUserByEmail(email);
          } catch (err: any) {
            if (err?.code === 'auth/user-not-found') {
              const tempSecret = randomBytes(12).toString('base64url');
              memberRecord = await adminAuth.createUser({
                email,
                password: `${tempSecret}Aa1!`,
                displayName: name || undefined,
                emailVerified: false,
              });
              memberCreated = true;
            } else {
              throw err;
            }
          }

          if (name && memberRecord.displayName !== name) {
            await adminAuth.updateUser(memberRecord.uid, { displayName: name });
            memberRecord = await adminAuth.getUser(memberRecord.uid);
          }

          const uid = memberRecord.uid;
          await syncCustomClaims(uid, roleKey);

          const resolvedName = name || memberRecord.displayName || null;
          const now = admin.firestore.FieldValue.serverTimestamp();
          await adminDb.collection('users').doc(uid).set(
            {
              id: uid,
              email,
              name: resolvedName,
              organisationId: orgRef.id,
              role: roleLabel,
              updatedAt: now,
            },
            { merge: true }
          );

          await adminDb.collection(`organisations/${orgRef.id}/users`).doc(uid).set(
            {
              id: uid,
              email,
              name: resolvedName,
              organisationId: orgRef.id,
              role: roleLabel,
              status: 'active',
              workspaceIds,
              updatedAt: now,
              createdAt: memberCreated ? now : admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          if (workspaceIds.length > 0) {
            await Promise.all(
              workspaceIds.map(async (workspaceId) => {
                const workspaceRef = adminDb.collection(`organisations/${orgRef.id}/workspaces`).doc(workspaceId);
                await workspaceRef.set(
                  {
                    members: admin.firestore.FieldValue.arrayUnion(uid),
                  },
                  { merge: true }
                );
              })
            );
          }

          const teamAssignments: Record<string, string[]> = {};
          if (teamKeys.length > 0 && workspaceIds.length > 0) {
            for (const workspaceId of workspaceIds) {
              for (const teamKey of teamKeys) {
                await assignMemberToTeam({
                  organisationId: orgRef.id,
                  workspaceId,
                  teamKey,
                  member: {
                    id: uid,
                    name: resolvedName,
                    email,
                    role: roleLabel,
                  },
                });
                if (!teamAssignments[teamKey]) {
                  teamAssignments[teamKey] = [];
                }
                if (!teamAssignments[teamKey].includes(workspaceId)) {
                  teamAssignments[teamKey].push(workspaceId);
                }
              }
            }
          }
          memberSummary.teamAssignments = teamAssignments;
          memberSummary.id = uid;
          memberSummary.userCreated = memberCreated;

          let inviteLink: string | null = null;
          const sendInvite = memberPayload?.sendInvite !== false;
          if (sendInvite || memberCreated) {
            try {
              inviteLink = await adminAuth.generatePasswordResetLink(email, { url: `${appBaseUrl}/set-password` });
            } catch (inviteErr) {
              console.warn('[admin organisations] failed to generate seeded member password link', inviteErr);
            }
          }

          if (inviteLink) {
            try {
              const primaryWorkspaceName = workspaceIds.length === 1 ? workspaceNameMap.get(workspaceIds[0]) ?? undefined : undefined;
              await sendInvitationEmail({
                recipientEmail: email,
                organisationName,
                workspaceName: primaryWorkspaceName,
                inviterName,
                passwordResetLink: inviteLink,
                role: roleLabel,
              });
              memberSummary.emailSent = true;
            } catch (emailErr) {
              console.warn('[admin organisations] failed to send seeded member invitation email', emailErr);
            }
          }
        } catch (memberError) {
          console.error('[admin organisations] failed to seed member', memberPayload?.email, memberError);
          memberSummary.error = memberError instanceof Error ? memberError.message : 'Failed to seed member';
        }

        seededMembers.push(memberSummary);
      }
    }

    let passwordLink: string | null = null;
    try {
      passwordLink = await adminAuth.generatePasswordResetLink(ownerEmail, {
        url: `${appBaseUrl}/set-password`,
      });
    } catch (linkError) {
      console.warn('[admin organisations] failed to generate password link', linkError);
    }

    // Send welcome email if password link was generated successfully
    if (passwordLink) {
      try {
        await sendWelcomeEmail({
          recipientEmail: ownerEmail,
          organisationName,
          passwordResetLink: passwordLink,
        });
      } catch (emailError) {
        console.warn('[admin organisations] failed to send welcome email', emailError);
        // Don't fail the entire operation if email fails
      }
    }

    return NextResponse.json({
      ok: true,
      organisation: {
        id: orgRef.id,
        name: organisationName,
        ownerId,
      },
      workspace: createdWorkspaces[0] || null,
      workspaces: createdWorkspaces,
      owner: {
        id: ownerId,
        email: ownerEmail,
        name: ownerName || ownerRecord.displayName || null,
      },
      userCreated,
      passwordLink,
      emailSent: !!passwordLink, // Indicate if welcome email was sent
      seededMembers,
    });
  } catch (error) {
    console.error('[admin organisations] POST failed', error);
    const message = (error as any)?.message || 'Failed to provision organisation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
