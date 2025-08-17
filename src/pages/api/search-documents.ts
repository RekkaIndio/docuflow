import type { NextApiRequest, NextApiResponse } from 'next';
import { searchDocumentsInWorkspace } from '@/lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { workspaceId, query } = req.body;
  if (!workspaceId || !query) {
    res.status(400).json({ error: 'workspaceId and query are required' });
    return;
  }
  try {
  console.log('[search-documents] workspaceId=', workspaceId, 'query=', query);
  const results = await searchDocumentsInWorkspace(workspaceId, query);
  console.log('[search-documents] results count=', results ? results.length : 0);
    // Also return the best match's documentId and folderId for UI highlighting
    let bestMatch = null;
    if (results && results.length > 0) {
      bestMatch = {
        documentId: results[0].id,
        folderId: results[0].folderId || null,
        name: results[0].name,
      };
    }
    res.status(200).json({ results, bestMatch });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to search documents', details: e?.message || e });
  }
}
