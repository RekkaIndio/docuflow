import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { firebaseConfig } from './firebase-config';
import { doc, updateDoc, setDoc } from "firebase/firestore";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


export { app, auth, db, storage };

/**
 * Delete a storage object given a Firebase Storage download URL.
 * This parses the URL to extract the storage path and attempts deletion.
 */
export async function deleteStorageFileByDownloadUrl(downloadUrl: string): Promise<void> {
  if (!downloadUrl) return;
  try {
    // Expected download URL format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media&token=...
    const parts = downloadUrl.split('/o/');
    if (parts.length < 2) return;
    const pathAndQuery = parts[1];
    const path = decodeURIComponent(pathAndQuery.split('?')[0]);
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (err) {
    // ignore errors (file may not exist or tokenized URL)
    console.warn('deleteStorageFileByDownloadUrl failed', err);
  }
}

/**
 * Upload a profile picture and optionally delete a previous picture by its download URL.
 * Returns the new download URL.
 */
export async function uploadProfilePicture(file: File, userId: string, previousDownloadUrl?: string): Promise<string> {
  // Try to delete previous image if provided
  if (previousDownloadUrl) {
    try {
      await deleteStorageFileByDownloadUrl(previousDownloadUrl);
    } catch (e) {
      // ignore deletion failure
      console.warn('Failed to delete previous profile picture', e);
    }
  }

  // Use a unique filename to avoid caching/token issues
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const storagePath = `profile-pictures/${userId}/${filename}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function saveProfilePictureUrl(userId: string, profilePictureUrl: string): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  try {
    await updateDoc(userDocRef, { profilePicture: profilePictureUrl });
  } catch (error) {
    // Added type assertion for the error object
    if ((error as any).code === "not-found") {
      // Create the document if it doesn't exist
      await setDoc(userDocRef, { profilePicture: profilePictureUrl });
    } else {
      throw error;
    }
  }
}
