import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const hasApiKey = !!process.env.MAILGUN_API_KEY;
  const hasDomain = !!process.env.MAILGUN_DOMAIN;
  const hasToken = !!process.env.MAILGUN_TEST_TOKEN;

  return res.status(200).json({ hasApiKey, hasDomain, hasToken });
}
