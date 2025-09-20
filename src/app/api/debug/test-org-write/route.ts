import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const docRef = adminDb.collection('organisations').doc(orgId).collection('policies').doc('_dev_write_test');

    const now = new Date().toISOString();
    try {
      await docRef.set({ test: true, timestamp: now }, { merge: true });
      return NextResponse.json({ ok: true, message: `Wrote test doc to organisations/${orgId}/policies/_dev_write_test` });
    } catch (writeErr) {
      return NextResponse.json({ ok: false, error: 'write_failed', message: (writeErr && (writeErr as any).message) || String(writeErr), stack: (writeErr && (writeErr as any).stack) || null }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'internal', message: (err as any)?.message || String(err) }, { status: 500 });
  }
}
