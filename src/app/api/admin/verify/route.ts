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
    if (!isAdmin && decoded.uid) {
      try {
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as any;
          const role = (userData?.role || '').toString().toLowerCase();
          if (role === 'admin' || role === 'owner') {
            isAdmin = true;
          }
        }
      } catch (userErr) {
        console.warn('[verify] failed admin role lookup', userErr);
      }
    }

    return NextResponse.json({ isAdmin, isOwner });
  } catch (e) {
    console.warn('/api/admin/verify token verify error:', e?.toString?.() ?? e);
    return NextResponse.json({ isAdmin: false, isOwner: false }, { status: 401 });
  }
}
