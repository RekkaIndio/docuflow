#!/usr/bin/env node

/**
 * Migration script to initialize feature flags for existing organisations
 * 
 * This script will:
 * 1. Find all organisations in Firestore
 * 2. Check if they have feature flags configured
 * 3. If not, initialize with all features enabled (default state)
 * 
 * Run with: node scripts/migrate-feature-flags.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, '..', 'docuflow-9a786-firebase-adminsdk-fbsvc-d0755c6e0f.json');

if (!admin.apps.length) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin initialized');
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Default feature flags - all features enabled
const DEFAULT_FEATURE_FLAGS = {
  modules: {
    dashboard: { enabled: true, name: 'Dashboard', description: 'Overview and daily check-ins', category: 'core', isCore: true },
    dependencyCalculator: { enabled: true, name: 'Dependency Calculator', description: 'Staff dependency tracking', category: 'operations' },
    audits: { enabled: true, name: 'Audits', description: 'Compliance auditing system', category: 'compliance' },
    actionPlans: { enabled: true, name: 'Action Plans', description: 'Task tracking from audit findings', category: 'compliance' },
    policies: { enabled: true, name: 'Policies', description: 'Policy document management', category: 'compliance' },
    appraisals: { enabled: true, name: 'Supervisions', description: 'Staff supervision tracking', category: 'operations' },
    rotas: { enabled: true, name: 'Rotas', description: 'Staff scheduling and rota management', category: 'operations' },
    files: { enabled: true, name: 'Files & Folders', description: 'Document browser and file management', category: 'core', isCore: true },
    teams: { enabled: true, name: 'Teams', description: 'Team member management', category: 'operations' },
    stats: { enabled: true, name: 'Statistics', description: 'Analytics and compliance statistics', category: 'analytics' },
    chatPanel: { enabled: true, name: 'AI Chat Assistant', description: 'AI-powered compliance assistant', category: 'communication' },
    notifications: { enabled: true, name: 'Notifications', description: 'Notification system', category: 'communication' },
    tags: { enabled: true, name: 'Tags', description: 'Document tagging system', category: 'core' },
    renewals: { enabled: true, name: 'Renewals', description: 'Document renewal tracking', category: 'compliance' },
    dailyCheckins: { enabled: true, name: 'Daily Check-ins', description: 'Daily status reports', category: 'operations' },
    accessibility: { enabled: true, name: 'Accessibility', description: 'Accessibility settings', category: 'core', isCore: true },
    settings: { enabled: true, name: 'Settings', description: 'Workspace settings', category: 'core', isCore: true },
  },
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedBy: 'system-migration',
};

async function migrateFeatureFlags() {
  console.log('\n🚀 Starting feature flags migration...\n');

  try {
    // Get all organisations
    const organisationsSnapshot = await db.collection('organisations').get();
    
    if (organisationsSnapshot.empty) {
      console.log('ℹ️  No organisations found.');
      return;
    }

    console.log(`Found ${organisationsSnapshot.size} organisation(s)\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const orgDoc of organisationsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      const orgName = orgData.name || orgId;

      try {
        // Check if feature flags already exist
        const featureFlagsRef = db.collection('organisations').doc(orgId).collection('settings').doc('feature-flags');
        const featureFlagsDoc = await featureFlagsRef.get();

        if (featureFlagsDoc.exists) {
          console.log(`⏭️  Skipping "${orgName}" (${orgId}) - feature flags already exist`);
          skippedCount++;
          continue;
        }

        // Initialize with default feature flags (all enabled)
        await featureFlagsRef.set(DEFAULT_FEATURE_FLAGS);
        console.log(`✅ Initialized feature flags for "${orgName}" (${orgId})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error processing organisation "${orgName}" (${orgId}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateFeatureFlags()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
