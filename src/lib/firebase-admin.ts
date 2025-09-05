// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.warn('Failed to initialize firebase-admin:', e?.toString?.() ?? e);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

export default admin;