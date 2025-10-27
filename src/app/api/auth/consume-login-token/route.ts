import { NextResponse } from 'next/server';
import admin, { adminDb, adminAuth } from '@/lib/firebase-admin';
import crypto from 'crypto';
import type { DocumentReference } from 'firebase-admin/firestore';

type ResolvedWorkspaceRef = {
  ref: DocumentReference;
  organisationId: string | null;
};

async function resolveWorkspaceReference(workspaceId: string, orgId: string | null): Promise<ResolvedWorkspaceRef> {
  let fallbackOrgId = orgId ?? null;

  if (orgId) {
    const orgScopedRef = adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`);
    const snap = await orgScopedRef.get();
    if (snap.exists) {
      return { ref: orgScopedRef, organisationId: orgId };
    }
  }

  const topLevelRef = adminDb.collection('workspaces').doc(workspaceId);
  const topSnap = await topLevelRef.get();
  if (topSnap.exists) {
    const data = topSnap.data() as any;
    const derivedOrgId = (data && data.organisationId) || fallbackOrgId || null;
    return { ref: topLevelRef, organisationId: derivedOrgId };
  }

  try {
    const cgSnap = await adminDb
      .collectionGroup('workspaces')
      .where(admin.firestore.FieldPath.documentId(), '==', workspaceId)
      .limit(1)
      .get();

    if (!cgSnap.empty) {
      const docSnap = cgSnap.docs[0];
      const parentCollection = docSnap.ref.parent;
      const parentOrg = parentCollection?.parent;
      const derivedOrgId = parentOrg ? parentOrg.id : ((docSnap.data() as any)?.organisationId ?? fallbackOrgId ?? null);
      return { ref: docSnap.ref, organisationId: derivedOrgId ?? null };
    }
  } catch (err) {
    console.warn('resolveWorkspaceReference collectionGroup lookup failed', err);
  }

  const fallbackRef = orgId
    ? adminDb.doc(`organisations/${orgId}/workspaces/${workspaceId}`)
    : topLevelRef;

  return { ref: fallbackRef, organisationId: fallbackOrgId };
}

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

    // For member-invite tokens, the user is already created, so use the provided userId
    if (tokenData.type === 'member-invite' && tokenData.userId) {
      const uid = tokenData.userId;
      try {
        await adminAuth.getUser(uid);
        const customToken = await adminAuth.createCustomToken(uid);
        return NextResponse.json({
          ok: true,
          customToken,
          email,
          uid
        });
      } catch (err) {
        console.error('Failed to get user for member-invite token:', err);
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
      }
    }

    const workspaceIdFromToken = tokenData.workspaceId || null;
    const workspaceOrgIdFromToken = tokenData.workspaceOrgId || null;

    let resolvedWorkspaceOrgId = workspaceOrgIdFromToken || null;
    let resolvedWorkspaceRef: DocumentReference | null = null;

    if (workspaceIdFromToken) {
      try {
        const resolved = await resolveWorkspaceReference(workspaceIdFromToken, workspaceOrgIdFromToken || null);
        if (resolved) {
          resolvedWorkspaceRef = resolved.ref;
          resolvedWorkspaceOrgId = resolved.organisationId ?? resolvedWorkspaceOrgId;
        }
      } catch (err) {
        console.warn('Failed to resolve workspace reference for login token', err);
      }
    }

    const assignedWorkspace = workspaceIdFromToken ? {
      id: workspaceIdFromToken,
      organisationId: resolvedWorkspaceOrgId || null
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
      if (workspaceIdFromToken && resolvedWorkspaceRef) {
        try {
          await resolvedWorkspaceRef.update({ members: admin.firestore.FieldValue.arrayUnion(uid) });
        } catch (err) {
          try {
            await resolvedWorkspaceRef.set({ members: admin.firestore.FieldValue.arrayUnion(uid) }, { merge: true });
          } catch (err2) {
            console.warn('Failed to attach existing user to workspace members from token:', err2);
          }
        }
      }

      // Create organisation user record if org specified
      if (resolvedWorkspaceOrgId) {
        try {
          const orgUserRef = adminDb.doc(`organisations/${resolvedWorkspaceOrgId}/users/${uid}`);
          const orgUserSnap = await orgUserRef.get();
          if (!orgUserSnap.exists) {
            await orgUserRef.set({
              id: uid,
              role: 'Member',
              organisationId: resolvedWorkspaceOrgId,
              createdAt: adminDb.FieldValue.serverTimestamp()
            }, { merge: true });
          }

          // Ensure top-level user has organisationId
          const topUserRef = adminDb.collection('users').doc(uid);
          await topUserRef.set({ organisationId: resolvedWorkspaceOrgId }, { merge: true });
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
              organisationId: resolvedWorkspaceOrgId || null
          });
        }
      } catch (e) {
        console.warn('Failed to create Firestore user doc for invite:', e);
      }

      // Add to workspace members if specified
      if (workspaceIdFromToken && resolvedWorkspaceRef) {
        try {
          await resolvedWorkspaceRef.update({ members: admin.firestore.FieldValue.arrayUnion(authUid) });
        } catch (e) {
          try {
            await resolvedWorkspaceRef.set({ members: admin.firestore.FieldValue.arrayUnion(authUid) }, { merge: true });
          } catch (err2) {
            console.warn('Failed to add invited user to workspace members:', err2);
          }
        }
      }

      // Create organisation user record if org specified
      if (resolvedWorkspaceOrgId) {
        try {
          const orgUserRef = adminDb.doc(`organisations/${resolvedWorkspaceOrgId}/users/${authUid}`);
          await orgUserRef.set({
            id: authUid,
            role: 'Member',
            organisationId: resolvedWorkspaceOrgId,
            createdAt: adminDb.FieldValue.serverTimestamp()
          }, { merge: true });

          // Ensure top-level user has organisationId
          const topUserRef = adminDb.collection('users').doc(authUid);
          await topUserRef.set({ organisationId: resolvedWorkspaceOrgId }, { merge: true });
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