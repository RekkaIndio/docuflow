#!/usr/bin/env node
const admin = require('firebase-admin');

// Initialize with credentials from FIREBASE_ADMIN_CREDENTIALS if provided
if (!admin.apps.length) {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    try {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } catch (e) {
      console.error('Failed to parse FIREBASE_ADMIN_CREDENTIALS:', e);
      process.exit(2);
    }
  } else {
    admin.initializeApp();
  }
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/debug-auth-user.js <uid>');
  process.exit(1);
}

admin.auth().getUser(uid)
  .then(user => {
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error fetching user:', err && err.message ? err.message : err);
    process.exit(2);
  });
