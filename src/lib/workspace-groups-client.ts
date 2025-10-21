import type { WorkspaceGroup } from '@/types';

const API_BASE = '/api/admin/workspace-groups';

export async function getWorkspaceGroups(orgId: string | null | undefined): Promise<WorkspaceGroup[]> {
  if (!orgId) return [];
  try {
    const resp = await fetch(`${API_BASE}?orgId=${encodeURIComponent(orgId)}`);
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => null);
    if (!data || !Array.isArray(data.groups)) return [];
    return data.groups as WorkspaceGroup[];
  } catch (error) {
    console.error('Failed to load workspace groups', error);
    return [];
  }
}

export async function createWorkspaceGroup(
  orgId: string,
  group: { name: string; description?: string | null; color?: string | null }
): Promise<WorkspaceGroup | null> {
  if (!orgId) throw new Error('Organisation ID is required');
  try {
    const resp = await fetch(`${API_BASE}?orgId=${encodeURIComponent(orgId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!resp.ok) {
      const message = await resp.text().catch(() => '');
      throw new Error(message || `Failed to create workspace group (${resp.status})`);
    }
    const data = await resp.json().catch(() => null);
    return data?.group || null;
  } catch (error) {
    console.error('Failed to create workspace group', error);
    throw error;
  }
}

export async function updateWorkspaceGroup(
  orgId: string,
  groupId: string,
  updates: Partial<{ name: string; description: string | null; color: string | null }>
): Promise<WorkspaceGroup | null> {
  if (!orgId) throw new Error('Organisation ID is required');
  if (!groupId) throw new Error('Group ID is required');
  try {
    const resp = await fetch(`${API_BASE}/${encodeURIComponent(groupId)}?orgId=${encodeURIComponent(orgId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!resp.ok) {
      const message = await resp.text().catch(() => '');
      throw new Error(message || `Failed to update workspace group (${resp.status})`);
    }
    const data = await resp.json().catch(() => null);
    return data?.group || null;
  } catch (error) {
    console.error('Failed to update workspace group', error);
    throw error;
  }
}

export async function deleteWorkspaceGroup(orgId: string, groupId: string): Promise<boolean> {
  if (!orgId) throw new Error('Organisation ID is required');
  if (!groupId) throw new Error('Group ID is required');
  try {
    const resp = await fetch(`${API_BASE}/${encodeURIComponent(groupId)}?orgId=${encodeURIComponent(orgId)}`, {
      method: 'DELETE',
    });
    if (!resp.ok) {
      const message = await resp.text().catch(() => '');
      throw new Error(message || `Failed to delete workspace group (${resp.status})`);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete workspace group', error);
    throw error;
  }
}

export async function assignWorkspaceToGroup(
  workspaceId: string,
  orgId: string,
  groupId: string | null
): Promise<void> {
  if (!workspaceId) throw new Error('Workspace ID is required');
  if (!orgId) throw new Error('Organisation ID is required');
  try {
    const resp = await fetch(`/api/admin/workspaces/${encodeURIComponent(workspaceId)}?orgId=${encodeURIComponent(orgId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceGroupId: groupId }),
    });
    if (!resp.ok) {
      const message = await resp.text().catch(() => '');
      throw new Error(message || `Failed to assign workspace group (${resp.status})`);
    }
  } catch (error) {
    console.error('Failed to assign workspace to group', error);
    throw error;
  }
}
