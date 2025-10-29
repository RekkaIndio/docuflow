import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { workspaceCollectionPath } from './paths';
import { collection, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db } from './firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const resolveAuditDocumentInfo = async (
  workspaceId: string,
  orgId: string | null | undefined,
  latest: any
): Promise<{ downloadUrl: string | null; documentId: string | null }> => {
  let downloadUrl: string | null = null;
  let documentId: string | null = null;
  try {
    const maybeDocId =
      latest?.pdfDocId ||
      latest?.extractedJson?.pdfDocId ||
      latest?.documentId ||
      latest?.extractedJson?.documentId ||
      null;
    const maybeStoragePath = latest?.storagePath || latest?.extractedJson?.storagePath || null;
    if (!maybeDocId && !maybeStoragePath) {
      return { downloadUrl, documentId };
    }
    const docsColPath = workspaceCollectionPath(workspaceId, 'documents', orgId || null);
    if (maybeDocId) {
      const docRef = doc(collection(db, docsColPath), maybeDocId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        downloadUrl = data.downloadUrl ?? null;
        documentId = snap.id;
        return { downloadUrl, documentId };
      }
    }
    if (maybeStoragePath) {
      const q = query(collection(db, docsColPath), where('storagePath', '==', maybeStoragePath));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        const refDoc = snaps.docs[0];
        const data = refDoc.data() as any;
        downloadUrl = data.downloadUrl ?? null;
        documentId = refDoc.id;
      }
    }
  } catch (err) {
    console.warn('resolveAuditDocumentInfo failed', err);
  }
  return { downloadUrl, documentId };
};
