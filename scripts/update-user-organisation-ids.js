#!/usr/bin/env node

/**
 * Script to update organisationId for users who are members of org-scoped workspaces
 * but don't have organisationId set in their user document.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../docuflow-9a786-firebase-adminsdk-fbsvc-d0755c6e0f.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function updateUserOrganisationIds() {
  console.log('Starting update of user organisationIds...');

  try {
    // Get all org-scoped workspaces
    const orgsSnap = await db.collection('organisations').get();

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      console.log(`Processing organisation: ${orgId}`);

      const workspacesSnap = await db.collection(`organisations/${orgId}/workspaces`).get();

      for (const wsDoc of workspacesSnap.docs) {
        const wsData = wsDoc.data();
        const members = Array.isArray(wsData.members) ? wsData.members : [];

        console.log(`Processing workspace ${wsDoc.id} with ${members.length} members`);

        for (const memberId of members) {
          try {
            // Check if user document exists and has organisationId set
            const userRef = db.collection('users').doc(memberId);
            const userSnap = await userRef.get();

            if (userSnap.exists) {
              const userData = userSnap.data();
              if (!userData.organisationId) {
                console.log(`Updating user ${memberId} organisationId to ${orgId}`);
                await userRef.update({ organisationId: orgId });
              } else if (userData.organisationId !== orgId) {
                console.log(`User ${memberId} has different organisationId (${userData.organisationId}) vs workspace org (${orgId})`);
              }
            } else {
              console.log(`User document not found for member ${memberId}`);
            }
          } catch (err) {
            console.error(`Error updating user ${memberId}:`, err);
          }
        }
      }
    }

    console.log('Update completed.');
  } catch (error) {
    console.error('Error updating user organisationIds:', error);
  }
}

updateUserOrganisationIds().then(() => {
  console.log('Script finished.');
  process.exit(0);
}).catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});