import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { sendWithMailgun } from '@/lib/mailgun';
import renderInviteEmail from '@/email-templates/invite/invite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: 'Missing email' });

  try {
    const tokenRef = adminDb.collection('loginTokens').doc();
    const tokenId = tokenRef.id;  
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    await tokenRef.set({ email: String(email).toLowerCase(), createdAt: now.toISOString(), expiresAt, consumedAt: null, type: 'magic' });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.APP_URL || 'http://localhost:3000');
    const inviteLink = `${appUrl.replace(/\/$/, '')}/accept-invite?token=${encodeURIComponent(tokenId)}`;
    const year = new Date().getFullYear();
    const html = renderInviteEmail({ inviterName: 'CG-360', workspaceName: 'CG-360', inviteLink, year });
    const subject = `Sign in to CG-360`;
    await sendWithMailgun({ to: [String(email).toLowerCase()], subject, html });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Failed to send magic link', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
