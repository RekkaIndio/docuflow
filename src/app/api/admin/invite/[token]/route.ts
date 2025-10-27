import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendWithMailgun } from '@/lib/mailgun';
import renderInviteEmail from '@/email-templates/invite/invite';

export async function DELETE(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    const ref = adminDb.collection('loginTokens').doc(token);
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Failed to delete invite token', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  // Resend invite email for a token
  try {
    const token = params.token;
    const ref = adminDb.collection('loginTokens').doc(token);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'Token not found' }, { status: 404 });
    const data = snap.data() as any;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://cg360.co.uk';
    const inviteLink = `${appUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(token)}`;
    const year = new Date().getFullYear();
    const html = renderInviteEmail({ inviterName: data.inviterName || 'A colleague', workspaceName: data.workspaceName || 'workspace', inviteLink, year });
    const subject = `${data.inviterName || 'Someone'} invited you to join ${data.workspaceName || 'Docuflow'}`;
    await sendWithMailgun({ to: [data.email], subject, html });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Failed to resend invite email', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
