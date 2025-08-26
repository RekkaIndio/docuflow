import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { renderWelcomeEmail } from '../../email-templates/welcome/welcome';
import { renderAdminUploadEmail } from '../../email-templates/admin-upload/admin-upload';
import { renderMissingDocsEmail } from '../../email-templates/missing-docs/missing-docs';

type Data = {
  ok: boolean;
  result?: any;
  error?: string;
};

/**
 * Simple Mailgun test endpoint.
 *
 * POST /api/mailgun-test
 * Body (JSON): { to: string, subject?: string, text?: string, from?: string }
 *
 * This endpoint reads the following environment variables:
 * - MAILGUN_API_KEY
 * - MAILGUN_DOMAIN
 *
 * NOTE: Do NOT commit your API key. Set env vars locally or in your deployment platform.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, result: 'POST JSON { to, subject, text, from } to send a test email.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const apiUrl = process.env.MAILGUN_API_URL || 'https://api.eu.mailgun.net';
  // No test token check; open endpoint for testing as in Mailgun's example

  if (!apiKey || !domain) {
    return res.status(500).json({ ok: false, error: 'MAILGUN_API_KEY or MAILGUN_DOMAIN not configured in environment.' });
  }


  const { to, subject = 'Test from Docuflow', text = 'This is a test message from Docuflow Mailgun integration.', from = `Docuflow <postmaster@${domain}>`, template, vars } = req.body || {};

  if (!to || typeof to !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing `to` address in request body.' });
  }

  try {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: 'api', key: apiKey, url: apiUrl });

    let html: string | undefined = undefined;
    let sendText = text;

    if (template === 'welcome') {
      html = renderWelcomeEmail(vars || { name: '' });
      sendText = undefined;
    } else if (template === 'admin-upload') {
      html = renderAdminUploadEmail(vars || { managerName: '', uploadedBy: '', documentName: '', uploadedAt: '' });
      sendText = undefined;
    } else if (template === 'missing-docs') {
      html = renderMissingDocsEmail(vars || { managerName: '', homeName: '', month: '', missingList: '' });
      sendText = undefined;
    }

    const resp = await mg.messages.create(domain, {
      from,
      to: [to],
      subject,
      ...(html ? { html } : {}),
      ...(sendText ? { text: sendText } : {}),
    });

    return res.status(200).json({ ok: true, result: resp });
  } catch (err: any) {
    console.error('Mailgun send error', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
