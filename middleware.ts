import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Prefer the runtime hostname but fall back to the Host header which Vercel sets.
  const hostname = req.nextUrl.hostname || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

  // Serve a simple coming-soon page when the request hostname matches the live domain.
  // This rewrites all requests to the coming-soon page on cg360.co.uk (and www) while
  // leaving the primary vercel preview domain unchanged for development.
  // Match hostnames that indicate this project (production domain or preview host variants)
  const isTargetHost = hostname.endsWith('cg360.co.uk') || hostname.includes('cg-360') || hostname.includes('cg360');

  // Skip internal next, static, and api routes so assets and API continue to work if needed
  if (isTargetHost &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/assets') &&
      !pathname.startsWith('/favicon') &&
      !pathname.startsWith('/coming-soon')) {
    // Return a small inline coming-soon HTML response directly from middleware.
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>CG-360 — Coming Soon</title>
        <style>
          body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial;background:#fff;margin:0;display:flex;align-items:center;justify-content:center;height:100vh}
          .wrap{max-width:680px;text-align:center;padding:24px}
          .logo{width:96px;height:96px;margin:0 auto 18px}
          h1{font-size:28px;margin:0 0 8px;color:#0f172a}
          p{color:#475569;margin:0 0 12px}
        </style>
      </head>
      <body>
        <div class="wrap">
          <img class="logo" src="https://docuflow.ai/assets/Neurodiversity_Symbol.png" alt="CG-360" />
          <h1>CG-360</h1>
          <p>We're launching soon. This site is temporarily unavailable.</p>
        </div>
      </body>
    </html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0'
      }
    });
  }

  // Default behavior: allow other middleware or routes to handle the request
  return NextResponse.next();
}

export const config = {
  // Run middleware for all routes so we can selectively rewrite by hostname.
  matcher: ['/:path*'],
};
