import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This API route runs in Node (not Edge) and is allowed to import firebase-admin.
// It verifies a bearer token using firebase-admin and returns a small JSON
// payload indicating whether the token belongs to an admin user.

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
    console.warn('Failed to initialize firebase-admin in /api/admin/verify:', e?.toString?.() ?? e);
  }
}

const adminDb = admin.firestore();

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return NextResponse.json({ isAdmin: false, isOwner: false }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    const roleClaim = (decoded?.role as string | undefined)?.toLowerCase?.();
    let isOwner = decoded?.owner === true || roleClaim === 'owner';
    console.log('[verify] decoded uid:', decoded.uid, 'email:', decoded.email, 'roleClaim:', roleClaim, 'isOwner:', isOwner);

    if (!isOwner) {
      try {
        const emailKey = (decoded.email || '').toLowerCase();
        if (emailKey) {
          const emailDoc = await adminDb.collection('owners').doc(emailKey).get();
          if (emailDoc.exists) isOwner = true;
        }
        if (!isOwner && decoded.uid) {
          const uidDoc = await adminDb.collection('owners').doc(decoded.uid).get();
          if (uidDoc.exists) isOwner = true;
        }
      } catch (ownerErr) {
        console.warn('[verify] failed owner collection lookup', ownerErr);
      }
    }

        let isAdmin = isOwner || decoded?.admin === true || roleClaim === 'admin';
    console.log('[verify] initial isAdmin:', isAdmin);
    if (!isAdmin && decoded.uid) {
      try {
        // Check top-level users collection first
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as any;
          const role = (userData?.role || '').toString().toLowerCase();
          console.log('[verify] top-level user found, role:', role);
          if (role === 'admin' || role === 'owner') {
            isAdmin = true;
          }
        } else {
          // Fallback: check org-scoped users via collectionGroup
          const snaps = await adminDb.collectionGroup('users').where('id', '==', decoded.uid).limit(1).get();
          if (!snaps.empty) {
            const docSnap = snaps.docs[0];
            const userData = docSnap.data() as any;
            const role = (userData?.role || '').toString().toLowerCase();
            console.log('[verify] org-scoped user found, role:', role, 'path:', docSnap.ref.path);
            if (role === 'admin' || role === 'owner') {
              isAdmin = true;
            }
          } else {
            console.log('[verify] no user doc found for uid:', decoded.uid);
          }
        }
      } catch (userErr) {
        console.warn('[verify] failed admin role lookup', userErr);
      }
    }
    console.log('[verify] final isAdmin:', isAdmin, 'isOwner:', isOwner);

    return NextResponse.json({ isAdmin, isOwner });
  } catch (e) {
    console.warn('/api/admin/verify token verify error:', e?.toString?.() ?? e);
    return NextResponse.json({ isAdmin: false, isOwner: false }, { status: 401 });
  }
}
