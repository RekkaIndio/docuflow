import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

type GroupDoc = {
  name?: string;
  description?: string | null;
  color?: string | null;
  workspaceIds?: string[];
  organisationId?: string;
  createdAt?: any;
  updatedAt?: any;
};

function serialiseGroup(doc: any, organisationId: string) {
  const data: GroupDoc = doc?.data?.() || {};
  const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : null;
  const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : null;
  const workspaceIds = Array.isArray(data.workspaceIds) ? data.workspaceIds.filter((id: any) => typeof id === 'string') : [];

  return {
    id: doc.id,
    organisationId,
    name: typeof data.name === 'string' ? data.name : doc.id,
    description: typeof data.description === 'string' ? data.description : null,
    color: typeof data.color === 'string' ? data.color : null,
    workspaceIds,
    workspaceCount: workspaceIds.length,
    createdAt,
    updatedAt,
  };
}

async function resolveGroupRef(groupId: string, organisationId?: string | null) {
  if (!groupId) return { ref: null, organisationId: null };
  if (organisationId) {
    return { ref: adminDb.doc(`organisations/${organisationId}/workspace-groups/${groupId}`), organisationId };
  }
  // Fallback: search via collection group
  const cg = await adminDb
    .collectionGroup('workspace-groups')
    .where(admin.firestore.FieldPath.documentId(), '==', groupId)
    .limit(1)
    .get();
  if (cg.empty) return { ref: null, organisationId: null };
  const docSnap = cg.docs[0];
  const parent = docSnap.ref.parent?.parent;
  const orgId = parent?.id || null;
  return { ref: adminDb.doc(docSnap.ref.path), organisationId: orgId };
}

export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const url = new URL(req.url);
    const orgIdParam = url.searchParams.get('orgId');
    const groupId = params?.groupId;
    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

    const { ref, organisationId } = await resolveGroupRef(groupId, orgIdParam);
    if (!ref || !organisationId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group: serialiseGroup(snap, organisationId) });
  } catch (error) {
    console.error('Failed to load workspace group', error);
    return NextResponse.json({ error: 'Failed to load workspace group' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const url = new URL(req.url);
    const orgIdParam = url.searchParams.get('orgId');
    const groupId = params?.groupId;
    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.description !== undefined) {
      updates.description = body.description === null ? null : String(body.description);
    }

    if (body.color !== undefined) {
      updates.color = body.color === null ? null : String(body.color).trim();
    }

    const { ref, organisationId } = await resolveGroupRef(groupId, orgIdParam);
    if (!ref || !organisationId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.set(updates, { merge: true });
    const snap = await ref.get();
    return NextResponse.json({ group: serialiseGroup(snap, organisationId) });
  } catch (error) {
    console.error('Failed to update workspace group', error);
    return NextResponse.json({ error: 'Failed to update workspace group' }, { status: 500 });
  }
}

async function clearGroupAssignments(organisationId: string, workspaceIds: string[]) {
  if (!workspaceIds?.length) return;

  const chunks: string[][] = [];
  for (let i = 0; i < workspaceIds.length; i += 400) {
    chunks.push(workspaceIds.slice(i, i + 400));
  }

  for (const chunk of chunks) {
    const batch = adminDb.batch();
    for (const workspaceId of chunk) {
      const workspaceRef = adminDb.doc(`organisations/${organisationId}/workspaces/${workspaceId}`);
      batch.set(
        workspaceRef,
        {
          workspaceGroupId: null,
          workspaceGroup: null,
          workspaceGroupColor: null,
          region: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

export async function DELETE(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const url = new URL(req.url);
    const orgIdParam = url.searchParams.get('orgId');
    const groupId = params?.groupId;
    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

    const { ref, organisationId } = await resolveGroupRef(groupId, orgIdParam);
    if (!ref || !organisationId) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const data: GroupDoc = snap.data() || {};
    const workspaceIds = Array.isArray(data.workspaceIds) ? data.workspaceIds.filter((id) => typeof id === 'string') : [];

    try {
      await clearGroupAssignments(organisationId, workspaceIds);
    } catch (assignmentErr) {
      console.warn('Failed to clear workspace assignments when deleting group', assignmentErr);
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workspace group', error);
    return NextResponse.json({ error: 'Failed to delete workspace group' }, { status: 500 });
  }
}
