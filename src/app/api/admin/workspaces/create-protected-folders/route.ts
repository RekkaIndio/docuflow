import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
  const { orgId, workspaceId } = body || {};
  if (!workspaceId || !orgId) return NextResponse.json({ error: 'Missing orgId or workspaceId' }, { status: 400 });

  // Use org-scoped base path only
  const basePath = `organisations/${orgId}/workspaces/${workspaceId}`;

    const protectedFolders = [
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

    for (const f of protectedFolders) {
      const docRef = adminDb.doc(`${basePath}/folders/${f.id}`);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          name: f.name,
          type: 'folder',
          parentId: f.parentId ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          protected: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Failed to create protected folders', e);
    return NextResponse.json({ error: 'Failed to create protected folders' }, { status: 500 });
  }
}
