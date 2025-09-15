import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, error: 'Missing token' });

  try {
    const tokenRef = adminDb.collection('loginTokens').doc(token);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return res.status(404).json({ ok: false, error: 'Token not found' });

    const data = tokenSnap.data() as any;
    const now = new Date();
    if (data.expiresAt && new Date(data.expiresAt) < now) {
      return res.status(410).json({ ok: false, error: 'Token expired' });
    }

    // Mark token consumed (idempotent)
    try {
      await tokenRef.update({ consumedAt: new Date().toISOString(), consumedIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null });
    } catch (e) {
      // ignore update errors
    }

    const email: string | undefined = data.email;
    if (!email) return res.status(400).json({ ok: false, error: 'Token has no email' });

    // Try to find a user document with this email
    const usersQuery = adminDb.collection('users').where('email', '==', email).limit(1);
    const usersSnap = await usersQuery.get();
    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      const uid = userDoc.id;

      // Create a Firebase custom token for client sign-in
      const customToken = await adminAuth.createCustomToken(uid);
      return res.status(200).json({ ok: true, customToken, email });
    }

    // No user exists; return email so client can pre-fill sign-up / show read-only view
    return res.status(200).json({ ok: true, email });
  } catch (err: any) {
    console.error('Failed to consume login token', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
