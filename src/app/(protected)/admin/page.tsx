"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import AdminWorkspaceView from '@/components/admin/admin-workspace-view';
import { DocumentView } from '@/components/dashboard/document-view';
import { TeamsView } from '@/components/dashboard/teams-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, BarChart2, Download, MessageSquare, X, ArrowLeft, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from '@/components/dashboard/overview-cards';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Sparkline from '@/components/admin/sparkline';
import { ChatPanel } from '@/components/chat/chat-panel';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import type { Folder, Document } from '@/lib/types';

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
        // read view param from URL (e.g., /admin?view=teams)
        try {
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const v = params?.get('view');
          if (v && ['home','files','documents','tags','teams','settings','renewals','accessibility','stats'].includes(v)) {
            setAdminView(v as any);
          }
        } catch (e) {
          // ignore
        }
        // fetch user record to check role
        const userResp = await fetch(`/api/users/${user.id}`);
        if (!userResp.ok) {
          // fallback: still fetch workspaces but warn
          await fetchData();
          return;
        }
        const userData = await userResp.json();
        // Allow dev-mode cookie 'isAdmin=1' as a fallback when the Firestore user
        // record doesn't have role set to 'Admin'. This mirrors the middleware
        // behaviour which also accepts the cookie when firebase-admin isn't
        // configured locally.
        const hasDevAdminCookie = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
        if (userData?.role === 'Admin' || hasDevAdminCookie) {
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

  // Listen for navigate-to-workspace events (from admin chat) so chat can open a workspace
  React.useEffect(() => {
    const handleNavigateToWorkspace = (ev: any) => {
      const detail = ev?.detail || {};
      const id = detail.workspaceId;
      const name = detail.workspaceName;
      if (!id && !name) return;
      // find by id first, then by case-insensitive name
      let found = workspaces.find(w => w.id === id);
      if (!found && name) {
        found = workspaces.find(w => (w.name || '').toLowerCase() === String(name).toLowerCase());
      }
      if (found) {
        setSelectedWorkspace(found);
        setAdminView('home');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('navigate-to-workspace', handleNavigateToWorkspace as EventListener);
      return () => window.removeEventListener('navigate-to-workspace', handleNavigateToWorkspace as EventListener);
    }
  }, [workspaces]);

  const [selectedWorkspace, setSelectedWorkspace] = React.useState<any | null>(null);
  const [selectedWorkspaceForTeams, setSelectedWorkspaceForTeams] = React.useState<any | null>(null);
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [lastChatDetail, setLastChatDetail] = React.useState<{ text?: string; documents?: any[] } | undefined>(undefined);
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

  // Listen for chat responses and navigate-to-document events so the admin
  // area can open DocumentView when requested by the AdminChatPanel.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChatResponse = (event: any) => {
      const detail = event?.detail;
      if (detail && (typeof detail.text === 'string' || Array.isArray(detail.documents))) {
        setLastChatDetail({ text: detail.text, documents: detail.documents || [] });
      }
    };

  const handleDocumentNavigation = async (event: CustomEvent) => {
      const { documentId, documentName } = event.detail || {};
      if (!selectedWorkspace) return;

      const findDocument = (items: (Folder | Document)[]): Document | null => {
        for (const item of items) {
          if ((item as any).type === 'document' && (item as Document).id === documentId) {
            return item as Document;
          }
          if ((item as any).type === 'folder') {
            const found = findDocument((item as Folder).items || []);
            if (found) return found;
          }
        }
        return null;
      };

      const document = findDocument(selectedWorkspace.folders || []);
      if (document) {
        setLastChatDetail(undefined);
        setSelectedDocument(document as Document);
        setAdminView('files');
        try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); } catch (e) {}
      } else {
        // Attempt cross-workspace resolution via server-side search
        try {
          const q = documentId || documentName || '';
          if (q) {
            const resp = await fetch('/api/search-documents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q, searchAll: true }),
            });
            if (resp.ok) {
              const json = await resp.json();
              const results = json?.results || [];
              const best = results[0];
              if (best) {
                // best should contain workspaceId and document fields returned by searchDocumentsInWorkspace
                const wsId = best.workspaceId || best.workspace || null;
                // Try to find the workspace in our loaded list and set it active so UI context matches
                const ws = workspaces.find(w => w.id === wsId) || null;
                if (ws) setSelectedWorkspace(ws);

                // Normalize document object to our Document type shape as much as possible
                const docObj: Document = {
                  id: best.id || best.documentId || best.document_id || '',
                  name: best.name || best.title || best.documentName || '',
                  type: 'document',
                  fileType: best.fileType || (best.name && best.name.split('.').pop()?.toLowerCase() as any) || 'pdf',
                  createdAt: best.createdAt || new Date().toISOString(),
                  owner: best.owner || { id: best.ownerId || 'unknown', name: best.ownerName || 'Unknown', email: null, avatarUrl: null },
                  extractedJson: best.extractedJson || best.documentJson || best.extracted || undefined,
                  summary: best.summary || undefined,
                  embedding: best.embedding || undefined,
                  workspaceId: wsId || undefined,
                  folderId: best.folderId || best.folder_id || null,
                  storagePath: best.storagePath || best.path || undefined,
                  tags: best.tags || undefined,
                  renewalDate: best.renewalDate || undefined,
                } as Document;

                setLastChatDetail(undefined);
                setSelectedDocument(docObj);
                setAdminView('files');
                try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: docObj.id } })); } catch (e) {}
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Cross-workspace document lookup failed', e);
        }

        console.warn(`Document ${documentId} (${documentName}) not found in selected workspace`);
        try { window.alert(`Document "${documentName || documentId}" not found in the selected workspace.`); } catch (e) {}
      }
    };

    // Create wrappers so we can register EventListener (non-async) while delegating
    // to our async handler for the navigate event.
    const navWrapper = (evt: Event) => {
      try {
        // Cast to CustomEvent to access .detail
        handleDocumentNavigation(evt as CustomEvent).catch((err) => console.error('navigate handler error', err));
      } catch (e) {
        console.error('navigate-to-document wrapper error', e);
      }
    };

    window.addEventListener('chat-response', handleChatResponse as EventListener);
    window.addEventListener('navigate-to-document', navWrapper as EventListener);

    return () => {
      try { window.removeEventListener('chat-response', handleChatResponse as EventListener); } catch (e) {}
      try { window.removeEventListener('navigate-to-document', navWrapper as EventListener); } catch (e) {}
    };
  }, [selectedWorkspace]);

  // Care-homes style overview: total beds, occupied and average occupancy
  const careOverview = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return { totalHomes: 0, totalBeds: 0, totalOccupied: 0, averageOccupancy: 0 };

    const homesWithBeds = workspaces.filter(w => typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number');
    const totalBeds = homesWithBeds.reduce((s, w) => s + (w.totalBeds || 0), 0);
    const totalOccupied = homesWithBeds.reduce((s, w) => s + (w.occupiedBeds || 0), 0);

    // For homes without explicit bed counts, use occupancy percentage if available
    const homesWithPercentage = workspaces.filter(w => !(typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number') && typeof w.occupancy === 'number');
    const percentageOccupancy = homesWithPercentage.length ? (homesWithPercentage.reduce((s, w) => s + (w.occupancy || 0), 0) / homesWithPercentage.length) : 0;

    const averageOccupancy = totalBeds > 0 ? (totalOccupied / totalBeds) : percentageOccupancy;

    return { totalHomes: workspaces.length, totalBeds, totalOccupied, averageOccupancy };
  }, [workspaces]);

  return (
    <>
      <div className="p-6">
        {!selectedWorkspace ? (
          // Top-level switch for admin views
          adminView === 'teams' ? (
            // Teams admin view
            <>
              <h1 className="text-2xl font-bold mb-4">Teams (Admin)</h1>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                  {selectedWorkspaceForTeams ? (
                    // Show the full TeamsView for a selected workspace with a header/back button
                    <div className="h-[calc(100vh-64px)] flex flex-col">
                      <header className="bg-background p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedWorkspaceForTeams(null)}>
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col">
                            <div className="text-lg font-semibold">Teams — {selectedWorkspaceForTeams.name || selectedWorkspaceForTeams.id}</div>
                            <div className="text-sm text-muted-foreground">Manage teams and permissions for this workspace</div>
                          </div>
                        </div>
                        <div />
                      </header>
                      <main className="flex-1 overflow-y-auto">
                        <TeamsView workspace={selectedWorkspaceForTeams} />
                      </main>
                    </div>
                  ) : (
                    // Show workspaces list with Manage Teams button
                    <>
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
                                  <Button onClick={() => setSelectedWorkspaceForTeams(ws)}>Manage Teams</Button>
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
              )}
            </>
          ) : (
            // Default dashboard / files view (unchanged)
            <>
              <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                      {/* Dark hero header like workspace view */}
                      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm mb-6">
                        <div className="w-full mx-auto flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-md">
                              <Users className="w-10 h-10 text-white/90" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold leading-tight">Admin Dashboard</h2>
                              <div className="mt-1 text-sm text-slate-200">Admin overview · {workspaces.length} workspaces · {aggregated.totalFolders} folders · {aggregated.totalDocuments} documents</div>
                              <div className="mt-3 flex items-center gap-2">
                                <Button size="sm" onClick={() => { /* noop for now */ }}>Refresh</Button>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-4">
                            <div className="grid grid-cols-4 gap-3">
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Workspaces</div>
                                  <div className="text-lg font-semibold">{workspaces.length}</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Folders</div>
                                  <div className="text-lg font-semibold">{aggregated.totalFolders}</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Documents</div>
                                  <div className="text-lg font-semibold">{aggregated.totalDocuments}</div>
                                </div>
                              </div>
                              <div className="p-4 bg-white/6 rounded-lg flex items-center gap-4 shadow-md">
                                <div className="flex items-center justify-center w-16 h-16 bg-white/5 rounded-full">
                                  <OccupancyPie percent={Math.round((careOverview.averageOccupancy || 0) * 100)} size={64} strokeWidth={8} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs text-slate-300">Overall Occupancy</div>
                                  <div className="text-2xl font-bold leading-tight text-white">{Math.round((careOverview.averageOccupancy || 0) * 100)}%</div>
                                  <div className="text-sm text-slate-200">{careOverview.totalOccupied}/{careOverview.totalBeds} beds</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <BarChart2 className="w-6 h-6 text-primary" />
                          <h1 className="text-2xl font-bold">Overview</h1>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
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

                      {/* New: Low occupancy and Quick Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <Card className="border">
                          <CardHeader className="flex items-center justify-between">
                            <div>Low Occupancy</div>
                            <div className="text-xs text-muted-foreground">Watchlist</div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(workspaces || []).slice().sort((a,b) => {
                                const av = typeof a.occupancy === 'number' ? a.occupancy : (a.totalBeds ? (a.occupiedBeds || 0) / a.totalBeds : 1);
                                const bv = typeof b.occupancy === 'number' ? b.occupancy : (b.totalBeds ? (b.occupiedBeds || 0) / b.totalBeds : 1);
                                return av - bv;
                              }).slice(0,3).map((w: any) => (
                                <div key={`low-${w.id}`} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full">
                                      <OccupancyPie percent={Math.round(((typeof w.occupancy === 'number' ? w.occupancy : (w.totalBeds ? (w.occupiedBeds||0)/w.totalBeds : 0)) || 0) * 100)} size={40} strokeWidth={6} />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{w.name || w.id}</div>
                                      <div className="text-xs text-muted-foreground">{Math.round(((typeof w.occupancy === 'number' ? w.occupancy : (w.totalBeds ? (w.occupiedBeds||0)/w.totalBeds : 0)) || 0) * 100)}% occupied</div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">{w.totalBeds ? `${w.occupiedBeds || 0}/${w.totalBeds}` : 'n/a'}</div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border">
                          <CardHeader className="flex items-center justify-between">
                            <div>Quick Actions</div>
                            <div className="text-xs text-muted-foreground">Admin tools</div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3">
                              <Button onClick={() => {
                                // export workspaces overview CSV
                                const rows = [['Workspace','Occupancy','TotalBeds','OccupiedBeds']];
                                for (const w of workspaces) {
                                  const occ = typeof w.occupancy === 'number' ? (Math.round(w.occupancy * 100) + '%') : (w.totalBeds ? Math.round(((w.occupiedBeds||0)/w.totalBeds)*100) + '%' : 'n/a');
                                  rows.push([w.name || w.id, occ, String(w.totalBeds || ''), String(w.occupiedBeds || '')]);
                                }
                                const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = 'workspaces-overview.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                              }}>Export CSV</Button>
                              <Button variant="outline" onClick={async () => {
                                setLoadingData(true);
                                try {
                                  const resp = await fetch('/api/admin/workspaces');
                                  if (resp.ok) {
                                    const json = await resp.json();
                                    setWorkspaces(json.workspaces || []);
                                  }
                                } catch (e) { console.error(e); }
                                setLoadingData(false);
                              }}>Refresh</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    
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
          )
        ) : (
          <div className="h-[calc(100vh-64px)]">
            {selectedDocument ? (
              <DocumentView
                document={selectedDocument}
                onBack={() => setSelectedDocument(null)}
                responseDetail={lastChatDetail}
                isChatOpen={isChatOpen}
              />
            ) : (
              <AdminWorkspaceView workspace={selectedWorkspace} onClose={() => setSelectedWorkspace(null)} />
            )}
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
