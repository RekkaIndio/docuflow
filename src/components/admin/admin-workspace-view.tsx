"use client";
import React, { useMemo, useEffect, useState } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminDependencyTable from './admin-dependency-table';
import { TeamsView } from '@/components/dashboard/teams-view';
import { StatsView } from '@/components/dashboard/stats-view';
import { collection, query as fsQuery, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft, PlusSquare, Users, Tag, Clock, BarChart2, TrendingUp } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminWorkspaceViewProps {
  workspace: Workspace;
  onClose: () => void;
}

const getFileIcon = (fileType: Document['fileType']) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'csv':
      return <FileSpreadsheet className="w-8 h-8 text-green-700" />;
    case 'xlsx':
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    default:
      return <FileX2 className="w-8 h-8 text-gray-400" />;
  }
};

export default function AdminWorkspaceView({ workspace, onClose }: AdminWorkspaceViewProps) {
  const isMobile = useIsMobile();
  const [stack, setStack] = React.useState<string[]>([]);

  const rootWrapper: Folder = React.useMemo(() => ({ id: 'root', name: workspace.name, type: 'folder', items: workspace.folders || [], workspaceId: workspace.id }), [workspace]);

  const getCurrentFolder = React.useCallback((): Folder => {
    if (stack.length === 0) return rootWrapper;
    let current: Folder | null = null;
    const find = (items: (Folder | Document)[], id: string): Folder | null => {
      for (const it of items) {
        if (it.type === 'folder' && it.id === id) return it as Folder;
        if (it.type === 'folder') {
          const sub = find(it.items, id);
          if (sub) return sub;
        }
      }
      return null;
    };
    current = find(workspace.folders || [], stack[stack.length - 1]) || null;
    return current || rootWrapper;
  }, [stack, workspace, rootWrapper]);

  const currentFolder = getCurrentFolder();

  const pushFolder = (id: string) => setStack(s => [...s, id]);
  const popFolder = () => setStack(s => s.slice(0, -1));

  // Simple in-memory folder creation for admin chat commands. This will
  // call setStack to navigate into the newly-created folder. Persistence
  // should be handled by a real API call; this keeps UI responsive while
  // admin prototypes are tested.
  const onFolderAdd = (folderName: string) => {
    // create a new folder object and append to current folder's items
    const newId = `folder-${Date.now()}`;
    const newFolder: Folder = { id: newId, name: folderName, type: 'folder', items: [], workspaceId: workspace.id } as Folder;

    // mutate workspace.folders in-memory — callers should persist this
    // in real implementation. If we're in a nested folder, find the
    // parent and push into its items, otherwise push to root workspace.folders.
    if (stack.length === 0) {
      if (!workspace.folders) workspace.folders = [];
      workspace.folders.push(newFolder as any);
    } else {
      // find parent folder and append
      const parentId = stack[stack.length - 1];
      const findAndAppend = (items: (Folder | Document)[]) => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === parentId) {
            it.items.push(newFolder as any);
            return true;
          }
          if (it.type === 'folder') {
            if (findAndAppend(it.items)) return true;
          }
        }
        return false;
      };
      findAndAppend(workspace.folders || []);
    }

    // navigate into the newly created folder
    pushFolder(newId);
  };

  const breadcrumb = React.useMemo(() => {
    const crumbs: { id: string; name: string }[] = [{ id: 'root', name: workspace.name }];
    if (stack.length > 0) {
      // Find names for ids in stack
      const findName = (items: (Folder | Document)[], id: string): string | null => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === id) return it.name;
          if (it.type === 'folder') {
            const sub = findName(it.items, id);
            if (sub) return sub;
          }
        }
        return null;
      };
      for (const id of stack) {
        const n = findName(workspace.folders || [], id) || id;
        crumbs.push({ id, name: n });
      }
    }
    return crumbs;
  }, [stack, workspace]);

  // Helper to navigate to a crumb by index (0 = root)
  const navigateToCrumb = (index: number) => {
    if (index <= 0) {
      setStack([]);
      return;
    }
    // Keep first `index` entries in stack
    setStack(s => s.slice(0, index));
  };

  const totalFolders = useMemo(() => workspace.folders?.length || 0, [workspace]);
  const totalDocuments = useMemo(() => {
    const countDocuments = (items: (Folder | Document)[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'document') return count + 1;
        if (item.type === 'folder') return count + countDocuments(item.items);
        return count;
      }, 0);
    };
    return countDocuments(workspace.folders || []);
  }, [workspace]);

  const { fileTypeCounts, recentUploads } = useMemo(() => {
    const ft: Record<string, number> = {};
    const uploads: Array<{ name: string; createdAt?: string }> = [];

    const walk = (items: (Folder | Document)[]) => {
      for (const it of items) {
        if (it.type === 'document') {
          const parts = (it.name || '').split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
          ft[ext] = (ft[ext] || 0) + 1;
          uploads.push({ name: it.name || 'Untitled', createdAt: it.createdAt ? String(it.createdAt) : undefined });
        } else if (it.type === 'folder') {
          walk(it.items || []);
        }
      }
    };

    walk(workspace.folders || []);
    uploads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { fileTypeCounts: ft, recentUploads: uploads.slice(0, 5) };
  }, [workspace]);

  // compute occupancy percent if available on workspace
  const occupancyPercent = useMemo(() => {
    const w = workspace as any;
    if (typeof w.occupancy === 'number') return Math.round((w.occupancy || 0) * 100);
    if (typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number' && w.totalBeds > 0) {
      return Math.round((w.occupiedBeds / w.totalBeds) * 100);
    }
    return undefined;
  }, [workspace]);

  // Staffing data state
  const [staffingData, setStaffingData] = useState<{ day: number; night: number; total: number; lastUpdated?: string } | null>(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingTimeframe, setStaffingTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [staffingHistory, setStaffingHistory] = useState<Array<{ date: string; day: number; night: number; total: number }>>([]);

  // Fetch latest staffing data from daily check-ins
  useEffect(() => {
    if (!workspace?.id) return;
    
    setStaffingLoading(true);
    
    try {
      const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
      
      // Calculate date range based on timeframe
      let startDate = new Date();
      switch (staffingTimeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      const q = fsQuery(colRef, where('createdAt', '>=', startDate), orderBy('createdAt', 'desc'));
      
      const unsub = onSnapshot(q, (snap) => {
        const historyData: Array<{ date: string; day: number; night: number; total: number }> = [];
        let latestStaffing: { day: number; night: number; total: number; lastUpdated: string } | null = null;
        
        if (!snap.empty) {
          snap.docs.forEach((doc) => {
            const data = doc.data();
            const day = parseInt(String(data.staffingDay || data.staffing?.day || '0')) || 0;
            const night = parseInt(String(data.staffingNight || data.staffing?.night || '0')) || 0;
            const total = day + night;
            
            const recordDate = data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
              new Date(data.recordedAt || Date.now());
            
            historyData.push({
              date: recordDate.toISOString().split('T')[0],
              day,
              night,
              total
            });
            
            // Set latest data from the first (most recent) record
            if (!latestStaffing) {
              latestStaffing = {
                day,
                night,
                total,
                lastUpdated: recordDate.toLocaleDateString()
              };
            }
          });
        }
        
        // Sort by date and group by date for aggregation
        const groupedData = historyData.reduce((acc, curr) => {
          if (!acc[curr.date] || acc[curr.date].total < curr.total) {
            acc[curr.date] = curr;
          }
          return acc;
        }, {} as Record<string, { date: string; day: number; night: number; total: number }>);
        
        const sortedHistory = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
        
        setStaffingHistory(sortedHistory);
        setStaffingData(latestStaffing);
        setStaffingLoading(false);
      }, (err) => {
        console.error('Failed to listen to daily checkins for staffing in admin view', err);
        setStaffingLoading(false);
      });
      
      return () => unsub();
    } catch (e) {
      console.error('Failed to set up daily checkins listener in admin view', e);
      setStaffingLoading(false);
    }
  }, [workspace?.id, staffingTimeframe]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm">
        <div className="w-full mx-auto flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 rounded-md">
              <Home className="w-10 h-10 text-white/90" />
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">{workspace.name}</h2>
              <div className="mt-1 text-sm text-slate-200">Owner: {workspace.ownerId || '—'} · {totalFolders} folders · {totalDocuments} documents</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => { const n = window.prompt('New folder name'); if (n) onFolderAdd(n); }}> <PlusSquare className="w-4 h-4 mr-2" /> New folder</Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); }}>Share</Button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <FolderIcon className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="text-xs text-slate-300">Folders</div>
                  <div className="text-lg font-semibold">{totalFolders}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <FileText className="w-6 h-6 text-rose-400" />
                <div>
                  <div className="text-xs text-slate-300">Documents</div>
                  <div className="text-lg font-semibold">{totalDocuments}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <BarChart2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-300">Types</div>
                  <div className="text-lg font-semibold">{Object.keys(fileTypeCounts).length}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <div className="w-10 h-10">
                  <OccupancyPie percent={occupancyPercent ?? 0} size={44} strokeWidth={6} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Occupancy</div>
                  <div className="text-lg font-semibold">{typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : 'n/a'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  {/* Main content */}
  <div className="p-6 w-full mx-auto flex-1 flex flex-col gap-6 overflow-auto">
        <Tabs defaultValue="folders" className="w-full">
          <TabsList className="grid w-[640px] grid-cols-3">
            <TabsTrigger value="folders" className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              Folders
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Stats
            </TabsTrigger>
            { /* Dependency Calculator temporarily hidden until backend/frontend integration is fixed.
            <TabsTrigger value="dependency" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dependency Calculator
            </TabsTrigger>
            */ }
          </TabsList>
          { /* Dependency tab disabled for now */ }
          
          <TabsContent value="folders" className="mt-6 flex-1">
            <div className="flex flex-col lg:flex-row gap-8 flex-1">
              <div className="flex-1 flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Location</div>
                    <nav className="text-sm text-muted-foreground mt-1">
                      {breadcrumb.map((b, index) => (
                        <button
                          key={b.id}
                          onClick={() => navigateToCrumb(index)}
                          className={`mr-2 inline-flex items-center ${index < breadcrumb.length - 1 ? 'text-blue-600 hover:underline' : 'text-slate-700 font-medium'}`}
                        >
                          {b.name}{index < breadcrumb.length - 1 ? ' / ' : ''}
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div>
                    {stack.length > 0 ? (
                      <button
                        onClick={() => setStack(s => s.slice(0, -1))}
                        className="text-sm text-muted-foreground hover:text-slate-900"
                      >
                        ← Back
                      </button>
                    ) : null}
                  </div>
                </div>

                <main className="overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {currentFolder.items?.map((item) => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-shadow transform hover:-translate-y-1 cursor-pointer min-h-[100px] w-full"
                        onClick={() => {
                          if (item.type === 'folder') {
                            pushFolder(item.id);
                            return;
                          }
                          // If it's a document, dispatch the shared navigation event so
                          // the admin page can listen and open DocumentView.
                          try {
                            const documentId = item.id;
                            if (typeof window !== 'undefined' && window.dispatchEvent) {
                              window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: item.name } }));
                              try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                              if (item.name) try { localStorage.setItem('lastHighlightedDocumentName', item.name); } catch (e) {}
                            }
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        <CardHeader className="p-0">
                          <div className="flex items-stretch">
                            <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-l flex-shrink-0">
                              {item.type === 'folder' ? (
                                <FolderIcon className="w-7 h-7 text-yellow-500" />
                              ) : (
                                getFileIcon(item.fileType)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Title bar with subtle colored background */}
                              <div className="px-3 py-2 bg-gradient-to-r from-slate-50/40 via-transparent to-transparent dark:from-slate-800/40 rounded-r">
                                <p className="font-medium break-words text-slate-900 dark:text-slate-100">{item.name}</p>
                                {item.type === 'folder' && (
                                  <p className="text-sm text-muted-foreground">{item.items?.filter(c => c.type === 'document').length} document{(item.items?.filter(c => c.type === 'document').length === 1) ? '' : 's'}</p>
                                )}
                                {item.type === 'document' && (
                                  <p className="text-sm text-muted-foreground">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </main>
              </div>

              <aside className="w-full lg:w-80">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>Recent uploads</CardHeader>
                    <CardContent>
                      <ul className="divide-y">
                        {recentUploads.length === 0 && <div className="text-sm text-muted-foreground">No recent uploads</div>}
                        {recentUploads.map((r, idx) => (
                          <li key={r.name + String(r.createdAt) + idx} className="py-2">
                            <button
                              onClick={() => {
                                try {
                                  let documentId = (r as any).id || (r as any).documentId || null;

                                  // If no explicit id, try to find the document by name in the workspace folders
                                  if (!documentId && r && r.name) {
                                    const targetName = String(r.name).toLowerCase().trim();
                                    const findDoc = (items: any[]): string | null => {
                                      for (const it of items || []) {
                                        if (it.type === 'document') {
                                          const n = String(it.name || '').toLowerCase().trim();
                                          if (n === targetName || n.includes(targetName) || targetName.includes(n)) return it.id;
                                        } else if (it.type === 'folder') {
                                          const res = findDoc(it.items || []);
                                          if (res) return res;
                                        }
                                      }
                                      return null;
                                    };
                                    try {
                                      const found = findDoc(workspace.folders || []);
                                      if (found) documentId = found;
                                    } catch (e) {
                                      // ignore
                                    }

                                    // last-resort: slugify name (legacy behavior)
                                    if (!documentId) {
                                      documentId = String(r.name).replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
                                    }
                                  }

                                  if (documentId && typeof window !== 'undefined' && window.dispatchEvent) {
                                    window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: r.name } }));
                                    try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                                    if (r.name) try { localStorage.setItem('lastHighlightedDocumentName', r.name); } catch (e) {}
                                  } else {
                                    console.warn('Could not locate document for recent upload:', r.name);
                                  }
                                } catch (e) { console.warn('Recent upload click error', e); }
                              }}
                              className="w-full text-left cursor-pointer hover:underline"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm truncate">{r.name}</div>
                                <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>Top file types</CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        {Object.entries(fileTypeCounts).length === 0 && <div className="text-sm text-muted-foreground">No documents</div>}
                        {Object.entries(fileTypeCounts).slice(0, 8).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> {k}</div>
                            <div className="font-medium">{v}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* occupancy moved to header */}
                </div>
              </aside>
            </div>
          </TabsContent>
          
          <TabsContent value="teams" className="mt-6">
            <TeamsView workspace={workspace} />
          </TabsContent>
          
          <TabsContent value="stats" className="mt-6">
            <div className="space-y-6">
              {/* Workspace Overview Cards */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Workspace Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="text-sm font-medium text-white">Total Folders</div>
                      <FolderIcon className="h-4 w-4 text-slate-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalFolders}</div>
                      <p className="text-xs text-muted-foreground">
                        Organization units
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="text-sm font-medium text-white">Total Documents</div>
                      <FileText className="h-4 w-4 text-slate-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalDocuments}</div>
                      <p className="text-xs text-muted-foreground">
                        All files in workspace
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="text-sm font-medium text-white">File Types</div>
                      <Tag className="h-4 w-4 text-slate-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{Object.keys(fileTypeCounts).length}</div>
                      <p className="text-xs text-muted-foreground">
                        Different formats
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Staffing Chart Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="md:col-span-2">
                    <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg">
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-slate-200" />
                          <div className="text-lg font-medium text-white">Staffing Levels</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-white border-white/20 hover:bg-white/10"
                            onClick={() => {
                              // Refresh data by re-triggering the effect
                              setStaffingLoading(true);
                            }}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Refresh
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {(['day', 'week', 'month'] as const).map((timeframe) => (
                          <Button
                            key={timeframe}
                            size="sm"
                            variant={staffingTimeframe === timeframe ? "secondary" : "ghost"}
                            className={staffingTimeframe === timeframe ? 
                              "bg-white/20 text-white hover:bg-white/30" : 
                              "text-white/70 hover:bg-white/10 hover:text-white"}
                            onClick={() => setStaffingTimeframe(timeframe)}
                          >
                            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {staffingLoading ? (
                        <div className="h-48 flex items-center justify-center">
                          <div className="text-muted-foreground">Loading staffing data...</div>
                        </div>
                      ) : staffingHistory.length > 0 ? (
                        <div className="space-y-4">
                          {/* Current Stats */}
                          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-amber-600">{staffingData?.day || 0}</div>
                              <div className="text-sm text-muted-foreground">Day Staff</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{staffingData?.night || 0}</div>
                              <div className="text-sm text-muted-foreground">Night Staff</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{staffingData?.total || 0}</div>
                              <div className="text-sm text-muted-foreground">Total Staff</div>
                            </div>
                          </div>

                          {/* Simple Bar Chart */}
                          <div className="h-32">
                            <div className="text-sm font-medium mb-2">Staffing Trend ({staffingTimeframe})</div>
                            <div className="flex items-end justify-between h-24 gap-1">
                              {staffingHistory.slice(-10).map((entry, index) => {
                                const maxTotal = Math.max(...staffingHistory.map(h => h.total), 1);
                                const dayHeight = (entry.day / maxTotal) * 100;
                                const nightHeight = (entry.night / maxTotal) * 100;
                                
                                return (
                                  <div key={entry.date} className="flex flex-col items-center flex-1 min-w-0">
                                    <div className="flex flex-col w-full" style={{ height: '72px' }}>
                                      <div 
                                        className="bg-amber-500 rounded-t"
                                        style={{ height: `${dayHeight}%`, minHeight: entry.day > 0 ? '2px' : '0' }}
                                        title={`Day: ${entry.day}`}
                                      />
                                      <div 
                                        className="bg-blue-500 rounded-b"
                                        style={{ height: `${nightHeight}%`, minHeight: entry.night > 0 ? '2px' : '0' }}
                                        title={`Night: ${entry.night}`}
                                      />
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                                      {new Date(entry.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                                <span>Day Staff</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                <span>Night Staff</span>
                              </div>
                            </div>
                          </div>
                          
                          {staffingData?.lastUpdated && (
                            <div className="text-xs text-muted-foreground text-center">
                              Last updated: {staffingData.lastUpdated}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-48 flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-muted-foreground mb-2" />
                          <div className="text-muted-foreground text-center">
                            No staffing data available for the selected timeframe
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Record daily staffing levels to see trends
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white rounded-t-lg flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="text-sm font-medium text-white">Occupancy</div>
                      <BarChart2 className="h-4 w-4 text-slate-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Current occupancy rate
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Audit Statistics with Summary Cards */}
              <StatsView workspaceId={workspace.id} />

              {/* Charts and Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Type Distribution */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">File Type Breakdown</div>
                    <div className="text-sm text-muted-foreground">Distribution of document types</div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(fileTypeCounts).length === 0 ? (
                        <div className="text-sm text-muted-foreground">No documents in workspace</div>
                      ) : (
                        Object.entries(fileTypeCounts)
                          .sort(([,a], [,b]) => b - a)
                          .map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                <span className="text-sm font-medium">{type.toUpperCase()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-muted-foreground">{count} files</div>
                                <div className="text-xs text-muted-foreground">
                                  ({Math.round((count / totalDocuments) * 100)}%)
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Recent Activity</div>
                    <div className="text-sm text-muted-foreground">Latest document uploads</div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentUploads.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No recent uploads</div>
                      ) : (
                        recentUploads.map((upload, index) => (
                          <div key={`${upload.name}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{upload.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex-shrink-0">
                              {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : 'Unknown'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Occupancy Visualization */}
              {typeof occupancyPercent === 'number' && (
                <Card>
                  <CardHeader>
                    <div className="text-lg font-semibold">Occupancy Overview</div>
                    <div className="text-sm text-muted-foreground">Current capacity utilization</div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-8">
                        <div className="flex items-center justify-center">
                          <OccupancyPie percent={occupancyPercent} size={120} strokeWidth={12} />
                        </div>
                        <div className="space-y-2">
                          <div className="text-3xl font-bold">{occupancyPercent}%</div>
                          <div className="text-sm text-muted-foreground">Current Occupancy</div>
                          {workspace.totalBeds && workspace.occupiedBeds && (
                            <div className="text-sm text-muted-foreground">
                              {workspace.occupiedBeds} of {workspace.totalBeds} beds occupied
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
