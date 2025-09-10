"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, MapPin, BarChart2, Plus, MoreVertical, Edit, Trash2, Target, AlertTriangle, TrendingUp, Activity, CheckCircle, XCircle, Clock, FileText, Building2, Shield, Zap, Database, Wifi, Folder } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

type Workspace = any;

export default function AdminWorkspacesView() {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  // Create workspace dialog
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);
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
        const resp = await fetch('/api/admin/workspaces');
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
  }, []);

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
      const response = await fetch('/api/admin/workspaces', {
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
      const workspacesResponse = await fetch('/api/admin/workspaces');
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
      const response = await fetch(`/api/admin/workspaces/${renameWorkspaceData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRenameWorkspaceName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename workspace');
      }
      const workspacesResponse = await fetch('/api/admin/workspaces');
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
      const response = await fetch(`/api/admin/workspaces/${deleteWorkspaceData.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }
      const workspacesResponse = await fetch('/api/admin/workspaces');
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

  return (
    <div>
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-b-2xl shadow-lg mb-6 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute top-16 right-16 w-24 h-24 bg-white rounded-full opacity-50"></div>
          <div className="absolute bottom-8 left-1/4 w-16 h-16 bg-white rounded-full opacity-30"></div>
          <div className="absolute bottom-4 right-8 w-20 h-20 bg-white rounded-full opacity-40"></div>
        </div>
        
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-md border border-white/20">
              <Users className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold leading-tight">Workspaces</h2>
              <div className="mt-1 text-sm text-blue-100">Admin workspaces · {workspaces.length} workspaces · {aggregated.totalFolders} folders · {aggregated.totalDocuments} documents</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => { /* noop for now */ }} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div>
                  <div className="text-xs text-blue-100">Workspaces</div>
                  <div className="text-lg font-semibold">{workspaces.length}</div>
                </div>
              </div>
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div>
                  <div className="text-xs text-blue-100">Folders</div>
                  <div className="text-lg font-semibold">{aggregated.totalFolders}</div>
                </div>
              </div>
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div>
                  <div className="text-xs text-blue-100">Documents</div>
                  <div className="text-lg font-semibold">{aggregated.totalDocuments}</div>
                </div>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 flex items-center gap-4 shadow-md">
                <div className="flex items-center justify-center w-16 h-16 bg-white/5 rounded-full">
                  <OccupancyPie percent={Math.round((careOverview.averageOccupancy || 0) * 100)} size={64} strokeWidth={8} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-blue-100">Overall Occupancy</div>
                  <div className="text-2xl font-bold leading-tight text-white">{Math.round((careOverview.averageOccupancy || 0) * 100)}%</div>
                  <div className="text-sm text-blue-100">{careOverview.totalOccupied}/{careOverview.totalBeds} beds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced System Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">System Overview</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsCreateWorkspaceOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
            <p className="text-sm text-muted-foreground">Managing <span className="font-medium">{workspaces.length}</span> workspaces</p>
          </div>
        </div>
      </div>

      

      {workspaces.length === 0 ? (
        <div className="rounded border p-6 text-center text-muted-foreground">No workspaces found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws: any) => {
            const totalDocs = (ws.folders || []).reduce((sum: number, f: any) => 
              sum + ((f.items || []).filter((it: any) => it.type === 'document').length), 0);
            const occupancyPercent = ws.totalBeds && ws.occupiedBeds ? 
              Math.round((ws.occupiedBeds / ws.totalBeds) * 100) : 
              (ws.occupancy ? Math.round(ws.occupancy * 100) : null);
            
            return (
              <Card key={ws.id} className={cn(
                'hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4',
                occupancyPercent && occupancyPercent > 80 ? 'border-l-red-500' :
                occupancyPercent && occupancyPercent > 60 ? 'border-l-yellow-500' :
                'border-l-green-500',
                ws.region ? '' : 'opacity-90'
              )}>
                <CardHeader className="flex items-center justify-between w-full px-4 py-4 rounded-t-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold truncate text-left">{ws.name || ws.id}</div>
                    <div className="text-xs text-slate-300 mt-1">
                      {ws.folders?.length || 0} folders • {totalDocs} documents
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {occupancyPercent && (
                      <div className="text-center">
                        <div className={`text-sm font-bold ${
                          occupancyPercent > 80 ? 'text-red-200' :
                          occupancyPercent > 60 ? 'text-yellow-200' :
                          'text-green-200'
                        }`}>
                          {occupancyPercent}%
                        </div>
                        <div className="text-xs text-slate-300">occupancy</div>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } }))}
                    >
                      Open
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRenameDialog(ws)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteDialog(ws)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Enhanced Workspace Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{ws.folders?.length || 0}</div>
                      <div className="text-xs text-blue-600">Folders</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{totalDocs}</div>
                      <div className="text-xs text-green-600">Documents</div>
                    </div>
                  </div>
                  
                  {/* Folder Preview */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-yellow-500" />
                      Folders Preview
                    </div>
                    {(ws.folders || []).length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2">No folders created</div>
                    ) : (
                      <div className="space-y-1">
                        {(ws.folders || []).slice(0, 4).map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <Folder className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {(f.items || []).filter((it: any) => it.type === 'document').length}
                            </Badge>
                          </div>
                        ))}
                        {(ws.folders || []).length > 4 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            +{(ws.folders || []).length - 4} more folders...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
