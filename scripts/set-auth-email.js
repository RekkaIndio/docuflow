#!/usr/bin/env node
const admin = require('firebase-admin');

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
const email = process.argv[3];
if (!uid || !email) {
  console.error('Usage: node scripts/set-auth-email.js <uid> <email>');
  process.exit(1);
}

admin.auth().updateUser(uid, { email })
  .then(user => {
    console.log('Updated user:', JSON.stringify(user, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to update user email:', err && err.message ? err.message : err);
    process.exit(2);
  });
