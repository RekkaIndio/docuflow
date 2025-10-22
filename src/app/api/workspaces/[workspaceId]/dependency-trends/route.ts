import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getDefaultAssessment, NPDS_FIELDS } from '@/lib/staffing/ndps';

import type { Resident as NdpsResident } from '@/lib/staffing/ndps';
import type { Resident as StaffingResident } from '@/lib/staffing';

import type { NextRequest } from 'next/server';

function normaliseNdpsResident(raw: any, index: number): NdpsResident {
  const defaults = getDefaultAssessment();
  const merged = { ...defaults, ...raw } as NdpsResident;

  if (!merged.id || typeof merged.id !== 'string') {
    merged.id = typeof raw?.id === 'number' ? String(raw.id) : `resident-${index}`;
  }

  merged.name = typeof raw?.name === 'string' && raw.name.trim().length > 0 ? raw.name : `Resident ${index + 1}`;
  merged.room = typeof raw?.room === 'string' ? raw.room : '';

  return merged;
}

function toStaffingResidents(residents: NdpsResident[]): StaffingResident[] {
  return residents.map((resident, index) => {
    const existingScores = (resident as any)?.npdsScores;
    if (existingScores && typeof existingScores === 'object') {
      const bcn = Number(existingScores.BCN ?? 0);
      const snn = Number(existingScores.SNN ?? 0);
      const therapy = Number(existingScores.THERAPY ?? 0);
      return {
        id: resident.id ?? `resident-${index}`,
        name: resident.name || `Resident ${index + 1}`,
        npdsScores: {
          BCN: Number.isFinite(bcn) ? bcn : 0,
          SNN: Number.isFinite(snn) ? snn : 0,
          THERAPY: Number.isFinite(therapy) ? therapy : 0,
        },
      };
    }

    const aggregates = { BCN: 0, SNN: 0, THERAPY: 0 };

    for (const field of NPDS_FIELDS) {
      const rawValue = (resident as any)[field.key];
      const numeric = typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string' && rawValue.trim().length > 0
          ? Number(rawValue)
          : 0;
      if (!Number.isFinite(numeric)) continue;
      if (field.section === 'BCN') aggregates.BCN += numeric;
      else if (field.section === 'SNN') aggregates.SNN += numeric;
      else aggregates.THERAPY += numeric;
    }

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    return {
      id: resident.id ?? `resident-${index}`,
      name: resident.name || `Resident ${index + 1}`,
      npdsScores: {
        BCN: clamp(aggregates.BCN, 0, 65),
        SNN: clamp(aggregates.SNN, 0, 25),
        THERAPY: clamp(aggregates.THERAPY, 0, 10),
      },
    };
  });
}

