// Search documents in a workspace by name, tags, or summary (case-insensitive substring match)
import { workspaceDocPath, workspaceCollectionPath } from './paths';
import { AUDIT_TYPES } from './audit-types';

export async function searchDocumentsInWorkspace(workspaceId: string, queryStr: string, orgId?: string | null): Promise<Document[]> {
    // Load all documents in workspace (org-aware)
    const basePath = orgId ? `organisations/${orgId}/workspaces/${workspaceId}` : `workspaces/${workspaceId}`;
    const documentsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null)));
    const documentsSnap = await getDocs(documentsQuery);

    // Normalize and tokenize the query into words
    const normalize = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const queryTokens = normalize(queryStr).split(' ').filter(Boolean);

    // If no query provided, return all documents
    if (queryTokens.length === 0) {
        return documentsSnap.docs.map(docSnap => {
            const data = docSnap.data() as Document;
            return { ...data, id: docSnap.id } as Document;
        });
    }

    const tokenMatchesTerm = (token: string, term: string) => {
        if (!token || !term) return false;
        if (term.includes(token)) return true; // substring
        if (term.startsWith(token) || token.startsWith(term)) return true; // prefix
        return false;
    };

    const results: { doc: Document; score: number }[] = [];

    documentsSnap.forEach(docSnap => {
        const data = docSnap.data() as Document;
        const name = normalize(data.name || '');
        const summary = normalize(data.summary || '');
        const tags = Array.isArray((data as any).tags) ? (data as any).tags.map((t: any) => String(t)).join(' ') : '';
        const blob = [name, summary, tags].filter(Boolean).join(' ');

        let score = 0;
        for (const token of queryTokens) {
            if (!token) continue;
            if (blob.includes(token)) {
                score += 2;
                continue;
            }
            const blobWords = blob.split(' ').filter(Boolean);
            let matched = false;
            for (const w of blobWords) {
                if (tokenMatchesTerm(token, w)) {
                    score += 1;
                    matched = true;
                    break;
                }
            }
            if (!matched && name.includes(token)) score += 1;
        }

        if (score > 0) {
            results.push({ doc: { ...data, id: docSnap.id } as Document, score });
        }
    });

    // Sort by score desc, then by name
    results.sort((a, b) => b.score - a.score || (a.doc.name || '').localeCompare(b.doc.name || ''));

    return results.map(r => r.doc);
}
// Delete a document and its storage (if any)
export async function deleteDocument(workspaceId: string, documentId: string, orgId?: string | null): Promise<void> {
    try {
        // Get the document reference (org-aware)
        const docRef = doc(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null), documentId);
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


import { collection, getDocs, doc, getDoc, addDoc, query, where, Timestamp, setDoc, deleteDoc, writeBatch, updateDoc, orderBy, limit, serverTimestamp } from "firebase/firestore";
import type { Workspace, Folder, Document, User } from './types';
import { db, storage } from './firebase';
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";

async function fetchAndStructureData(workspaceId: string, orgId?: string | null): Promise<{ folders: (Folder | Document)[], documents: Document[] }> {
    const basePath = orgId ? `organisations/${orgId}/workspaces/${workspaceId}` : `workspaces/${workspaceId}`;
    try { console.debug('[fetchAndStructureData] workspaceId=', workspaceId, 'orgId=', orgId, 'basePath=', basePath); } catch (e) {}
    const foldersQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)));
    const documentsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null)));

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
                // updateDoc(doc(db, workspaceCollectionPath(document.workspaceId, 'documents', orgId), document.id), { name: displayName });
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
export async function ensureProtectedFolders(workspaceId: string, orgId?: string | null): Promise<void> {
    try {
        const basePath = orgId ? `organisations/${orgId}/workspaces/${workspaceId}` : `workspaces/${workspaceId}`;
        // debug context
        try { console.debug('[ensureProtectedFolders] workspaceId=', workspaceId, 'orgId=', orgId, 'basePath=', basePath); } catch (e) {}

        // If this workspace is org-scoped, ask the server to create protected folders
        if (orgId) {
            const url = `/api/admin/workspaces/create-protected-folders`;
            const payload = { orgId, workspaceId };
            // Try a couple of times with backoff in case of transient network issues
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                try {
                    const resp = await fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
                    if (resp.ok) {
                        try { console.debug('[ensureProtectedFolders] server-created protected folders for', workspaceId, 'orgId=', orgId); } catch (e) {}
                        return;
                    } else {
                        // If server returns 4xx, don't retry
                        if (resp.status >= 400 && resp.status < 500) break;
                    }
                } catch (e) {
                    // network error - retry
                }
                attempts++;
                await new Promise(r => setTimeout(r, 200 * attempts));
            }
            console.warn('[ensureProtectedFolders] server-side creation failed or unreachable, falling back to client-side for', workspaceId);
            // Continue to client-side creation as a last resort (best-effort)
        }

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
            const folderCol = collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null));
            const folderRef = doc(folderCol, f.id);
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


