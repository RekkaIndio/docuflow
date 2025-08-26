"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import AdminWorkspaceView from '@/components/admin/admin-workspace-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, BarChart2, Download, MessageSquare, X } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Sparkline from '@/components/admin/sparkline';
import { ChatPanel } from '@/components/chat/chat-panel';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import type { Folder } from '@/lib/types';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      // not signed in
      router.push('/login');
      return;
    }
    // Simple client-side role check: we expect admin users to have role 'Admin' on their user doc
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const resp = await fetch('/api/admin/workspaces');
        if (!resp.ok) {
          console.error('Failed to fetch workspaces');
          setWorkspaces([]);
          return;
        }
        const data = await resp.json();
        setWorkspaces(data.workspaces || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };

    // Only fetch if current user looks like an admin (client-side). This is a convenience
    // check only; server must also protect this route in production.
    (async () => {
      try {
        if (!user) return;
        // fetch user record to check role
        const userResp = await fetch(`/api/users/${user.id}`);
        if (!userResp.ok) {
          // fallback: still fetch workspaces but warn
          await fetchData();
          return;
        }
        const userData = await userResp.json();
        if (userData?.role === 'Admin') {
          await fetchData();
        } else {
          // not an admin
          router.push('/');
        }
      } catch (e) {
        console.error(e);
        await fetchData();
      }
    })();
  }, [user, loading, router]);

  const [selectedWorkspace, setSelectedWorkspace] = React.useState<any | null>(null);
  const [adminView, setAdminView] = React.useState<'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'stats'>('home');
  const [regionFilter, setRegionFilter] = React.useState<string[]>((['All']));

  // Helper: return a folder-like object for the selected workspace (chat expects a Folder)
  const getWorkspaceRootForChat = (ws: any) => ({ id: ws?.id || 'admin-root', name: ws?.name || 'Admin', type: 'folder' as const, items: ws?.folders || [], workspaceId: ws?.id || 'admin' });

  // Derived metrics from workspaces
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
          if (item.type === 'document') {
            wsDocCount += 1;
            totalDocuments += 1;
            const ft = item.fileType || 'unknown';
            fileTypeCounts[ft] = (fileTypeCounts[ft] || 0) + 1;
            recentUploads.push({ id: item.id, name: item.name, createdAt: item.createdAt, workspaceName: ws.name || ws.id });
          }
        }
      }
      workspaceDocCounts.push({ id: ws.id, name: ws.name || ws.id, count: wsDocCount });
    }

    recentUploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topFileTypes = Object.entries(fileTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topWorkspaces = workspaceDocCounts.sort((a, b) => b.count - a.count).slice(0, 5);

    // Build region map
    const regions: Record<string, { workspaces: any[]; totalFolders: number; totalDocuments: number }> = {};
    for (const ws of workspaces) {
      const region = ws.region || 'Unspecified';
      if (!regions[region]) regions[region] = { workspaces: [], totalFolders: 0, totalDocuments: 0 };
      regions[region].workspaces.push(ws);
      regions[region].totalFolders += (ws.folders?.length || 0);
      // count docs in ws
      let wsDocs = 0;
      for (const folder of (ws.folders || [])) {
        for (const item of (folder.items || [])) {
          if (item.type === 'document') wsDocs += 1;
        }
      }
      regions[region].totalDocuments += wsDocs;
    }

    // build last 30 days timeline
    const days = 30;
    const today = new Date();
    const timelineLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      timelineLabels.push(d.toISOString().slice(0, 10));
    }

    const timelineCounts = timelineLabels.map(label => recentUploads.filter(r => r.createdAt.slice(0, 10) === label).length);

    return { fileTypeCounts, topFileTypes, recentUploads: recentUploads.slice(0, 10), topWorkspaces, totalFolders, totalDocuments, regions, timelineLabels, timelineCounts };
  }, [workspaces]);

  const filteredWorkspaces = React.useMemo(() => {
    if (!aggregated || !aggregated.regions) return workspaces;
    if (regionFilter.includes('All') || regionFilter.length === 0) return workspaces;
    const set = new Set(regionFilter);
    const res: any[] = [];
    for (const r of Object.keys(aggregated.regions)) {
      if (set.has(r)) res.push(...(aggregated.regions[r].workspaces || []));
    }
    return res;
  }, [aggregated, regionFilter, workspaces]);

  return (
    <>
      <div className="p-6">
          {!selectedWorkspace ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader>Total Workspaces</CardHeader>
                      <CardContent>{workspaces.length}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader>Total Folders</CardHeader>
                      <CardContent>{aggregated.totalFolders}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader>Total Documents</CardHeader>
                      <CardContent>{aggregated.totalDocuments}</CardContent>
                    </Card>
                  </div>

                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <BarChart2 className="w-6 h-6 text-primary" />
                          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-muted-foreground">Showing <span className="font-medium">{workspaces.length}</span> workspaces</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <select multiple value={regionFilter} onChange={(e) => {
                              const opts = Array.from(e.currentTarget.selectedOptions).map(o => o.value);
                              setRegionFilter(opts);
                            }} className="text-sm bg-background border rounded px-2 py-1">
                              <option value="All">All regions</option>
                              {Object.keys(aggregated.regions || {}).map(r => (
                                <option key={r} value={r}>{r} ({aggregated.regions[r].workspaces.length})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardHeader>Top File Types</CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {aggregated.topFileTypes.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No documents yet</div>
                              ) : (
                                aggregated.topFileTypes.map(([ft, count]: any) => (
                                  <div key={ft} className="flex items-center justify-between">
                                    <div className="capitalize">{ft}</div>
                                    <div className="text-sm text-muted-foreground">{count}</div>
                                  </div>
                                ))
                              )}
                              <div className="mt-2">
                                <Sparkline values={aggregated.timelineCounts} width={200} height={40} />
                                <div className="text-xs text-muted-foreground mt-1">Documents in last 30 days: <span className="font-medium">{aggregated.timelineCounts.reduce((s: number, v: number) => s + v, 0)}</span></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>Recent Uploads</CardHeader>
                          <CardContent>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {aggregated.recentUploads.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No recent uploads</div>
                              ) : (
                                aggregated.recentUploads.map((u) => (
                                  <div key={u.id} className="flex items-center justify-between">
                                    <div className="truncate pr-2">{u.name}</div>
                                    <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex items-center justify-between">
                            <div>Top Workspaces</div>
                            <div className="flex items-center gap-2">
                              <button className="text-xs text-muted-foreground flex items-center gap-1" onClick={() => {
                                // export CSV of top workspaces using native download
                                const csv = ['Workspace,Count', ...aggregated.topWorkspaces.map((w: any) => `${w.name.replace(/,/g, '')},${w.count}`)].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'top-workspaces.csv';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              }}><Download className="w-4 h-4" /> Export</button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {aggregated.topWorkspaces.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No data</div>
                              ) : (
                                aggregated.topWorkspaces.map((w) => (
                                  <div key={w.id} className="flex items-center justify-between">
                                    <div className="truncate pr-2">{w.name}</div>
                                    <div className="text-sm text-muted-foreground">{w.count}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Right column intentionally left for metrics */}
                    <aside className="w-80 hidden xl:block">
                      <div className="space-y-4">
                        <Card>
                          <CardHeader>Occupancy (overall)</CardHeader>
                          <CardContent>
                            {/* compute overall occupancy from workspaces: average weighted by workspace size if available, otherwise simple mean */}
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <OccupancyPie percent={(() => {
                                  // default: compute simple average of workspace occupancy values (0..1)
                                  if (!workspaces || workspaces.length === 0) return 0;
                                  const vals = workspaces.map(w => (typeof w.occupancy === 'number' ? w.occupancy : 0));
                                  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                                  return Math.round((avg || 0) * 100);
                                })()} />
                              </div>
                              <div className="w-36">
                                <div className="text-sm text-muted-foreground">Regions</div>
                                <div className="mt-2 space-y-2">
                                  {Object.keys(aggregated.regions || {}).slice(0,5).map(r => {
                                    const reg = aggregated.regions[r];
                                    // compute region avg occupancy
                                    const occVals = (reg.workspaces || []).map((w: any) => typeof w.occupancy === 'number' ? w.occupancy : 0);
                                    const avg = occVals.length ? (occVals.reduce((s: number, v: number) => s + v, 0) / occVals.length) : 0;
                                    return (
                                      <div key={r} className="flex items-center justify-between">
                                        <div className="text-sm truncate pr-2">{r}</div>
                                        <div className="text-sm font-medium">{Math.round(avg * 100)}%</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>Occupancy by region</CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.keys(aggregated.regions || {}).length === 0 ? (
                                <div className="text-sm text-muted-foreground">No region data</div>
                              ) : (
                                Object.keys(aggregated.regions).map(r => {
                                  const reg = aggregated.regions[r];
                                  const occVals = (reg.workspaces || []).map((w: any) => typeof w.occupancy === 'number' ? w.occupancy : 0);
                                  const avg = occVals.length ? (occVals.reduce((s: number, v: number) => s + v, 0) / occVals.length) : 0;
                                  return (
                                    <div key={r} className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-slate-400 rounded-full flex-shrink-0" />
                                      <div className="flex-1 text-sm truncate">{r}</div>
                                      <div className="w-24 text-right text-sm font-medium">{Math.round(avg * 100)}%</div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </aside>
                  </div>

                  {workspaces.length === 0 ? (
                    <div className="rounded border p-6 text-center text-muted-foreground">No workspaces found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredWorkspaces.map((ws: any) => (
                        <Card key={ws.id} className={cn('hover:shadow-lg transition-shadow', ws.region ? '' : 'opacity-90') }>
                          <CardHeader className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-semibold">{ws.name || ws.id}</div>
                              <div className="text-sm text-muted-foreground">Owner: {ws.ownerId || '—'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{ws.folders?.length || 0} folders</Badge>
                              <Button onClick={() => setSelectedWorkspace(ws)}>Open</Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="mt-2 text-sm text-muted-foreground space-y-2">
                              {(ws.folders || []).slice(0, 6).map((f: any) => (
                                <div key={f.id} className="flex items-center justify-between">
                                  <div className="truncate">{f.name}</div>
                                  <div className="text-xs text-muted-foreground">{(f.items || []).filter((it: any) => it.type === 'document').length} docs</div>
                                </div>
                              ))}
                              {(ws.folders || []).length > 6 && <div className="text-xs text-muted-foreground">And more...</div>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="h-[calc(100vh-64px)]">
              <AdminWorkspaceView workspace={selectedWorkspace} onClose={() => setSelectedWorkspace(null)} />
            </div>
          )}
        </div>
  {/* Floating chat button and overlay (admin) */}
  <div className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out",
        isMobile
          ? isChatOpen
            ? "bottom-0 right-0 left-0 h-[70vh] max-h-[600px]"
            : "bottom-4 right-4 w-auto h-auto"
          : isChatOpen
            ? "bottom-4 right-4 w-[500px] h-[650px]"
            : "bottom-4 right-4 w-auto h-auto"
      )}>
        {isChatOpen ? (
          <div className="h-full">
            <div className="h-full flex flex-col shadow-2xl bg-white rounded-lg">
              <div className="flex items-center justify-between p-2 border-b">
                <h3 className="font-semibold px-2 truncate">Admin Chat</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
                <div className="p-2 h-full">
                <AdminChatPanel selectedItem={getWorkspaceRootForChat(selectedWorkspace || { id: 'admin-root', name: 'Admin', folders: [] })} onFolderAdd={() => { /* noop for now */ }} />
              </div>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  size={isMobile ? "default" : "lg"}
                  className={cn(
                    "rounded-full shadow-lg transition-all duration-200",
                    isMobile ? "w-14 h-14" : "w-16 h-16"
                  )}
                  onClick={() => setIsChatOpen(true)}
                  aria-label="Open admin chat"
                >
                  <MessageSquare className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side={isMobile ? "top" : "left"}>
              <p>Open admin chat</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );
}
