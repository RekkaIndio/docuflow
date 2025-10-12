import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../../_utils/admin-auth';
import { ensureProtectedFolders, summariseWorkspace } from '../../../_utils/workspaces';

function normaliseId(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

    const snapshot = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
    const workspaces = await Promise.all(
      snapshot.docs.map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => summariseWorkspace(docSnap, organisationId))
    );

    return NextResponse.json({ workspaces });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation workspaces] GET failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to load workspaces' }, { status });
  }
}

type CreateWorkspacePayload = {
  name?: string;
  ownerId?: string | null;
  memberIds?: string[];
};

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

    const body = (await req.json().catch(() => ({}))) as CreateWorkspacePayload;
    const name = normaliseId(body?.name);
    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const organisationSnap = await adminDb.collection('organisations').doc(organisationId).get();
    if (!organisationSnap.exists) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const organisationData = organisationSnap.data() as Record<string, any>;
    const workspaceLimit = typeof organisationData?.workspaceLimit === 'number' ? organisationData.workspaceLimit : null;
    if (workspaceLimit !== null) {
      const workspaceCountSnap = await adminDb.collection(`organisations/${organisationId}/workspaces`).get();
      if (workspaceCountSnap.size >= workspaceLimit) {
        return NextResponse.json({
          error: 'workspace_limit_reached',
          message: `Workspace limit reached (${workspaceLimit}). Contact support to upgrade.`,
          limit: workspaceLimit,
        }, { status: 403 });
      }
    }

    const ownerId = normaliseId(body?.ownerId) ?? normaliseId(organisationData?.ownerId);
    if (!ownerId) {
      return NextResponse.json({ error: 'Owner ID required to create workspace' }, { status: 400 });
    }

    const memberIds = Array.isArray(body?.memberIds) ? Array.from(new Set(body.memberIds.filter(Boolean))) : [];
    if (!memberIds.includes(ownerId)) memberIds.push(ownerId);

    const workspaceRef = adminDb.collection(`organisations/${organisationId}/workspaces`).doc();
    await workspaceRef.set({
      name,
      ownerId,
      members: memberIds,
      organisationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      provisionedBy: ctx.uid ?? 'owner-console',
    });

    await ensureProtectedFolders(workspaceRef.id, organisationId);

    // Ensure organisation user records
    await Promise.all(
      memberIds.map(async (memberId) => {
        const orgUserRef = adminDb.doc(`organisations/${organisationId}/users/${memberId}`);
        await orgUserRef.set({
          id: memberId,
          organisationId,
          role: memberId === ownerId ? 'Owner' : 'Member',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Ensure top-level user doc tracks organisation relation
        await adminDb.collection('users').doc(memberId).set({
          organisationId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      })
    );

  const summary = await summariseWorkspace(await workspaceRef.get(), organisationId);
    return NextResponse.json({ ok: true, workspace: summary });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation workspaces] POST failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create workspace' }, { status });
  }
}
