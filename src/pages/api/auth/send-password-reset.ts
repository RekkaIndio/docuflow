import type { NextApiRequest, NextApiResponse } from 'next';
import { sendWithMailgun } from '@/lib/mailgun';
import renderPasswordResetEmail from '@/email-templates/password-reset';
import { getAuth } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: 'Missing email' });

  try {
    // Generate Firebase password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'
    });

    const year = new Date().getFullYear();
    const html = renderPasswordResetEmail({ email, resetLink, year });
    const subject = `Reset your CG360 password`;

    await sendWithMailgun({ to: [String(email).toLowerCase()], subject, html });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Failed to send password reset email', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}