import { NextResponse } from 'next/server';
import { createWorkspace, getAllWorkspaces } from '@/lib/firestore';
import { adminDb } from '@/lib/firebase-admin';

async function getAllWorkspacesAdmin(): Promise<any[]> {
  try {
    const workspacesCollection = adminDb.collection('workspaces');
    const snapshot = await workspacesCollection.get();
    
    const workspaces = await Promise.all(snapshot.docs.map(async (doc: any) => {
      const data = doc.data();
      
      // Fetch folders for this workspace
      const foldersCollection = adminDb.collection(`workspaces/${doc.id}/folders`);
      const foldersSnapshot = await foldersCollection.get();
      
      const folders = foldersSnapshot.docs.map((folderDoc: any) => ({
        id: folderDoc.id,
        ...folderDoc.data()
      }));
      
      // Fetch documents for this workspace  
      const documentsCollection = adminDb.collection(`workspaces/${doc.id}/documents`);
      const documentsSnapshot = await documentsCollection.get();
      
      const documents = documentsSnapshot.docs.map((docDoc: any) => ({
        id: docDoc.id,
        ...docDoc.data(),
        createdAt: docDoc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      
      // Structure the folders and documents properly
      const structuredFolders = folders.map((folder: any) => ({
        ...folder,
        type: 'folder',
        items: documents.filter((doc: any) => doc.folderId === folder.id)
      }));
      
      // Add root documents (documents without a folderId)
      const rootDocuments = documents.filter((doc: any) => !doc.folderId || doc.folderId === 'root');
      

      
      return {
        id: doc.id,
        ...data,
        folders: [...structuredFolders, ...rootDocuments]
      };
    }));
    
    return workspaces;
  } catch (e) {
    console.error('Failed to load workspaces with admin SDK:', e);
    throw e;
  }
}

export async function GET() {
  try {
    const workspaces = await getAllWorkspacesAdmin();
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
