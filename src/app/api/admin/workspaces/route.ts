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
        return {
          id: doc.id,
          ...workspaceData,
          folders
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
