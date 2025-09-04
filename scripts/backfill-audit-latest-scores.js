#!/usr/bin/env node
/*
  Backfill script: scans audits for each workspace and writes the latest per-auditType
  into workspaces/{workspaceId}/settings/audit_latest_scores.

  Usage:
    - Set GOOGLE_APPLICATION_CREDENTIALS env var to a service account JSON with Firestore access,
      or pass the path via --serviceAccount=/path/to/key.json
    - Optionally set FIREBASE_PROJECT env var or pass --project=your-project-id
    - Run: node scripts/backfill-audit-latest-scores.js

  Notes:
    - This script uses the Admin SDK and must be run in a trusted environment.
    - It pages through audits in batches to avoid loading entire collections into memory.
    - It looks for `auditType` and numeric `scorePercent` on audit documents.
    - For each auditType it picks the audit with the newest `createdAt` timestamp.
*/

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function parseArg(name) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!arg) return null;
  return arg.split('=')[1];
}

async function main() {
  const serviceAccount = parseArg('serviceAccount') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = parseArg('project') || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT;

  if (serviceAccount && fs.existsSync(serviceAccount)) {
    const cred = require(path.resolve(serviceAccount));
    admin.initializeApp({ credential: admin.credential.cert(cred), projectId });
  } else {
    // Try default credentials
    admin.initializeApp();
  }

  const db = admin.firestore();
  console.log('Starting backfill: scanning workspaces...');

  const workspacesSnap = await db.collection('workspaces').get();
  console.log(`Found ${workspacesSnap.size} workspaces`);

  let processed = 0;
  for (const wsDoc of workspacesSnap.docs) {
    const workspaceId = wsDoc.id;
    console.log(`\nProcessing workspace: ${workspaceId}`);

    // Map auditType -> auditData (we'll keep the newest createdAt)
    const latestByType = {};

    let lastDoc = null;
    const batchSize = 500;
    while (true) {
      let q = db.collection(`workspaces/${workspaceId}/audits`).orderBy('createdAt', 'desc').limit(batchSize);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        lastDoc = docSnap;
        const data = docSnap.data();
        const auditType = data?.auditType;
        if (!auditType) continue;
        const score = typeof data?.scorePercent === 'number' ? data.scorePercent : null;
        if (score === null) continue;
        const createdAt = data?.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : (data?.createdAt || Date.now());

        const existing = latestByType[auditType];
        if (!existing || createdAt > existing.createdAt) {
          latestByType[auditType] = {
            scorePercent: score,
            yesCount: typeof data?.yesCount === 'number' ? data.yesCount : null,
            totalCount: typeof data?.totalCount === 'number' ? data.totalCount : null,
            createdAt,
          };
        }
      }

      if (snap.size < batchSize) break;
    }

    const writeDoc = {};
    for (const [auditType, d] of Object.entries(latestByType)) {
      writeDoc[auditType] = {
        scorePercent: d.scorePercent,
        yesCount: d.yesCount,
        totalCount: d.totalCount,
        updatedAt: d.createdAt,
      };
    }

    if (Object.keys(writeDoc).length === 0) {
      console.log('  No audit scores found for this workspace — skipping');
      processed++;
      continue;
    }

    try {
      const ref = db.doc(`workspaces/${workspaceId}/settings/audit_latest_scores`);
      await ref.set(writeDoc, { merge: true });
      console.log(`  Wrote ${Object.keys(writeDoc).length} audit types to settings`);
    } catch (e) {
      console.error('  Failed to write audit_latest_scores for workspace', workspaceId, e);
    }

    processed++;
  }

  console.log('\nBackfill complete. Workspaces processed:', processed);
  process.exit(0);
}

main().catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
