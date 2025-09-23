import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Prefer the runtime hostname but fall back to the Host header which Vercel sets.
  const hostname = req.nextUrl.hostname || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

  // Serve a simple coming-soon page when the request hostname matches the live domain.
  // This rewrites all requests to the coming-soon page on cg360.co.uk (and www) while
  // leaving the primary vercel preview domain unchanged for development.
  const targetHosts = ['cg360.co.uk', 'www.cg360.co.uk', 'cg-360.vercel.app', 'www.cg-360.vercel.app'];

  // Skip internal next, static, and api routes so assets and API continue to work if needed
  if (targetHosts.some(h => hostname.endsWith(h)) &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/assets') &&
      !pathname.startsWith('/favicon') &&
      !pathname.startsWith('/coming-soon')) {
    const url = req.nextUrl.clone();
    url.pathname = '/coming-soon';
    return NextResponse.rewrite(url);
  }

  // Default behavior: allow other middleware or routes to handle the request
  return NextResponse.next();
}

export const config = {
  // Run middleware for all routes so we can selectively rewrite by hostname.
  matcher: ['/:path*'],
};
