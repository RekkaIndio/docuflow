import { doc, updateDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { workspaceCollectionPath } from './paths';
import type { Document, Folder } from "./types";

export async function renameDocument(workspaceId: string, documentId: string, newName: string): Promise<void> {
  const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'documents')), documentId);
  await updateDoc(docRef, { name: newName });
}

export async function renameFolder(workspaceId: string, folderId: string, newName: string): Promise<void> {
  const folderRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'folders')), folderId);
  await updateDoc(folderRef, { name: newName });
}
