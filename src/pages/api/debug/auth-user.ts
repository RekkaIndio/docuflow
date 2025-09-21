import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';

// Dev-only endpoint: /api/debug/auth-user?uid=...  
// Returns the adminAuth.getUser(...) result for quick inspection during local debugging.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ ok: false, error: 'Not available in production' });
  }

  const { uid } = req.query;
  if (!uid || Array.isArray(uid)) return res.status(400).json({ ok: false, error: 'Missing uid' });

  try {
    const user = await adminAuth.getUser(String(uid));
    return res.status(200).json({ ok: true, user });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
