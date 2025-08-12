import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Document, Folder } from "./types";

export async function renameDocument(workspaceId: string, documentId: string, newName: string): Promise<void> {
  const docRef = doc(db, `workspaces/${workspaceId}/documents`, documentId);
  await updateDoc(docRef, { name: newName });
}

export async function renameFolder(workspaceId: string, folderId: string, newName: string): Promise<void> {
  const folderRef = doc(db, `workspaces/${workspaceId}/folders`, folderId);
  await updateDoc(folderRef, { name: newName });
}
