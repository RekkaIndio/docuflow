#!/usr/bin/env node
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const crypto = require('crypto');

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

async function main() {
  const email = process.argv[2] || `test+${Date.now()}@example.com`;
  const workspaceId = process.argv[3] || null;
  const workspaceOrgId = process.argv[4] || null;

  const token = crypto.randomBytes(12).toString('hex');
  const doc = {
    email,
    type: 'invite',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  };
  if (workspaceId) doc.workspaceId = workspaceId;
  if (workspaceOrgId) doc.workspaceOrgId = workspaceOrgId;

  await admin.firestore().collection('loginTokens').doc(token).set(doc);
  console.log('Created token:', token, 'for email', email);

  // Call local consume endpoint
  const resp = await fetch('http://localhost:9002/api/auth/consume-login-token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
  });
  const body = await resp.text();
  console.log('Consume response status:', resp.status);
  console.log('Body:', body);
}

main().catch(err => { console.error(err); process.exit(2); });
