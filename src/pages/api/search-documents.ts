import type { NextApiRequest, NextApiResponse } from 'next';
import { searchDocumentsInWorkspace, getAllWorkspaces } from '@/lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { workspaceId, query, searchAll, organisationId } = req.body;
  if (!query || (!workspaceId && !searchAll)) {
    res.status(400).json({ error: 'query and either workspaceId or searchAll=true are required' });
    return;
  }
  try {
    let results: any[] = [];
    // If searchAll is true, aggregate results across all workspaces
    if (searchAll) {
      // If an organisationId was provided, limit the workspaces fetched to that org
      const workspaces = await getAllWorkspaces(organisationId);
      for (const ws of workspaces) {
        try {
          // Prefer explicit organisationId from the request; otherwise fall back to the workspace's organisationId (if available)
          const wsOrgId = organisationId || (ws as any)?.organisationId || null;
          const wsResults = await searchDocumentsInWorkspace(ws.id, query, wsOrgId);
          // attach workspaceId and organisationId so callers know where the document lives
          const mapped = (wsResults || []).map(r => ({ ...r, workspaceId: ws.id, organisationId: wsOrgId }));
          results.push(...mapped);
        } catch (e) {
          console.warn('Failed searching workspace', ws.id, e);
        }
      }
    } else {
      const wsId = workspaceId as string;
      const wsResults = await searchDocumentsInWorkspace(wsId, query, organisationId || null);
      results = (wsResults || []).map(r => ({ ...r, workspaceId: wsId, organisationId: organisationId || null }));
    }

    // Also return the best match's documentId and folderId for UI highlighting
    let bestMatch = null;
    if (results && results.length > 0) {
      bestMatch = {
        documentId: results[0].id,
        folderId: results[0].folderId || null,
        name: results[0].name,
        workspaceId: results[0].workspaceId || null,
        organisationId: results[0].organisationId || null,
      };
    }

    res.status(200).json({ results, bestMatch });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to search documents', details: e?.message || e });
  }
}
