// Search documents in a workspace by name, tags, or summary (case-insensitive substring match)
export async function searchDocumentsInWorkspace(workspaceId: string, queryStr: string): Promise<Document[]> {
    // Load all documents in workspace (could be optimized with indexed search in future)
    const documentsQuery = query(collection(db, `workspaces/${workspaceId}/documents`));
    const documentsSnap = await getDocs(documentsQuery);

    // Normalize and tokenize the query into words
    const normalize = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const queryTokens = normalize(queryStr).split(' ').filter(Boolean);

    // If no query provided, return all documents (useful for callers that expect a full listing)
    if (queryTokens.length === 0) {
        return documentsSnap.docs.map(docSnap => {
            const data = docSnap.data() as Document;
            return { ...data, id: docSnap.id } as Document;
        });
    }

    // Simple fuzzy helper: checks if token is a substring or shares prefix with term
    const tokenMatchesTerm = (token: string, term: string) => {
        if (!token || !term) return false;
        if (term.includes(token)) return true; // substring
        if (term.startsWith(token) || token.startsWith(term)) return true; // prefix
        // allow short fuzzy matches: small Levenshtein distance for short tokens
        if (Math.abs(term.length - token.length) <= 2) {
            // quick early-exit: require at least first char equality
            if (term[0] !== token[0]) return false;
            let d = 0;
            const minLen = Math.min(term.length, token.length);
            for (let i = 0; i < minLen; i++) {
                if (term[i] !== token[i]) d++;
                if (d > 2) return false;
            }
            return true;
        }
        return false;
    };

    const results: { doc: Document; score: number }[] = [];
    // Try semantic rerank if an OpenAI API key is available
    const openApiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
    let queryEmbedding: number[] | null = null;
    let useEmbeddings = false;
    let OpenAIClient: any = null;
    if (openApiKey) {
        try {
            const { OpenAI } = await import('openai');
            OpenAIClient = new OpenAI({ apiKey: openApiKey });
            // Compute query embedding
            const embedRes = await OpenAIClient.embeddings.create({ model: 'text-embedding-3-small', input: queryStr });
            queryEmbedding = embedRes.data[0].embedding as number[];
            useEmbeddings = !!queryEmbedding;
        } catch (e) {
            console.warn('Embeddings unavailable, falling back to token matching', e);
            useEmbeddings = false;
        }
    }
    for (const docSnap of documentsSnap.docs) {
        const data = docSnap.data() as Document;

        // Build a searchable blob from several fields
        const name = normalize(data.name);
        const summary = normalize(data.summary);
        const tags = Array.isArray(data.tags) ? data.tags.map(t => normalize(t)).join(' ') : '';
        // Include any extracted text if available
    const extractedText = normalize((data.extractedJson ? JSON.stringify(data.extractedJson) : ''));
        const blob = [name, summary, tags, extractedText].filter(Boolean).join(' ');

        // If embeddings are enabled and document has an embedding, compute cosine similarity
        let score = 0;
        if (useEmbeddings && queryEmbedding) {
            // Ensure the document has an embedding; if not, try to generate and persist one (best-effort)
            let docEmbedding = (data as any).embedding as number[] | undefined;
            if (!docEmbedding) {
                try {
                    if (OpenAIClient) {
                        const textToEmbed = [name, summary, tags].filter(Boolean).join('\n');
                        const res = await OpenAIClient.embeddings.create({ model: 'text-embedding-3-small', input: textToEmbed });
                        docEmbedding = res.data[0].embedding as number[];
                        // Persist the embedding back to Firestore (best-effort, no retry)
                        try {
                            const docRef = doc(db, `workspaces/${workspaceId}/documents`, docSnap.id);
                            await setDoc(docRef, { embedding: docEmbedding }, { merge: true });
                        } catch (persistErr) {
                            console.warn('Failed to persist embedding for doc', docSnap.id, persistErr);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to generate embedding for document', docSnap.id, e);
                    docEmbedding = undefined;
                }
            }

            if (docEmbedding && queryEmbedding) {
                // cosine similarity
                const dot = docEmbedding.reduce((acc, v, i) => acc + v * (queryEmbedding ? queryEmbedding[i] ?? 0 : 0), 0);
                const normA = Math.sqrt(docEmbedding.reduce((acc, v) => acc + v * v, 0));
                const normB = Math.sqrt(queryEmbedding.reduce((acc, v) => acc + v * v, 0));
                const cosine = normA && normB ? dot / (normA * normB) : 0;
                // map cosine [-1,1] to a positive score, give stronger weight
                score = Math.max(0, (cosine + 1) / 2) * 100;
            }
        }

        // When embeddings aren't used or didn't produce a score, fall back to token scoring
        if (!score) {
            for (const token of queryTokens) {
                if (!token) continue;
                if (blob.includes(token)) {
                    score += 2; // exact token present
                    continue;
                }
                // check token against individual words in blob
                const blobWords = blob.split(' ').filter(Boolean);
                let matched = false;
                for (const w of blobWords) {
                    if (tokenMatchesTerm(token, w)) {
                        score += 1;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    // small bonus if token is contained in document name specifically
                    if (name.includes(token)) score += 1;
                }
            }
        }

        if (score > 0) {
            results.push({ doc: { ...data, id: docSnap.id }, score });
        }
    }

    // Sort by score desc, then by name
    results.sort((a, b) => b.score - a.score || (a.doc.name || '').localeCompare(b.doc.name || ''));

    return results.map(r => r.doc);
}
// Delete a document and its storage (if any)
export async function deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    try {
        // Get the document reference
        const docRef = doc(db, `workspaces/${workspaceId}/documents`, documentId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("Document does not exist");
        }
        const docData = docSnap.data() as Document;
        // Delete file from storage if it exists
        if (docData.storagePath) {
            const fileRef = ref(storage, docData.storagePath);
            try {
                await deleteObject(fileRef);
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.error(`Failed to delete file from storage: ${docData.storagePath}`, error);
                }
            }
        }
        // Delete document from firestore
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
}


import { collection, getDocs, doc, getDoc, addDoc, query, where, Timestamp, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import type { Workspace, Folder, Document, User } from './types';
import { db, storage } from './firebase';
import { ref, deleteObject } from "firebase/storage";

async function fetchAndStructureData(workspaceId: string): Promise<{ folders: (Folder | Document)[], documents: Document[] }> {
    const foldersQuery = query(collection(db, `workspaces/${workspaceId}/folders`));
    const documentsQuery = query(collection(db, `workspaces/${workspaceId}/documents`));

    const [foldersSnap, documentsSnap] = await Promise.all([
        getDocs(foldersQuery),
        getDocs(documentsQuery)
    ]);
    
    const allDocuments: Record<string, Document> = {};
    documentsSnap.forEach(docSnap => {
        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : new Date().toISOString();
        allDocuments[docSnap.id] = { id: docSnap.id, ...data, createdAt } as Document;
    });

    const allFoldersMap: Record<string, Folder> = {};
    foldersSnap.forEach(docSnap => {
        const data = docSnap.data();
        allFoldersMap[docSnap.id] = {
            ...data,
            id: docSnap.id,
            name: data.name || "Untitled Folder",
            type: data.type || "folder",
            items: [],
            workspaceId: workspaceId
        } as Folder;
    });

    const rootFolders: Folder[] = [];
    Object.values(allFoldersMap).forEach(folder => {
        if (folder.parentId && allFoldersMap[folder.parentId]) {
            allFoldersMap[folder.parentId].items.push(folder);
        } else {
            rootFolders.push(folder);
        }
    });
    
    // Add documents to their respective folders
    Object.values(allDocuments).forEach(doc => {
        if (doc.folderId && allFoldersMap[doc.folderId]) {
            // Find the folder in the nested structure and add the document
            const addDocToFolder = (folders: (Folder|Document)[]) => {
                for (let i = 0; i < folders.length; i++) {
                    const item = folders[i];
                    if(item.type === 'folder') {
                        if (item.id === doc.folderId) {
                            item.items.push(doc);
                            return true;
                        }
                        if (addDocToFolder(item.items)) return true;
                    }
                }
                return false;
            }
            addDocToFolder(rootFolders);
        }
    });
    
    const rootDocuments = Object.values(allDocuments).filter(d => !d.folderId || d.folderId === 'root');

    return { folders: [...rootFolders, ...rootDocuments], documents: Object.values(allDocuments) };
}

// Ensure protected/immutable folders exist in Firestore for a workspace
export async function ensureProtectedFolders(workspaceId: string): Promise<void> {
    try {
        const protectedFolders: { id: string; name: string; parentId?: string | null }[] = [
            { id: 'audits', name: 'Audits', parentId: null },
            { id: 'audits-managers-monthly-audit', name: "Managers' Monthly Audit", parentId: 'audits' },
            { id: 'audits-audits', name: 'Audits', parentId: 'audits' },

            { id: 'complaints-and-compliments', name: 'Complaints and Compliments', parentId: null },
            { id: 'complaints', name: 'Complaints', parentId: 'complaints-and-compliments' },
            { id: 'compliments', name: 'Compliments', parentId: 'complaints-and-compliments' },

            { id: 'surveys', name: 'Surveys', parentId: null },
            { id: 'surveys-staff', name: 'Staff', parentId: 'surveys' },
            { id: 'surveys-residents', name: 'Residents', parentId: 'surveys' },
            { id: 'surveys-professional', name: 'Professional', parentId: 'surveys' },
            { id: 'surveys-relatives', name: 'Relatives', parentId: 'surveys' },

            { id: 'rd-compliance-report', name: 'Rd compliance report', parentId: null },

            { id: 'action-plans', name: 'Action plans', parentId: null },
            { id: 'action-plans-external', name: 'External', parentId: 'action-plans' },
            { id: 'action-plans-internal', name: 'Internal', parentId: 'action-plans' },

            { id: 'cqc-notifications', name: 'Cqc notifications', parentId: null },
            { id: 'safeguards', name: 'Safeguards', parentId: null },
            { id: 'riddor', name: 'RIDDOR', parentId: null },
            { id: 'hdp', name: 'HDP', parentId: null },
            { id: 'sip', name: 'SIP', parentId: null },
            { id: 'pr-submissions', name: 'PR submissions', parentId: null },
            { id: 'business-continuity-plan', name: 'Business continuity plan', parentId: null },
            { id: 'service-user-guide', name: 'Service user guide', parentId: null },
            { id: 'statement-of-purpose', name: 'Statement of purpose', parentId: null },
            { id: 'lessons-learnt', name: 'Lessons learnt', parentId: null },
            { id: 'rcas', name: 'RCAs', parentId: null },
        ];

        for (const f of protectedFolders) {
            const folderRef = doc(db, `workspaces/${workspaceId}/folders`, f.id);
            const folderSnap = await getDoc(folderRef);
                    if (!folderSnap.exists()) {
                        await setDoc(folderRef, {
                            name: f.name,
                            type: 'folder',
                            parentId: f.parentId ?? null,
                            createdAt: Timestamp.now(),
                            protected: true,
                        });
                        // Helpful log for debugging in browser console
                        // eslint-disable-next-line no-console
                        console.log(`Created protected folder ${f.id} in workspace ${workspaceId}`);
                    }
        }
    } catch (error) {
        console.error('Failed to ensure protected folders for workspace', workspaceId, error);
    }
}


export async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    try {
        const q = query(collection(db, "workspaces"), where("members", "array-contains", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return [];
        }

        const workspaces = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
            const workspaceData = docSnap.data() as Omit<Workspace, 'id' | 'folders'>;
            // Ensure protected folders exist for this workspace
            await ensureProtectedFolders(docSnap.id);
            const { folders } = await fetchAndStructureData(docSnap.id);
            return {
                id: docSnap.id,
                ...workspaceData,
                folders: folders,
            };
        }));
        
        return workspaces;

    } catch (error) {
        console.error("Error fetching workspaces for user:", error);
        return [];
    }
}

