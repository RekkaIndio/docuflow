import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';
import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';

function serialiseGroup(doc: DocumentSnapshot<DocumentData>, organisationId: string) {
  const data = doc.data() || {};
  const createdAt = (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate().toISOString() : null;
  const updatedAt = (data.updatedAt && typeof data.updatedAt.toDate === 'function') ? data.updatedAt.toDate().toISOString() : null;
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

type SerializedWorkspaceGroup = ReturnType<typeof serialiseGroup>;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organisationId = url.searchParams.get('orgId');
    if (!organisationId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const snap = await adminDb.collection(`organisations/${organisationId}/workspace-groups`).get();
    const groups = snap.docs.map((docSnapshot: QueryDocumentSnapshot<DocumentData>) => serialiseGroup(docSnapshot, organisationId));
    groups.sort((a: SerializedWorkspaceGroup, b: SerializedWorkspaceGroup) => a.name.localeCompare(b.name));
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Failed to list workspace groups', error);
    return NextResponse.json({ error: 'Failed to load workspace groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const organisationId = url.searchParams.get('orgId');
    if (!organisationId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = body.description === null ? null : (typeof body.description === 'string' ? body.description.trim() : undefined);
    const color = body.color === null ? null : (typeof body.color === 'string' ? body.color.trim() : undefined);

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      name,
      organisationId,
      workspaceIds: Array.isArray(body.workspaceIds) ? body.workspaceIds.filter((id: any) => typeof id === 'string') : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (description !== undefined) payload.description = description;
    if (color !== undefined) payload.color = color;

    const docRef = await adminDb.collection(`organisations/${organisationId}/workspace-groups`).add(payload);
    const created = await docRef.get();
    const group = serialiseGroup(created, organisationId);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Failed to create workspace group', error);
    return NextResponse.json({ error: 'Failed to create workspace group' }, { status: 500 });
  }
}
