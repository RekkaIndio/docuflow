import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  workspaceId: string;
  workspaceName: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function GET(req: Request) {
  try {
    // Require admin secret header to perform global listing
    // (This prevents accidental cross-org data exposure.)
    // Note: callers that need org-scoped listing should call organisations/{orgId}/workspaces instead.
    const headers = (globalThis as any)?.headers?.() || {};
    const adminSecret = (headers['x-admin-secret'] || headers['authorization'] || null);
    if (!adminSecret) return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });

    // Check for optional orgId query parameter to scope results
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');

    const allManagers: Manager[] = [];

    if (orgId) {
      // Fetch org-scoped workspaces
      const orgWorkspacesSnap = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
      
      for (const workspaceDoc of orgWorkspacesSnap.docs) {
        const workspaceData = workspaceDoc.data();
        const workspaceId = workspaceDoc.id;
        const workspaceName = workspaceData.name || 'Unnamed Workspace';

        const managers = workspaceData.managers || [];

        managers.forEach((manager: any) => {
          allManagers.push({
            ...manager,
            workspaceId,
            workspaceName,
          });
        });
      }
    } else {
      // Fetch legacy top-level workspaces (for backward compatibility)
      const workspacesSnap = await adminDb.collection('workspaces').get();

      // Extract managers from each workspace
      for (const workspaceDoc of workspacesSnap.docs) {
        const workspaceData = workspaceDoc.data();
        const workspaceId = workspaceDoc.id;
        const workspaceName = workspaceData.name || 'Unnamed Workspace';

        const managers = workspaceData.managers || [];

        // Add workspace context to each manager
        managers.forEach((manager: any) => {
          allManagers.push({
            ...manager,
            workspaceId,
            workspaceName,
          });
        });
      }
      
      // Also fetch from all org-scoped workspaces using collectionGroup
      try {
        const orgWorkspacesSnap = await adminDb.collectionGroup('workspaces').get();
        for (const workspaceDoc of orgWorkspacesSnap.docs) {
          // Skip if it's a top-level workspace (already processed)
          if (workspaceDoc.ref.parent.id === 'workspaces') continue;
          
          const workspaceData = workspaceDoc.data();
          const workspaceId = workspaceDoc.id;
          const workspaceName = workspaceData.name || 'Unnamed Workspace';

          const managers = workspaceData.managers || [];

          managers.forEach((manager: any) => {
            allManagers.push({
              ...manager,
              workspaceId,
              workspaceName,
            });
          });
        }
      } catch (cgErr) {
        console.warn('Failed to fetch org-scoped workspaces via collectionGroup', cgErr);
      }
    }

    // Sort by name for better UX
    allManagers.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      managers: allManagers,
      total: allManagers.length
    });

  } catch (error) {
    console.error('Failed to fetch managers:', error);
    return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 });
  }
}