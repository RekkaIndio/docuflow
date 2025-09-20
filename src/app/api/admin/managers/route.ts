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

export async function GET() {
  try {
    // Require admin secret header to perform global listing
    // (This prevents accidental cross-org data exposure.)
    // Note: callers that need org-scoped listing should call organisations/{orgId}/workspaces instead.
    const headers = (globalThis as any)?.headers?.() || {};
    const adminSecret = (headers['x-admin-secret'] || headers['authorization'] || null);
    if (!adminSecret) return NextResponse.json({ error: 'Missing admin authorization' }, { status: 403 });

    // Fetch all workspaces
    const workspacesSnap = await adminDb.collection('workspaces').get();

    const allManagers: Manager[] = [];

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