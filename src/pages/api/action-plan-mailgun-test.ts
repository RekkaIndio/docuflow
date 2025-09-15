import type { NextApiRequest, NextApiResponse } from 'next';
import renderActionPlanAssignmentEmail from '@/email-templates/action-plan-assignment';
import { sendWithMailgun } from '@/lib/mailgun';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { to, monthKey, assignedBy } = req.body || {};
  if (!to || !monthKey || !assignedBy) return res.status(400).json({ ok: false, error: 'Missing to, monthKey or assignedBy' });

  try {
    const itemsSummaryHtml = `<ul><li>Sample item — High priority</li></ul>`;

    // create login token doc for this recipient (1 hour expiry)
    let tokenId: string | null = null;
    try {
      const tokenDoc = await addDoc(collection(db, 'loginTokens'), {
        email: Array.isArray(to) ? to[0] : to,
        workspaceId: 'test',
        monthKey,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString()
      });
      tokenId = tokenDoc.id;
    } catch (e) {
      console.warn('Failed to create test login token', e);
    }

    const recipient = Array.isArray(to) ? to[0] : to;
    const { subject, html } = renderActionPlanAssignmentEmail({ monthKey, assignedBy, itemsSummaryHtml, loginToken: tokenId, recipientEmail: recipient });
    const resp = await sendWithMailgun({ to: Array.isArray(to) ? to : [to], subject, html });
    return res.status(200).json({ ok: true, result: resp });
  } catch (err: any) {
    console.error('Mailgun test send failed', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