export async function getUserById(userId: string): Promise<User | null> {
    try {
        const userRef = doc(db, `users`, userId);
        const snap = await getDoc(userRef);
        if (!snap.exists()) return null;
    const data = snap.data() as User;
    // Avoid duplicate `id` field if present in the stored doc
    const { id: _maybeId, ...rest } = data as any;
    return { id: snap.id, ...rest } as User;
    } catch (error) {
        console.error('Error fetching user by id', userId, error);
        return null;
    }
}

/**
 * Admin helper: return all workspaces with their nested folder/document structure.
 * Note: potentially expensive if you have many workspaces. Consider pagination if needed.
 */
export async function getAllWorkspaces(): Promise<Workspace[]> {
    try {
        const qAll = query(collection(db, "workspaces"));
        const snaps = await getDocs(qAll);
        const workspaces = await Promise.all(snaps.docs.map(async (docSnap) => {
            const workspaceData = docSnap.data() as Omit<Workspace, 'id' | 'folders'>;
            const { folders } = await fetchAndStructureData(docSnap.id);
            return {
                id: docSnap.id,
                ...workspaceData,
                folders,
            } as Workspace;
        }));
        return workspaces;
    } catch (error) {
        console.error('Error fetching all workspaces', error);
        return [];
    }
}


export async function createWorkspace(workspace: Omit<Workspace, 'id' | 'folders'>): Promise<Workspace> {
    try {
        const docRef = await addDoc(collection(db, "workspaces"), workspace);
        // Ensure protected folders are created for the new workspace
        await ensureProtectedFolders(docRef.id);
        const { folders } = await fetchAndStructureData(docRef.id);
        return {
            ...workspace,
            id: docRef.id,
            folders,
        };
    } catch (error) {
        console.error("Error creating workspace:", error);
        throw error;
    }
}


