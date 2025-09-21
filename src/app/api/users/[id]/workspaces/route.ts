import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

async function fetchWorkspaceStructure(workspaceRefPath: string) {
  try {
    const foldersSnap = await adminDb.collection(`${workspaceRefPath}/folders`).get();
    const documentsSnap = await adminDb.collection(`${workspaceRefPath}/documents`).get();

    const allDocuments: Record<string, any> = {};
    documentsSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      const createdAt = data && data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      allDocuments[docSnap.id] = { id: docSnap.id, ...data, createdAt, type: 'document' };
    });

    const allFoldersMap: Record<string, any> = {};
    foldersSnap.forEach((docSnap: any) => {
      const data = docSnap.data();
      allFoldersMap[docSnap.id] = { ...data, id: docSnap.id, name: data.name || 'Untitled Folder', type: 'folder', items: [] };
    });

    const rootFolders: any[] = [];
    Object.values(allFoldersMap).forEach((folder: any) => {
      if (folder.parentId && allFoldersMap[folder.parentId]) {
        allFoldersMap[folder.parentId].items.push(folder);
      } else {
        rootFolders.push(folder);
      }
    });

    Object.values(allDocuments).forEach((doc: any) => {
      if (doc.folderId && allFoldersMap[doc.folderId]) {
        allFoldersMap[doc.folderId].items.push(doc);
      } else {
        rootFolders.push(doc);
      }
    });

    return { folders: rootFolders, documents: Object.values(allDocuments) };
  } catch (e) {
    console.error('fetchWorkspaceStructure failed', e);
    return { folders: [], documents: [] };
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
  // Next.js requires awaiting `params` in dynamic API routes to avoid sync access
  // (see: https://nextjs.org/docs/messages/sync-dynamic-apis)
  const userId = (await params).id;
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId') || undefined;

    // Use collectionGroup to find any workspaces where the user is a member or owner
    const docsMap: Record<string, any> = {};

    if (orgId) {
      const snaps = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
      snaps.forEach((d: any) => {
        const data = d.data() || {};
        const members = Array.isArray(data.members) ? data.members : [];
        if (members.includes(userId) || data.ownerId === userId) {
          docsMap[d.id] = { id: d.id, ...data, _refPath: `organisations/${orgId}/workspaces/${d.id}` };
        }
      });
    } else {
      // collectionGroup on 'workspaces' to find any workspaces under organisations/*/workspaces or top-level workspaces
      try {
        const memberSnap = await adminDb.collectionGroup('workspaces').where('members', 'array-contains', userId).get();
        memberSnap.forEach((d: any) => docsMap[d.id] = { id: d.id, ...d.data(), _refPath: d.ref.path });
      } catch (e) {
        // ignore
      }
      try {
        const ownerSnap = await adminDb.collectionGroup('workspaces').where('ownerId', '==', userId).get();
        ownerSnap.forEach((d: any) => docsMap[d.id] = { id: d.id, ...d.data(), _refPath: d.ref.path });
      } catch (e) {
        // ignore
      }
    }

    const workspaces = [];
    for (const id of Object.keys(docsMap)) {
      const ws = docsMap[id];
      const structure = await fetchWorkspaceStructure(ws._refPath);
      // derive organisationId if path contains organisations/
      const orgMatch = (ws._refPath || '').match(/^organisations\/([^\/]+)\/workspaces\//);
      const organisationId = orgMatch ? orgMatch[1] : (ws.organisationId || null);
      workspaces.push({ id, name: ws.name || id, ownerId: ws.ownerId, members: ws.members || [], organisationId, folders: structure.folders });
    }

    return NextResponse.json({ workspaces });
  } catch (e) {
    console.error('Failed to fetch user workspaces', e);
    return NextResponse.json({ error: 'Failed to fetch user workspaces' }, { status: 500 });
  }
}
