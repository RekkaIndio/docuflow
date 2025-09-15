import { NextApiRequest, NextApiResponse } from 'next';
import { sendAssignmentsForPlan } from '@/actions/action-plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Temporarily disabled: email assignment sending is being simplified. This route intentionally
    // returns 501 so assignments are not auto-sent. Re-enable by restoring the original implementation.
    return res.status(501).json({ ok: false, error: 'Send assignments disabled' });
  } catch (err) {
    console.error('API send-assignments error', err);
    return res.status(500).json({ error: 'failed' });
  }
}
