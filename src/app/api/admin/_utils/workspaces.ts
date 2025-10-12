import admin, { adminDb } from '@/lib/firebase-admin';
import { workspaceCollectionPath } from '@/lib/paths';

const PROTECTED_FOLDERS = [
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
  { id: 'action-plans', name: 'Action plans', parentId: null },
  { id: 'action-plans-external', name: 'External', parentId: 'action-plans' },
  { id: 'action-plans-internal', name: 'Internal', parentId: 'action-plans' },
  { id: 'rd-compliance-report', name: 'Rd compliance report', parentId: null },
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

export async function ensureProtectedFolders(workspaceId: string, organisationId: string) {
  const basePath = workspaceCollectionPath(workspaceId, undefined, organisationId);
  if (!basePath) return;

  await Promise.all(
    PROTECTED_FOLDERS.map(async (folder) => {
      const docRef = adminDb.doc(`${basePath}/folders/${folder.id}`);
      const existing = await docRef.get();
      if (!existing.exists) {
        await docRef.set({
          name: folder.name,
          type: 'folder',
          parentId: folder.parentId ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          protected: true,
        });
      }
    })
  );
}

export async function summariseWorkspace(
  docSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
  organisationId: string,
) {
  const data = docSnap.data() as Record<string, any>;
  const members = Array.isArray(data?.members) ? data.members : [];
  const createdAt = data?.createdAt && typeof data.createdAt.toDate === 'function'
    ? data.createdAt.toDate().toISOString()
    : data?.createdAt ?? null;

  return {
    id: docSnap.id,
    name: data?.name || 'Untitled workspace',
    ownerId: data?.ownerId ?? null,
    organisationId,
    members,
    memberCount: members.length,
    createdAt,
  };
}
