import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

async function fetchWorkspaceStructure(workspaceId: string, orgId?: string) {
  try {
    const basePath = orgId ? `organisations/${orgId}/workspaces/${workspaceId}` : `workspaces/${workspaceId}`;
    const [foldersSnap, documentsSnap] = await Promise.all([
      adminDb.collection(`${basePath}/folders`).get(),
      adminDb.collection(`${basePath}/documents`).get()
    ]);
    
    const allDocuments: Record<string, any> = {};
    documentsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      const createdAt = data.createdAt && data.createdAt.toDate 
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();
      allDocuments[docSnap.id] = { id: docSnap.id, ...data, createdAt, type: 'document' };
    });

    const allFoldersMap: Record<string, any> = {};
    foldersSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      allFoldersMap[docSnap.id] = {
        ...data,
        id: docSnap.id,
        name: data.name || "Untitled Folder",
        type: "folder",
        items: []
      };
    });

    // Build folder structure
    const rootFolders: any[] = [];
    Object.values(allFoldersMap).forEach((folder: any) => {
      if (!folder.parentId) {
        rootFolders.push(folder);
      } else if (allFoldersMap[folder.parentId]) {
        allFoldersMap[folder.parentId].items.push(folder);
      }
    });

    // Add documents to appropriate folders or root
    console.log(`Debug: Found ${Object.keys(allDocuments).length} documents and ${Object.keys(allFoldersMap).length} folders`);
    let documentsPlaced = 0;
    let documentsAtRoot = 0;
    Object.values(allDocuments).forEach((document: any) => {
      // Use folderId instead of parentId for documents
      if (document.folderId && allFoldersMap[document.folderId]) {
        allFoldersMap[document.folderId].items.push(document);
        documentsPlaced++;
      } else {
        rootFolders.push(document);
        documentsAtRoot++;
        if (documentsAtRoot < 3) { // Log first few mismatched documents
          console.log(`Debug: Document "${document.name}" folderId "${document.folderId}" not found in folders`);
        }
      }
    });
    console.log(`Debug: Placed ${documentsPlaced} documents in folders, ${documentsAtRoot} at root`);

    return { folders: rootFolders, documents: Object.values(allDocuments) };
  } catch (error) {
    console.error(`Failed to fetch structure for workspace ${workspaceId}:`, error);
    return { folders: [], documents: [] };
  }
}

