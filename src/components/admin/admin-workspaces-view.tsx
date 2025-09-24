"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, MapPin, BarChart2, Plus, MoreVertical, Edit, Trash2, Target, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle, Clock, FileText, Building2, Shield, Zap, Database, Wifi, Folder as FolderIcon } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { computeStaffAggregate } from '@/lib/computeStaffAggregate';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import AdminPageHeader from '@/components/admin/admin-page-header';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

type Workspace = any;

export default function AdminWorkspacesView() {
  const { user, loading } = useAuth();
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

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
      let wsDocCount = 0;
      for (const folder of (ws.folders || [])) {
        for (const item of (folder.items || [])) {
          if (item.type === 'document') wsDocCount += 1;
        }
      }
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

  React.useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Wait for auth hydration. Only fetch when we have a user or dev admin cookie.
        if (loading) return;
        if (!user && !(typeof document !== 'undefined' && document.cookie.includes('isAdmin=1'))) {
          setWorkspaces([]);
          return;
        }

        const orgId = (user as any)?.organisationId;
        const isDevAdmin = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
        if (!orgId && !isDevAdmin) {
          // No organisation context available yet; avoid calling server which will reject.
          setWorkspaces([]);
          return;
        }

        const orgQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
        const resp = await fetch(`/api/admin/workspaces${orgQuery}`);
        if (!resp.ok) {
          setWorkspaces([]);
          return;
        }
        const data = await resp.json();
        setWorkspaces(data.workspaces || []);
      } catch (e) {
        console.error('Failed to fetch workspaces', e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user, loading]);

  // Derived filtered workspaces (client-side search)
  const [filteredWorkspaces, setFilteredWorkspaces] = React.useState<Workspace[]>([]);
  React.useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      setFilteredWorkspaces(workspaces);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    setFilteredWorkspaces(workspaces.filter((w: any) => (w.name || '').toLowerCase().includes(q) || (w.id || '').toLowerCase().includes(q)));
  }, [searchQuery, workspaces]);

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

    setIsCreatingWorkspace(true);
    try {
  const orgId = (user as any)?.organisationId;
  const orgQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
      const response = await fetch(`/api/admin/workspaces${orgQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim(), ownerId: newWorkspaceOwner.trim(), members: [newWorkspaceOwner.trim()] }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }
      const data = await response.json();
      // refresh
  const orgQueryRefresh = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const workspacesResponse = await fetch(`/api/admin/workspaces${orgQueryRefresh}`);
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }
      setNewWorkspaceName('');
      setNewWorkspaceOwner('');
      setIsCreateWorkspaceOpen(false);
      alert(`Workspace "${data.workspace?.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleRenameWorkspace = async () => {
    if (!renameWorkspaceData || !newRenameWorkspaceName.trim()) {
      alert('Please provide a valid workspace name');
      return;
    }
    setIsRenamingWorkspace(true);
    try {
  const orgId = (user as any)?.organisationId;
  const orgQueryRefresh2 = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetch(`/api/admin/workspaces/${renameWorkspaceData.id}${orgQueryRefresh2}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRenameWorkspaceName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename workspace');
      }
  const workspacesResponse = await fetch(`/api/admin/workspaces${orgQueryRefresh2}`);
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }
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
    setIsDeletingWorkspace(true);
    try {
  const orgId = (user as any)?.organisationId;
  const orgQueryDelete = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const response = await fetch(`/api/admin/workspaces/${deleteWorkspaceData.id}${orgQueryDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }
  const orgQueryRefresh3 = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  const workspacesResponse = await fetch(`/api/admin/workspaces${orgQueryRefresh3}`);
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Workspaces"
        subtitle={`Admin workspaces · ${workspaces.length} workspaces · ${aggregated.totalFolders} folders · ${aggregated.totalDocuments} documents`}
        icon={<Users className="w-5 h-5 text-white" />}
      />
      {/* Top summary strip removed per admin update — keeping header and main content below */}

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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workspaces..."
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm w-64"
                />
                <Button onClick={() => setIsCreateWorkspaceOpen(true)} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" aria-label="Create workspace" title="Create workspace">
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
              </div>
              <p className="text-sm text-gray-600">Managing <span className="font-medium">{workspaces.length}</span> workspaces</p>
            </div>
          </div>
        </div>

      {filteredWorkspaces.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500 bg-white">
          No workspaces found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkspaces.map((ws: any) => {
            const totalDocs = (ws.folders || []).reduce((sum: number, f: any) => 
              sum + ((f.items || []).filter((it: any) => it.type === 'document').length), 0);
            const occupancyPercent = ws.totalBeds && ws.occupiedBeds ? 
              Math.round((ws.occupiedBeds / ws.totalBeds) * 100) : 
              (ws.occupancy ? Math.round(ws.occupancy * 100) : null);
            
            return (
              <Card key={ws.id} className="relative hover:shadow-xl transition-all duration-300 border border-blue-100 bg-white rounded-2xl">
                {/* top accent */}
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
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => {
                        try {
                          if (typeof window !== 'undefined') {
                            // Dispatch a direct admin-select-workspace event with the full workspace
                            // so parent admin page can open it even if its local workspaces cache
                            // is empty or out-of-sync.
                            window.dispatchEvent(new CustomEvent('admin-select-workspace', { detail: { workspace: ws } }));
                            // Also dispatch the legacy navigate-to-workspace event for other listeners
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
                  {/* Simplified workspace metrics: occupancy, compliance, staffing */}
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    {/* Occupancy tile */}
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

                    {/* Compliance tile */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <Shield className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{ws.complianceScore ? `${Math.round(ws.complianceScore)}%` : '—'}</div>
                      <div className="text-sm text-slate-500 mt-1">Compliance</div>
                    </div>

                    {/* Staffing tile (aggregated staff count) */}
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
    </div>
  );
}
