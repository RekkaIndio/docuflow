/*
Migration script (safe-mode/dry-run by default).
This will:
 - read all top-level `workspaces` documents
 - for each workspace, create (or find) an organisation document for the ownerId
 - copy the workspace document under `organisations/{orgId}/workspaces/{workspaceId}`
 - optionally (on --apply) delete or keep the top-level documents

Usage:
  # dry-run (no writes):
  ts-node scripts/migrate-to-organisations.ts

  # apply changes (writes to Firestore):
  ts-node scripts/migrate-to-organisations.ts --apply

Notes:
 - Requires FIREBASE_ADMIN_CREDENTIALS env var or a configured Application Default Credential.
 - Test on a staging project before running in production.
*/

import admin from '../src/lib/firebase-admin';

const db = admin.firestore();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  console.log('Migration to organisations starting. apply=', apply);

  const workspacesSnap = await db.collection('workspaces').get();
  console.log(`Found ${workspacesSnap.size} workspaces`);

  for (const wsDoc of workspacesSnap.docs) {
    const ws = wsDoc.data();
    const ownerId = ws.ownerId || (Array.isArray(ws.members) && ws.members[0]) || null;
    const orgName = ownerId ? `Org for ${ownerId}` : 'Orphaned Org';

    // Try to find existing organisation for owner
    let orgId: string | null = null;
    if (ownerId) {
      const existing = await db.collection('organisations').where('ownerId', '==', ownerId).limit(1).get();
      if (!existing.empty) orgId = existing.docs[0].id;
    }

    if (!orgId) {
      if (apply) {
        const newOrgRef = db.collection('organisations').doc();
        await newOrgRef.set({ name: orgName, ownerId: ownerId || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        orgId = newOrgRef.id;
        console.log(`Created org ${orgId} (${orgName})`);
      } else {
        console.log(`[dry-run] Would create org for workspace ${wsDoc.id} name=${orgName}`);
        orgId = 'DRYRUN_ORGID';
      }
    }

    // Copy workspace under organisations/{orgId}/workspaces/{workspaceId}
    const orgWsRefPath = `organisations/${orgId}/workspaces/${wsDoc.id}`;
    if (apply) {
      await db.doc(orgWsRefPath).set({ ...ws, mirroredFrom: 'workspaces', mirroredAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log(`Mirrored workspace ${wsDoc.id} into ${orgWsRefPath}`);
    } else {
      console.log(`[dry-run] Would mirror workspace ${wsDoc.id} into ${orgWsRefPath}`);
    }

    // Optionally, create organisations/{orgId}/users/{ownerId} doc for owner
    if (ownerId) {
      const userRef = db.doc(`users/${ownerId}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        if (apply) {
          await db.doc(`organisations/${orgId}/users/${ownerId}`).set({ id: ownerId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          console.log(`Created org user placeholder for ${ownerId}`);
        } else {
          console.log(`[dry-run] Would create org user placeholder for ${ownerId}`);
        }
      } else {
        if (apply) {
          const user = userSnap.data();
          await db.doc(`organisations/${orgId}/users/${ownerId}`).set({ ...user, organisationId: orgId }, { merge: true });
          console.log(`Copied user ${ownerId} into organisations/${orgId}/users`);
        } else {
          console.log(`[dry-run] Would copy user ${ownerId} into organisations/${orgId}/users`);
        }
      }
    }
  }

  console.log('Migration dry-run complete. Re-run with --apply to apply changes.');
}

main().catch(e => { console.error(e); process.exit(1); });
