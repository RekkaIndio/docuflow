import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Read requested storage path from query param `path`
    const url = new URL(request.url);
    const storagePath = url.searchParams.get('path');

    if (!storagePath) {
      return NextResponse.json({ error: 'Missing required query parameter `path`' }, { status: 400 });
    }

    // Only allow workspace policy paths to avoid creating an open proxy
    // Accept both legacy `workspaces/{workspaceId}/...` and org-scoped
    // `organisations/{orgId}/workspaces/{workspaceId}/...` paths.
    const isWorkspacePath = storagePath.startsWith('workspaces/');
    const isOrgWorkspacePath = storagePath.startsWith('organisations/') && storagePath.includes('/workspaces/');
    if (!isWorkspacePath && !isOrgWorkspacePath) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Lazily require admin SDK (keeps import behaviour consistent with other routes)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminModule = require('@/lib/firebase-admin');
    const admin = adminModule && (adminModule.default || adminModule);

    if (!admin || !admin.storage) {
      return NextResponse.json({ error: 'Firebase admin storage not configured' }, { status: 500 });
    }

    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cfg = require('@/lib/firebase-config');
        bucketName = cfg?.firebaseConfig?.storageBucket || bucketName;
      } catch (e) {
        // ignore
      }
    }

    const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Download file buffer from storage
    const data = await file.download();
    const buffer = Array.isArray(data) ? data[0] : data;

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${storagePath.split('/').pop()}"`,
      // Allow the app origin to fetch this; use NEXT_PUBLIC_SITE_URL if set otherwise allow localhost:9002 for dev
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Accept-Ranges': 'bytes',
    };

    return new NextResponse(buffer as any, { headers });
  } catch (err: any) {
    console.error('Storage proxy error', err);
    return NextResponse.json({ error: 'Failed to fetch file', details: err?.message || String(err) }, { status: 500 });
  }
}

// Simple OPTIONS handler to satisfy preflight requests
export function OPTIONS() {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
  };
  return new NextResponse(null, { headers });
}
