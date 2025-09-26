import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body || {};

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    const tokenRef = adminDb.collection('loginTokens').doc(token);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return NextResponse.json({ ok: false, error: 'Token not found' }, { status: 404 });
    }

    const tokenData = tokenSnap.data();
    if (!tokenData) {
      return NextResponse.json({ ok: false, error: 'Invalid token data' }, { status: 400 });
    }

    const now = new Date();
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) < now) {
      return NextResponse.json({ ok: false, error: 'Token expired' }, { status: 400 });
    }

    // Mark token as consumed
    await tokenRef.update({
      consumedAt: new Date().toISOString(),
      consumedIp: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    const email = tokenData.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Token has no email' }, { status: 400 });
    }

    const workspaceIdFromToken = tokenData.workspaceId || null;
    const workspaceOrgIdFromToken = tokenData.workspaceOrgId || null;
    const assignedWorkspace = workspaceIdFromToken ? {
      id: workspaceIdFromToken,
      organisationId: workspaceOrgIdFromToken || null
    } : null;

    // Check if user already exists in Firestore
    const usersQuery = adminDb.collection('users').where('email', '==', email).limit(1);
    const usersSnap = await usersQuery.get();

    if (!usersSnap.empty) {
      // Existing user - ensure they have access to the workspace
      const userDoc = usersSnap.docs[0];
      const uid = userDoc.id;

      try {
        await adminAuth.getUser(uid);
      } catch (e) {
        // Create auth user if it doesn't exist
        try {
          const tempPass = crypto.randomBytes(16).toString('hex');
          await adminAuth.createUser({ uid, email, password: tempPass });
        } catch (createErr) {
          console.warn('Failed to create auth user for existing Firestore user:', createErr);
        }
      }

      // Update auth user email
      try {
        await adminAuth.updateUser(uid, { email });
      } catch (e) {
        // ignore
      }

      // Add user to workspace members if workspace specified
      if (workspaceIdFromToken) {
        try {
          let wsRef;
          if (workspaceOrgIdFromToken) {
            wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
          } else {
            wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
          }
          await wsRef.update({ members: adminDb.FieldValue.arrayUnion(uid) });
        } catch (err) {
          try {
            let wsRef;
            if (workspaceOrgIdFromToken) {
              wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
            } else {
              wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
            }
            const wsSnap = await wsRef.get();
            if (!wsSnap.exists) {
              await wsRef.set({ members: [uid] }, { merge: true });
            }
          } catch (err2) {
            console.warn('Failed to attach existing user to workspace members from token:', err2);
          }
        }
      }

      // Create organisation user record if org specified
      if (workspaceOrgIdFromToken) {
        try {
          const orgUserRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/users/${uid}`);
          const orgUserSnap = await orgUserRef.get();
          if (!orgUserSnap.exists) {
            await orgUserRef.set({
              id: uid,
              role: 'Member',
              organisationId: workspaceOrgIdFromToken,
              createdAt: adminDb.FieldValue.serverTimestamp()
            }, { merge: true });
          }

          // Ensure top-level user has organisationId
          const topUserRef = adminDb.collection('users').doc(uid);
          await topUserRef.set({ organisationId: workspaceOrgIdFromToken }, { merge: true });
        } catch (err) {
          console.warn('Failed to create organisation user record for existing user:', err);
        }
      }

      const customToken = await adminAuth.createCustomToken(uid);
      return NextResponse.json({
        ok: true,
        customToken,
        email,
        assignedWorkspace,
        uid
      });
    }

    // No Firestore user exists - create new user
    let authUid = null;
    try {
      const authUser = await adminAuth.getUserByEmail(email);
      authUid = authUser.uid;
    } catch (e) {
      // Create new auth user
      try {
        const tempPass = crypto.randomBytes(16).toString('hex');
        const newUser = await adminAuth.createUser({ email, password: tempPass });
        authUid = newUser.uid;
      } catch (createErr) {
        console.error('Failed to create auth user for invite email:', createErr);
        return NextResponse.json({
          ok: true,
          email,
          assignedWorkspace
        });
      }
    }

    if (authUid) {
      // Create Firestore user document
      try {
        const userRef = adminDb.collection('users').doc(authUid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          const nowIso = new Date().toISOString();
          await userRef.set({
            email,
            createdAt: nowIso,
            createdFromInvite: true,
            workspaceId: workspaceIdFromToken || null,
            organisationId: workspaceOrgIdFromToken || null
          });
        }
      } catch (e) {
        console.warn('Failed to create Firestore user doc for invite:', e);
      }

      // Add to workspace members if specified
      if (workspaceIdFromToken) {
        try {
          let wsRef;
          if (workspaceOrgIdFromToken) {
            wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
          } else {
            wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
          }
          await wsRef.update({ members: adminDb.FieldValue.arrayUnion(authUid) });
        } catch (e) {
          try {
            let wsRef;
            if (workspaceOrgIdFromToken) {
              wsRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/workspaces/${workspaceIdFromToken}`);
            } else {
              wsRef = adminDb.collection('workspaces').doc(workspaceIdFromToken);
            }
            const wsSnap = await wsRef.get();
            if (!wsSnap.exists) {
              await wsRef.set({ members: [authUid] }, { merge: true });
            }
          } catch (err2) {
            console.warn('Failed to add invited user to workspace members:', err2);
          }
        }
      }

      // Create organisation user record if org specified
      if (workspaceOrgIdFromToken) {
        try {
          const orgUserRef = adminDb.doc(`organisations/${workspaceOrgIdFromToken}/users/${authUid}`);
          await orgUserRef.set({
            id: authUid,
            role: 'Member',
            organisationId: workspaceOrgIdFromToken,
            createdAt: adminDb.FieldValue.serverTimestamp()
          }, { merge: true });

          // Ensure top-level user has organisationId
          const topUserRef = adminDb.collection('users').doc(authUid);
          await topUserRef.set({ organisationId: workspaceOrgIdFromToken }, { merge: true });
        } catch (err) {
          console.warn('Failed to create organisation user record for new user:', err);
        }
      }

      // Update auth user email
      try {
        await adminAuth.updateUser(authUid, { email });
      } catch (err) {
        // ignore
      }

      const customToken = await adminAuth.createCustomToken(authUid);
      return NextResponse.json({
        ok: true,
        customToken,
        email,
        assignedWorkspace,
        uid: authUid
      });
    }

    return NextResponse.json({
      ok: true,
      email,
      assignedWorkspace
    });
  } catch (err: any) {
    console.error('Failed to consume login token:', err);
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err)
    }, { status: 500 });
  }
}