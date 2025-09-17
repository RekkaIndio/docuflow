import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

import type { NextRequest } from 'next/server';

// Server-side aggregation of dependency snapshots for a workspace
export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  try {
    // Read workspace doc to find owner/members
    const wsRef = adminDb.collection('workspaces').doc(workspaceId);
    const wsSnap = await wsRef.get();
    if (!wsSnap.exists) return NextResponse.json({ error: 'workspace not found' }, { status: 404 });
    const wsData = wsSnap.data() as any;

    // Candidate user ids to look for snapshots: ownerId, first member
    const candidates: string[] = [];
    if (wsData?.ownerId && typeof wsData.ownerId === 'string') candidates.push(wsData.ownerId);
    if (Array.isArray(wsData?.members) && wsData.members.length > 0) {
      for (const m of wsData.members) {
        if (typeof m === 'string') candidates.push(m);
      }
    }

    // We'll also consider workspace settings occupancy ownerId if present
    try {
      const settingsSnap = await adminDb.collection(`workspaces/${workspaceId}/settings`).doc('occupancy').get();
      if (settingsSnap.exists) {
        const s = settingsSnap.data() as any;
        if (s?.ownerId && typeof s.ownerId === 'string' && !candidates.includes(s.ownerId)) candidates.unshift(s.ownerId);
      }
    } catch (e) {
      // ignore
    }

    // Collect snapshots from candidate users
    const allSnapshots: Array<{ savedAt?: number | any; residents?: any[]; options?: any; sourceUser?: string; id?: string }> = [];

    for (const userId of candidates) {
      try {
        const snaps = await adminDb.collection(`users/${userId}/dependency_calculator_snapshots`).orderBy('savedAt', 'desc').limit(50).get();
        snaps.forEach((s: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = s.data();
          allSnapshots.push({ ...data, sourceUser: userId, id: s.id });
        });
      } catch (e) {
        // ignore
      }
    }

    // If no user snapshots found, try workspace-level doc path (workspaces/{id}/dependency_calculator_snapshots)
    if (allSnapshots.length === 0) {
      try {
        const snaps = await adminDb.collection(`workspaces/${workspaceId}/dependency_calculator_snapshots`).orderBy('savedAt', 'desc').limit(50).get();
  snaps.forEach((s: FirebaseFirestore.QueryDocumentSnapshot) => allSnapshots.push({ ...(s.data() as any), sourceUser: 'workspace', id: s.id }));
      } catch (e) {
        // ignore
      }
    }

    if (allSnapshots.length === 0) {
      return NextResponse.json({ points: [] });
    }

    // Sort snapshots by savedAt ascending
    allSnapshots.sort((a, b) => {
      const aTs = typeof a.savedAt === 'number' ? a.savedAt : (a.savedAt && a.savedAt.toMillis ? a.savedAt.toMillis() : 0);
      const bTs = typeof b.savedAt === 'number' ? b.savedAt : (b.savedAt && b.savedAt.toMillis ? b.savedAt.toMillis() : 0);
      return aTs - bTs;
    });

    // Import computeStaffing dynamic. Note: import path must be allowed in server
    const { computeStaffing } = await import('@/lib/staffing');

    const points: Array<{ date: string; totalStaff: number; carers: number; ns: number; levels: Record<string, number>; sourceUser?: string; id?: string }> = [];

    for (const snap of allSnapshots) {
      const residents = snap.residents || [];
      if (!Array.isArray(residents) || residents.length === 0) continue;
      const options = snap.options || {};
      const staffing = computeStaffing(residents, options);
      const roundedDay = staffing.totals.rounded.day;
      const roundedNight = staffing.totals.rounded.night;
      const totalStaff = (roundedDay.all || 0) + (roundedNight.all || 0);
      const carers = (roundedDay.carers || 0) + (roundedNight.carers || 0);
      const ns = (roundedDay.ns || 0) + (roundedNight.ns || 0);
      const levelCounts: Record<string, number> = {};
      staffing.perResident.forEach((r: any) => {
        if (r.level) levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
      });
      const dateStr = snap.savedAt ? (typeof snap.savedAt === 'number' ? new Date(snap.savedAt).toISOString() : (snap.savedAt.toDate ? snap.savedAt.toDate().toISOString() : String(snap.savedAt))) : new Date().toISOString();
      points.push({ date: dateStr, totalStaff, carers, ns, levels: levelCounts, sourceUser: snap.sourceUser, id: snap.id });
    }

    return NextResponse.json({ points });
  } catch (e) {
    return NextResponse.json({ error: (e as any)?.toString?.() ?? 'unknown error' }, { status: 500 });
  }
}

// This route uses firebase-admin which depends on Node built-ins (net, tls, etc.).
// Run on Node.js runtime to avoid attempting to bundle server-only modules for the Edge runtime.
export const runtime = 'nodejs';
