#!/usr/bin/env node
const admin = require('firebase-admin');
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

async function consume(token) {
  const adminDb = admin.firestore();
  const adminAuth = admin.auth();

  const tokenRef = adminDb.collection('loginTokens').doc(token);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) throw new Error('Token not found');
  const data = tokenSnap.data();
  const now = new Date();
  if (data.expiresAt && new Date(data.expiresAt) < now) throw new Error('Token expired');

  await tokenRef.update({ consumedAt: new Date().toISOString(), consumedIp: '127.0.0.1' });

  const email = data.email;
  if (!email) throw new Error('Token has no email');

  const usersQuery = adminDb.collection('users').where('email', '==', email).limit(1);
  const usersSnap = await usersQuery.get();
  const workspaceIdFromToken = data?.workspaceId || null;
  const workspaceOrgIdFromToken = data?.workspaceOrgId || null;
  const assignedWorkspace = workspaceIdFromToken ? { id: workspaceIdFromToken, organisationId: workspaceOrgIdFromToken || null } : null;

  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    const uid = userDoc.id;

    try {
      await adminAuth.getUser(uid);
    } catch (e) {
      try {
        const tempPass = crypto.randomBytes(16).toString('hex');
        await adminAuth.createUser({ uid, email, password: tempPass });
      } catch (createErr) {
        console.warn('Failed to create auth user for existing Firestore user:', createErr);
      }
    }

    try { await adminAuth.updateUser(uid, { email }); } catch (e) { /* ignore */ }
    if (workspaceIdFromToken) {
      try {
        let wsRef;
        if (workspaceOrgIdFromToken) wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
        else wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
        await wsRef.update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
      } catch (err) {
        try {
          const wsRef = workspaceOrgIdFromToken ? adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`) : adminDb.collection('workspaces').doc(workspaceIdFromToken);
          const wsSnap = await wsRef.get();
          if (!wsSnap.exists) await wsRef.set({ members: [uid] }, { merge: true });
        } catch (err2) { console.warn('Failed to attach existing user to workspace members from token:', err2); }
      }
    }
    const customToken = await adminAuth.createCustomToken(uid);
    return { ok: true, customToken, email, assignedWorkspace, uid };
  }

  // No Firestore user exists
  let authUid = null;
  try {
    const authUser = await adminAuth.getUserByEmail(email);
    authUid = authUser.uid;
  } catch (e) {
    try {
      const tempPass = crypto.randomBytes(16).toString('hex');
      const newUser = await adminAuth.createUser({ email, password: tempPass });
      authUid = newUser.uid;
    } catch (createErr) {
      console.error('Failed to create auth user for invite email:', createErr);
      return { ok: true, email, assignedWorkspace };
    }
  }

  if (authUid) {
    try {
      const userRef = adminDb.collection('users').doc(authUid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        const nowIso = new Date().toISOString();
        await userRef.set({ email, createdAt: nowIso, createdFromInvite: true, workspaceId: workspaceIdFromToken || null });
        if (workspaceIdFromToken) {
          try {
            let wsRef;
            if (workspaceOrgIdFromToken) wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
            else wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
            await wsRef.update({ members: admin.firestore.FieldValue.arrayUnion(authUid) });
          } catch (e) {
            try { const wsRef = workspaceOrgIdFromToken ? adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`) : adminDb.collection('workspaces').doc(workspaceIdFromToken); const wsSnap = await wsRef.get(); if (!wsSnap.exists) await wsRef.set({ members: [authUid] }, { merge: true }); } catch (err2) { console.warn('Failed to add invited user to workspace members:', err2); }
          }
        }
      }
    } catch (e) { console.warn('Failed to create minimal Firestore user doc for invite:', e); }

    try { await adminAuth.updateUser(authUid, { email }); } catch (err) { /* ignore */ }
    const customToken = await adminAuth.createCustomToken(authUid);
    return { ok: true, customToken, email, assignedWorkspace, uid: authUid };
  }

  return { ok: true, email, assignedWorkspace };
}

const token = process.argv[2];
if (!token) { console.error('Usage: node scripts/consume-login-token-direct.js <token>'); process.exit(1); }

consume(token).then(res => { console.log(JSON.stringify(res, null, 2)); process.exit(0); }).catch(err => { console.error('Error:', err); process.exit(2); });
