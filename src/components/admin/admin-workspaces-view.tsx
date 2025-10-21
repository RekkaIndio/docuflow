"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Users, MapPin, BarChart2, Plus, MoreVertical, Edit, Trash2, Target, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle, Clock, FileText, Building2, Shield, Zap, Database, Wifi, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { computeStaffAggregate } from '@/lib/computeStaffAggregate';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { getWorkspaceGroups, createWorkspaceGroup, updateWorkspaceGroup, deleteWorkspaceGroup, assignWorkspaceToGroup } from '@/lib/workspace-groups-client';
import { useAuth } from '@/hooks/use-auth';
import AdminPageHeader from '@/components/admin/admin-page-header';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { Workspace, WorkspaceGroup, Folder as WorkspaceFolder, Document as WorkspaceDocument } from '@/types';

const countDocumentsInEntry = (entry: WorkspaceFolder | WorkspaceDocument): number => {
  if (entry.type === 'document') {
    return 1;
  }
  return entry.items.reduce((sum, child) => sum + countDocumentsInEntry(child), 0);
};

export default function AdminWorkspacesView() {
  // Modal for workspace limit reached
  const [isLimitModalOpen, setIsLimitModalOpen] = React.useState(false);
  const { user, loading } = useAuth();
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [workspaceLimit, setWorkspaceLimit] = React.useState<number|null>(null);
  const [quotaLoading, setQuotaLoading] = React.useState(false);
  const orgId = React.useMemo(() => (user as any)?.organisationId || null, [user]);

  const [workspaceGroups, setWorkspaceGroups] = React.useState<WorkspaceGroup[]>([]);
  const [groupLoading, setGroupLoading] = React.useState(false);
  const [groupFilter, setGroupFilter] = React.useState<string>('all');
  const [workspaceGroupSaving, setWorkspaceGroupSaving] = React.useState<Record<string, boolean>>({});

  // Group management dialogs
  const [groupModalOpen, setGroupModalOpen] = React.useState(false);
  const [groupModalMode, setGroupModalMode] = React.useState<'create' | 'edit'>('create');
  const [groupModalGroup, setGroupModalGroup] = React.useState<WorkspaceGroup | null>(null);
  const [groupModalName, setGroupModalName] = React.useState('');
  const [groupModalDescription, setGroupModalDescription] = React.useState('');
  const [groupModalColor, setGroupModalColor] = React.useState('');
  const [isSavingGroup, setIsSavingGroup] = React.useState(false);
  const [groupToDelete, setGroupToDelete] = React.useState<WorkspaceGroup | null>(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = React.useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = React.useState(false);

  // Create workspace dialog
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const [newWorkspaceOwner, setNewWorkspaceOwner] = React.useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);

  // Rename/Delete dialogs
  const [isRenameWorkspaceOpen, setIsRenameWorkspaceOpen] = React.useState(false);
  const [renameWorkspaceData, setRenameWorkspaceData] = React.useState<{id: string, currentName: string} | null>(null);
  const [newRenameWorkspaceName, setNewRenameWorkspaceName] = React.useState('');
  const [isRenamingWorkspace, setIsRenamingWorkspace] = React.useState(false);

  const [isDeleteWorkspaceOpen, setIsDeleteWorkspaceOpen] = React.useState(false);
  const [deleteWorkspaceData, setDeleteWorkspaceData] = React.useState<{id: string, name: string} | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = React.useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = React.useState(false);

  // Aggregates (simple local derivation)
  const aggregated = React.useMemo(() => {
    const fileTypeCounts: Record<string, number> = {};
    const recentUploads: Array<{ id: string; name: string; createdAt: string; workspaceName: string }> = [];
    const workspaceDocCounts: Array<{ id: string; name: string; count: number }> = [];
    let totalFolders = 0;
    let totalDocuments = 0;

    for (const ws of workspaces) {
      totalFolders += (ws.folders?.length || 0);
      const folderEntries = ws.folders || [];
      const wsDocCount = folderEntries.reduce<number>((count, entry) => count + countDocumentsInEntry(entry), 0);
      workspaceDocCounts.push({ id: ws.id, name: ws.name || ws.id, count: wsDocCount });
      totalDocuments += wsDocCount;
    }

    const topWorkspaces = workspaceDocCounts.sort((a, b) => b.count - a.count).slice(0, 5);

    return { fileTypeCounts, topWorkspaces, totalFolders, totalDocuments, regions: {} };
  }, [workspaces]);

  const careOverview = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return { totalHomes: 0, totalBeds: 0, totalOccupied: 0, averageOccupancy: 0 };
    const homesWithBeds = workspaces.filter(w => typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number');
    const totalBeds = homesWithBeds.reduce((s, w) => s + (w.totalBeds || 0), 0);
    const totalOccupied = homesWithBeds.reduce((s, w) => s + (w.occupiedBeds || 0), 0);
    const homesWithPercentage = workspaces.filter(w => !(typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number') && typeof w.occupancy === 'number');
    const percentageOccupancy = homesWithPercentage.length ? (homesWithPercentage.reduce((s, w) => s + (w.occupancy || 0), 0) / homesWithPercentage.length) : 0;
    const averageOccupancy = totalBeds > 0 ? (totalOccupied / totalBeds) : percentageOccupancy;
    return { totalHomes: workspaces.length, totalBeds, totalOccupied, averageOccupancy };
  }, [workspaces]);

  const fetchWorkspaceGroups = React.useCallback(async (targetOrgId?: string | null) => {
    const activeOrgId = targetOrgId ?? orgId;
    if (!activeOrgId) {
      setWorkspaceGroups([]);
      return [] as WorkspaceGroup[];
    }
    setGroupLoading(true);
    try {
      const groups = await getWorkspaceGroups(activeOrgId);
      setWorkspaceGroups(groups);
      return groups;
    } catch (error) {
      console.error('Failed to load workspace groups', error);
      setWorkspaceGroups([]);
      return [] as WorkspaceGroup[];
    } finally {
      setGroupLoading(false);
    }
  }, [orgId]);

  const reloadWorkspaces = React.useCallback(async (targetOrgId?: string | null) => {
    const activeOrgId = targetOrgId ?? orgId;
    const isDevAdmin = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
    if (!activeOrgId && !isDevAdmin) {
      setWorkspaces([]);
      return [] as Workspace[];
    }
    try {
      const orgQuery = activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : '';
      const resp = await fetch(`/api/admin/workspaces${orgQuery}`);
      if (!resp.ok) {
        setWorkspaces([]);
        return [] as Workspace[];
      }
      const data = await resp.json();
      const items: Workspace[] = data?.workspaces || [];
      setWorkspaces(items);
      return items;
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
      setWorkspaces([]);
      return [] as Workspace[];
    }
  }, [orgId]);

  const resetGroupModal = () => {
    setGroupModalGroup(null);
    setGroupModalName('');
    setGroupModalDescription('');
    setGroupModalColor('');
  };

  const openCreateGroupModal = () => {
    setGroupModalMode('create');
    resetGroupModal();
    setGroupModalOpen(true);
  };

  const openEditGroupModal = (group: WorkspaceGroup) => {
    setGroupModalMode('edit');
    setGroupModalGroup(group);
    setGroupModalName(group.name);
    setGroupModalDescription(group.description || '');
    setGroupModalColor(group.color || '');
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!orgId) {
      alert('Organisation ID is required to manage workspace groups.');
      return;
    }
    const trimmedName = groupModalName.trim();
    if (!trimmedName) {
      alert('Please provide a group name.');
      return;
    }

    const payload = {
      name: trimmedName,
      description: groupModalDescription.trim() ? groupModalDescription.trim() : null,
      color: groupModalColor.trim() ? groupModalColor.trim() : null,
    };

    setIsSavingGroup(true);
    try {
      if (groupModalMode === 'create') {
        await createWorkspaceGroup(orgId, payload);
      } else if (groupModalGroup) {
        await updateWorkspaceGroup(orgId, groupModalGroup.id, payload);
      }
      await fetchWorkspaceGroups(orgId);
      await reloadWorkspaces(orgId);
      setGroupModalOpen(false);
      resetGroupModal();
    } catch (error) {
      console.error('Failed to save workspace group', error);
      alert('Failed to save workspace group.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!orgId || !groupToDelete) {
      setIsDeleteGroupOpen(false);
      return;
    }
    setIsDeletingGroup(true);
    try {
      await deleteWorkspaceGroup(orgId, groupToDelete.id);
      await fetchWorkspaceGroups(orgId);
      await reloadWorkspaces(orgId);
      setGroupToDelete(null);
      setIsDeleteGroupOpen(false);
    } catch (error) {
      console.error('Failed to delete workspace group', error);
      alert('Failed to delete workspace group.');
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const handleAssignWorkspaceGroup = async (workspace: Workspace, nextGroupIdValue: string | null) => {
    if (!orgId) {
      alert('Organisation ID is required to assign workspace groups.');
      return;
    }
    const currentGroupId = workspace.workspaceGroupId || null;
    const nextGroupId = nextGroupIdValue && nextGroupIdValue !== '__none__' ? nextGroupIdValue : null;
    if (currentGroupId === nextGroupId) return;

    setWorkspaceGroupSaving(prev => ({ ...prev, [workspace.id]: true }));
    try {
      await assignWorkspaceToGroup(workspace.id, orgId, nextGroupId);
      const selectedGroup = nextGroupId ? workspaceGroups.find(g => g.id === nextGroupId) || null : null;
      setWorkspaces(prev => prev.map(w => (
        w.id === workspace.id
          ? {
              ...w,
              workspaceGroupId: nextGroupId,
              workspaceGroup: selectedGroup,
              workspaceGroupColor: selectedGroup?.color || null,
              region: selectedGroup?.name || null,
            }
          : w
      )));
      await fetchWorkspaceGroups(orgId);
    } catch (error) {
      console.error('Failed to update workspace group assignment', error);
      alert('Failed to update workspace group assignment.');
    } finally {
      setWorkspaceGroupSaving(prev => ({ ...prev, [workspace.id]: false }));
    }
  };

  const groupCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const ws of workspaces) {
      if (ws.workspaceGroupId) {
        counts.set(ws.workspaceGroupId, (counts.get(ws.workspaceGroupId) || 0) + 1);
      }
    }
    return counts;
  }, [workspaces]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setQuotaLoading(true);
      try {
        if (loading) return;
        const isDevAdmin = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
        if (!user && !isDevAdmin) {
          setWorkspaces([]);
          setWorkspaceGroups([]);
          setWorkspaceLimit(null);
          return;
        }

        const activeOrgId = orgId || null;
        await reloadWorkspaces(activeOrgId);
        await fetchWorkspaceGroups(activeOrgId);

        if (activeOrgId) {
          try {
            const orgDocRef = doc(db, 'organisations', activeOrgId);
            const orgSnap = await getDoc(orgDocRef);
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              setWorkspaceLimit(typeof orgData.workspaceLimit === 'number' ? orgData.workspaceLimit : null);
            } else {
              setWorkspaceLimit(null);
            }
          } catch (e) {
            setWorkspaceLimit(null);
          }
        } else {
          setWorkspaceLimit(null);
        }
      } catch (e) {
        console.error('Failed to fetch workspaces or quota', e);
        setWorkspaceLimit(null);
      } finally {
        setLoadingData(false);
        setQuotaLoading(false);
      }
    };
    fetchData();
  }, [user, loading, orgId, reloadWorkspaces, fetchWorkspaceGroups]);

  // Derived filtered workspaces (client-side search)
  const [filteredWorkspaces, setFilteredWorkspaces] = React.useState<Workspace[]>([]);
  React.useEffect(() => {
    let base = workspaces;
    if (groupFilter === '__ungrouped__') {
      base = workspaces.filter((w) => !w.workspaceGroupId);
    } else if (groupFilter !== 'all') {
      base = workspaces.filter((w) => (w.workspaceGroupId || null) === groupFilter);
    }

    if (!searchQuery || searchQuery.trim() === '') {
      setFilteredWorkspaces(base);
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    setFilteredWorkspaces(
      base.filter((w: Workspace) => {
        const name = (w.name || '').toLowerCase();
        const idMatch = (w.id || '').toLowerCase();
        const region = (w.region || '').toLowerCase();
        const groupName = (w.workspaceGroup?.name || '').toLowerCase();
        return name.includes(q) || idMatch.includes(q) || region.includes(q) || groupName.includes(q);
      })
    );
  }, [searchQuery, workspaces, groupFilter]);

  const groupedWorkspaceSections = React.useMemo(() => {
    const groupsById = new Map<string, WorkspaceGroup | null>();
    workspaceGroups.forEach(group => groupsById.set(group.id, group));

    const ensureEntry = (
      map: Map<string, { group: WorkspaceGroup | null; workspaces: Workspace[] }>,
      groupId: string,
      groupData: WorkspaceGroup | null
    ) => {
      if (!map.has(groupId)) {
        map.set(groupId, { group: groupData, workspaces: [] });
      }
      return map.get(groupId)!;
    };

    const map = new Map<string, { group: WorkspaceGroup | null; workspaces: Workspace[] }>();
    filteredWorkspaces.forEach(ws => {
      const idForWorkspace = ws.workspaceGroupId || '__ungrouped__';
      const groupData = groupsById.get(idForWorkspace) || null;
      ensureEntry(map, idForWorkspace, groupData).workspaces.push(ws);
    });

    if (groupFilter && groupFilter !== 'all') {
      if (groupFilter === '__ungrouped__') {
        ensureEntry(map, '__ungrouped__', null);
      } else {
        const groupData = groupsById.get(groupFilter) || null;
        ensureEntry(map, groupFilter, groupData);
      }
    } else if (filteredWorkspaces.some(ws => !ws.workspaceGroupId)) {
      ensureEntry(map, '__ungrouped__', null);
    }

    const entries = Array.from(map.entries()).map(([id, value]) => ({
      id,
      group: value.group,
      workspaces: value.workspaces,
    }));

    entries.sort((a, b) => {
      if (a.id === '__ungrouped__' && b.id === '__ungrouped__') return 0;
      if (a.id === '__ungrouped__') return 1;
      if (b.id === '__ungrouped__') return -1;
      const nameA = a.group?.name || '';
      const nameB = b.group?.name || '';
      return nameA.localeCompare(nameB);
    });

    return entries;
  }, [filteredWorkspaces, workspaceGroups, groupFilter]);

  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groupedWorkspaceSections.forEach(section => {
      initial[section.id] = true;
    });
    return initial;
  });

  React.useEffect(() => {
    setExpandedGroups(prev => {
      const next = { ...prev };
      let changed = false;
      const activeIds = new Set(groupedWorkspaceSections.map(section => section.id));

      groupedWorkspaceSections.forEach(section => {
        if (next[section.id] === undefined) {
          next[section.id] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach(key => {
        if (!activeIds.has(key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [groupedWorkspaceSections]);

  const openRenameDialog = (workspace: any) => {
    setRenameWorkspaceData({ id: workspace.id, currentName: workspace.name || workspace.id });
    setNewRenameWorkspaceName(workspace.name || workspace.id);
    setIsRenameWorkspaceOpen(true);
  };

  const openDeleteDialog = (workspace: any) => {
    setDeleteWorkspaceData({ id: workspace.id, name: workspace.name || workspace.id });
    setDeleteConfirmationName('');
    setIsDeleteWorkspaceOpen(true);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !newWorkspaceOwner.trim()) {
      alert('Please provide both workspace name and owner ID');
      return;
    }

    if (!orgId) {
      alert('Organisation ID is required to create a workspace.');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const orgQuery = `?orgId=${encodeURIComponent(orgId)}`;
      const response = await fetch(`/api/admin/workspaces${orgQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim(), ownerId: newWorkspaceOwner.trim(), members: [newWorkspaceOwner.trim()] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'workspace_limit_reached') {
          setIsLimitModalOpen(true);
          setIsCreateWorkspaceOpen(false);
        } else {
          alert(errorData.error || 'Failed to create workspace');
        }
        throw new Error(errorData.error || 'Failed to create workspace');
      }
      const data = await response.json();
      await reloadWorkspaces(orgId);
      await fetchWorkspaceGroups(orgId);
      setNewWorkspaceName('');
      setNewWorkspaceOwner('');
      setIsCreateWorkspaceOpen(false);
      alert(`Workspace "${data.workspace?.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleRenameWorkspace = async () => {
    if (!renameWorkspaceData || !newRenameWorkspaceName.trim()) {
      alert('Please provide a valid workspace name');
      return;
    }

    if (!orgId) {
      alert('Organisation ID is required to rename a workspace.');
      return;
    }
    setIsRenamingWorkspace(true);
    try {
  const orgQueryRefresh2 = `?orgId=${encodeURIComponent(orgId)}`;
  const response = await fetch(`/api/admin/workspaces/${renameWorkspaceData.id}${orgQueryRefresh2}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRenameWorkspaceName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename workspace');
      }
  await reloadWorkspaces(orgId);
  await fetchWorkspaceGroups(orgId);
      setNewRenameWorkspaceName('');
      setRenameWorkspaceData(null);
      setIsRenameWorkspaceOpen(false);
      alert(`Workspace renamed to "${newRenameWorkspaceName.trim()}" successfully!`);
    } catch (error) {
      console.error('Error renaming workspace:', error);
      alert(`Failed to rename workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRenamingWorkspace(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceData || deleteConfirmationName.trim() !== deleteWorkspaceData.name) {
      alert('Please type the exact workspace name to confirm deletion');
      return;
    }

    if (!orgId) {
      alert('Organisation ID is required to delete a workspace.');
      return;
    }
    setIsDeletingWorkspace(true);
    try {
  const orgQueryDelete = `?orgId=${encodeURIComponent(orgId)}`;
  const response = await fetch(`/api/admin/workspaces/${deleteWorkspaceData.id}${orgQueryDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }
  await reloadWorkspaces(orgId);
  await fetchWorkspaceGroups(orgId);
      setDeleteConfirmationName('');
      setDeleteWorkspaceData(null);
      setIsDeleteWorkspaceOpen(false);
      alert(`Workspace "${deleteWorkspaceData.name}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      alert(`Failed to delete workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  // Compute deduplicated staff count from various possible workspace member fields.
  const computeStaffAggregate = (ws: any) => {
    if (!ws) return '—';
    try {
      const membersSet = new Set<string>();
      const collect = (arr: any) => {
        if (!arr) return;
        if (!Array.isArray(arr)) return;
        for (const m of arr) {
          if (!m) continue;
          if (typeof m === 'string') membersSet.add(m);
          else if (typeof m === 'object') {
            if (m.id) membersSet.add(String(m.id));
            else if (m.email) membersSet.add(String(m.email));
            else if (m.userId) membersSet.add(String(m.userId));
            else membersSet.add(JSON.stringify(m));
          }
        }
      };

      collect(ws.members);
      const candidateFields = ['managers','nurses','ctms','domestics','maintenances','kitchens','activities','staff','staffMembers'];
      for (const f of candidateFields) collect(ws[f]);

      if (membersSet.size > 0) return membersSet.size;
      if (typeof ws.staffCount === 'number') return ws.staffCount;
      if (typeof ws.staffingLevel === 'number') return `${ws.staffingLevel}%`;
      return '—';
    } catch (e) {
      return '—';
    }
  };

  // Quota UI logic
  const atQuota = workspaceLimit !== null && workspaces.length >= workspaceLimit;
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Workspaces"
        subtitle={`Admin workspaces · ${workspaces.length} workspaces · ${aggregated.totalFolders} folders · ${aggregated.totalDocuments} documents`}
        icon={<Users className="w-5 h-5 text-white" />}
      />
      {/* Main content */}
      <div className="p-6 space-y-6">
        {/* System Overview */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Overview</h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-end">
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workspaces..."
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm w-64"
                />
                <Select
                  value={groupFilter}
                  onValueChange={(value) => setGroupFilter(value)}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Filter by group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    <SelectItem value="__ungrouped__">Unassigned</SelectItem>
                    {workspaceGroups.map((group) => {
                      const count = group.workspaceIds?.length ?? groupCounts.get(group.id) ?? 0;
                      return (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                          {count ? ` (${count})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={openCreateGroupModal}
                  className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label="Create workspace group"
                  title="Create workspace group"
                >
                  <MapPin className="w-4 h-4" />
                  New Group
                </Button>
                <Button
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  aria-label="Create workspace"
                  title="Create workspace"
                  disabled={atQuota || isCreatingWorkspace}
                >
                  <Plus className="w-4 h-4" />
                  {atQuota ? 'Quota Reached' : (isCreatingWorkspace ? 'Creating...' : 'Create Workspace')}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Managing <span className="font-medium">{workspaces.length}</span> workspaces
                {workspaceLimit !== null && (
                  <span className="ml-2 text-xs text-blue-500 bg-blue-50 rounded px-2 py-1">
                    Quota: {workspaces.length} / {workspaceLimit}
                    {workspaceLimit > workspaces.length && (
                      <span className="ml-2 text-green-600">({workspaceLimit - workspaces.length} left)</span>
                    )}
                    {workspaceLimit <= workspaces.length && (
                      <span className="ml-2 text-red-600">(0 left)</span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
          {atQuota && (
            <div className="mb-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Workspace quota reached. Please contact support to upgrade your plan or increase your limit.
            </div>
          )}
        </div>

        <Card className="border border-blue-100 bg-white rounded-2xl shadow-sm">
          <CardHeader className="border-b border-blue-50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Workspace groups</h3>
                <p className="text-sm text-gray-500">Group homes by region or portfolio to compare performance faster.</p>
              </div>
              <Button
                variant="outline"
                onClick={openCreateGroupModal}
                className="flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Manage groups
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupLoading ? (
              <div className="py-6 text-sm text-gray-500">Loading groups…</div>
            ) : workspaceGroups.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">
                No workspace groups yet. Create one to start organising your homes by region.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaceGroups.map((group) => {
                  const count = group.workspaceIds?.length ?? groupCounts.get(group.id) ?? 0;
                  return (
                    <div key={group.id} className="border border-blue-50 rounded-xl bg-slate-50 px-4 py-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-blue-500">Group</p>
                          <h4 className="text-lg font-semibold text-slate-900">{group.name}</h4>
                        </div>
                        {group.color && (
                          <span
                            className="inline-flex h-4 w-4 rounded-full border border-white shadow"
                            style={{ backgroundColor: group.color }}
                            aria-label="Group colour"
                          />
                        )}
                      </div>
                      {group.description && (
                        <p className="text-sm text-slate-600 line-clamp-3">{group.description}</p>
                      )}
                      <div className="text-sm text-slate-600 font-medium">{count} {count === 1 ? 'workspace' : 'workspaces'}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditGroupModal(group)} className="text-blue-600 hover:text-blue-700">
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setGroupToDelete(group);
                            setIsDeleteGroupOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      {filteredWorkspaces.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500 bg-white">
          No workspaces found for the current filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedWorkspaceSections.map(({ id: groupId, group, workspaces: grouped }) => {
            const isExpanded = expandedGroups[groupId] ?? true;
            const workspaceCount = grouped.length;
            const title = group ? group.name : 'Unassigned';
            const description = group?.description || (groupId === '__ungrouped__' ? 'Workspaces not yet assigned to a group' : undefined);
            const accentColor = group?.color || null;

            return (
              <Card key={groupId} className="border border-blue-100 bg-white rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 py-4 border-b border-blue-50">
                  <button
                    type="button"
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [groupId]: !isExpanded }))}
                    className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                    aria-expanded={isExpanded}
                    aria-controls={`workspace-group-${groupId}`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                      <ChevronDown className={cn('h-4 w-4 text-blue-600 transition-transform', !isExpanded && '-rotate-90')} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide text-blue-500">{group ? 'Group' : 'Ungrouped'}</p>
                      <h4 className="text-lg font-semibold text-slate-900 truncate">{title}</h4>
                      {description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{description}</p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    {accentColor && (
                      <span
                        className="inline-flex h-4 w-4 rounded-full border border-blue-100 shadow"
                        style={{ backgroundColor: accentColor }}
                        aria-label="Group colour"
                      />
                    )}
                    <Badge variant="outline" className="text-xs font-medium text-slate-600 border-slate-200">
                      {workspaceCount} {workspaceCount === 1 ? 'workspace' : 'workspaces'}
                    </Badge>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent id={`workspace-group-${groupId}`} className="p-5">
                    {workspaceCount === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 bg-gray-50">
                        No workspaces match your current filters for this group.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {grouped.map((ws: Workspace) => {
                          const totalDocs = (ws.folders || []).reduce(
                            (sum: number, entry) => sum + countDocumentsInEntry(entry),
                            0,
                          );
                          const occupancyPercent = ws.totalBeds && ws.occupiedBeds ?
                            Math.round((ws.occupiedBeds / ws.totalBeds) * 100) :
                            (ws.occupancy ? Math.round(ws.occupancy * 100) : null);
                          const isSavingGroup = !!workspaceGroupSaving[ws.id];
                          const effectiveGroup = ws.workspaceGroup || (groupId !== '__ungrouped__' ? group || null : null);
                          const effectiveRegion = ws.region || effectiveGroup?.name || null;
                          const badgeColour = ws.workspaceGroupColor || effectiveGroup?.color || null;

                          return (
                            <Card key={ws.id} className="relative hover:shadow-xl transition-all duration-300 border border-blue-100 bg-white rounded-2xl">
                              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" aria-hidden />
                              <CardHeader className="flex flex-row items-center justify-between w-full px-5 py-4 border-b border-blue-50 bg-white rounded-t-2xl">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <FolderIcon className="w-5 h-5 text-blue-500" />
                                    <span className="text-lg font-semibold truncate text-blue-900">{ws.name || ws.id}</span>
                                  </div>
                                  <div className="text-xs text-blue-400 mt-1 font-medium">
                                    {ws.folders?.length || 0} folders • {totalDocs} documents
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {effectiveGroup ? (
                                      <Badge
                                        className={cn('text-xs font-medium shadow-sm', !badgeColour && 'bg-blue-100 text-blue-700')}
                                        style={badgeColour ? { backgroundColor: badgeColour, color: '#fff' } : undefined}
                                      >
                                        {effectiveGroup.name}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs font-medium text-slate-600 border-slate-200">
                                        Unassigned
                                      </Badge>
                                    )}
                                    {effectiveRegion && (!effectiveGroup || effectiveRegion !== effectiveGroup.name) && (
                                      <Badge variant="secondary" className="text-xs font-medium">
                                        {effectiveRegion}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      try {
                                        if (typeof window !== 'undefined') {
                                          window.dispatchEvent(new CustomEvent('admin-select-workspace', { detail: { workspace: ws } }));
                                          window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } }));
                                        }
                                      } catch (e) {
                                        // best-effort
                                      }
                                    }}
                                    aria-label={`Open workspace ${ws.name || ws.id}`}
                                    title={`Open workspace ${ws.name || ws.id}`}
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-none font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                                  >
                                    Open
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" aria-label={`Workspace options for ${ws.name || ws.id}`} title={`Workspace options for ${ws.name || ws.id}`}>
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openRenameDialog(ws)}>
                                        <Edit className="w-4 h-4 mr-2 text-blue-500" />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openDeleteDialog(ws)} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent className="p-5">
                                <div className="flex flex-col gap-2 mb-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-slate-700">Group assignment</span>
                                    <Select
                                      value={ws.workspaceGroupId || '__none__'}
                                      onValueChange={(value) => handleAssignWorkspaceGroup(ws, value)}
                                      disabled={isSavingGroup || !orgId}
                                    >
                                      <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Select group" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Unassigned</SelectItem>
                                        {workspaceGroups.map((availableGroup) => (
                                          <SelectItem key={availableGroup.id} value={availableGroup.id}>
                                            {availableGroup.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {isSavingGroup && (
                                    <span className="text-xs text-blue-500">Updating group…</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-2">
                                  <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                      {typeof occupancyPercent === 'number' ? (
                                        <div className="-mt-1">
                                          <OccupancyPie percent={occupancyPercent} size={28} strokeWidth={3} />
                                        </div>
                                      ) : (
                                        <Building2 className="w-6 h-6 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">{typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : '—'}</div>
                                    <div className="text-sm text-slate-500 mt-1">Occupancy</div>
                                  </div>
                                  <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                      <Shield className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">{ws.complianceScore ? `${Math.round(ws.complianceScore)}%` : '—'}</div>
                                    <div className="text-sm text-slate-500 mt-1">Compliance</div>
                                  </div>
                                  <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                      <Users className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">{computeStaffAggregate(ws) ?? (typeof ws.staffCount === 'number' ? ws.staffCount : (typeof ws.staffingLevel === 'number' ? `${ws.staffingLevel}%` : '—'))}</div>
                                    <div className="text-sm text-slate-500 mt-1">Staffing</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} placeholder="Workspace name" />
            <Input value={newWorkspaceOwner} onChange={(e) => setNewWorkspaceOwner(e.target.value)} placeholder="Owner user ID" />
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreateWorkspaceOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateWorkspace} disabled={isCreatingWorkspace}>{isCreatingWorkspace ? 'Creating...' : 'Create'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workspace Limit Modal */}
      <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Workspace Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">You have reached the maximum number of workspaces allowed for your organisation. Please contact support to upgrade your plan or increase your limit.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLimitModalOpen(false)} autoFocus>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameWorkspaceOpen} onOpenChange={setIsRenameWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Workspace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input value={newRenameWorkspaceName} onChange={(e) => setNewRenameWorkspaceName(e.target.value)} />
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsRenameWorkspaceOpen(false)}>Cancel</Button>
              <Button onClick={handleRenameWorkspace} disabled={isRenamingWorkspace}>{isRenamingWorkspace ? 'Renaming...' : 'Rename'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteWorkspaceOpen} onOpenChange={setIsDeleteWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">Type the workspace name to confirm deletion: <strong>{deleteWorkspaceData?.name}</strong></div>
            <Input value={deleteConfirmationName} onChange={(e) => setDeleteConfirmationName(e.target.value)} placeholder="Workspace name" />
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsDeleteWorkspaceOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteWorkspace} disabled={isDeletingWorkspace}>{isDeletingWorkspace ? 'Deleting...' : 'Delete'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupModalOpen}
        onOpenChange={(open) => {
          setGroupModalOpen(open);
          if (!open) resetGroupModal();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{groupModalMode === 'create' ? 'Create workspace group' : `Edit group: ${groupModalGroup?.name || ''}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Group name</label>
              <Input value={groupModalName} onChange={(e) => setGroupModalName(e.target.value)} placeholder="e.g. North Region" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Description (optional)</label>
              <Textarea value={groupModalDescription} onChange={(e) => setGroupModalDescription(e.target.value)} placeholder="Short summary to help teammates understand the group." rows={3} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Accent colour (optional)</label>
              <Input value={groupModalColor} onChange={(e) => setGroupModalColor(e.target.value)} placeholder="#2563eb" />
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => { setGroupModalOpen(false); resetGroupModal(); }}>Cancel</Button>
              <Button onClick={handleSaveGroup} disabled={isSavingGroup}>
                {isSavingGroup ? 'Saving…' : groupModalMode === 'create' ? 'Create group' : 'Save changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteGroupOpen} onOpenChange={setIsDeleteGroupOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete workspace group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-slate-600">
              This group currently contains <strong>{groupToDelete ? (groupToDelete.workspaceIds?.length ?? groupCounts.get(groupToDelete.id) ?? 0) : 0}</strong> workspaces. Deleting it will unassign those workspaces.
            </p>
            <p className="text-sm text-slate-500">This action can’t be undone.</p>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsDeleteGroupOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteGroup} disabled={isDeletingGroup}>
                {isDeletingGroup ? 'Deleting…' : `Delete ${groupToDelete?.name || 'group'}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
