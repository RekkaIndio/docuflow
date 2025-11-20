#!/usr/bin/env node
/**
 * Migration script to move teams from workspace-scoped paths to organisation-scoped paths
 * Old path: organisations/{orgId}/workspaces/{workspaceId}/teams/{teamId}
 * New path: organisations/{orgId}/teams/{teamId}
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Failed to initialize firebase-admin:', e);
    process.exit(1);
  }
}

const firestore = admin.firestore();

async function migrateTeamsToOrgScope() {
  console.log('Starting teams migration to org-scoped paths...\n');

  try {
    // Get all organisations
    const orgsSnapshot = await firestore.collection('organisations').get();
    console.log(`Found ${orgsSnapshot.docs.length} organisations`);

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      console.log(`\n--- Processing organisation: ${orgId} ---`);

      // Get all workspaces in this organisation
      const workspacesSnapshot = await firestore
        .collection('organisations')
        .doc(orgId)
        .collection('workspaces')
        .get();

      console.log(`  Found ${workspacesSnapshot.docs.length} workspaces`);

      for (const workspaceDoc of workspacesSnapshot.docs) {
        const workspaceId = workspaceDoc.id;

        // Get all teams in the old workspace-scoped location
        const oldTeamsRef = firestore
          .collection('organisations')
          .doc(orgId)
          .collection('workspaces')
          .doc(workspaceId)
          .collection('teams');

        const oldTeamsSnapshot = await oldTeamsRef.get();

        if (oldTeamsSnapshot.empty) {
          continue;
        }

        console.log(`    Workspace ${workspaceId}: Found ${oldTeamsSnapshot.docs.length} teams to migrate`);

        for (const teamDoc of oldTeamsSnapshot.docs) {
          const teamId = teamDoc.id;
          const teamData = teamDoc.data();

          try {
            // Check if team already exists at new location
            const newTeamRef = firestore.collection('organisations').doc(orgId).collection('teams').doc(teamId);
            const newTeamSnapshot = await newTeamRef.get();

            if (newTeamSnapshot.exists) {
              console.log(`      ⊘ Team ${teamId} already exists at new location, skipping`);
              totalSkipped++;
              continue;
            }

            // Ensure organisationId is set
            const updatedTeamData = {
              ...teamData,
              organisationId: orgId,
            };

            // Write to new org-scoped location
            await newTeamRef.set(updatedTeamData);
            console.log(`      ✓ Migrated team ${teamId}`);

            // Delete from old workspace-scoped location
            await teamDoc.ref.delete();
            console.log(`      ✓ Deleted from old location`);

            totalMigrated++;
          } catch (err) {
            console.error(`      ✗ Error migrating team ${teamId}:`, err.message);
          }
        }
      }
    }

    // Also check for top-level teams that need organisationId
    console.log(`\n--- Checking top-level teams ---`);
    const topLevelTeamsSnapshot = await firestore.collection('teams').get();
    console.log(`  Found ${topLevelTeamsSnapshot.docs.length} top-level teams`);

    for (const teamDoc of topLevelTeamsSnapshot.docs) {
      const teamData = teamDoc.data();
      
      if (!teamData.organisationId) {
        console.log(`  ⚠ Top-level team ${teamDoc.id} missing organisationId, skipping migration`);
        totalSkipped++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${totalMigrated} teams`);
    console.log(`   Skipped: ${totalSkipped} teams`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateTeamsToOrgScope();
