import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware that prefers verifying Firebase ID tokens if credentials are available.
// Fallback: cookie check 'isAdmin' === '1' (development convenience).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Try to verify Firebase ID token if possible.
  try {
    const authHeader = req.headers.get('authorization') || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const tokenFromCookie = req.cookies.get('token')?.value ?? null;
    const idToken = tokenFromHeader || tokenFromCookie;

    // Only attempt firebase-admin verification if there's a token and credentials available
    const canUseAdmin = Boolean(process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (idToken && canUseAdmin) {
      // Lazy import to avoid adding firebase-admin at runtime unless configured
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        // Initialize admin SDK with credentials from env if provided
        if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
          const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
          admin.initializeApp({ credential: admin.credential.cert(creds) });
        } else {
          admin.initializeApp();
        }
      }

      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        // Accept if token contains admin custom claim or role
        const isAdmin = decoded.admin === true || decoded.role === 'Admin' || decoded.role === 'admin';
        if (isAdmin) return NextResponse.next();
        // otherwise redirect
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      } catch (e) {
        // token verification failed -> fall through to cookie check
        console.warn('Firebase token verification failed in middleware:', e?.toString?.() ?? e);
      }
    }
  } catch (e) {
    console.warn('Middleware firebase-admin init error:', e?.toString?.() ?? e);
  }

  // Fallback dev check: cookie 'isAdmin' === '1'
  const isAdminCookie = req.cookies.get('isAdmin')?.value === '1';
  if (isAdminCookie) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
