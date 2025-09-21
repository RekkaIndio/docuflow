import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import admin from '@/lib/firebase-admin';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, error: 'Missing token' });

  try {
    const tokenRef = adminDb.collection('loginTokens').doc(token);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ ok: false, error: 'Token not found' });

    const data = tokenSnap.data() as any;
    const now = new Date();
    if (data.expiresAt && new Date(data.expiresAt) < now) {
      return res.status(410).json({ ok: false, error: 'Token expired' });
    }

    // Mark token consumed (idempotent)
    try {
      await tokenRef.update({ consumedAt: new Date().toISOString(), consumedIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null });
    } catch (e) {
      // ignore update errors
    }

    const email: string | undefined = data.email;
    if (!email) return res.status(400).json({ ok: false, error: 'Token has no email' });

    // Try to find a user document with this email in Firestore
    const usersQuery = adminDb.collection('users').where('email', '==', email).limit(1);
    const usersSnap = await usersQuery.get();
    const tokenData = tokenSnap.data() as any;
    const workspaceIdFromToken = tokenData?.workspaceId || null;
    const workspaceOrgIdFromToken = tokenData?.workspaceOrgId || null;
    const assignedWorkspace = workspaceIdFromToken
      ? { id: workspaceIdFromToken, organisationId: workspaceOrgIdFromToken || null }
      : null;

    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      const uid = userDoc.id;

      // If a Firestore user exists but there's no Firebase Auth user, try
      // to create one with the same uid so we can attach an email/password
      // provider. This fixes cases where updateUser would fail silently
      // because the auth record doesn't exist yet.
      try {
        await adminAuth.getUser(uid);
      } catch (e) {
        // auth user not found -> create one with a temporary password
        try {
          const tempPass = crypto.randomBytes(16).toString('hex');
          await adminAuth.createUser({ uid, email, password: tempPass });
        } catch (createErr) {
          console.warn('Failed to create auth user for existing Firestore user:', createErr);
        }
      }

      // Ensure the Firebase Auth user has the email set. If the auth user
      // was just created above this should succeed; if it fails we'll
      // ignore but we want to attempt it so providerData/email are present.
      try {
        await adminAuth.updateUser(uid, { email });
      } catch (err) {
        // ignore; may fail for reasons like invalid email format etc.
      }

      // Ensure the existing user is added to the workspace members array if token included workspaceId
      if (workspaceIdFromToken) {
        try {
          let wsRef: any;
          if (workspaceOrgIdFromToken) {
            wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
          } else {
            wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
          }
          await wsRef.update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
        } catch (err) {
          // ignore failures here; best-effort membership attach
          try {
            if (workspaceIdFromToken) {
              const wsRef = workspaceOrgIdFromToken ? adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`) : adminDb.collection('workspaces').doc(workspaceIdFromToken);
              const wsSnap = await wsRef.get();
              if (!wsSnap.exists()) {
                await wsRef.set({ members: [uid] }, { merge: true });
              }
            }
          } catch (err2) {
            console.warn('Failed to attach existing user to workspace members from token:', err2);
          }
        }
      }

      // Create a Firebase custom token for client sign-in
      const customToken = await adminAuth.createCustomToken(uid);
      return res.status(200).json({ ok: true, customToken, email, assignedWorkspace });
    }

    // No Firestore user exists. Try to find or create a Firebase Auth user so we can provide a customToken
    let authUid: string | null = null;
    try {
      const authUser = await adminAuth.getUserByEmail(email);
      authUid = authUser.uid;
    } catch (e) {
      // user not found in auth - create a user with a temporary password so
      // the email/password provider shows up in the Firebase Console and the
      // user can later set their password via the client `set-password` flow.
      try {
        const tempPass = crypto.randomBytes(16).toString('hex');
        const newUser = await adminAuth.createUser({ email, password: tempPass });
        authUid = newUser.uid;
      } catch (createErr) {
        console.error('Failed to create auth user for invite email:', createErr);
        // Return email so client can show signup flow as fallback
        return res.status(200).json({ ok: true, email, assignedWorkspace });
      }
    }

    if (authUid) {
      // Ensure a minimal Firestore user doc exists (so app code expecting a users doc works)
      try {
        const userRef = adminDb.collection('users').doc(authUid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          const nowIso = new Date().toISOString();
          // token data may include workspaceId; attach if present
          const workspaceId = (tokenSnap.data() as any)?.workspaceId || null;
          await userRef.set({ email, createdAt: nowIso, createdFromInvite: true, workspaceId });
          // If token included a workspaceId, add this user to the workspace members array
          try {
            const tokenData = tokenSnap.data() as any;
            const workspaceIdForToken = tokenData?.workspaceId || null;
            const workspaceOrgId = tokenData?.workspaceOrgId || null;
            if (workspaceIdForToken) {
              let wsRef: any;
              if (workspaceOrgId) {
                wsRef = adminDb.doc(`organisations/${workspaceOrgId}/workspaces/${workspaceIdForToken}`);
              } else {
                wsRef = adminDb.collection('workspaces').doc(workspaceIdForToken);
              }
              try {
                await wsRef.update({ members: admin.firestore.FieldValue.arrayUnion(authUid) });
              } catch (e) {
                // If update fails (missing doc), try to set members array
                try {
                  const wsSnap = await wsRef.get();
                  if (!wsSnap.exists()) {
                    await wsRef.set({ members: [authUid] }, { merge: true });
                  }
                } catch (err) {
                  console.warn('Failed to add invited user to workspace members:', err);
                }
              }
            }
          } catch (err) {
            console.warn('Failed to attach workspace membership from token:', err);
          }
        }
      } catch (e) {
        console.warn('Failed to create minimal Firestore user doc for invite:', e);
      }

      // Also ensure the Firebase Auth record has an email set
      try {
        await adminAuth.updateUser(authUid, { email });
      } catch (err) {
        // ignore
      }

      // Create custom token for client to sign in (magic link)
      const customToken = await adminAuth.createCustomToken(authUid);
      return res.status(200).json({ ok: true, customToken, email, assignedWorkspace });
    }

  // Fallback: return email so client can pre-fill sign-up
  return res.status(200).json({ ok: true, email, assignedWorkspace });
  } catch (err: any) {
    console.error('Failed to consume login token', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
