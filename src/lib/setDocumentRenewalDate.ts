import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function setDocumentRenewalDate(workspaceId: string, documentId: string, renewalDate: string): Promise<void> {
  const docRef = doc(db, `workspaces/${workspaceId}/documents`, documentId);
  await updateDoc(docRef, { renewalDate });
}
