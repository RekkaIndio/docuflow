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


import { collection, getDocs, doc, getDoc, addDoc, query, where, Timestamp, setDoc, deleteDoc, writeBatch, updateDoc, orderBy, limit } from "firebase/firestore";
import type { Workspace, Folder, Document, User } from './types';
import { db, storage } from './firebase';
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";

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
        const document = { id: docSnap.id, ...data, createdAt } as Document;
        
        // Auto-fix audit document names that are still in filename format
        if (document.extractedJson?.isAuditSnapshot && document.name && 
            (document.name.includes('_audit_') || document.name.endsWith('.pdf'))) {
            const auditType = document.extractedJson.auditType;
            if (auditType) {
                const displayName = getAuditDisplayName(auditType);
                document.name = displayName;
                // Optionally update in Firestore (uncomment if you want to persist the fix)
                // updateDoc(doc(db, `workspaces/${document.workspaceId}/documents`, document.id), { name: displayName });
            }
        }
        
        allDocuments[docSnap.id] = document;
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
            // attempt to read occupancy settings document (optional)
            let totalBeds: number | undefined = undefined;
            let occupiedBeds: number | undefined = undefined;
            try {
                const occRef = doc(db, `workspaces/${docSnap.id}/settings`, 'occupancy');
                const occSnap = await getDoc(occRef);
                if (occSnap.exists()) {
                    const d = occSnap.data() as any;
                    if (typeof d.totalBeds === 'number') totalBeds = d.totalBeds;
                    if (typeof d.occupiedBeds === 'number') occupiedBeds = d.occupiedBeds;
                }
            } catch (e) {
                console.warn('Failed to read occupancy settings for workspace', docSnap.id, e);
            }

            // Fetch latest dependency snapshot for admin view
            let dependencySnapshot: any = null;
            try {
                // Prefer ownerId, fallback to first member
                const userId = (workspaceData.ownerId && typeof workspaceData.ownerId === 'string')
                  ? workspaceData.ownerId
                  : (Array.isArray(workspaceData.members) && workspaceData.members.length > 0 ? workspaceData.members[0] : null);
                if (userId) {
                    // Query all dependency_calculator_snapshots for this user
                    const snapshotsCol = collection(db, 'users', userId, 'dependency_calculator_snapshots');
                    const snapshotsSnap = await getDocs(snapshotsCol);
                    let latest: any = null;
                    snapshotsSnap.forEach(doc => {
                        const data = doc.data();
                        // Use savedAt or updatedAt for recency
                        const ts = (typeof data.savedAt === 'number') ? data.savedAt : (data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : 0);
                        if (!latest || ts > latest._ts) {
                            latest = { ...data, _ts: ts, _id: doc.id };
                        }
                    });
                    if (latest) {
                        dependencySnapshot = { ...latest };
                        delete dependencySnapshot._ts;
                        delete dependencySnapshot._id;
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch dependency snapshot for workspace', docSnap.id, e);
            }

            return {
                id: docSnap.id,
                ...workspaceData,
                folders,
                // attach bed counts if available for admin consumers
                totalBeds,
                occupiedBeds,
                // attach latest dependency snapshot for admin consumers
                dependencySnapshot,
            } as Workspace & { totalBeds?: number; occupiedBeds?: number; dependencySnapshot?: any };
        }));
        return workspaces;
    } catch (error) {
        console.error('Error fetching all workspaces', error);
        return [];
    }
}

// Save a daily check-in document under workspaces/{workspaceId}/daily-checkins
export async function saveDailyCheckin(workspaceId: string, data: any): Promise<string> {
    try {
        const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
        const docRef = await addDoc(colRef, { ...data, createdAt: Timestamp.now() });
        return docRef.id;
    } catch (e) {
        console.error('Failed to save daily checkin', e);
        throw e;
    }
}

