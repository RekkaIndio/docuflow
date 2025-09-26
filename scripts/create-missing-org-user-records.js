#!/usr/bin/env node

/**
 * Script to create organisation user records for users who have organisationId set
 * but don't have the corresponding organisations/{orgId}/users/{userId} record.
 * This is needed for Firestore security rules to work properly.
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

async function createMissingOrgUserRecords() {
  console.log('Starting creation of missing organisation user records...');

  try {
    // Get all users with organisationId set
    const usersSnap = await db.collection('users').where('organisationId', '!=', null).get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const orgId = userData.organisationId;

      if (!orgId) continue;

      try {
        // Check if org user record exists
        const orgUserRef = db.doc(`organisations/${orgId}/users/${userId}`);
        const orgUserSnap = await orgUserRef.get();

        if (!orgUserSnap.exists) {
          console.log(`Creating org user record for user ${userId} in org ${orgId}`);
          await orgUserRef.set({
            id: userId,
            role: userData.role || 'Member',
            organisationId: orgId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          console.log(`Org user record already exists for user ${userId} in org ${orgId}`);
        }
      } catch (err) {
        console.error(`Error creating org user record for user ${userId}:`, err);
      }
    }

    console.log('Creation completed.');
  } catch (error) {
    console.error('Error creating missing org user records:', error);
  }
}

createMissingOrgUserRecords().then(() => {
  console.log('Script finished.');
  process.exit(0);
}).catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});