
'use server';

import { getStorage, ref, getBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase"; // Ensure firebase app is initialized

// Get a reference to the storage service, which is used to create references in your storage bucket
const storage = getStorage(app);

export async function getDocumentAsBase64(storagePath: string): Promise<string | null> {
    try {
        const fileRef = ref(storage, storagePath);
        const bytes = await getBytes(fileRef);
        const buffer = Buffer.from(bytes);
        return buffer.toString('base64');
    } catch (error: any) {
        console.error("Error fetching document from storage:", error);
        // Handle specific errors, e.g., object not found
        if (error.code === 'storage/object-not-found') {
            console.error(`File not found at path: ${storagePath}`);
        }
        return null;
    }
}

export async function getDownloadUrl(storagePath: string): Promise<string> {
    try {
        const fileRef = ref(storage, storagePath);
        const url = await getDownloadURL(fileRef);
        return url;
    } catch (error) {
        console.error("Error getting download URL:", error);
        throw new Error("Could not get download URL for the specified file.");
    }
}

    