// Save a generic audit record to a top-level `audits` collection
export async function saveAudit(data: any, workspaceId?: string): Promise<string> {
    try {
        if (workspaceId) {
            const colRef = collection(db, `workspaces/${workspaceId}/audits`);
            const docRef = await addDoc(colRef, { ...data, workspaceId, createdAt: Timestamp.now() });

            // If the audit contains a numeric scorePercent and an auditType, mirror it
            // to workspace settings for quick dashboard access.
            try {
                if (data && typeof data.scorePercent === 'number' && typeof data.auditType === 'string') {
                    const latestRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_latest_scores');
                    const updateData = {
                        [data.auditType]: {
                            scorePercent: data.scorePercent,
                            yesCount: data.yesCount ?? null,
                            totalCount: data.totalCount ?? null,
                            updatedAt: new Date().toISOString()
                        }
                    };
                    await setDoc(latestRef, updateData, { merge: true });
                    console.log('Mirrored audit score to dashboard:', data.auditType, data.scorePercent);
                }
            } catch (mirrorErr) {
                console.warn('Failed to mirror latest audit score to workspace settings', mirrorErr);
            }
            return docRef.id;
        }
        // Fallback: write to top-level audits collection so older code paths don't fail
        // Log a warning for debugging so we can surface missing workspace usage
        // eslint-disable-next-line no-console
        console.warn('saveAudit called without workspaceId — falling back to top-level `audits` collection.');
        const docRef = await addDoc(collection(db, 'audits'), { ...data, createdAt: Timestamp.now() });
        return docRef.id;
    } catch (e) {
        console.error('Failed to save audit', e);
        throw e;
    }
}

export async function updateAudit(auditId: string, data: any, workspaceId?: string): Promise<void> {
    try {
        if (workspaceId) {
            const docRef = doc(db, `workspaces/${workspaceId}/audits`, auditId);
            await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
            return;
        }
        // Fallback to top-level audits collection
        // eslint-disable-next-line no-console
        console.warn('updateAudit called without workspaceId — falling back to top-level `audits` collection.');
        const docRef = doc(db, 'audits', auditId);
        await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
    } catch (e) {
        console.error('Failed to update audit', e);
        throw e;
    }
}

