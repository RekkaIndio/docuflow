import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../_utils/admin-auth';
import { summariseWorkspace } from '../../_utils/workspaces';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags';

type InviteSummary = {
  id: string;
  email: string | null;
  workspaceId: string | null;
  organisationId: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  role: string | null;
};

function toIso(value: any): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
  } catch (err) {
    console.warn('[admin organisation detail] failed to normalise timestamp', err);
  }
  return null;
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

    const orgRef = adminDb.collection('organisations').doc(organisationId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const orgData = orgSnap.data() as Record<string, any>;
    const createdAt = toIso(orgData?.createdAt);
    const workspaceLimit = typeof orgData?.workspaceLimit === 'number' ? orgData.workspaceLimit : null;

    const [workspacesSnap, membersSnap, flagsSnap, invitesSnap] = await Promise.all([
      adminDb.collection(`organisations/${organisationId}/workspaces`).get(),
      adminDb.collection(`organisations/${organisationId}/users`).get(),
      adminDb.doc(`organisations/${organisationId}/settings/feature-flags`).get().catch(() => null),
      adminDb.collection('loginTokens').where('type', '==', 'invite').get().catch(() => null),
    ]);

    const workspaces = await Promise.all(
      workspacesSnap.docs.map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => summariseWorkspace(docSnap, organisationId))
    );

    const members = await Promise.all(
      membersSnap.docs.map(async (docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
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
          } catch (userErr) {
            console.warn('[admin organisation detail] failed to read user doc', docSnap.id, userErr);
          }
        }
        return {
          id: docSnap.id,
          email,
          name,
          role: data?.role ?? null,
          createdAt: toIso(data?.createdAt) ?? null,
          updatedAt: toIso(data?.updatedAt) ?? null,
          status: data?.status ?? 'active',
        };
      })
    );

    const invites: InviteSummary[] = (invitesSnap?.docs || [])
      .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot): InviteSummary => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          email: data?.email ?? null,
          workspaceId: data?.workspaceId ?? null,
          organisationId: data?.organisationId ?? data?.workspaceOrgId ?? null,
          createdAt: toIso(data?.createdAt) ?? null,
          expiresAt: toIso(data?.expiresAt) ?? null,
          consumedAt: toIso(data?.consumedAt) ?? null,
          role: data?.role ?? null,
        };
      })
  .filter((invite: InviteSummary) => invite.organisationId === organisationId);

    let featureFlags = DEFAULT_FEATURE_FLAGS;
    if (flagsSnap && flagsSnap.exists) {
      const data = flagsSnap.data() as Record<string, any>;
      featureFlags = {
        ...DEFAULT_FEATURE_FLAGS,
        ...data,
        modules: {
          ...DEFAULT_FEATURE_FLAGS.modules,
          ...(data?.modules ?? {}),
        },
      };
    }

    let ownerEmail: string | null = null;
    let ownerName: string | null = null;
    if (orgData?.ownerId) {
      try {
        const ownerDoc = await adminDb.collection('users').doc(orgData.ownerId).get();
        if (ownerDoc.exists) {
          const ownerData = ownerDoc.data() as Record<string, any>;
          ownerEmail = typeof ownerData?.email === 'string' ? ownerData.email : ownerEmail;
          ownerName = typeof ownerData?.name === 'string' ? ownerData.name : ownerName;
        }
      } catch (ownerErr) {
        console.warn('[admin organisation detail] failed to load owner info', ownerErr);
      }
    }

    return NextResponse.json({
      organisation: {
        id: orgSnap.id,
        name: orgData?.name || 'Untitled organisation',
        ownerId: orgData?.ownerId ?? null,
        ownerEmail,
        ownerName,
        createdAt,
        workspaceLimit,
      },
      counts: {
        workspaceCount: workspaces.length,
        memberCount: members.length,
        inviteCount: invites.length,
      },
      workspaces,
      members,
      invites,
      featureFlags,
    });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation detail] GET failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to load organisation' }, { status });
  }
}
