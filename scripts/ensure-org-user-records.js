// One-off script to ensure organisations/{orgId}/users/{userId} exist for workspace members
// and to set top-level users/{userId}.organisationId for compatibility with security rules.
// Run with: node scripts/ensure-org-user-records.js

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.resolve(process.cwd(), 'docuflow-9a786-firebase-adminsdk-fbsvc-d0755c6e0f.json');

if (fs.existsSync(serviceAccountPath)) {
  const creds = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(creds) });
} else if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function ensure() {
  console.log('Scanning organisations...');
  const orgsSnap = await db.collection('organisations').get();
  let totalCreated = 0;
  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    console.log('Processing org', orgId, orgDoc.data().name || '');
    const wsSnap = await db.collection(`organisations/${orgId}/workspaces`).get();
    for (const wsDoc of wsSnap.docs) {
      const wsData = wsDoc.data() || {};
      const members = Array.isArray(wsData.members) ? wsData.members : [];
      if (wsData.ownerId && !members.includes(wsData.ownerId)) members.push(wsData.ownerId);
      for (const memberId of members) {
        try {
          const orgUserRef = db.doc(`organisations/${orgId}/users/${memberId}`);
          const orgUserSnap = await orgUserRef.get();
          if (!orgUserSnap.exists) {
            await orgUserRef.set({ id: memberId, role: memberId === wsData.ownerId ? 'Owner' : 'Member', organisationId: orgId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            totalCreated++;
            console.log(`  Created org user ${memberId} in org ${orgId}`);
          }

          // Ensure top-level users/{id} has organisationId set
          const topUserRef = db.collection('users').doc(memberId);
          const topUserSnap = await topUserRef.get();
          if (!topUserSnap.exists || !(topUserSnap.data() && topUserSnap.data().organisationId === orgId)) {
            try {
              await topUserRef.set({ organisationId: orgId }, { merge: true });
              console.log(`  Set users/${memberId}.organisationId = ${orgId}`);
            } catch (e) {
              console.warn(`  Failed to set top-level users/${memberId} organisationId:`, e.toString());
            }
          }

        } catch (e) {
          console.error('  Failed to ensure member', memberId, 'for org', orgId, e.toString());
        }
      }
    }
  }
  console.log('Done. Total org user docs created:', totalCreated);
  process.exit(0);
}

ensure().catch(err => { console.error('Script failed', err); process.exit(1); });
