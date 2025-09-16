import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createWorkspace } from '@/lib/firestore';

async function fetchWorkspaceStructure(workspaceId: string) {
  try {
    const [foldersSnap, documentsSnap] = await Promise.all([
      adminDb.collection(`workspaces/${workspaceId}/folders`).get(),
      adminDb.collection(`workspaces/${workspaceId}/documents`).get()
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

export async function GET() {
  try {
    // Use Firebase Admin SDK to bypass security rules for admin operations
    const workspacesSnap = await adminDb.collection('workspaces').get();
    const workspaces = await Promise.all(
      workspacesSnap.docs.map(async (doc: any) => {
        const workspaceData = doc.data();
        const { folders } = await fetchWorkspaceStructure(doc.id);

        // Derive occupancy from workspace settings where possible
        let totalBeds: number | undefined = undefined;
        let occupiedBeds: number | undefined = undefined;
        try {
          const occDoc = await adminDb.doc(`workspaces/${doc.id}/settings/occupancy`).get();
          if (occDoc.exists) {
            const d = occDoc.data();
            if (d && typeof d.totalBeds === 'number') totalBeds = d.totalBeds;
            if (d && typeof d.occupiedBeds === 'number') occupiedBeds = d.occupiedBeds;
          }
        } catch (occErr) {
          console.warn('Failed to read occupancy settings for', doc.id, occErr);
        }

        // Derive complianceScore from audit_latest_scores (average of numeric scorePercent values)
        let complianceScore: number | null = null;
        try {
          const latestScoresDoc = await adminDb.doc(`workspaces/${doc.id}/settings/audit_latest_scores`).get();
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

        // Get latest daily checkin for staffing information
        let staffCount: number | null = null;
        let staffingLevel: number | null = null; // percentage
        let latestDailyCheckinAt: string | null = null;
        try {
          const checkinsCol = adminDb.collection(`workspaces/${doc.id}/daily-checkins`);
          const snaps = await checkinsCol.orderBy('createdAt', 'desc').limit(1).get();
          if (!snaps.empty) {
            const latest = snaps.docs[0].data();
            latestDailyCheckinAt = latest && latest.recordedAt ? latest.recordedAt : (latest && latest.createdAt && latest.createdAt.toDate ? latest.createdAt.toDate().toISOString() : null);

            // staffingDay/night or staffingDay & staffingNight numeric fields
            const day = latest.staffingDay ?? (latest.staffing && latest.staffing.day) ?? null;
            const night = latest.staffingNight ?? (latest.staffing && latest.staffing.night) ?? null;
            if (typeof day === 'number' && typeof night === 'number') {
              staffCount = (Number(day) || 0) + (Number(night) || 0);
            } else if (typeof day === 'number') {
              staffCount = Number(day) || 0;
            } else if (typeof latest.staffCount === 'number') {
              staffCount = latest.staffCount;
            }

            // Derive staffingLevel as percent of required or beds when available
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
          ...workspaceData,
          folders,
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
    if (!name || !ownerId) return NextResponse.json({ error: 'Missing name or ownerId' }, { status: 400 });
    const ws = await createWorkspace({ name, ownerId, members: members || [ownerId] });
    return NextResponse.json({ ok: true, workspace: ws });
  } catch (e) {
    console.error('Failed to create workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
