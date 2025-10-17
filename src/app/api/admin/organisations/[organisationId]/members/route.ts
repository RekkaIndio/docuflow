import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../../_utils/admin-auth';
import { sendInvitationEmail } from '@/actions/email';

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
  return {
    id: docSnap.id,
    email,
    name,
    role: data?.role ?? null,
    status: data?.status ?? 'active',
    createdAt: toIso(data?.createdAt) ?? null,
    updatedAt: toIso(data?.updatedAt) ?? null,
  };
}

export async function GET(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
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
};

type UpdateMemberPayload = {
  role?: RoleKey | string;
  status?: string;
  workspaceIds?: string[];
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

export async function POST(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
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
      updatedAt: now,
    }, { merge: true });

    await adminDb.collection(`organisations/${organisationId}/users`).doc(uid).set({
      id: uid,
      email,
      name,
      organisationId,
      role: roleLabel,
      status: 'active',
      updatedAt: now,
      createdAt: userCreated ? now : admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await syncWorkspaceMemberships(organisationId, uid, body.workspaceIds);

    let passwordLink: string | null = null;
    if (userCreated || body.sendPasswordEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.docuflow.ai';
        passwordLink = await adminAuth.generatePasswordResetLink(email, { url: `${baseUrl.replace(/\/$/, '')}/set-password` });
      } catch (err) {
        console.warn('[admin organisation members] failed to generate password link', err);
      }
    }

    // Send invitation email if password link was generated successfully
    let emailSent = false;
    if (passwordLink) {
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

    return NextResponse.json({ ok: true, member, passwordLink, userCreated, emailSent });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation members] POST failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to invite member' }, { status });
  }
}

export async function PATCH(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as UpdateMemberPayload & { userId?: string };
    const userId = typeof body?.userId === 'string' ? body.userId : null;
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const memberRef = adminDb.collection(`organisations/${organisationId}/users`).doc(userId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    const roleKey = normaliseRole(body.role);
    if (roleKey) {
      updatePayload.role = ROLE_LABELS[roleKey];
      await syncCustomClaims(userId, roleKey);
      await adminDb.collection('users').doc(userId).set({ role: ROLE_LABELS[roleKey], updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    if (typeof body.status === 'string') {
      updatePayload.status = body.status;
    }

    await memberRef.set(updatePayload, { merge: true });

    await syncWorkspaceMemberships(organisationId, userId, body.workspaceIds);

  const member = await mapMemberDoc(await memberRef.get());
    return NextResponse.json({ ok: true, member });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation members] PATCH failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update member' }, { status });
  }
}