export async function saveDocument(document: Omit<Document, 'id'>): Promise<string> {
    if (!document.workspaceId) {
        throw new Error("Workspace ID is required to save a document.");
    }
    try {
        const docWithTimestamp = {
            ...document,
            createdAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, `workspaces/${document.workspaceId}/documents`), docWithTimestamp);
        // Also create a workspace-level notification for consumers of the notifications feed
        try {
            const notifRef = await addDoc(collection(db, `workspaces/${document.workspaceId}/notifications`), {
                title: `New document: ${document.name}`,
                body: document.summary ?? '',
                type: 'document',
                createdAt: Timestamp.now(),
                read: false,
                meta: {
                    documentId: docRef.id,
                    folderId: document.folderId ?? null,
                },
            });
            // Helpful debug log for client/browser console
            // eslint-disable-next-line no-console
            console.log(`Created notification ${notifRef.id} for document ${docRef.id} in workspace ${document.workspaceId}`);
        } catch (notifErr) {
            // Non-critical: fail gracefully if notification couldn't be created
            console.error('Failed to create notification for new document', notifErr);
        }

        return docRef.id;
    } catch (error) {
        console.error("Error saving document:", error);
        throw error;
    }
}

export async function saveFolder(folder: Omit<Folder, 'id' | 'items'>): Promise<string> {
    if (!folder.workspaceId) {
        throw new Error("Workspace ID is required to save a folder.");
    }
    try {
        const folderWithTimestamp = {
            ...folder,
            createdAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, `workspaces/${folder.workspaceId}/folders`), folderWithTimestamp);
        return docRef.id;
    } catch (error) {
        console.error("Error saving folder:", error);
        throw error;
    }
}

