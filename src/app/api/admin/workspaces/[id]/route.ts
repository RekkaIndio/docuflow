import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

export async function PATCH(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const allowed: any = {};

  // Allow name updates
  if (body.name !== undefined) {
    allowed.name = String(body.name).trim();
  }

  // Accept explicit totalBeds and occupiedBeds (numbers) and/or occupancy (0..1)
  if (body.totalBeds !== undefined) {
    const tb = Number(body.totalBeds);
    allowed.totalBeds = isNaN(tb) ? 0 : tb;
  }
  if (body.occupiedBeds !== undefined) {
    const ob = Number(body.occupiedBeds);
    allowed.occupiedBeds = isNaN(ob) ? 0 : ob;
  }
  if (body.occupancy !== undefined) {
    const num = Number(body.occupancy);
    allowed.occupancy = isNaN(num) ? 0 : num;
  }

  // If both total and occupied provided, compute occupancy (override occupancy if present)
  if (allowed.totalBeds !== undefined && allowed.occupiedBeds !== undefined) {
    const tb = Number(allowed.totalBeds) || 0;
    const ob = Number(allowed.occupiedBeds) || 0;
    allowed.occupancy = tb > 0 ? (ob / tb) : 0;
  }

  try {
    // Try top-level workspaces first
    let targetRef: any = adminDb.doc(`workspaces/${id}`);
    let targetSnap = await targetRef.get();
    let foundOrgId: string | undefined = undefined;
    if (!targetSnap.exists) {
      // Search org-scoped workspaces via collectionGroup
      try {
        const cg = await adminDb.collectionGroup('workspaces').where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          // Recreate a direct doc ref to update/delete via its full path
          targetRef = adminDb.doc(docSnap.ref.path);
          targetSnap = await targetRef.get();
          // Derive organisationId from parent path
          const parent = docSnap.ref.parent && docSnap.ref.parent.parent ? docSnap.ref.parent.parent : null;
          foundOrgId = parent && parent.id ? parent.id : undefined;
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }
    if (!targetSnap || !targetSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await targetRef.update(allowed);
    const updatedSnap = await targetRef.get();
    return NextResponse.json({ id: updatedSnap.id, ...(updatedSnap.data() || {}), organisationId: foundOrgId });
  } catch (e) {
    console.error('Failed to update workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    // Try top-level workspace first
    let ref = adminDb.doc(`workspaces/${id}`);
    let snap = await ref.get();
    let orgId: string | undefined = undefined;
    if (!snap || !snap.exists) {
      // Search org-scoped workspaces via collectionGroup
      try {
        const cg = await adminDb.collectionGroup('workspaces').where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          ref = adminDb.doc(docSnap.ref.path);
          snap = await ref.get();
          const parent = docSnap.ref.parent && docSnap.ref.parent.parent ? docSnap.ref.parent.parent : null;
          orgId = parent && parent.id ? parent.id : undefined;
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }
    if (!snap || !snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...(snap.data() || {}), organisationId: orgId });
  } catch (e) {
    console.error('Failed to get workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  try {
    // Attempt to find workspace doc either top-level or org-scoped
    let targetRef: any = adminDb.doc(`workspaces/${id}`);
    let targetSnap = await targetRef.get();
    if (!targetSnap || !targetSnap.exists) {
      try {
        const cg = await adminDb.collectionGroup('workspaces').where(admin.firestore.FieldPath.documentId(), '==', id).limit(1).get();
        if (!cg.empty) {
          const docSnap = cg.docs[0];
          targetRef = adminDb.doc(docSnap.ref.path);
          targetSnap = await targetRef.get();
        }
      } catch (cgErr) {
        console.warn('collectionGroup search failed', cgErr);
      }
    }
    if (!targetSnap || !targetSnap.exists) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    await targetRef.delete();
    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' });
  } catch (e) {
    console.error('Failed to delete workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
