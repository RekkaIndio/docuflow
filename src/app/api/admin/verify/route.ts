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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return NextResponse.json({ isAdmin: false }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    const isAdmin = decoded?.admin === true || decoded?.role === 'Admin' || decoded?.role === 'admin';
    return NextResponse.json({ isAdmin });
  } catch (e) {
    console.warn('/api/admin/verify token verify error:', e?.toString?.() ?? e);
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
}
