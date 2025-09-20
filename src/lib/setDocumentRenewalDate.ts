import { doc, updateDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { workspaceCollectionPath } from './paths';

export async function setDocumentRenewalDate(workspaceId: string, documentId: string, renewalDate: string): Promise<void> {
  const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'documents')), documentId);
  await updateDoc(docRef, { renewalDate });
}
