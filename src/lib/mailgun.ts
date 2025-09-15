import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export async function sendWithMailgun({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const apiUrl = process.env.MAILGUN_API_URL || 'https://api.eu.mailgun.net';

  if (!apiKey || !domain) {
    throw new Error('Mailgun not configured');
  }

  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({ username: 'api', key: apiKey, url: apiUrl });
  const from = `Docuflow <postmaster@${domain}>`;
  const resp = await mg.messages.create(domain, {
    from,
    to,
    subject,
    html,
  });

  return resp;
}
