import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const ref = doc(db, 'workspaces', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await updateDoc(ref, allowed);
    const updatedSnap = await getDoc(ref);
    return NextResponse.json({ id: updatedSnap.id, ...(updatedSnap.data() || {}) });
  } catch (e) {
    console.error('Failed to update workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    const ref = doc(db, 'workspaces', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: snap.id, ...(snap.data() || {}) });
  } catch (e) {
    console.error('Failed to get workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  try {
    const ref = doc(db, 'workspaces', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    
    await deleteDoc(ref);
    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' });
  } catch (e) {
    console.error('Failed to delete workspace', e);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
