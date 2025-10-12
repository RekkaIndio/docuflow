import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware that prefers verifying Firebase ID tokens if credentials are available.
// Fallback: cookie check 'isAdmin' === '1' (development convenience).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith('/admin');
  const isOwnerPath = pathname.startsWith('/owner');

  if (!isAdminPath && !isOwnerPath) return NextResponse.next();

  // Try to verify Firebase ID token if possible by delegating verification
  // to a server-side API route so we avoid importing `firebase-admin` in
  // the Edge middleware (which is not allowed).
  try {
    const authHeader = req.headers.get('authorization') || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const tokenFromCookie = req.cookies.get('token')?.value ?? null;
    const idToken = tokenFromHeader || tokenFromCookie;

    // Only attempt server-side verification if there's a token and credentials available
    const canUseAdmin = Boolean(process.env.FIREBASE_ADMIN_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (idToken && canUseAdmin) {
      try {
        // Call an internal server-side API that performs the firebase-admin verification.
        // Use the incoming request's URL as the base so the origin is correct.
        const verifyUrl = new URL('/api/admin/verify', req.url);
        const res = await fetch(verifyUrl.toString(), {
          method: 'GET',
          headers: {
            authorization: `Bearer ${idToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if ((isAdminPath && data?.isAdmin) || (isOwnerPath && data?.isOwner)) {
            return NextResponse.next();
          }
          const url = req.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      } catch (e) {
        // verification failed or internal API not available -> fall through to cookie check
        console.warn('Middleware token verification via internal API failed:', e?.toString?.() ?? e);
      }
    }
  } catch (e) {
    console.warn('Middleware verification error:', e?.toString?.() ?? e);
  }

  // Fallback dev check: cookie-based override
  // - Admin pages: accept either an admin cookie OR an owner cookie as owners
  //   are privileged and should be able to access admin pages during local/dev flows.
  if (isAdminPath) {
    const isAdminCookie = req.cookies.get('isAdmin')?.value === '1' || req.cookies.get('isOwner')?.value === '1';
    if (isAdminCookie) return NextResponse.next();
  }

  // - Owner pages: only allow explicit owner cookie. Do NOT allow a generic
  //   admin cookie to grant owner access via the fallback, because admin users
  //   are not necessarily owners and owner pages may expose higher-privilege
  //   operations.
  if (isOwnerPath) {
    const isOwnerCookie = req.cookies.get('isOwner')?.value === '1';
    if (isOwnerCookie) return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/owner/:path*'],
};