export async function GET(req: Request) {
  try {
    // For safety, require that global listing is only available to admins.
    // We detect a platform admin via an Authorization header (this is a simple gate — replace with your real auth check).
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId') || undefined;
    const authHeader = req.headers.get('x-admin-secret') || req.headers.get('authorization');

    // If no orgId is provided, require admin header to list top-level workspaces
    if (!orgId && !authHeader) {
      return NextResponse.json({ error: 'Missing orgId or admin authorization' }, { status: 403 });
    }

    // If orgId is present, return only workspaces under that organisation
    let snaps: any;
    if (orgId) {
      snaps = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
    } else if (authHeader) {
      // For admins without orgId, list workspaces across all organisations
      const orgSnaps = await adminDb.collection('organisations').get();
      const allWorkspaces: any[] = [];
      for (const orgDoc of orgSnaps.docs) {
        const wsSnaps = await adminDb.collection(`organisations/${orgDoc.id}/workspaces`).get();
        allWorkspaces.push(...wsSnaps.docs);
      }
      snaps = { docs: allWorkspaces };
    } else {
      return NextResponse.json({ error: 'Missing orgId or admin authorization' }, { status: 403 });
    }

    const groupCache = new Map<string, Map<string, any>>();
    const loadGroupsForOrg = async (orgKey?: string | null) => {
      if (!orgKey) return null;
      if (groupCache.has(orgKey)) {
        return groupCache.get(orgKey)!;
      }
      try {
        const snap = await adminDb.collection(`organisations/${orgKey}/workspace-groups`).get();
        const map = new Map<string, any>();
        snap.forEach((docSnap: any) => {
          const data = docSnap.data() || {};
          const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : null;
          const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : null;
          const workspaceIds = Array.isArray(data.workspaceIds) ? data.workspaceIds.filter((v: any) => typeof v === 'string') : [];
          map.set(docSnap.id, {
            id: docSnap.id,
            organisationId: orgKey,
            name: typeof data.name === 'string' ? data.name : docSnap.id,
            description: typeof data.description === 'string' ? data.description : null,
            color: typeof data.color === 'string' ? data.color : null,
            workspaceIds,
            workspaceCount: workspaceIds.length,
            createdAt,
            updatedAt,
          });
        });
        groupCache.set(orgKey, map);
        return map;
      } catch (groupErr) {
        console.warn('Failed to load workspace groups while listing workspaces', groupErr);
        const empty = new Map<string, any>();
        groupCache.set(orgKey, empty);
        return empty;
      }
    };

    const workspaces = await Promise.all(
      snaps.docs.map(async (doc: any) => {
        const workspaceData = doc.data();

        // Derive organisationId from the document reference if present (doc may come from org-scoped collection)
        const parent = doc && doc.ref && doc.ref.parent && doc.ref.parent.parent ? doc.ref.parent.parent : null;
        const docOrgId = parent && parent.id ? parent.id : orgId || undefined;

        const { folders } = await fetchWorkspaceStructure(doc.id, docOrgId);

        const workspaceGroupId: string | null = workspaceData.workspaceGroupId || workspaceData.groupId || null;
        let workspaceGroup: any = (workspaceData.workspaceGroup && typeof workspaceData.workspaceGroup === 'object') ? workspaceData.workspaceGroup : null;
        if (workspaceGroupId && (!workspaceGroup || workspaceGroup.id !== workspaceGroupId)) {
          const map = await loadGroupsForOrg(docOrgId);
          if (map && map.has(workspaceGroupId)) {
            workspaceGroup = map.get(workspaceGroupId);
          }
        }
        const workspaceGroupColor = workspaceData.workspaceGroupColor || workspaceGroup?.color || null;
        const derivedRegion = workspaceData.region || workspaceGroup?.name || null;

        // attempt occupancy and scores as before, but prefer org-scoped path for this workspace
        let totalBeds: number | undefined = undefined;
        let occupiedBeds: number | undefined = undefined;
        try {
            const occDocRef = docOrgId
              ? adminDb.doc(`organisations/${docOrgId}/workspaces/${doc.id}/settings/occupancy`)
              : adminDb.doc(`workspaces/${doc.id}/settings/occupancy`);
            const occDoc = await occDocRef.get();
          if (occDoc.exists) {
            const d = occDoc.data();
            if (d && typeof d.totalBeds === 'number') totalBeds = d.totalBeds;
            if (d && typeof d.occupiedBeds === 'number') occupiedBeds = d.occupiedBeds;
          }
        } catch (occErr) {
          console.warn('Failed to read occupancy settings for', doc.id, occErr);
        }

        let complianceScore: number | null = null;
        try {
          const latestScoresRef = docOrgId
            ? adminDb.doc(`organisations/${docOrgId}/workspaces/${doc.id}/settings/audit_latest_scores`)
            : adminDb.doc(`workspaces/${doc.id}/settings/audit_latest_scores`);
          const latestScoresDoc = await latestScoresRef.get();
          if (latestScoresDoc.exists) {
            const data = latestScoresDoc.data() || {};
            const scores: number[] = Object.values(data)
              .map((v: any) => (v && typeof v.scorePercent === 'number' ? v.scorePercent : null))
              .filter((s: any) => typeof s === 'number');
            if (scores.length > 0) {
              complianceScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
          }
        } catch (scoreErr) {
          console.warn('Failed to read audit_latest_scores for', doc.id, scoreErr);
        }

        let staffCount: number | null = null;
        let staffingLevel: number | null = null; // percentage
        let latestDailyCheckinAt: string | null = null;
        try {
          const checkinsColRef = docOrgId
            ? adminDb.collection(`organisations/${docOrgId}/workspaces/${doc.id}/daily-checkins`)
            : adminDb.collection(`workspaces/${doc.id}/daily-checkins`);
          const snaps = await checkinsColRef.orderBy('createdAt', 'desc').limit(1).get();
          if (!snaps.empty) {
            const latest = snaps.docs[0].data();
            latestDailyCheckinAt = latest && latest.recordedAt ? latest.recordedAt : (latest && latest.createdAt && latest.createdAt.toDate ? latest.createdAt.toDate().toISOString() : null);

            const day = latest.staffingDay ?? (latest.staffing && latest.staffing.day) ?? null;
            const night = latest.staffingNight ?? (latest.staffing && latest.staffing.night) ?? null;
            if (typeof day === 'number' && typeof night === 'number') {
              staffCount = (Number(day) || 0) + (Number(night) || 0);
            } else if (typeof day === 'number') {
              staffCount = Number(day) || 0;
            } else if (typeof latest.staffCount === 'number') {
              staffCount = latest.staffCount;
            }

            if (typeof staffCount === 'number') {
              if (typeof totalBeds === 'number' && totalBeds > 0) {
                staffingLevel = Math.round((staffCount / totalBeds) * 100);
              } else if (typeof workspaceData.requiredStaff === 'number' && workspaceData.requiredStaff > 0) {
                staffingLevel = Math.round((staffCount / workspaceData.requiredStaff) * 100);
              }
            }
          }
        } catch (checkinErr) {
          console.warn('Failed to read latest daily-checkin for', doc.id, checkinErr);
        }

        return {
          id: doc.id,
          organisationId: docOrgId,
          ...workspaceData,
          folders,
          region: derivedRegion,
          workspaceGroupId,
          workspaceGroup: workspaceGroup || null,
          workspaceGroupColor,
          totalBeds,
          occupiedBeds,
          occupancy: (typeof totalBeds === 'number' && typeof occupiedBeds === 'number' && totalBeds > 0) ? (occupiedBeds / totalBeds) : workspaceData.occupancy ?? null,
          complianceScore,
          staffCount,
          staffingLevel,
          latestDailyCheckinAt,
        };
      })
    );
    return NextResponse.json({ workspaces });
  } catch (e) {
    console.error('Failed to load all workspaces', e);
    return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, ownerId, members } = body || {};
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId') || undefined;
    if (!name || !ownerId) return NextResponse.json({ error: 'Missing name or ownerId' }, { status: 400 });

    // Workspace quota enforcement
    // Platform admin override (existing logic)
    const adminHeader = req.headers.get('x-admin-secret') || req.headers.get('authorization');

    // Only enforce quota if not platform admin
    let enforceQuota = true;
    if (adminHeader) enforceQuota = false;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required to create a workspace' }, { status: 400 });
    }

    if (enforceQuota) {
      // Read workspaceLimit directly from organisation doc
      const orgRef = adminDb.doc(`organisations/${orgId}`);
      const orgSnap = await orgRef.get();
      let workspaceLimit = null;
      if (orgSnap.exists) {
        const orgData = orgSnap.data();
        workspaceLimit = typeof orgData.workspaceLimit === 'number' ? orgData.workspaceLimit : null;
      }
      // If no limit, allow unlimited
      if (workspaceLimit !== null) {
        // Count current workspaces
        const wsSnap = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
        const currentCount = wsSnap.size;
        if (currentCount >= workspaceLimit) {
          return NextResponse.json({
            error: 'workspace_limit_reached',
            message: `Workspace limit reached (${currentCount} of ${workspaceLimit}). Contact support to upgrade.`,
            limit: workspaceLimit,
            used: currentCount
          }, { status: 403 });
        }
      }
    }

    // Build payload
    const payload: any = {
      name,
      ownerId,
      members: Array.isArray(members) ? members : (members ? [members] : [ownerId]),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const rawGroup = body.workspaceGroupId !== undefined ? body.workspaceGroupId : body.groupId;
    let groupPayload: { id: string; name: string; color: string | null } | null = null;
    if (rawGroup !== undefined) {
      const trimmed = rawGroup === null ? null : String(rawGroup).trim();
      const targetGroupId = trimmed || null;
      if (targetGroupId) {
        const groupRef = adminDb.doc(`organisations/${orgId}/workspace-groups/${targetGroupId}`);
        const groupSnap = await groupRef.get();
        if (!groupSnap.exists) {
          return NextResponse.json({ error: 'Workspace group not found' }, { status: 404 });
        }
        const groupData = groupSnap.data() || {};
        groupPayload = {
          id: targetGroupId,
          name: typeof groupData.name === 'string' ? groupData.name : targetGroupId,
          color: typeof groupData.color === 'string' ? groupData.color : null,
        };
        payload.workspaceGroupId = groupPayload.id;
        payload.workspaceGroup = groupPayload;
        payload.workspaceGroupColor = groupPayload.color || null;
        payload.region = groupPayload.name;
      } else {
        payload.workspaceGroupId = null;
        payload.workspaceGroup = null;
        payload.workspaceGroupColor = null;
      }
    }

    let workspaceId: string;

    // Create org-scoped workspace
    const wsRef = await adminDb.collection(`organisations/${orgId}/workspaces`).add({ ...payload, organisationId: orgId });
    workspaceId = wsRef.id;

    if (groupPayload) {
      try {
        const groupRef = adminDb.doc(`organisations/${orgId}/workspace-groups/${groupPayload.id}`);
        await groupRef.set(
          {
            workspaceIds: admin.firestore.FieldValue.arrayUnion(workspaceId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (groupErr) {
        console.warn('Failed to add workspace to group during creation', groupErr);
      }
    }

    // Ensure organisation user records exist for owner and members so security rules
    // that check organisations/{orgId}/users/{uid} succeed for client requests.
    try {
      const memberIds = Array.isArray(payload.members) ? payload.members : [payload.ownerId];
      for (const m of memberIds) {
        try {
          // Create or merge an organisations/{orgId}/users/{userId} doc
          const orgUserRef = adminDb.doc(`organisations/${orgId}/users/${m}`);
          await orgUserRef.set({ id: m, role: m === payload.ownerId ? 'Owner' : 'Member', organisationId: orgId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (inner) {
          console.warn('admin POST: failed to create org user record for', m, inner);
        }
      }
    } catch (membersErr) {
      console.warn('admin POST: failed to ensure org user records', membersErr);
    }

    // Ensure protected folders exist under the org-scoped workspace (server-side)
    try {
      const basePath = `organisations/${orgId}/workspaces/${workspaceId}`;
      const protectedFolders = [
        { id: 'audits', name: 'Audits', parentId: null },
        { id: 'audits-managers-monthly-audit', name: "Managers' Monthly Audit", parentId: 'audits' },
        { id: 'audits-audits', name: 'Audits', parentId: 'audits' },
        { id: 'complaints-and-compliments', name: 'Complaints and Compliments', parentId: null },
        { id: 'complaints', name: 'Complaints', parentId: 'complaints-and-compliments' },
        { id: 'compliments', name: 'Compliments', parentId: 'complaints-and-compliments' },
        { id: 'surveys', name: 'Surveys', parentId: null },
        { id: 'surveys-staff', name: 'Staff', parentId: 'surveys' },
        { id: 'surveys-residents', name: 'Residents', parentId: 'surveys' },
        { id: 'surveys-professional', name: 'Professional', parentId: 'surveys' },
        { id: 'surveys-relatives', name: 'Relatives', parentId: 'surveys' },
        { id: 'action-plans', name: 'Action plans', parentId: null },
        { id: 'action-plans-external', name: 'External', parentId: 'action-plans' },
        { id: 'action-plans-internal', name: 'Internal', parentId: 'action-plans' },
      ];

      for (const f of protectedFolders) {
        const docRef = adminDb.doc(`${basePath}/folders/${f.id}`);
        const snap = await docRef.get();
        if (!snap.exists) {
          await docRef.set({
            name: f.name,
            type: 'folder',
            parentId: f.parentId ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            protected: true,
          });
        }
      }
    } catch (pfErr) {
      console.warn('admin POST: failed to create protected folders', pfErr);
    }

    // Build response workspace object using admin reads
    const wsDoc = await adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`).get();
    const wsData = wsDoc.exists ? wsDoc.data() : { name };
    const structure = await fetchWorkspaceStructure(workspaceId, orgId);
    return NextResponse.json({ ok: true, workspace: { id: workspaceId, ...wsData, folders: structure.folders } });
  } catch (e) {
    console.error('Failed to create workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
