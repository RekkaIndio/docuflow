import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept audit routes
  if (pathname.startsWith('/audits') && !pathname.startsWith('/audits/accident-incident')) {
    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Audit pages temporarily disabled</title>
        <style>body{font-family:Inter,ui-sans-serif,system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#fff; color:#111; display:flex; align-items:center; justify-content:center; height:100vh; margin:0} .card{max-width:720px;border:1px solid #f1e9b8;background:#fff8e6;padding:28px;border-radius:8px;text-align:center}</style>
      </head>
      <body>
        <div class="card">
          <h1 style="margin:0 0 8px 0;font-size:20px">Audit pages temporarily disabled</h1>
          <p style="margin:0;color:#333">To debug build issues we have temporarily disabled audit pages except <strong>/audits/accident-incident</strong>. If you need a specific audit page enabled for testing, let me know which one and I can enable it individually.</p>
        </div>
      </body>
    </html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/audits/:path*'],
};
