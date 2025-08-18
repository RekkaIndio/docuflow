import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseConfig } from './firebase-config';
import { doc, updateDoc, setDoc } from "firebase/firestore";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


export { app, auth, db, storage };

export async function uploadProfilePicture(file: File, userId: string): Promise<string> {
  const storageRef = ref(storage, `profile-pictures/${userId}`);
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
