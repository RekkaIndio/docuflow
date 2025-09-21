import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ ok: false, error: 'workspaceId required' }, { status: 400 });

    // simple auth: ensure admin header present or a valid id token
    // (reuse logic from invite/route.ts in production)
    const snaps = await adminDb.collection('loginTokens')
      .where('workspaceId', '==', workspaceId)
      .where('type', '==', 'invite')
      .get();
  const now = new Date();
  const invites = snaps.docs
    .map((d: any) => ({ id: d.id, ...(d.data() as any) }))
    .filter((t: any) => {
      if (t.consumedAt) return false;
      if (t.expiresAt && new Date(t.expiresAt) < now) return false;
      return true;
    });
    return NextResponse.json({ ok: true, invites });
  } catch (e: any) {
    console.error('Failed to list invites', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