export async function getWorkspacesForUser(userId: string, orgIdOverride?: string): Promise<Workspace[]> {
    try {
        // Prefer an explicit orgId override (passed from hydrated server-side user). If not
        // provided, attempt a best-effort client read for the user's orgId but do not
        // fail if that read is denied by security rules.
        let orgId: string | null = orgIdOverride || null;
        if (!orgId) {
            try {
                const userRef = doc(db, `users`, userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const d: any = userSnap.data();
                    orgId = d.organisationId || null;
                }
            } catch (e) {
                // Likely permission denied by strict rules; continue without orgId
                console.debug('getWorkspacesForUser: could not read users/{id} for orgId (permission?), continuing without orgId', e);
                orgId = null;
            }
            // If we couldn't read the top-level user doc (or it doesn't exist), try server-side fallback for organisationId
            if (!orgId) {
                try {
                    const resp = await fetch(`/api/users/${encodeURIComponent(userId)}`);
                    if (resp.ok) {
                        const data = await resp.json();
                        if (data && data.organisationId) {
                            orgId = data.organisationId;
                            console.debug('getWorkspacesForUser: obtained orgId from server API', orgId);
                        }
                    } else {
                        console.debug('getWorkspacesForUser: server fallback /api/users returned', resp.status);
                    }
                } catch (serverErr) {
                    console.debug('getWorkspacesForUser: server fallback failed', serverErr);
                }
            }
        }

        // Prefer server-admin fetch which returns workspaces (with folders) using admin privileges.
        // This avoids client-side permission errors when rules forbid direct reads of org-scoped data.
        try {
            const resp = await fetch(`/api/users/${encodeURIComponent(userId)}/workspaces${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && Array.isArray(data.workspaces)) {
                    return data.workspaces.map((w: any) => ({ id: w.id, name: w.name, ownerId: w.ownerId, members: w.members || [], organisationId: w.organisationId || null, folders: w.folders || [] }));
                }
            } else {
                console.debug('getWorkspacesForUser: admin fetch returned', resp.status);
            }
        } catch (adminErr) {
            console.debug('getWorkspacesForUser: admin fetch failed', adminErr);
        }

        // If the user-specific endpoint returned no workspaces, attempt a conservative
        // org-scoped admin listing as a fallback. This helps in dev environments where
        // the user-workspaces route might not include expected entries due to timing
        // or differences in membership records. We filter results to only include
        // workspaces where the user is a member or owner before returning.
        if (orgId) {
            try {
                const resp2 = await fetch(`/api/admin/workspaces?orgId=${encodeURIComponent(orgId)}`);
                if (resp2.ok) {
                    const data2 = await resp2.json();
                    if (data2 && Array.isArray(data2.workspaces)) {
                        console.debug('getWorkspacesForUser: admin org listing returned', data2.workspaces.length, 'workspaces');
                        const filtered = data2.workspaces.filter((w: any) => {
                            const members = Array.isArray(w.members) ? w.members : [];
                            return members.includes(userId) || w.ownerId === userId;
                        }).map((w: any) => ({ id: w.id, name: w.name, ownerId: w.ownerId, members: w.members || [], organisationId: w.organisationId || null, folders: w.folders || [] }));
                        if (filtered.length > 0) return filtered;
                    }
                } else {
                    console.debug('getWorkspacesForUser: admin org listing returned', resp2.status);
                }
            } catch (e) {
                console.debug('getWorkspacesForUser: admin org listing failed', e);
            }
        }

        // If server fetch fails, return empty list; client-side direct queries were removed to avoid
        // leaking privileged access or relying on top-level legacy collections.
        return [];

    } catch (error) {
        // Log and return empty; dashboard should handle empty lists gracefully instead
        // of bubbling permission errors to the top-level UI.
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
export async function getAllWorkspaces(orgId?: string): Promise<Workspace[]> {
    try {
        // Use server-admin API to fetch workspaces to avoid client-side permission issues.
        try {
            const resp = await fetch(`/api/admin/workspaces${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && Array.isArray(data.workspaces)) {
                    return data.workspaces as Workspace[];
                }
            } else {
                console.debug('getAllWorkspaces: admin API returned', resp.status);
            }
        } catch (e) {
            console.error('Error fetching all workspaces from admin API', e);
        }

        return [];
    } catch (error) {
        console.error('Error fetching all workspaces', error);
        return [];
    }
}

