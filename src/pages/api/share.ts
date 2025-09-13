import type { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import renderSharedDocumentEmail from '@/email-templates/shared-document/shared-document';

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

  const { teamId, url, name, subject, emailBody } = req.body || {};
  if (!teamId || !url) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  try {
    // Lookup team in Firestore to get emails
    let teamData: any = null;
    // Try workspace subcollection lookup if teamId encodes workspace (pattern admin-{workspaceId} etc.)
    try {
      const topRef = doc(db, 'teams', teamId);
      const topSnap = await getDoc(topRef);
      if (topSnap.exists()) {
        teamData = topSnap.data();
      }
    } catch (e) {
      // ignore
    }

    // If not found at top-level, try collectionGroup search or workspace subcollections
    if (!teamData) {
      // Try collectionGroup search for teamId
      try {
        const cg = await import('firebase/firestore').then(m => m);
        const q = cg.query(cg.collectionGroup(db, 'teams'), cg.where('id', '==', teamId));
        const snap = await cg.getDocs(q);
        if (!snap.empty) {
          teamData = snap.docs[0].data();
        }
      } catch (e) {
        // ignore
      }
    }

    if (!teamData) {
      return res.status(404).json({ ok: false, error: 'Team not found.' });
    }
    const recipients: string[] = Array.isArray(teamData.emails) ? teamData.emails : [];

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ ok: false, error: 'No email recipients configured for this team.' });
    }

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({ username: 'api', key: apiKey, url: apiUrl });

    const from = `Docuflow <postmaster@${domain}>`;
    const html = renderSharedDocumentEmail({ sharerName: (req as any).user?.name || 'A colleague', teamName: teamData.name || 'team', documentName: name || url, documentUrl: url, message: emailBody });
    const sendRes = await mg.messages.create(domain, {
      from,
      to: recipients,
      subject: subject || `Document shared: ${name || url}`,
      html,
    });

    // Record a simple audit log in Firestore
    try {
      const sharesCol = collection(db, 'shares');
      await addDoc(sharesCol, {
        teamId,
        documentName: name || null,
        documentUrl: url,
        sharedAt: new Date().toISOString(),
        // If authentication middleware attaches user, include it; otherwise leave null
        sharedBy: (req as any).user?.id || null,
      });
    } catch (e) {
      // non-fatal
      console.warn('Failed to write share audit log', e);
    }

    return res.status(200).json({ ok: true, result: sendRes });
  } catch (err: any) {
    console.error('Share send error', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