async function deleteFolderRecursive(workspaceId: string, folderId: string) {
    const batch = writeBatch(db);

    // Get documents in the current folder
    const docsQuery = query(collection(db, `workspaces/${workspaceId}/documents`), where("folderId", "==", folderId));
    const docsSnap = await getDocs(docsQuery);
    
    for (const docSnap of docsSnap.docs) {
        const docData = docSnap.data() as Document;
        // Delete file from storage if it exists
        if (docData.storagePath) {
            const fileRef = ref(storage, docData.storagePath);
            try {
                await deleteObject(fileRef);
            } catch (error: any) {
                // It's okay if the file doesn't exist, log other errors.
                if (error.code !== 'storage/object-not-found') {
                    console.error(`Failed to delete file from storage: ${docData.storagePath}`, error);
                }
            }
        }
        // Delete document from firestore
        batch.delete(docSnap.ref);
    }

    // Get subfolders in the current folder
    const subfoldersQuery = query(collection(db, `workspaces/${workspaceId}/folders`), where("parentId", "==", folderId));
    const subfoldersSnap = await getDocs(subfoldersQuery);

    // Recursively delete subfolders
    for (const subfolderSnap of subfoldersSnap.docs) {
        await deleteFolderRecursive(workspaceId, subfolderSnap.id);
    }
    
    // After handling all children, delete the current folder document
    const folderRef = doc(db, `workspaces/${workspaceId}/folders`, folderId);
    batch.delete(folderRef);

    // Commit all deletions for the current folder level
    await batch.commit();
}


export async function deleteFolder(workspaceId: string, folderId: string): Promise<void> {
    try {
        await deleteFolderRecursive(workspaceId, folderId);
    } catch (error) {
        console.error("Error deleting folder and its contents:", error);
        throw error;
    }
}


export async function createUserInFirestore(user: User) {
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        await setDoc(userRef, user);
    }
}
