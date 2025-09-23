import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Serve a simple coming-soon page when the request hostname matches the live domain.
  // This rewrites all requests to the coming-soon page on cg360.co.uk (and www) while
  // leaving the primary vercel preview domain unchanged for development.
  const targetHosts = ['cg360.co.uk', 'www.cg360.co.uk'];

  // Skip internal next, static, and api routes so assets and API continue to work if needed
  if (targetHosts.includes(hostname) &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/assets') &&
      !pathname.startsWith('/favicon')) {
    const url = req.nextUrl.clone();
    url.pathname = '/coming-soon';
    return NextResponse.rewrite(url);
  }

  // Default behavior: allow other middleware or routes to handle the request
  return NextResponse.next();
}

export const config = {
  matcher: ['/audits/:path*'],
};