// Save a daily check-in document under workspaces/{workspaceId}/daily-checkins
export async function saveDailyCheckin(workspaceId: string, data: any, orgId?: string | null): Promise<string> {
    try {
    // If caller provided orgId, prefer it. Otherwise attempt to derive it via admin API (safer than client-side reads)
    let resolvedOrgId: string | null = orgId ?? null;
    if (!resolvedOrgId) {
      try {
        resolvedOrgId = await resolveWorkspaceOrgId(workspaceId);
      } catch (e) {
        console.warn('Failed to resolve organisationId for workspace when saving daily checkin', e);
      }
    }

    const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', resolvedOrgId || null));
        const docRef = await addDoc(colRef, { ...data, createdAt: Timestamp.now() });
        return docRef.id;
    } catch (e) {
        console.error('Failed to save daily checkin', e);
        throw e;
    }
}

// Save a generic audit record to a top-level `audits` collection
export async function saveAudit(data: any, workspaceId?: string, orgId?: string | null): Promise<string> {
    try {
        if (workspaceId) {
            const colRef = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));
            const docRef = await addDoc(colRef, { ...data, workspaceId, createdAt: Timestamp.now() });

            // If the audit contains a numeric scorePercent and an auditType, mirror it
            // to workspace settings for quick dashboard access.
            try {
                if (data && typeof data.scorePercent === 'number' && typeof data.auditType === 'string') {
                    const latestRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_latest_scores');
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

export async function updateAudit(auditId: string, data: any, workspaceId?: string, orgId?: string | null): Promise<void> {
    try {
        if (workspaceId) {
            const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null)), auditId);
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
export async function updateDailyCheckin(workspaceId: string, checkinId: string, data: any, orgId?: string | null): Promise<void> {
    try {
        let resolvedOrgId: string | null = orgId ?? null;
        if (!resolvedOrgId) {
            try {
                resolvedOrgId = await resolveWorkspaceOrgId(workspaceId);
            } catch (e) {
                console.warn('Failed to resolve organisationId for workspace when updating daily checkin', e);
            }
        }
        const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', resolvedOrgId || null)), checkinId);
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
export async function setAuditSchedule(workspaceId: string, auditKey: string, scheduledDateIso: string | null, orgId?: string | null): Promise<void> {
    try {
    const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_schedule');
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
export async function getAuditSchedule(workspaceId: string, orgId?: string | null): Promise<Record<string, string | null>> {
    try {
    const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_schedule');
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
export async function markAuditCompleted(workspaceId: string, auditKey: string, completedAtIso?: string, orgId?: string | null): Promise<void> {
    try {
    const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_status');
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
export async function getAuditStatus(workspaceId: string, orgId?: string | null): Promise<Record<string, string>> {
    try {
    const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_status');
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
    const orgId = auditData?.organisationId || auditData?.orgId || null;
    const snapshotCollectionRef = collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${monthKey}/${auditType}`, orgId));
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
export async function isAuditCompletedThisMonth(workspaceId: string, auditType: string, orgId?: string | null): Promise<boolean> {
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        
        // Check if there are any snapshots for this audit type in the current month
        const snapshotQuery = query(
            collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${monthKey}/${auditType}`, orgId || null))
        );
        const snapshot = await getDocs(snapshotQuery);

        if (!snapshot.empty) return true;

        // Fallback: check the audit_status map for a last completed timestamp and ensure
        // that the timestamp falls within the current month. This handles cases where a
        // status timestamp might be set but no snapshot exists for the current month.
        try {
            const statusRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId || null)), 'audit_status');
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
                const latestRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings')), 'audit_latest_scores');
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
        await markAuditCompleted(workspaceId, auditType, completedAtIso, auditData?.organisationId || auditData?.orgId || null);

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
        
        // If attachments exist on the audit data, try to inline them as base64 data URLs so the PDF generator can embed them.
        try {
            if (pdfData.data && pdfData.data.attachments && typeof pdfData.data.attachments === 'object') {
                // Lazy-import helper that can fetch storage bytes as base64
                const { getDocumentAsBase64 } = await import('@/actions/documents');
                const embedded: Record<string, { dataUrl: string; name?: string }[]> = {};

                for (const fieldName of Object.keys(pdfData.data.attachments)) {
                    const list = pdfData.data.attachments[fieldName];
                    if (!Array.isArray(list)) continue;
                    embedded[fieldName] = [];
                    for (const item of list) {
                        try {
                            // Prefer storagePath (server-friendly). If downloadUrl present, skip here.
                            if (item.storagePath) {
                                const base64 = await getDocumentAsBase64(item.storagePath);
                                if (base64) {
                                    // Try to infer mime type from filename
                                    const extMatch = (item.name || item.storagePath).match(/\.([a-zA-Z0-9]+)$/);
                                    const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
                                    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';
                                    const dataUrl = `data:${mime};base64,${base64}`;
                                    embedded[fieldName].push({ dataUrl, name: item.name });
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to inline attachment for PDF', item, e);
                            continue;
                        }
                    }
                    if (embedded[fieldName].length === 0) delete embedded[fieldName];
                }

                if (Object.keys(embedded).length > 0) {
                    // Place embedded images under a reserved key for the PDF generator
                    pdfData.data._embeddedImages = embedded;
                }
            }
        } catch (e) {
            console.warn('Failed to inline attachments for PDF generation', e);
        }

    // Generate PDF
    /*...*/
        
    // Generate PDF
    const pdfBuffer = generateAuditPDF(pdfData);
        
        // Generate filename
        const filename = getAuditPDFFilename(auditType, homeName, pdfData.auditDate);
        
        // Save to Audits folder (pass organisationId if present so storage and firestore use org-scoped paths)
        const orgId = auditData?.organisationId || auditData?.orgId || null;
        const docId = await saveAuditPDFToFolder(workspaceId, auditType, pdfBuffer, filename, pdfData.auditDate, orgId);
        return docId;
    } catch (e) {
        console.error('Failed to generate and save audit PDF', e);
        throw e;
    }
}

/**
 * Get the audit completion status for all audit types in the current month
 */
export async function getMonthlyAuditCompletionStatus(workspaceId: string, orgId?: string | null): Promise<Record<string, boolean>> {
    try {
        const auditTypes = AUDIT_TYPES;

        const result: Record<string, boolean> = Object.fromEntries(
            auditTypes.map((type) => [type, false])
        );

        const date = new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Check for snapshots in the current month for each audit type
        await Promise.all(auditTypes.map(async (auditType) => {
            try {
                const snapshotQuery = query(
                    collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${monthKey}/${auditType}`, orgId || null))
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
export async function getMonthlyAuditSnapshots(workspaceId: string, monthKey?: string, orgId?: string | null): Promise<Record<string, any[]>> {
    try {
        const targetMonth = monthKey || getCurrentMonthKey();
        const result: Record<string, any[]> = Object.fromEntries(
            AUDIT_TYPES.map((type) => [type, [] as any[]])
        );
        
        for (const auditType of AUDIT_TYPES) {
            const snapshotQuery = query(
                collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${targetMonth}/${auditType}`, orgId || null))
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
export async function getLatestAuditData(workspaceId: string, auditType: string, monthKey?: string, orgId?: string | null): Promise<any | null> {
    try {
        const targetMonth = monthKey || getCurrentMonthKey();
        const snapshotQuery = query(
            collection(db, workspaceCollectionPath(workspaceId, `audit-snapshots/${targetMonth}/${auditType}`, orgId || null)),
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
    , orgId?: string | null
): Promise<string> {
    try {
        // Get the month key from audit date
        const date = new Date(auditDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthKey = `${year}-${month}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Create month folder if it doesn't exist
    const monthFolderId = await createMonthlyAuditFolder(workspaceId, monthKey, monthName, orgId);

        // Check for existing audit document of the same type in this month and delete it
        try {
            const existingDocsQuery = query(
                collection(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null)),
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
                    await deleteDoc(doc(collection(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null)), docSnap.id));
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
            // Build storage path: prefer organisation-scoped path when orgId is provided
            const storagePath = orgId
                ? `organisations/${orgId}/workspaces/${workspaceId}/audits/${monthKey}/${auditType}/${safeFilename}`
                : `workspaces/${workspaceId}/audits/${monthKey}/${auditType}/${safeFilename}`;
            const fileRef = ref(storage, storagePath);

            // uploadBytes accepts ArrayBuffer | Uint8Array
            await uploadBytes(fileRef, pdfData);
            const downloadUrl = await getDownloadURL(fileRef);

            // Save the PDF as a document with storage metadata
            const displayName = getAuditDisplayName(auditType);
            const document: any = {
                name: displayName,
                type: 'document' as const,
                fileType: 'pdf' as const,
                createdAt: new Date().toISOString(),
                owner: { id: 'system', name: 'Audit System', email: null, avatarUrl: null },
                folderId: monthFolderId,
                workspaceId: workspaceId,
                organisationId: orgId ?? undefined,
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
async function createMonthlyAuditFolder(workspaceId: string, monthKey: string, monthName: string, orgId?: string | null): Promise<string> {
    try {
        // Check if Audits folder exists
        const auditsFolder = await getOrCreateAuditsFolder(workspaceId, orgId);
        
        // Check if month folder exists
        const monthFolderQuery = query(
            collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)),
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
        
    const docRef = await addDoc(collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)), monthFolder);
        return docRef.id;
        
    } catch (e) {
        console.error('Failed to create monthly audit folder', e);
        throw e;
    }
}

/**
 * Get or create the main Audits folder
 */
async function getOrCreateAuditsFolder(workspaceId: string, orgId?: string | null): Promise<{ id: string; name: string }> {
    try {
        // Check if Audits folder exists
        const auditsFolderQuery = query(
            collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)),
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
        
    const docRef = await addDoc(collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)), auditsFolder);
        return { id: docRef.id, name: auditsFolder.name };
        
    } catch (e) {
        console.error('Failed to get or create Audits folder', e);
        throw e;
    }
}

// Delete a daily checkin document
export async function deleteDailyCheckin(workspaceId: string, checkinId: string, orgId?: string | null): Promise<void> {
    try {
        let resolvedOrgId: string | null = orgId ?? null;
        if (!resolvedOrgId) {
            try {
                resolvedOrgId = await resolveWorkspaceOrgId(workspaceId);
            } catch (e) {
                console.warn('Failed to resolve organisationId for workspace when deleting daily checkin', e);
            }
        }
         const docRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', resolvedOrgId || null)), checkinId);
                await deleteDoc(docRef);
    } catch (e) {
        console.error('Failed to delete daily checkin', e);
        throw e;
    }
}

// Fetch daily checkins in a given time range (inclusive)
export async function getDailyCheckinsInRange(workspaceId: string, fromTs: any, toTs: any, orgId?: string | null): Promise<any[]> {
    try {
        let resolvedOrgId: string | null = orgId ?? null;
        if (!resolvedOrgId) {
            try {
                resolvedOrgId = await resolveWorkspaceOrgId(workspaceId);
            } catch (e) {
                console.warn('Failed to resolve organisationId for workspace when querying daily checkins', e);
            }
        }
        const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', resolvedOrgId || null));
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
export async function getLatestDailyCheckin(workspaceId: string, orgId?: string | null): Promise<any | null> {
        try {
        let resolvedOrgId: string | null = orgId ?? null;
        if (!resolvedOrgId) {
            try {
                resolvedOrgId = await resolveWorkspaceOrgId(workspaceId);
            } catch (e) {
                console.warn('Failed to resolve organisationId for workspace when fetching latest daily checkin', e);
            }
        }
        const colRef = collection(db, workspaceCollectionPath(workspaceId, 'daily-checkins', resolvedOrgId || null));
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


export async function createWorkspace(workspace: Omit<Workspace, 'id' | 'folders'>, orgId?: string): Promise<Workspace> {
    try {
        const payload: any = {
            ...workspace,
            createdAt: Timestamp.now(),
        };
        // Workspace creation must be performed server-side via the admin API.
        // Require orgId to create org-scoped workspaces.
        if (!orgId) {
            throw new Error('Organisation ID is required to create a workspace');
        }

        // Call admin API to create workspace and provision protected folders
        try {
            const resp = await fetch(`/api/admin/workspaces?orgId=${encodeURIComponent(orgId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...workspace, ownerId: workspace.ownerId, members: workspace.members }),
            });
            if (!resp.ok) {
                const body = await resp.text().catch(() => null);
                throw new Error(`Admin API workspace creation failed: ${resp.status} ${String(body)}`);
            }
            const json = await resp.json();
            if (!json || !json.workspace) throw new Error('Admin API returned invalid workspace');
            return json.workspace as Workspace;
        } catch (apiErr) {
            console.error('Failed to create workspace via admin API', apiErr);
            throw apiErr;
        }
    } catch (error) {
        console.error('Error creating workspace:', error);
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
        const orgId = (document as any).organisationId || (document as any).orgId || null;
        const docsCol = collection(db, workspaceCollectionPath(document.workspaceId, 'documents', orgId || null));
        const docRef = await addDoc(docsCol, docWithTimestamp);
        // Also create a workspace-level notification for consumers of the notifications feed
        try {
            const notifsCol = collection(db, workspaceCollectionPath(document.workspaceId, 'notifications', orgId || null));
            const notifRef = await addDoc(notifsCol, {
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
    const orgId = (folder as any).organisationId || (folder as any).orgId || null;
    const foldersCol = collection(db, workspaceCollectionPath(folder.workspaceId, 'folders', orgId || null));
    const docRef = await addDoc(foldersCol, folderWithTimestamp);
        return docRef.id;
    } catch (error) {
        console.error("Error saving folder:", error);
        throw error;
    }
}

async function deleteFolderRecursive(workspaceId: string, folderId: string) {
    // First, recursively delete all subfolders
    const subfoldersQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'folders')), where("parentId", "==", folderId));
    const subfoldersSnap = await getDocs(subfoldersQuery);

    // Recursively delete subfolders first (depth-first)
    for (const subfolderSnap of subfoldersSnap.docs) {
        await deleteFolderRecursive(workspaceId, subfolderSnap.id);
    }

    // Now delete documents in the current folder in chunks to avoid transaction size limits
    const docsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents')), where("folderId", "==", folderId));
    const docsSnap = await getDocs(docsQuery);

    // Process documents in chunks of 400 to stay under Firebase's 500 operation batch limit
    const CHUNK_SIZE = 400;
    for (let i = 0; i < docsSnap.docs.length; i += CHUNK_SIZE) {
        const chunk = docsSnap.docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const docSnap of chunk) {
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

            // Add document deletion to batch
            batch.delete(docSnap.ref);
        }

        // Commit this chunk's batch
        if (chunk.length > 0) {
            await batch.commit();
        }
    }

    // Finally, delete the folder itself
    const folderRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'folders')), folderId);
    await deleteDoc(folderRef);
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
        try {
            // Create a top-level user doc immediately to avoid race conditions with security rules
            // (other rules check existence of /users/{uid}). We'll update organisationId later.
            await setDoc(userRef, user);

            // Create a new organisation for this user
            const orgName = user.name ? `${user.name}'s Organisation` : 'My Organisation';
            const orgRef = doc(collection(db, 'organisations'));
            await setDoc(orgRef, {
                name: orgName,
                ownerId: user.id,
                createdAt: Timestamp.now(),
            });

            // Create the user document under organisations/{orgId}/users/{userId}
            const orgUserRef = doc(db, `organisations/${orgRef.id}/users`, user.id);
            await setDoc(orgUserRef, { ...user, organisationId: orgRef.id });

            // Update the top-level user doc to include organisationId for compatibility
            await setDoc(userRef, { ...user, organisationId: orgRef.id }, { merge: true });

            // NOTE: Creating an initial workspace automatically on signup has caused
            // accidental duplicate workspaces and permission complexity. We no longer
            // auto-create a workspace here. Workspaces should only be created explicitly
            // by user action via the UI.
        } catch (e) {
            console.error('Failed to create organisation/workspace for new user', e);
            // Fallback: ensure top-level user doc exists
            try {
                await setDoc(userRef, user, { merge: true });
            } catch (innerErr) {
                console.error('Failed to create top-level user doc as fallback', innerErr);
            }
        }
    }
}

/**
 * Ensure an organisation-scoped user doc exists for the given userId.
 * This is safe for the user to call (security rules allow users to create their
 * own organisations/{orgId}/users/{uid} doc). Returns true if the doc exists or
 * was successfully created, false on error.
 */
export async function ensureOrgUserRecord(userId: string, organisationId: string, data?: Partial<User>): Promise<boolean> {
    try {
        if (!userId || !organisationId) return false;
        const ref = doc(db, `organisations/${organisationId}/users`, userId);
        const snap = await getDoc(ref);
        if (snap.exists()) return true;

        const payload: any = {
            id: userId,
            organisationId,
            name: data?.name || null,
            email: data?.email || null,
            role: (data as any)?.role || 'Member',
            createdAt: serverTimestamp()
        };
        await setDoc(ref, payload, { merge: true });
        console.debug('ensureOrgUserRecord: created org user record', userId, organisationId);
        return true;
    } catch (e) {
        console.error('ensureOrgUserRecord failed', e);
        return false;
    }
}

/**
 * Return a safe CollectionReference for an organisation-aware workspace path.
 * Returns null when workspaceId is missing or the computed path is empty.
 */
export function getWorkspaceCollectionRef(workspaceId?: string | null, subpath?: string, organisationId?: string | null): any | null {
    if (!workspaceId) return null;
    const path = workspaceCollectionPath(workspaceId, subpath || '', organisationId ?? null);
    if (!path) return null;
    try {
        return collection(db, path) as any;
    } catch (err) {
        console.warn('[getWorkspaceCollectionRef] invalid path', path, err);
        return null;
    }
}

/**
 * Return a safe DocumentReference for an organisation-aware workspace path.
 * Returns null when workspaceId is missing or the computed path is empty.
 */
export function getWorkspaceDocRef(workspaceId?: string | null, subpath?: string, docId?: string, organisationId?: string | null): any | null {
    if (!workspaceId || !docId) return null;
    const path = workspaceCollectionPath(workspaceId, subpath || '', organisationId ?? null);
    if (!path) return null;
    try {
        return doc(collection(db, path), docId) as any;
    } catch (err) {
        console.warn('[getWorkspaceDocRef] invalid path', path, err);
        return null;
    }
}

/**
 * Resolve a workspace's organisationId by asking the admin API. Returns null when unknown.
 * This avoids attempting client-side reads of workspaces/{id} when the workspace is org-scoped (which
 * would be denied by Firestore rules for ordinary users).
 */
async function resolveWorkspaceOrgId(workspaceId: string): Promise<string | null> {
    if (!workspaceId) return null;
    try {
        const resp = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.organisationId ?? null;
    } catch (e) {
        console.debug('resolveWorkspaceOrgId: admin API lookup failed', e);
        return null;
    }
}
