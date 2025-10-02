import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

// Admin-only endpoint: scan organisations and ensure organisations/{orgId}/users/{userId}
// and top-level users/{userId}.organisationId exist for workspace members.
// Require an admin header (x-admin-secret or Authorization) to run.

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-admin-secret') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });
    }

    const orgSnaps = await adminDb.collection('organisations').get();
    let totalCreated = 0;
    let totalTopLevelUpdated = 0;
    const errors: any[] = [];

    for (const orgDoc of orgSnaps.docs) {
      const orgId = orgDoc.id;
      try {
        const wsSnap = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
        for (const wsDoc of wsSnap.docs) {
          const wsData = wsDoc.data() || {};
          const members = Array.isArray(wsData.members) ? wsData.members.slice() : [];
          if (wsData.ownerId && !members.includes(wsData.ownerId)) members.push(wsData.ownerId);

          for (const memberId of members) {
            try {
              const orgUserRef = adminDb.doc(`organisations/${orgId}/users/${memberId}`);
              const orgUserSnap = await orgUserRef.get();
              if (!orgUserSnap.exists) {
                await orgUserRef.set({ id: memberId, role: memberId === wsData.ownerId ? 'Owner' : 'Member', organisationId: orgId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                totalCreated++;
              }

              // Ensure top-level users/{id} has organisationId set
              const topUserRef = adminDb.collection('users').doc(memberId);
              const topUserSnap = await topUserRef.get();
              if (!topUserSnap.exists || topUserSnap.data()?.organisationId !== orgId) {
                await topUserRef.set({ organisationId: orgId }, { merge: true });
                totalTopLevelUpdated++;
              }
            } catch (e: any) {
              errors.push({ orgId, workspaceId: wsDoc.id, memberId, error: String(e) });
            }
          }
        }
      } catch (e: any) {
        errors.push({ orgId, error: String(e) });
      }
    }

    return NextResponse.json({ ok: true, created: totalCreated, topLevelUpdated: totalTopLevelUpdated, errors });
  } catch (e) {
    console.error('Failed to ensure org user records', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
