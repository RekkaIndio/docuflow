import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' });

  try {
    const userRef = doc(db, 'users', id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json(snap.data());
  } catch (error) {
    console.error('Failed to fetch user', error);
    return res.status(500).json({ error: 'Failed' });
  }
}
