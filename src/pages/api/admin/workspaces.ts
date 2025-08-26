import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllWorkspaces } from '@/lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // NOTE: This endpoint currently does not perform server-side auth checks.
    // In production, enforce admin-only access here (verify session/cookies/JWT).
    try {
      const workspaces = await getAllWorkspaces();
      return res.status(200).json({ workspaces });
    } catch (innerErr) {
      console.warn('getAllWorkspaces failed, falling back to lightweight read', innerErr);
      // Lightweight fallback: read workspace docs directly and return id + name
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = collection(db, 'workspaces');
        const snaps = await getDocs(q);
        const workspaces = snaps.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        return res.status(200).json({ workspaces });
      } catch (fallbackErr: any) {
        console.error('Fallback read failed for workspaces', fallbackErr);
        return res.status(200).json({ workspaces: [] });
      }
    }
  } catch (error: any) {
    console.error('Failed to load all workspaces', error);
    return res.status(500).json({ error: 'Failed to load workspaces', details: error?.message || String(error) });
  }
}
