/**
 * Script to revoke expired per-user team access.
 *
 * Usage (locally):
 *   ts-node scripts/revoke-expired-user-access.ts
 *
 * Or with node if you set FIREBASE_ADMIN_CREDENTIALS env:
 *   node -r ts-node/register scripts/revoke-expired-user-access.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.error('Failed to initialize firebase-admin in revoke script:', e?.toString?.() ?? e);
    process.exit(1);
  }
}

const db = admin.firestore();

async function revokeExpired() {
  console.log('[revoke] scanning teams (collectionGroup) for expired userAccess entries...');
  const now = admin.firestore.Timestamp.fromDate(new Date());

  // Iterate all team documents via collectionGroup
  const teamsSnap = await db.collectionGroup('teams').get();
  console.log(`[revoke] found ${teamsSnap.size} team documents to scan`);

  let totalRevoked = 0;

  for (const docSnap of teamsSnap.docs) {
    try {
      const data = docSnap.data() as any;
      const userAccess = data?.userAccess;
      if (!userAccess || typeof userAccess !== 'object') continue;

      const expiredKeys: string[] = [];
      for (const [userKey, infoRaw] of Object.entries(userAccess)) {
        const info: any = infoRaw as any;
        if (!info) continue;
        const expiresAt = info.expiresAt;
        if (!expiresAt) continue;

        let ts = null;
        if (expiresAt._seconds !== undefined && expiresAt._nanoseconds !== undefined) {
          // Firestore Timestamp-like
          ts = expiresAt;
        } else if (typeof expiresAt === 'object' && expiresAt.seconds !== undefined) {
          ts = expiresAt; // handle other forms
        } else if (typeof expiresAt === 'number') {
          ts = admin.firestore.Timestamp.fromMillis(expiresAt);
        }

        if (ts && ts.seconds <= now.seconds) {
          expiredKeys.push(userKey);
        }
      }

      if (expiredKeys.length > 0) {
        const updates: Record<string, any> = {};
        for (const k of expiredKeys) {
          // Remove the entire per-user map
          updates[`userAccess.${k}`] = admin.firestore.FieldValue.delete();
        }
        await docSnap.ref.update(updates);
        console.log(`[revoke] revoked ${expiredKeys.length} entries on ${docSnap.ref.path}`);
        totalRevoked += expiredKeys.length;
      }
    } catch (err) {
      console.warn('[revoke] failed processing doc', docSnap.ref.path, err?.toString?.() ?? err);
    }
  }

  console.log(`[revoke] finished. total revoked entries: ${totalRevoked}`);
}

revokeExpired().catch(err => {
  console.error('[revoke] script failed', err?.toString?.() ?? err);
  process.exit(2);
});