// Server-side aggregation of dependency snapshots for a workspace
export async function GET(req: NextRequest, { params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params;
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  try {
    const queryOrgIdParam = req.nextUrl?.searchParams?.get('orgId');
    const queryOrgId = queryOrgIdParam && queryOrgIdParam.trim().length > 0 ? queryOrgIdParam.trim() : undefined;

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
    let orgId: string | undefined = queryOrgId;

    // If caller specified orgId, attempt to load org-scoped document first
    if (orgId) {
      try {
        const scopedSnap = await adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`).get();
        if (scopedSnap.exists) {
          wsSnap = scopedSnap;
          wsData = scopedSnap.data();
        }
      } catch (e) {
        // ignore errors; fall back to default resolution below
      }
    }

    // If still unresolved, read top-level workspace for backwards compatibility
    if (!wsSnap) {
      const topRef = adminDb.collection('workspaces').doc(workspaceId);
      const topSnap = await topRef.get();
      if (topSnap.exists) {
        wsSnap = topSnap;
        wsData = topSnap.data();
        if (!orgId && wsData?.organisationId) {
          orgId = wsData.organisationId;
        }
      }
    }

    // If we discovered orgId from top-level doc (or it was provided), attempt to load the org-scoped workspace for canonical data
    if (orgId) {
      try {
        const orgWsSnap = await adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`).get();
        if (orgWsSnap.exists) {
          wsSnap = orgWsSnap;
          wsData = orgWsSnap.data();
        }
      } catch (e) {
        // ignore and continue with previously resolved snapshot
      }
    }

    // Derive a definitive per-workspace organisation id from the chosen snapshot if possible
    const docOrgId = (wsSnap && wsSnap.ref && wsSnap.ref.parent && wsSnap.ref.parent.parent)
      ? wsSnap.ref.parent.parent.id
      : (orgId || wsData?.organisationId || undefined);

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
      const docPaths: string[] = [];
      if (docOrgId) {
        docPaths.push(`organisations/${docOrgId}/workspaces/${workspaceId}/dependency_calculator/default`);
      }
      docPaths.push(`workspaces/${workspaceId}/dependency_calculator/default`);

      for (const path of docPaths) {
        try {
          const calcDoc = await adminDb.doc(path).get();
          if (calcDoc.exists) {
            const docData = calcDoc.data() as any;
            if (Array.isArray(docData?.residents) && docData.residents.length > 0) {
              const normalisedResidents = (docData.residents as any[]).map((resident, index) =>
                normaliseNdpsResident(resident, index)
              );

              allSnapshots.push({
                residents: normalisedResidents,
                options: docData.options || {},
                savedAt: docData.updatedAt || docData.createdAt || Date.now(),
                sourceUser: 'workspace_document',
                id: 'workspace-default',
              });
              break;
            }
          }
        } catch (docErr) {
          // ignore and continue checking fallback paths
        }
      }
    }

    if (allSnapshots.length === 0) {
      return NextResponse.json({ points: [], latest: null });
    }

    // Sort snapshots by savedAt ascending for consistent timeline calculations
    allSnapshots.sort((a, b) => {
      const aTs = typeof a.savedAt === 'number'
        ? a.savedAt
        : (a.savedAt && a.savedAt.toMillis ? a.savedAt.toMillis() : (a.savedAt && Date.parse(a.savedAt)) || 0);
      const bTs = typeof b.savedAt === 'number'
        ? b.savedAt
        : (b.savedAt && b.savedAt.toMillis ? b.savedAt.toMillis() : (b.savedAt && Date.parse(b.savedAt)) || 0);
      return aTs - bTs;
    });

    // Import computeStaffing dynamic. Note: import path must be allowed in server
    const { computeStaffing } = await import('@/lib/staffing');

    type SnapshotMetric = {
      dateIso: string;
      totalStaff: number;
      carers: number;
      ns: number;
      levels: Record<string, number>;
      residentsCount: number;
      staffing: {
        day: { carers: number; ns: number; total: number };
        night: { carers: number; ns: number; total: number };
        totals: { dayHours: number; nightHours: number; overallHours: number };
      };
      sourceUser?: string;
      id?: string;
      savedAtMs: number;
    };

    const metrics: SnapshotMetric[] = [];

    for (const snap of allSnapshots) {
      const rawResidents = Array.isArray(snap.residents) ? snap.residents : [];
      if (rawResidents.length === 0) continue;

      const ndpsResidents = rawResidents.map((resident, idx) => normaliseNdpsResident(resident, idx));
      if (ndpsResidents.length === 0) continue;

      const staffingResidents = toStaffingResidents(ndpsResidents).filter((r) => r && typeof r === 'object');
      if (staffingResidents.length === 0) continue;

      const options = snap.options || {};
      const staffing = computeStaffing(staffingResidents, options);
      const roundedDay = staffing.totals?.rounded?.day ?? {};
      const roundedNight = staffing.totals?.rounded?.night ?? {};
      const hoursDay = staffing.totals?.hours?.day ?? {};
      const hoursNight = staffing.totals?.hours?.night ?? {};

      const dayCarers = Number(roundedDay.carers ?? 0);
      const dayNs = Number(roundedDay.ns ?? 0);
      const dayTotal = Number(roundedDay.all ?? dayCarers + dayNs);
      const nightCarers = Number(roundedNight.carers ?? 0);
      const nightNs = Number(roundedNight.ns ?? 0);
      const nightTotal = Number(roundedNight.all ?? nightCarers + nightNs);

      const totalStaff = dayTotal + nightTotal;
      const carers = dayCarers + nightCarers;
      const ns = dayNs + nightNs;

      const levelCounts: Record<string, number> = {};
      if (Array.isArray(staffing.perResident)) {
        staffing.perResident.forEach((r: any) => {
          const level = typeof r?.level === 'string' ? r.level : null;
          if (level) levelCounts[level] = (levelCounts[level] || 0) + 1;
        });
      }

      const savedAtMs = typeof snap.savedAt === 'number'
        ? snap.savedAt
        : (snap.savedAt && snap.savedAt.toMillis
            ? snap.savedAt.toMillis()
            : (snap.savedAt && Date.parse(snap.savedAt)) || Date.now());
      const dateIso = new Date(savedAtMs).toISOString();

      metrics.push({
        dateIso,
        totalStaff,
        carers,
        ns,
        levels: levelCounts,
        residentsCount: staffingResidents.length,
        staffing: {
          day: { carers: dayCarers, ns: dayNs, total: dayTotal },
          night: { carers: nightCarers, ns: nightNs, total: nightTotal },
          totals: {
            dayHours: Number(hoursDay.all ?? 0),
            nightHours: Number(hoursNight.all ?? 0),
            overallHours: Number((hoursDay.all ?? 0) + (hoursNight.all ?? 0)),
          },
        },
        sourceUser: snap.sourceUser,
        id: snap.id,
        savedAtMs,
      });
    }

    if (metrics.length === 0) {
      return NextResponse.json({ points: [], latest: null });
    }

    metrics.sort((a, b) => a.savedAtMs - b.savedAtMs);

    const points = metrics.map((m) => ({
      date: m.dateIso,
      totalStaff: m.totalStaff,
      carers: m.carers,
      ns: m.ns,
      levels: m.levels,
      sourceUser: m.sourceUser,
      id: m.id,
    }));

    const latestMetric = metrics[metrics.length - 1];
    const latest = latestMetric
      ? {
          savedAt: latestMetric.dateIso,
          totalStaff: latestMetric.totalStaff,
          carers: latestMetric.carers,
          ns: latestMetric.ns,
          residentsCount: latestMetric.residentsCount,
          dependencyLevels: latestMetric.levels,
          staffing: latestMetric.staffing,
          sourceUser: latestMetric.sourceUser,
          id: latestMetric.id,
        }
      : null;

    return NextResponse.json({ points, latest });
  } catch (e) {
    return NextResponse.json({ error: (e as any)?.toString?.() ?? 'unknown error' }, { status: 500 });
  }
}

// This route uses firebase-admin which depends on Node built-ins (net, tls, etc.).
// Run on Node.js runtime to avoid attempting to bundle server-only modules for the Edge runtime.
export const runtime = 'nodejs';
