import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

import type { NextRequest } from 'next/server';

// Server-side aggregation of dependency snapshots for a workspace
export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  try {
    // Require Authorization: Bearer <idToken> so we can verify membership against org-scoped users
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    const idToken = authHeader.replace(/^Bearer\s+/i, '');

    // Verify token with Admin SDK
    let token: any;
    try {
      token = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    const requesterUid = token.uid;

    // Read workspace doc to find owner/members and (if present) organisationId
    // Prefer organisation-scoped workspace if it exists; otherwise fall back to top-level workspace (migration compatibility)
    let wsSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let wsData: any = null;
    // First try to find a top-level workspace doc (for backwards compatibility)
    const topRef = adminDb.collection('workspaces').doc(workspaceId);
    const topSnap = await topRef.get();
    if (topSnap.exists) {
      wsSnap = topSnap;
      wsData = topSnap.data();
    }

    // If the workspace doc includes organisationId, prefer org-scoped membership checks and nested paths
    let orgId: string | undefined = wsData?.organisationId || undefined;

    // If orgId is set, load org-scoped workspace document to get canonical data
    if (orgId) {
      try {
        const orgWsSnap = await adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`).get();
        if (orgWsSnap.exists) {
          wsSnap = orgWsSnap;
          wsData = orgWsSnap.data();
        }
      } catch (e) {
        // ignore and continue with top-level data
      }
    }

    // Derive a definitive per-workspace organisation id from the chosen snapshot if possible
    const docOrgId = (wsSnap && (wsSnap.ref && (wsSnap.ref.parent && wsSnap.ref.parent.parent))) ? wsSnap.ref.parent.parent.id : (wsData?.organisationId || undefined);

    if (!wsSnap || !wsSnap.exists) return NextResponse.json({ error: 'workspace not found' }, { status: 404 });

    // Determine membership: check organisations/{orgId}/users/{requesterUid} if orgId present, else check workspace owner/members
    let isMember = false;
    if (docOrgId) {
      try {
        const orgUserSnap = await adminDb.doc(`organisations/${docOrgId}/users/${requesterUid}`).get();
        if (orgUserSnap.exists) isMember = true;
      } catch (e) {
        // ignore
      }
    }

    if (!isMember) {
      // fallback to checking workspace owner/members fields on the workspace doc
      try {
        const ownerId = wsData?.ownerId;
        const members = Array.isArray(wsData?.members) ? wsData.members : [];
        if (ownerId === requesterUid) isMember = true;
        if (!isMember && members.includes && members.includes(requesterUid)) isMember = true;
      } catch (e) {
        // ignore
      }
    }

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Candidate user ids to look for snapshots: ownerId, members
    const candidates: string[] = [];
    if (wsData?.ownerId && typeof wsData.ownerId === 'string') candidates.push(wsData.ownerId);
    if (Array.isArray(wsData?.members) && wsData.members.length > 0) {
      for (const m of wsData.members) {
        if (typeof m === 'string') candidates.push(m);
      }
    }

    // We'll also consider workspace settings occupancy ownerId if present
    try {
        const settingsPath = docOrgId ? `organisations/${docOrgId}/workspaces/${workspaceId}/settings` : `workspaces/${workspaceId}/settings`;
      const settingsSnap = await adminDb.doc(`${settingsPath}/occupancy`).get();
      if (settingsSnap.exists) {
        const s = settingsSnap.data() as any;
        if (s?.ownerId && typeof s.ownerId === 'string' && !candidates.includes(s.ownerId)) candidates.unshift(s.ownerId);
      }
    } catch (e) {
      // ignore
    }

    // Collect snapshots from candidate users (prefer org-scoped user snapshots path if orgId present)
    const allSnapshots: Array<{ savedAt?: number | any; residents?: any[]; options?: any; sourceUser?: string; id?: string }> = [];

    for (const userId of candidates) {
      try {
  const snapsPath = docOrgId ? `organisations/${docOrgId}/users/${userId}/dependency_calculator_snapshots` : `users/${userId}/dependency_calculator_snapshots`;
  const snaps = await adminDb.collection(snapsPath).orderBy('savedAt', 'desc').limit(50).get();
        snaps.forEach((s: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = s.data();
          allSnapshots.push({ ...data, sourceUser: userId, id: s.id });
        });
      } catch (e) {
        // ignore
      }
    }

    // If no user snapshots found, try workspace-level doc path (prefer org-scoped path when orgId present)
    if (allSnapshots.length === 0) {
      try {
  const wsSnapsPath = docOrgId ? `organisations/${docOrgId}/workspaces/${workspaceId}/dependency_calculator_snapshots` : `workspaces/${workspaceId}/dependency_calculator_snapshots`;
  const snaps = await adminDb.collection(wsSnapsPath).orderBy('savedAt', 'desc').limit(50).get();
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
