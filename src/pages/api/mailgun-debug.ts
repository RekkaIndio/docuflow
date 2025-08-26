import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.MAILGUN_API_KEY || '';
  const domain = process.env.MAILGUN_DOMAIN || '';
  res.status(200).json({
    apiKey: apiKey ? apiKey.slice(0, 6) + '...' + apiKey.slice(-4) : '',
    apiKeyLength: apiKey.length,
    apiKeyType: typeof apiKey,
    domain,
    domainLength: domain.length,
    domainType: typeof domain,
  });
}
