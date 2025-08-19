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
    const workspaces = await getAllWorkspaces();
    return res.status(200).json({ workspaces });
  } catch (error) {
    console.error('Failed to load all workspaces', error);
    return res.status(500).json({ error: 'Failed to load workspaces' });
  }
}
