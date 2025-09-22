import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import renderInviteEmail from '@/email-templates/invite/invite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const apiUrl = process.env.MAILGUN_API_URL || 'https://api.eu.mailgun.net';

  if (!apiKey || !domain) {
    return res.status(500).json({ ok: false, error: 'MAILGUN_API_KEY or MAILGUN_DOMAIN not configured in environment.' });
  }

  const { to, inviterName, workspaceName, inviteLink } = req.body || {};
  if (!to || !inviterName || !workspaceName || !inviteLink) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  try {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: 'api', key: apiKey, url: apiUrl });
    const year = new Date().getFullYear();
    const html = renderInviteEmail({ inviterName, workspaceName, inviteLink, year });
    const subject = `${inviterName} invited you to join ${workspaceName} on CG360`;
    const from = `CG360 <postmaster@${domain}>`;

    const resp = await mg.messages.create(domain, {
      from,
      to: [to],
      subject,
      html,
    });

    return res.status(200).json({ ok: true, result: resp });
  } catch (err: any) {
    console.error('Mailgun send error', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