// Update an existing daily checkin document
export async function updateDailyCheckin(workspaceId: string, checkinId: string, data: any): Promise<void> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/daily-checkins`, checkinId);
        await setDoc(docRef, { ...data, updatedAt: Timestamp.now() }, { merge: true });
    } catch (e) {
        console.error('Failed to update daily checkin', e);
        throw e;
    }
}

// -------------------- Audit schedule & status helpers --------------------
/**
 * Set the scheduled completion date for a named audit (e.g., 'accident-incident')
 * stored under workspaces/{workspaceId}/settings/audit_schedule
 */
export async function setAuditSchedule(workspaceId: string, auditKey: string, scheduledDateIso: string | null): Promise<void> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_schedule');
        // Merge update: store a map of auditKey -> ISO date (or null to clear)
        await setDoc(docRef, { [auditKey]: scheduledDateIso }, { merge: true });
    } catch (e) {
        console.error('Failed to set audit schedule', e);
        throw e;
    }
}

/**
 * Get the audit schedule map for a workspace. Returns an object mapping auditKey -> ISO date string | null
 */
export async function getAuditSchedule(workspaceId: string): Promise<Record<string, string | null>> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_schedule');
        const snap = await getDoc(docRef);
        if (!snap.exists()) return {};
        return snap.data() as Record<string, string | null>;
    } catch (e) {
        console.error('Failed to get audit schedule', e);
        return {};
    }
}

/**
 * Mark an audit as completed for a given auditKey. Stores lastCompletedAt under workspaces/{workspaceId}/settings/audit_status
 */
export async function markAuditCompleted(workspaceId: string, auditKey: string, completedAtIso?: string): Promise<void> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_status');
        const payload: any = {};
        payload[auditKey] = completedAtIso ?? new Date().toISOString();
        await setDoc(docRef, payload, { merge: true });
    } catch (e) {
        console.error('Failed to mark audit completed', e);
        throw e;
    }
}

/**
 * Get the audit status map for a workspace: auditKey -> ISO date string when last completed.
 */
export async function getAuditStatus(workspaceId: string): Promise<Record<string, string>> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_status');
        const snap = await getDoc(docRef);
        if (!snap.exists()) return {};
        return snap.data() as Record<string, string>;
    } catch (e) {
        console.error('Failed to get audit status', e);
        return {};
    }
}

/**
 * Save an audit snapshot for a specific month. Used to archive completed audits.
 */
export async function saveAuditSnapshot(workspaceId: string, auditType: string, auditData: any): Promise<string> {
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 01-12
        const monthKey = `${year}-${month}`;
        
        // Check for existing snapshot and delete it to avoid duplicates
        const snapshotCollectionRef = collection(db, `workspaces/${workspaceId}/audit-snapshots/${monthKey}/${auditType}`);
        try {
            const existingSnapshots = await getDocs(snapshotCollectionRef);
            // Delete all existing snapshots for this audit type in this month
            for (const existingDoc of existingSnapshots.docs) {
                await deleteDoc(existingDoc.ref);
            }
        } catch (deleteErr) {
            console.warn('Failed to delete existing snapshots:', deleteErr);
            // Continue with creation even if deletion fails
        }
        
        // Save new snapshot to monthly snapshot collection
        const docRef = await addDoc(snapshotCollectionRef, {
            ...auditData,
            snapshotCreatedAt: Timestamp.now(),
            monthKey,
            year,
            month,
        });
        
        return docRef.id;
    } catch (e) {
        console.error('Failed to save audit snapshot', e);
        throw e;
    }
}

/**
 * Check if an audit has been completed for the current month
 */
export async function isAuditCompletedThisMonth(workspaceId: string, auditType: string): Promise<boolean> {
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        
        // Check if there are any snapshots for this audit type in the current month
        const snapshotQuery = query(
            collection(db, `workspaces/${workspaceId}/audit-snapshots/${monthKey}/${auditType}`)
        );
        const snapshot = await getDocs(snapshotQuery);

        if (!snapshot.empty) return true;

        // Fallback: check the audit_status map for a last completed timestamp and ensure
        // that the timestamp falls within the current month. This handles cases where a
        // status timestamp might be set but no snapshot exists for the current month.
        try {
            const statusRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_status');
            const statusSnap = await getDoc(statusRef);
            if (!statusSnap.exists()) return false;
            const data = statusSnap.data() as Record<string, string>;
            const ts = data[auditType];
            if (!ts) return false;
            const completedDate = new Date(ts);
            const completedMonthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
            return completedMonthKey === monthKey;
        } catch (e) {
            // If the status read fails for any reason, default to snapshot check result (which is false here)
            console.warn('Failed to read audit_status while checking completion month', e);
            return false;
        }
    } catch (e) {
        console.error('Failed to check audit completion status', e);
        return false;
    }
}

/**
 * Mark an audit as completed for the current month and save a snapshot
 */
export async function markAuditCompletedWithSnapshot(workspaceId: string, auditType: string, auditData: any, completedAtIso?: string): Promise<{ snapshotId: string; pdfDocId?: string }> {
    try {
        // Save the snapshot first
        const snapshotId = await saveAuditSnapshot(workspaceId, auditType, auditData);

        // Generate and save PDF to Audits folder
        let pdfDocId: string | undefined = undefined;
        try {
            pdfDocId = await generateAndSaveAuditPDF(workspaceId, auditType, auditData, completedAtIso);
        } catch (pdfError) {
            console.error('[markAuditCompletedWithSnapshot] Failed to generate audit PDF, but audit snapshot was saved', pdfError);
        }

        // Generate action plan items from audit data
        try {
            const { generateActionPlanItemsFromAudit, saveActionPlanItems, getCurrentMonthKey } = await import('./action-plans');
            const actionItems = generateActionPlanItemsFromAudit(auditData, auditType, snapshotId);
            if (actionItems.length > 0) {
                const monthKey = getCurrentMonthKey();
                await saveActionPlanItems(workspaceId, monthKey, actionItems);
            }
        } catch (actionPlanError) {
            console.error('[markAuditCompletedWithSnapshot] Failed to generate action plan items:', actionPlanError);
        }

        // Mirror the audit score to workspace settings for dashboard display
        try {
            if (auditData && typeof auditData.scorePercent === 'number' && typeof auditType === 'string') {
                const latestRef = doc(db, `workspaces/${workspaceId}/settings`, 'audit_latest_scores');
                const updateData = {
                    [auditType]: {
                        scorePercent: auditData.scorePercent,
                        yesCount: auditData.yesCount ?? null,
                        totalCount: auditData.totalCount ?? null,
                        updatedAt: new Date().toISOString()
                    }
                };
                await setDoc(latestRef, updateData, { merge: true });
                console.log('Mirrored audit score to dashboard from completion:', auditType, auditData.scorePercent);
            }
        } catch (mirrorErr) {
            console.warn('Failed to mirror latest audit score to workspace settings', mirrorErr);
        }

        // Then mark as completed in the status map
        await markAuditCompleted(workspaceId, auditType, completedAtIso);

        return { snapshotId, pdfDocId };
    } catch (e) {
        console.error('Failed to mark audit completed with snapshot', e);
        throw e;
    }
}

/**
 * Generate PDF and save to Audits folder
 */
async function generateAndSaveAuditPDF(workspaceId: string, auditType: string, auditData: any, completedAtIso?: string): Promise<string | undefined> {
    try {
        // Import PDF generator (dynamic import to avoid SSR issues)
        const { generateAuditPDF, getAuditPDFFilename } = await import('./pdf-generator');
        
        // Get home name from audit data or use workspace ID as fallback
        const homeName = auditData.home || auditData.facility || `Workspace ${workspaceId}`;
        
        // Prepare PDF data
        const pdfData = {
            auditType,
            home: homeName,
            auditDate: completedAtIso || auditData.auditDate || new Date().toISOString(),
            completedBy: auditData.completedBy || 'Unknown',
            data: auditData,
            comments: auditData.comments || auditData.finalComments,
            scorePercent: auditData.scorePercent,
            yesCount: auditData.yesCount,
            totalCount: auditData.totalCount
        };
        
    // Generate PDF
    const pdfBuffer = generateAuditPDF(pdfData);
        
        // Generate filename
        const filename = getAuditPDFFilename(auditType, homeName, pdfData.auditDate);
        
        // Save to Audits folder
        const docId = await saveAuditPDFToFolder(workspaceId, auditType, pdfBuffer, filename, pdfData.auditDate);
        return docId;
    } catch (e) {
        console.error('Failed to generate and save audit PDF', e);
        throw e;
    }
}

/**
 * Get the audit completion status for all audit types in the current month
 */
export async function getMonthlyAuditCompletionStatus(workspaceId: string): Promise<Record<string, boolean>> {
    try {
        const auditTypes = [
            'accident-incident', 'call-bell-monitoring', 'care-plan', 'equipment',
            'fire-safety', 'hand-hygiene', 'health-safety', 'infection-control',
            'kitchen', 'maintenance', 'managers-weekly', 'mealtime', 'night-visit',
            'restrictive-practice', 'staff-file', 'weight-monitoring', 'wound-monitoring',
            'risk-register'
        ];

        const result: Record<string, boolean> = {};

        const date = new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Check for snapshots in the current month for each audit type
        await Promise.all(auditTypes.map(async (auditType) => {
            try {
                const snapshotQuery = query(
                    collection(db, `workspaces/${workspaceId}/audit-snapshots/${monthKey}/${auditType}`)
                );
                const snapshot = await getDocs(snapshotQuery);
                result[auditType] = !snapshot.empty;
            } catch (err) {
                // If snapshot check fails for a specific audit type, treat as not completed
                result[auditType] = false;
            }
        }));

        return result;
    } catch (e) {
        console.error('Failed to get monthly audit completion status', e);
        return {};
    }
}

/**
 * Get the current month key for organizing audit snapshots
 */
export function getCurrentMonthKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get audit snapshots for a specific month
 */
export async function getMonthlyAuditSnapshots(workspaceId: string, monthKey?: string): Promise<Record<string, any[]>> {
    try {
        const targetMonth = monthKey || getCurrentMonthKey();
        const result: Record<string, any[]> = {};
        
        const auditTypes = [
            'accident-incident', 'call-bell-monitoring', 'care-plan', 'equipment', 
            'fire-safety', 'hand-hygiene', 'health-safety', 'infection-control', 
            'kitchen', 'maintenance', 'managers-weekly', 'mealtime', 'night-visit', 
            'restrictive-practice', 'staff-file', 'weight-monitoring', 'wound-monitoring', 
            'risk-register'
        ];
        
        for (const auditType of auditTypes) {
            const snapshotQuery = query(
                collection(db, `workspaces/${workspaceId}/audit-snapshots/${targetMonth}/${auditType}`)
            );
            const snapshot = await getDocs(snapshotQuery);
            result[auditType] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        
        return result;
    } catch (e) {
        console.error('Failed to get monthly audit snapshots', e);
        return {};
    }
}

/**
 * Get the latest (most recent) audit data for a specific audit type in the current month
 */
export async function getLatestAuditData(workspaceId: string, auditType: string, monthKey?: string): Promise<any | null> {
    try {
        const targetMonth = monthKey || getCurrentMonthKey();
        const snapshotQuery = query(
            collection(db, `workspaces/${workspaceId}/audit-snapshots/${targetMonth}/${auditType}`),
            orderBy('snapshotCreatedAt', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(snapshotQuery);
        
        if (snapshot.empty) {
            return null;
        }
        
        const latestDoc = snapshot.docs[0];
        return {
            id: latestDoc.id,
            ...latestDoc.data()
        };
    } catch (e) {
        console.error('Failed to get latest audit data', e);
        return null;
    }
}

/**
 * Save an audit PDF to the Audits folder with month organization
 */
// Convert audit type slug to human-readable name
function getAuditDisplayName(auditType: string): string {
    const auditNames: Record<string, string> = {
        'accident-incident': 'Accident And Incident Audit',
        'infection-control': 'Infection Control Audit', 
        'fire-safety': 'Fire Safety Audit',
        'health-safety': 'Health And Safety Audit',
        'kitchen': 'Kitchen Audit',
        'maintenance': 'Maintenance Audit',
        'equipment': 'Equipment Audit',
        'hand-hygiene': 'Hand Hygiene Audit',
        'care-plan': 'Care Plan Audit',
        'call-bell-monitoring': 'Call Bell Monitoring Audit',
        'mealtime': 'Mealtime Audit',
        'managers-weekly': 'Managers Weekly Audit',
        'managers-monthly': 'Managers Monthly Audit'
    };
    
    return auditNames[auditType] || auditType.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Audit';
}

export async function saveAuditPDFToFolder(
    workspaceId: string,
    auditType: string,
    pdfData: Uint8Array,
    filename: string,
    auditDate: string
): Promise<string> {
    try {
        // Get the month key from audit date
        const date = new Date(auditDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Create month folder if it doesn't exist
        const monthFolderId = await createMonthlyAuditFolder(workspaceId, monthKey, monthName);

        // Check for existing audit document of the same type in this month and delete it
        try {
            const existingDocsQuery = query(
                collection(db, `workspaces/${workspaceId}/documents`),
                where('folderId', '==', monthFolderId),
                where('extractedJson.auditType', '==', auditType),
                where('extractedJson.isAuditSnapshot', '==', true)
            );
            const existingDocs = await getDocs(existingDocsQuery);
            
            // Delete existing audit documents and their storage files
            for (const docSnap of existingDocs.docs) {
                const docData = docSnap.data();
                try {
                    // Delete from storage if storagePath exists
                    if (docData.storagePath) {
                        const oldFileRef = ref(storage, docData.storagePath);
                        await deleteObject(oldFileRef);
                    }
                    // Delete document from Firestore
                    await deleteDoc(doc(db, `workspaces/${workspaceId}/documents`, docSnap.id));
                } catch (deleteErr) {
                    console.warn('Failed to delete old audit file/document:', deleteErr);
                    // Continue with creation even if deletion fails
                }
            }
        } catch (queryErr) {
            console.warn('Failed to query for existing audit documents:', queryErr);
            // Continue with creation even if query fails
        }

        // Upload PDF binary to Firebase Storage
        try {
            const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storagePath = `workspaces/${workspaceId}/audits/${monthKey}/${auditType}/${safeFilename}`;
            const fileRef = ref(storage, storagePath);

            // uploadBytes accepts ArrayBuffer | Uint8Array
            await uploadBytes(fileRef, pdfData);
            const downloadUrl = await getDownloadURL(fileRef);

            // Save the PDF as a document with storage metadata
            const displayName = getAuditDisplayName(auditType);
            const document = {
                name: displayName,
                type: 'document' as const,
                fileType: 'pdf' as const,
                createdAt: new Date().toISOString(),
                owner: { id: 'system', name: 'Audit System', email: null, avatarUrl: null },
                folderId: monthFolderId,
                workspaceId: workspaceId,
                storagePath,
                downloadUrl,
                extractedJson: {
                    auditType,
                    auditDate,
                    monthKey,
                    generatedAt: new Date().toISOString(),
                    isAuditSnapshot: true,
                    originalFilename: filename // Keep the original filename for reference
                }
            };

            const docId = await saveDocument(document as any);
            return docId;
        } catch (uploadErr) {
            console.error('Failed to upload PDF to storage or save document metadata', uploadErr);
            throw uploadErr;
        }
    } catch (e) {
        console.error('Failed to save audit PDF to folder', e);
        throw e;
    }
}

/**
 * Create or get monthly audit folder
 */
async function createMonthlyAuditFolder(workspaceId: string, monthKey: string, monthName: string): Promise<string> {
    try {
        // Check if Audits folder exists
        const auditsFolder = await getOrCreateAuditsFolder(workspaceId);
        
        // Check if month folder exists
        const monthFolderQuery = query(
            collection(db, `workspaces/${workspaceId}/folders`),
            where('name', '==', monthName),
            where('parentId', '==', auditsFolder.id)
        );
        
        const monthFolderSnapshot = await getDocs(monthFolderQuery);
        
        if (!monthFolderSnapshot.empty) {
            return monthFolderSnapshot.docs[0].id;
        }
        
        // Create month folder
        const monthFolder = {
            name: monthName,
            parentId: auditsFolder.id,
            workspaceId: workspaceId,
            createdAt: Timestamp.now(),
            type: 'folder',
            metadata: {
                monthKey,
                auditFolder: true
            }
        };
        
        const docRef = await addDoc(collection(db, `workspaces/${workspaceId}/folders`), monthFolder);
        return docRef.id;
        
    } catch (e) {
        console.error('Failed to create monthly audit folder', e);
        throw e;
    }
}

/**
 * Get or create the main Audits folder
 */
async function getOrCreateAuditsFolder(workspaceId: string): Promise<{ id: string; name: string }> {
    try {
        // Check if Audits folder exists
        const auditsFolderQuery = query(
            collection(db, `workspaces/${workspaceId}/folders`),
            where('name', '==', 'Audits'),
            where('parentId', '==', null)
        );
        
        const auditsFolderSnapshot = await getDocs(auditsFolderQuery);
        
        if (!auditsFolderSnapshot.empty) {
            const folder = auditsFolderSnapshot.docs[0];
            return { id: folder.id, name: folder.data().name };
        }
        
        // Create Audits folder
        const auditsFolder = {
            name: 'Audits',
            parentId: null,
            workspaceId: workspaceId,
            createdAt: Timestamp.now(),
            type: 'folder',
            metadata: {
                systemFolder: true,
                description: 'Monthly audit reports and snapshots'
            }
        };
        
        const docRef = await addDoc(collection(db, `workspaces/${workspaceId}/folders`), auditsFolder);
        return { id: docRef.id, name: auditsFolder.name };
        
    } catch (e) {
        console.error('Failed to get or create Audits folder', e);
        throw e;
    }
}

// Delete a daily checkin document
export async function deleteDailyCheckin(workspaceId: string, checkinId: string): Promise<void> {
    try {
        const docRef = doc(db, `workspaces/${workspaceId}/daily-checkins`, checkinId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error('Failed to delete daily checkin', e);
        throw e;
    }
}

// Fetch daily checkins in a given time range (inclusive)
export async function getDailyCheckinsInRange(workspaceId: string, fromTs: any, toTs: any): Promise<any[]> {
    try {
        const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
        const q = query(colRef, where('createdAt', '>=', fromTs), where('createdAt', '<=', toTs));
        const snaps = await getDocs(q);
        const items: any[] = [];
        snaps.forEach(s => items.push({ id: s.id, ...s.data() }));
        // sort ascending by createdAt
        items.sort((a, b) => {
            const aTs = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt && typeof a.createdAt === 'number' ? a.createdAt : 0);
            const bTs = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt && typeof b.createdAt === 'number' ? b.createdAt : 0);
            return aTs - bTs;
        });
        return items;
    } catch (e) {
        console.error('Failed to fetch daily checkins', e);
        throw e;
    }
}

// Get the latest daily check-in for a workspace
export async function getLatestDailyCheckin(workspaceId: string): Promise<any | null> {
    try {
        const colRef = collection(db, `workspaces/${workspaceId}/daily-checkins`);
        const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));
        const snaps = await getDocs(q);
        
        if (snaps.empty) {
            return null;
        }
        
        const latestDoc = snaps.docs[0];
        return { id: latestDoc.id, ...latestDoc.data() };
    } catch (e) {
        console.error('Failed to fetch latest daily checkin', e);
        throw e;
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

/**
 * Admin helper: return all care homes. This reads a top-level `care-homes` collection
 * when present (used in dev mode API) or falls back to deriving care-home like data
 * from the `workspaces` collection when a dedicated collection isn't available.
 */
export async function getAllCareHomes(): Promise<any[]> {
    try {
        // Try reading a dedicated collection first
        const q = query(collection(db, 'care-homes'));
        const snaps = await getDocs(q);
        if (!snaps.empty) {
            return snaps.docs.map(docSnap => {
                const data = docSnap.data() as any;
                return {
                    id: docSnap.id,
                    name: data.name || data.title || docSnap.id,
                    occupancy: typeof data.occupancy === 'number' ? data.occupancy : (typeof data.occupiedBeds === 'number' && typeof data.totalBeds === 'number' && data.totalBeds > 0 ? (data.occupiedBeds / data.totalBeds) : undefined),
                    totalBeds: typeof data.totalBeds === 'number' ? data.totalBeds : undefined,
                    occupiedBeds: typeof data.occupiedBeds === 'number' ? data.occupiedBeds : undefined,
                    complianceScore: typeof data.complianceScore === 'number' ? data.complianceScore : undefined,
                    renewalBacklog: typeof data.renewalBacklog === 'number' ? data.renewalBacklog : 0,
                };
            });
        }

        // Fallback: derive from workspaces collection (works for cases where care homes are represented as workspaces)
        const allWorkspaces = await getAllWorkspaces();
        return allWorkspaces.map(ws => ({
            id: ws.id,
            name: ws.name || ws.id,
            occupancy: typeof (ws as any).occupancy === 'number' ? (ws as any).occupancy : (typeof (ws as any).totalBeds === 'number' && typeof (ws as any).occupiedBeds === 'number' && (ws as any).totalBeds > 0 ? ((ws as any).occupiedBeds / (ws as any).totalBeds) : undefined),
            totalBeds: (ws as any).totalBeds,
            occupiedBeds: (ws as any).occupiedBeds,
            complianceScore: (ws as any).complianceScore,
            renewalBacklog: (ws as any).renewalBacklog || 0,
        }));
    } catch (error) {
        console.error('Error fetching care homes', error);
        return [];
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
