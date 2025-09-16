import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('@/lib/firebase-admin').default;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storagePath = url.searchParams.get('path');
    if (!storagePath) return NextResponse.json({ error: 'path query param required' }, { status: 400 });

    if (!admin || !admin.storage || typeof admin.storage !== 'function') {
      return NextResponse.json({ error: 'Storage not configured on server' }, { status: 500 });
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
    const file = bucket.file(storagePath);

    // signed URL valid for 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: expiresAt });

    return NextResponse.json({ url: signedUrl });
  } catch (err: any) {
    console.error('Failed to create signed URL:', err);
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
  }
}
