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
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white rounded-b-3xl shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-40 -translate-x-40"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10 py-6 sm:py-8 lg:py-10 px-8 md:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
            {/* Main content - left side */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Workspaces
                  </h1>
                  <div className="mt-2 text-sm text-blue-100 font-medium">
                    Admin workspaces · {workspaces.length} workspaces · {aggregated.totalFolders} folders · {aggregated.totalDocuments} documents
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={() => { /* noop for now */ }} className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                  Refresh
                </Button>
              </div>
            </div>

            {/* Key metrics cards - right side */}
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                {/* Workspaces */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors duration-300">
                      <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{workspaces.length}</div>
                      <div className="text-xs text-blue-200 font-medium uppercase tracking-wide">Workspaces</div>
                    </div>
                  </div>
                </div>

                {/* Folders */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition-colors duration-300">
                      <Folder className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{aggregated.totalFolders}</div>
                      <div className="text-xs text-yellow-200 font-medium uppercase tracking-wide">Folders</div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors duration-300">
                      <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{aggregated.totalDocuments}</div>
                      <div className="text-xs text-purple-200 font-medium uppercase tracking-wide">Documents</div>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors duration-300">
                      <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">98%</div>
                      <div className="text-xs text-emerald-200 font-medium uppercase tracking-wide">Health</div>
                    </div>
                  </div>
                </div>

                {/* Occupancy */}
                <div className="group h-20 p-3 lg:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <div className="flex items-center gap-2 lg:gap-3 h-full">
                    <div className="p-2 bg-rose-500/20 rounded-xl group-hover:bg-rose-500/30 transition-colors duration-300">
                      <div className="w-4 h-4 lg:w-5 lg:h-5">
                        <OccupancyPie percent={Math.round((careOverview.averageOccupancy || 0) * 100)} size={20} strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xl lg:text-2xl font-bold text-white">{Math.round((careOverview.averageOccupancy || 0) * 100)}%</div>
                      <div className="text-xs text-rose-200 font-medium uppercase tracking-wide">Occupancy</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <Button onClick={() => setIsCreateWorkspaceOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
              <p className="text-sm text-gray-600">Managing <span className="font-medium">{workspaces.length}</span> workspaces</p>
            </div>
          </div>
        </div>

      {workspaces.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500 bg-white">
          No workspaces found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws: any) => {
            const totalDocs = (ws.folders || []).reduce((sum: number, f: any) => 
              sum + ((f.items || []).filter((it: any) => it.type === 'document').length), 0);
            const occupancyPercent = ws.totalBeds && ws.occupiedBeds ? 
              Math.round((ws.occupiedBeds / ws.totalBeds) * 100) : 
              (ws.occupancy ? Math.round(ws.occupancy * 100) : null);
            
            return (
              <Card key={ws.id} className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white">
                <CardHeader className="flex items-center justify-between w-full px-4 py-4 rounded-t-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 text-white">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold truncate text-left">{ws.name || ws.id}</div>
                    <div className="text-xs text-blue-100 mt-1 font-medium">
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
                        <div className="text-xs text-blue-100">occupancy</div>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } }))}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
                  {/* Workspace Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-lg font-bold text-blue-600">{ws.folders?.length || 0}</div>
                      <div className="text-xs text-blue-600 font-medium">Folders</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-lg font-bold text-green-600">{totalDocs}</div>
                      <div className="text-xs text-green-600 font-medium">Documents</div>
                    </div>
                  </div>
                  
                  {/* Folder Preview */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-yellow-500" />
                      Folders Preview
                    </div>
                    {(ws.folders || []).length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded-lg">No folders created</div>
                    ) : (
                      <div className="space-y-1">
                        {(ws.folders || []).slice(0, 4).map((f: any) => (
                          <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs border border-gray-100">
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
                          <div className="text-xs text-gray-500 text-center py-1">
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
