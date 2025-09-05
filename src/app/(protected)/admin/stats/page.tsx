"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart2, 
  Users, 
  FileText, 
  Folder, 
  TrendingUp, 
  Activity,
  PieChart as PieChartIcon,
  Calendar,
  Building,
  Target,
  Database,
  Clock
} from 'lucide-react';

import MetricCard from '@/components/admin/metric-card';
import BarChart from '@/components/admin/bar-chart';
import PieChart from '@/components/admin/pie-chart';
import LineChart from '@/components/admin/line-chart';
import ActivityFeed from '@/components/admin/activity-feed';

// Simple in-file searchable multi-select for workspaces (no external deps)
function WorkspaceMultiSelect({ options, selected, onToggle }: { options: { id: string; name: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="p-2 border rounded bg-white dark:bg-gray-800">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search workspaces..." className="w-full px-2 py-1 border rounded text-sm mb-2" />
      <div className="flex gap-2 flex-wrap mb-2">
        {selected.map(id => {
          const o = options.find(x => x.id === id);
          return o ? (
            <button key={id} onClick={() => onToggle(id)} className="px-2 py-1 bg-primary text-white rounded text-xs">{o.name}</button>
          ) : null;
        })}
      </div>
      <div className="max-h-36 overflow-auto">
        {filtered.slice(0, 30).map(o => (
          <div key={o.id} className="flex items-center justify-between py-1">
            <div className="text-sm truncate">{o.name}</div>
            <div>
              <button onClick={() => onToggle(o.id)} className={`px-2 py-1 rounded text-xs border ${selected.includes(o.id) ? 'bg-primary text-white' : ''}`}>{selected.includes(o.id) ? 'Remove' : 'Add'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface UserStats {
  users: any[];
  statistics: {
    totalUsers: number;
    newUsersLast30Days: number;
    newUsersLast7Days: number;
    activeUsersLast30Days: number;
    activeUsersLast7Days: number;
    registrationTrends: { date: string; count: number }[];
    activityTrends: { date: string; count: number }[];
    roleDistribution: Record<string, number>;
  };
}

interface AnalyticsData {
  overview: {
    totalWorkspaces: number;
    totalDocuments: number;
    totalFolders: number;
    totalStorageUsage: string;
    documentsLast30Days: number;
    documentsLast7Days: number;
  };
  trends: {
    documentTrends: { date: string; count: number }[];
    documentsLast90Days: number;
    growthRate30Days: string;
  };
  distributions: {
    fileTypeDistribution: Record<string, number>;
    documentsByWorkspace: { name: string; count: number }[];
    topTags: { tag: string; count: number }[];
  };
  workspaces: {
    analytics: any[];
    mostActive: any[];
  };
  careHomes: {
    totalCareHomes: number;
    averageOccupancy: number;
    totalBeds: number;
    occupiedBeds: number;
    averageCompliance: number;
    totalRenewalBacklog: number;
    staffingDay?: number;
    staffingNight?: number;
  };
  careHomesList?: Array<{
    id: string;
    name: string;
    occupancy?: number;
    totalBeds?: number;
    occupiedBeds?: number;
    complianceScore?: number;
    renewalBacklog?: number;
    staffingDay?: number;
    staffingNight?: number;
  }>;
    dailyCheckins?: {
    totalCheckinsLast30Days: number;
    totalCheckinsLast7Days: number;
    totalFallsLast30Days: number;
    totalFallsLast7Days: number;
    totalCqcNotificationsLast30Days: number;
    totalSafeguardsLast30Days: number;
    woundTypeCounts: Record<string, number>;
    infectionCounts: Record<string, number>;
    weekly?: { weekStart: string; checkins: number; falls: number; cqc: number; safeguards: number }[];
    perWorkspaceWeekly?: Array<{
      workspaceId: string;
      workspaceName: string;
      weekly: { weekStart: string; checkins: number; falls: number; cqc: number; safeguards: number }[];
      totalsLast30?: {
        checkins: number;
        falls: number;
        cqc: number;
        safeguards: number;
        wounds: Record<string, number>;
        infections: Record<string, number>;
      };
      totalBeds?: number;
      occupiedBeds?: number;
      occupancy?: number;
    }>;
  };
  recentActivity: {
    documents: any[];
  };
}

export default function AdminStatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [loadingData, setLoadingData] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (loading) {
      return; // Wait for auth to complete
    }

    const fetchData = async () => {
      setLoadingData(true);
      setFetchError(null);
      try {
        const [usersResp, analyticsResp] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/analytics')
        ]);

        if (usersResp.ok) {
          const userData = await usersResp.json();
          setUserStats(userData);
        } else {
          // eslint-disable-next-line no-console
          console.warn('Admin stats: /api/admin/users returned', usersResp.status);
        }

        if (analyticsResp.ok) {
          const analyticsData = await analyticsResp.json();
          setAnalyticsData(analyticsData);
        } else {
          // eslint-disable-next-line no-console
          console.warn('Admin stats: /api/admin/analytics returned', analyticsResp.status);
        }

        if (!usersResp.ok && !analyticsResp.ok) {
          setFetchError('Failed to fetch admin statistics. Please try again later.');
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch admin stats:', e);
        setFetchError('Failed to fetch admin statistics. Please try again later.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  

  const fileTypeChartData = Object.entries(analyticsData?.distributions?.fileTypeDistribution || {}).map(([type, count]) => ({
    name: type.toUpperCase(),
    value: count as number
  }));

  const workspaceChartData = (analyticsData?.distributions?.documentsByWorkspace || []).slice(0, 10).map((item: any) => ({
    name: item.name,
    value: item.count
  }));

  const roleChartData = Object.entries(userStats?.statistics?.roleDistribution || {}).map(([role, count]) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: count as number
  }));

  const registrationTrends = (userStats?.statistics?.registrationTrends || []).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.count
  }));

  const documentTrends = (analyticsData?.trends?.documentTrends || []).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.count
  }));

  // staffing summary defaults (used in Staffing card)
  // Compute staffing totals with sensible fallbacks so the UI always shows available data.
  // Priority: careHomes aggregated totals (analyticsData.careHomes), then dailyCheckins totals (dailyCheckins.*),
  // then per-workspace totals (careHomesList entries), finally default to 0.
  const staffingDayFromCareHomes = analyticsData?.careHomes?.staffingDay;
  const staffingNightFromCareHomes = analyticsData?.careHomes?.staffingNight;

  // dailyCheckins totals (aggregated in analytics API) — these are totals for last 30 days
  const dailyStaffingDay = analyticsData?.dailyCheckins ? analyticsData.dailyCheckins.perWorkspaceWeekly?.length ? undefined : undefined : undefined;
  // The analytics API currently returns staffing totals on careHomes and perWorkspaceWeekly.totalsLast30, so prefer careHomes first.

  const staffingDay = typeof staffingDayFromCareHomes === 'number' ? staffingDayFromCareHomes : 0;
  const staffingNight = typeof staffingNightFromCareHomes === 'number' ? staffingNightFromCareHomes : 0;

  // Workspace selector hooks (declare early to avoid conditional hook rendering)
  const workspaceOptions = (analyticsData?.workspaces?.analytics || []).map((ws: any) => ({ id: ws.id, name: ws.name }));

  const [selectedWorkspaces, setSelectedWorkspaces] = React.useState<string[]>([]);
  const [showAllComparison, setShowAllComparison] = React.useState(false);
  const COMPARE_LIMIT = 6;

  const toggleWorkspace = (id: string) => {
    setSelectedWorkspaces(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // small helper to render comparisons inside cards
  function ComparisonRows({ metric, ids }: { metric: 'occupancy' | 'safeguards' | 'falls' | 'wounds' | 'infections' | 'cqc' | 'totalNotifications'; ids?: string[] }) {
    if (!analyticsData?.dailyCheckins?.perWorkspaceWeekly || !analyticsData?.careHomesList) return null;
    const list = ids && ids.length > 0 ? ids : selectedWorkspaces;
    const rows = list.map(id => {
      const p = (analyticsData.dailyCheckins!.perWorkspaceWeekly || []).find((pw: any) => pw.workspaceId === id);
      const home = (analyticsData.careHomesList as any[]).find(h => h.id === id) || {};
      const name = p?.workspaceName || home.name || id;
      // extract metric value (last 30 days totals if available)
      let value = 0;
      if (metric === 'occupancy') {
  const totalBeds = Number((home && (home.totalBeds ?? (p as any)?.totalBeds)) ?? (p as any)?.totalBeds ?? 0);
  const occupied = Number((home?.occupiedBeds ?? (p as any)?.occupiedBeds ?? Math.round((home?.occupancy || 0) * (Number(home?.totalBeds ?? (p as any)?.totalBeds ?? 0))))) || 0;
        value = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;
        return { id, name, display: `${value}%`, sortVal: value };
      }
  const totals: any = (p as any)?.totalsLast30 || {};
  if (metric === 'safeguards') value = Number(totals.safeguards || 0);
  if (metric === 'falls') value = Number(totals.falls || 0);
  if (metric === 'wounds') value = Object.values(totals.wounds || {}).reduce((s: number, x: any) => s + (Number(x) || 0), 0);
  if (metric === 'infections') value = Object.values(totals.infections || {}).reduce((s: number, x: any) => s + (Number(x) || 0), 0);
  if (metric === 'cqc') value = Number(totals.cqc || 0);
  if (metric === 'totalNotifications') value = (Number(totals.safeguards || 0) + Number(totals.cqc || 0));
      return { id, name, display: `${value}`, sortVal: value };
    });
    const max = Math.max(...rows.map(r => r.sortVal), 1);
    return (
      <div className="space-y-2">
        {rows.sort((a, b) => b.sortVal - a.sortVal).map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="w-40 text-sm truncate">{r.name}</div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                <div className="h-3 bg-primary" style={{ width: `${Math.round((r.sortVal / max) * 100)}%` }} />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-semibold">{r.display}</div>
          </div>
        ))}
      </div>
    );
  }

  // Comparison rows for a specific infection type (uti, chest, wound)
  function ComparisonRowsInfectionType({ type, ids }: { type: 'uti' | 'chest' | 'wound'; ids?: string[] }) {
    if (!analyticsData?.dailyCheckins?.perWorkspaceWeekly || !analyticsData?.careHomesList) return null;
    const list = ids && ids.length > 0 ? ids : selectedWorkspaces;
    const rows = list.map(id => {
      const p = (analyticsData.dailyCheckins!.perWorkspaceWeekly || []).find((pw: any) => pw.workspaceId === id);
      const home = (analyticsData.careHomesList as any[]).find(h => h.id === id) || {};
      const name = p?.workspaceName || home.name || id;
      const totals: any = (p as any)?.totalsLast30 || {};
      const val = Number((totals.infections && totals.infections[type]) || 0);
      return { id, name, display: `${val}`, sortVal: val };
    });
    const max = Math.max(...rows.map(r => r.sortVal), 1);
    return (
      <div className="space-y-2">
        {rows.sort((a, b) => b.sortVal - a.sortVal).map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="w-40 text-sm truncate">{r.name}</div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                <div className="h-3 bg-primary" style={{ width: `${Math.round((r.sortVal / max) * 100)}%` }} />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-semibold">{r.display}</div>
          </div>
        ))}
      </div>
    );
  }

  // Comparison rows for a specific wound type
  function ComparisonRowsWoundType({ type, ids }: { type: string; ids?: string[] }) {
    if (!analyticsData?.dailyCheckins?.perWorkspaceWeekly || !analyticsData?.careHomesList) return null;
    const list = ids && ids.length > 0 ? ids : selectedWorkspaces;
    const rows = list.map(id => {
      const p = (analyticsData.dailyCheckins!.perWorkspaceWeekly || []).find((pw: any) => pw.workspaceId === id);
      const home = (analyticsData.careHomesList as any[]).find(h => h.id === id) || {};
      const name = p?.workspaceName || home.name || id;
      const totals: any = (p as any)?.totalsLast30 || {};
      const val = Number((totals.wounds && (totals.wounds[type] ?? 0)) || 0);
      return { id, name, display: `${val}`, sortVal: val };
    });
    const max = Math.max(...rows.map(r => r.sortVal), 1);
    return (
      <div className="space-y-2">
        {rows.sort((a, b) => b.sortVal - a.sortVal).map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="w-40 text-sm truncate">{r.name}</div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                <div className="h-3 bg-primary" style={{ width: `${Math.round((r.sortVal / max) * 100)}%` }} />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-semibold">{r.display}</div>
          </div>
        ))}
      </div>
    );
  }

  // Comparison rows for staffing (day / night / total)
  function ComparisonRowsStaffing({ metric, ids }: { metric: 'day' | 'night' | 'total'; ids?: string[] }) {
    if (!analyticsData?.dailyCheckins?.perWorkspaceWeekly || !analyticsData?.careHomesList) return null;
    const list = ids && ids.length > 0 ? ids : selectedWorkspaces;
    const rows = list.map(id => {
      const p = (analyticsData.dailyCheckins!.perWorkspaceWeekly || []).find((pw: any) => pw.workspaceId === id);
      const home = (analyticsData.careHomesList as any[]).find(h => h.id === id) || {};
      const name = p?.workspaceName || home.name || id;
      // staffing can be on careHomes root or per-workspace totalsLast30 (use careHomesList values first)
      const day = Number(home?.staffingDay ?? (p as any)?.totalsLast30?.staffingDay ?? analyticsData?.careHomes?.staffingDay ?? 0);
      const night = Number(home?.staffingNight ?? (p as any)?.totalsLast30?.staffingNight ?? analyticsData?.careHomes?.staffingNight ?? 0);
      const total = day + night;
      const val = metric === 'day' ? day : metric === 'night' ? night : total;
      return { id, name, display: `${val}`, sortVal: val };
    });
    const max = Math.max(...rows.map(r => r.sortVal), 1);
    return (
      <div className="space-y-2">
        {rows.sort((a, b) => b.sortVal - a.sortVal).map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="w-40 text-sm truncate">{r.name}</div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-100 h-3 rounded overflow-hidden">
                <div className="h-3 bg-primary" style={{ width: `${Math.round((r.sortVal / max) * 100)}%` }} />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-semibold">{r.display}</div>
          </div>
        ))}
      </div>
    );
  }

  // If we are still loading, show a spinner.
  if (loading || loadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Statistics Suite</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // If both requests failed, show an error.
  if (fetchError && !userStats && !analyticsData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Statistics Suite</h1>
        </div>
        <div className="rounded border p-6 text-center text-muted-foreground">{fetchError}</div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full bg-surface-50 dark:bg-surface-900 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 shadow-sm">
          <BarChart2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">Admin Statistics Suite</h1>
          <p className="text-muted-foreground">Comprehensive insights across your platform</p>
        </div>
      </div>

      

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="care-homes">Care Homes</TabsTrigger>
          <TabsTrigger value="weekly-checkins">Weekly Check-ins</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Weekly Check-ins</h2>
              <p className="text-sm text-muted-foreground">Overview across all workspaces — last {analyticsData?.dailyCheckins?.weekly?.length ?? 0} weeks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">Compare workspaces:</div>
              <div className="max-w-md w-full">
                {/* Workspace multi-select search + chips */}
                <WorkspaceMultiSelect
                  options={workspaceOptions}
                  selected={selectedWorkspaces}
                  onToggle={toggleWorkspace}
                />
              </div>
            </div>
          </div>

            {/* Per-workspace comparison panel when 2 or more selected */}
            {selectedWorkspaces.length >= 2 && analyticsData?.careHomesList && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedWorkspaces.slice(0, COMPARE_LIMIT).map(id => {
                  const home = (analyticsData.careHomesList as any[]).find(h => h.id === id);
                  const totalBeds = home?.totalBeds ?? 0;
                  const occupied = home?.occupiedBeds ?? Math.round((home?.occupancy || 0) * (home?.totalBeds || 0));
                  const pct = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : null;
                  return (
                    <Card key={id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="font-medium">{home?.name || id}</div>
                        <div className="text-xs text-muted-foreground">Occupancy</div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-100 h-4 rounded overflow-hidden">
                            <div className="h-4 bg-primary" style={{ width: pct ? `${pct}%` : '2%' }} />
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <div>Occupied: <span className="font-semibold">{occupied}</span></div>
                            <div>Total: <span className="font-semibold">{totalBeds}</span></div>
                            <div>{pct !== null ? <span className="font-semibold">{pct}%</span> : <span className="text-muted-foreground">—</span>}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {selectedWorkspaces.length > COMPARE_LIMIT && (
                  <div className="flex items-center justify-center">
                    <button className="px-3 py-2 rounded border" onClick={() => setShowAllComparison(true)}>+{selectedWorkspaces.length - COMPARE_LIMIT} more</button>
                  </div>
                )}
              </div>
            )}

          {/* summary cards: Occupancy, Staffing, Safeguarding, CQC Notifications, Wounds */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/50 to-primary/5 dark:from-gray-800/50 rounded-t">
                <PieChartIcon className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Occupancy</div>
                  <div className="text-xs text-muted-foreground">Beds occupied vs available</div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  {selectedWorkspaces.length >= 2 ? (
                    <div className="w-full">
                      <ComparisonRows metric="occupancy" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                      {selectedWorkspaces.length > COMPARE_LIMIT && (
                        <div className="text-center mt-2"><button className="px-2 py-1 rounded border" onClick={() => setShowAllComparison(true)}>+{selectedWorkspaces.length - COMPARE_LIMIT} more</button></div>
                      )}
                    </div>
                  ) : typeof analyticsData?.careHomes?.totalBeds === 'number' ? (
                    (() => {
                      const total = analyticsData!.careHomes!.totalBeds || 0;
                      const occupied = analyticsData!.careHomes!.occupiedBeds || 0;
                      const available = Math.max(total - occupied, 0);
                      const pieData = [
                        { name: 'Occupied', value: occupied },
                        { name: 'Available', value: available }
                      ];
                      return (
                        <div className="text-center">
                          <PieChart data={pieData} size={140} />
                          <div className="flex justify-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full block"></span>Occupied {occupied}</div>
                            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-muted rounded-full block"></span>Available {available}</div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-xs text-muted-foreground">Beds data not available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/50 to-secondary/5 dark:from-gray-800/50 rounded-t">
                <Building className="w-5 h-5 text-secondary" />
                <div>
                  <div className="text-sm font-medium">Staffing</div>
                  <div className="text-xs text-muted-foreground">Total, Day & Night</div>
                </div>
              </div>
              <CardContent className="p-4">
                <Tabs defaultValue="total">
                  <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="night">Night</TabsTrigger>
                  </TabsList>
                  <TabsContent value="total">
                    {selectedWorkspaces.length >= 2 ? (
                      <div className="w-full">
                        <ComparisonRowsStaffing metric="total" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                        {selectedWorkspaces.length > COMPARE_LIMIT && (
                          <div className="text-center mt-2"><button className="px-2 py-1 rounded border" onClick={() => setShowAllComparison(true)}>+{selectedWorkspaces.length - COMPARE_LIMIT} more</button></div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <PieChart data={[{ name: 'Day', value: staffingDay }, { name: 'Night', value: staffingNight }]} size={140} />
                        <div className="flex justify-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-secondary rounded-full block"></span>Day {staffingDay}</div>
                          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-muted rounded-full block"></span>Night {staffingNight}</div>
                          <div className="flex items-center gap-2 font-semibold">Total {staffingDay + staffingNight}</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="day">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsStaffing metric="day" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <div className="text-sm font-semibold">{analyticsData?.careHomes?.staffingDay ?? 0}</div>
                    )}
                  </TabsContent>
                  <TabsContent value="night">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsStaffing metric="night" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <div className="text-sm font-semibold">{analyticsData?.careHomes?.staffingNight ?? 0}</div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Safeguarding summary card */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/50 to-amber-50 dark:from-gray-800/50 rounded-t">
                <Target className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">Safeguarding</div>
                  <div className="text-xs text-muted-foreground">Last 30 days</div>
                </div>
              </div>
              <CardContent className="p-4">
                {selectedWorkspaces.length >= 2 ? (
                  <ComparisonRows metric="safeguards" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                ) : (
                  <div className="text-sm font-semibold">{analyticsData?.dailyCheckins?.totalSafeguardsLast30Days ?? 0}</div>
                )}
              </CardContent>
            </Card>

            {/* CQC Notifications summary card */}
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/50 to-amber-50 dark:from-gray-800/50 rounded-t">
                <Database className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">CQC Notifications</div>
                  <div className="text-xs text-muted-foreground">Last 30 days</div>
                </div>
              </div>
              <CardContent className="p-4">
                {selectedWorkspaces.length >= 2 ? (
                  <ComparisonRows metric="cqc" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                ) : (
                  <div className="text-sm font-semibold">{analyticsData?.dailyCheckins?.totalCqcNotificationsLast30Days ?? 0}</div>
                )}
              </CardContent>
            </Card>

            {/* Wounds card moved down to join the charts below so we have two rows of three */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-white/50 to-rose-50 dark:from-gray-800/50 rounded-t">
                <FileText className="w-5 h-5 text-rose-500" />
                <div>
                  <div className="text-sm font-medium">Wounds</div>
                  <div className="text-xs text-muted-foreground">Types & counts</div>
                </div>
              </div>
              <CardContent className="p-4">
                <Tabs defaultValue="total">
                  <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    {/* list wound types dynamically */}
                    {(Object.keys(analyticsData?.dailyCheckins?.woundTypeCounts || {}) || []).slice(0, 6).map((wt: string) => (
                      <TabsTrigger key={wt} value={wt}>{wt.charAt(0).toUpperCase() + wt.slice(1)}</TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="total">
                    {selectedWorkspaces.length >= 2 ? (
                      <div className="w-full">
                        <ComparisonRows metric="wounds" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                        {selectedWorkspaces.length > COMPARE_LIMIT && (
                          <div className="text-center mt-2"><button className="px-2 py-1 rounded border" onClick={() => setShowAllComparison(true)}>+{selectedWorkspaces.length - COMPARE_LIMIT} more</button></div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(analyticsData?.dailyCheckins?.woundTypeCounts || {}).map(([k, v]) => (
                          <div key={k} className="flex justify-between"><span className="capitalize text-sm">{k}</span><span className="font-semibold">{v}</span></div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  {/* Per-wound tabs */}
                  {(Object.keys(analyticsData?.dailyCheckins?.woundTypeCounts || {}) || []).slice(0, 6).map((wt: string) => (
                    <TabsContent key={wt} value={wt}>
                      {selectedWorkspaces.length >= 2 ? (
                        <ComparisonRowsWoundType type={wt} ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                      ) : (
                        <BarChart data={[{ name: wt.charAt(0).toUpperCase() + wt.slice(1), value: analyticsData?.dailyCheckins?.woundTypeCounts?.[wt] ?? 0 }]} height={120} />
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Safeguarding & CQC (Last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">Safeguarding Reports</div>
                    <div className="font-semibold">{analyticsData?.dailyCheckins?.totalSafeguardsLast30Days ?? 0}</div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">CQC Notifications</div>
                    <div className="font-semibold">{analyticsData?.dailyCheckins?.totalCqcNotificationsLast30Days ?? 0}</div>
                  </div>

                  <div className="border-t pt-2 flex justify-between items-center">
                    <div className="text-sm">Total</div>
                    <div className="font-semibold">{(analyticsData?.dailyCheckins?.totalSafeguardsLast30Days ?? 0) + (analyticsData?.dailyCheckins?.totalCqcNotificationsLast30Days ?? 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Infections</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="total">
                  <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    <TabsTrigger value="uti">UTI</TabsTrigger>
                    <TabsTrigger value="chest">Chest</TabsTrigger>
                    <TabsTrigger value="wound">Wound</TabsTrigger>
                  </TabsList>
                  <TabsContent value="total">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRows metric="infections" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart
                        data={[
                          { name: 'UTI', value: analyticsData?.dailyCheckins?.infectionCounts?.uti ?? 0 },
                          { name: 'Chest', value: analyticsData?.dailyCheckins?.infectionCounts?.chest ?? 0 },
                          { name: 'Wound', value: analyticsData?.dailyCheckins?.infectionCounts?.wound ?? 0 }
                        ]}
                        height={140}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="uti">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="uti" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'UTI', value: analyticsData?.dailyCheckins?.infectionCounts?.uti ?? 0 }]} height={120} />
                    )}
                  </TabsContent>
                  <TabsContent value="chest">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="chest" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'Chest', value: analyticsData?.dailyCheckins?.infectionCounts?.chest ?? 0 }]} height={120} />
                    )}
                  </TabsContent>
                  <TabsContent value="wound">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="wound" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'Wound', value: analyticsData?.dailyCheckins?.infectionCounts?.wound ?? 0 }]} height={120} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            
          </div>

          {/* duplicate summary cards removed */}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={userStats?.statistics?.totalUsers ?? 0}
              icon={Users}
            />
            <MetricCard
              title="Active (30 days)"
              value={userStats?.statistics?.activeUsersLast30Days ?? 0}
              change={`${(((userStats?.statistics?.activeUsersLast30Days ?? 0) / Math.max((userStats?.statistics?.totalUsers ?? 1), 1)) * 100).toFixed(1)}% of total`}
              icon={Activity}
            />
            <MetricCard
              title="New This Week"
              value={userStats?.statistics?.newUsersLast7Days ?? 0}
              icon={Calendar}
            />
            <MetricCard
              title="New This Month"
              value={userStats?.statistics?.newUsersLast30Days ?? 0}
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Registrations Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={registrationTrends} height={250} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={roleChartData} size={200} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(userStats?.users || []).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{user.role}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        

        <TabsContent value="workspaces" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Workspaces"
              value={analyticsData?.overview?.totalWorkspaces ?? 0}
              icon={Folder}
            />
            <MetricCard
              title="Avg Documents/Workspace"
              value={Math.round((analyticsData?.overview?.totalDocuments ?? 0) / Math.max((analyticsData?.overview?.totalWorkspaces ?? 1), 1))}
              icon={FileText}
            />
            <MetricCard
              title="Most Active"
              value={analyticsData?.workspaces?.mostActive?.[0]?.name || 'None'}
              description={`${analyticsData?.workspaces?.mostActive?.[0]?.recentActivity || 0} recent uploads`}
              icon={TrendingUp}
            />
            <MetricCard
              title="Total Folders"
              value={analyticsData?.overview?.totalFolders ?? 0}
              icon={Folder}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Documents by Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={workspaceChartData} height={300} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analyticsData?.workspaces?.analytics || []).map((workspace: any) => (
                  <div key={workspace.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                        <p className="font-medium">{workspace.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {workspace.memberCount} members • {workspace.folderCount} folders
                        </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{workspace.documentCount} documents</p>
                      <p className="text-xs text-muted-foreground">
                        {workspace.recentActivity} recent uploads
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="care-homes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Care Homes"
              value={analyticsData?.careHomes?.totalCareHomes ?? 0}
              icon={Building}
            />
            <MetricCard
              title="Average Occupancy"
              value={`${(((analyticsData?.careHomes?.averageOccupancy ?? 0) * 100)).toFixed(1)}%`}
              icon={Target}
            />
            <MetricCard
              title="Bed Utilization"
              value={`${analyticsData?.careHomes?.occupiedBeds ?? 0}/${analyticsData?.careHomes?.totalBeds ?? 0}`}
              description={`${(((analyticsData?.careHomes?.occupiedBeds ?? 0) / Math.max((analyticsData?.careHomes?.totalBeds ?? 1), 1)) * 100).toFixed(1)}% occupied`}
              icon={Target}
            />
            <MetricCard
              title="Renewal Backlog"
              value={analyticsData?.careHomes?.totalRenewalBacklog ?? 0}
              changeType={(analyticsData?.careHomes?.totalRenewalBacklog ?? 0) > 0 ? 'negative' : 'positive'}
              icon={Clock}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricCard
              title="Average Compliance Score"
              value={`${(analyticsData?.careHomes?.averageCompliance ?? 0).toFixed(1)}/100`}
              changeType={(analyticsData?.careHomes?.averageCompliance ?? 0) >= 80 ? 'positive' : 'negative'}
              icon={Target}
              size="lg"
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Beds:</span>
                  <span className="font-medium">{analyticsData?.careHomes?.totalBeds ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupied Beds:</span>
                  <span className="font-medium">{analyticsData?.careHomes?.occupiedBeds ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Beds:</span>
                  <span className="font-medium">{Math.max((analyticsData?.careHomes?.totalBeds ?? 0) - (analyticsData?.careHomes?.occupiedBeds ?? 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupancy Rate:</span>
                  <span className="font-medium">{(((analyticsData?.careHomes?.occupiedBeds ?? 0) / Math.max((analyticsData?.careHomes?.totalBeds ?? 1), 1)) * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly-checkins" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Weekly Check-ins</h2>
              <p className="text-sm text-muted-foreground">Overview across all workspaces — last {analyticsData?.dailyCheckins?.weekly?.length ?? 0} weeks</p>
            </div>
            {/* Intentionally removed the two small summary cards to focus on the charts below */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={(analyticsData?.dailyCheckins?.weekly || []).map((w: any) => ({ date: w.weekStart, value: w.checkins }))} height={240} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Falls</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={(analyticsData?.dailyCheckins?.weekly || []).map((w: any) => ({ name: w.weekStart, value: w.falls }))} height={240} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Wound Types (count)</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={Object.entries(analyticsData?.dailyCheckins?.woundTypeCounts || {}).map(([k, v]) => ({ name: k, value: v }))} size={180} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Infections</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="total">
                  <TabsList>
                    <TabsTrigger value="total">Total</TabsTrigger>
                    <TabsTrigger value="uti">UTI</TabsTrigger>
                    <TabsTrigger value="chest">Chest</TabsTrigger>
                    <TabsTrigger value="wound">Wound</TabsTrigger>
                  </TabsList>
                  <TabsContent value="total">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRows metric="infections" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart
                        data={[
                          { name: 'UTI', value: analyticsData?.dailyCheckins?.infectionCounts?.uti ?? 0 },
                          { name: 'Chest', value: analyticsData?.dailyCheckins?.infectionCounts?.chest ?? 0 },
                          { name: 'Wound', value: analyticsData?.dailyCheckins?.infectionCounts?.wound ?? 0 }
                        ]}
                        height={160}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="uti">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="uti" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'UTI', value: analyticsData?.dailyCheckins?.infectionCounts?.uti ?? 0 }]} height={140} />
                    )}
                  </TabsContent>
                  <TabsContent value="chest">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="chest" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'Chest', value: analyticsData?.dailyCheckins?.infectionCounts?.chest ?? 0 }]} height={140} />
                    )}
                  </TabsContent>
                  <TabsContent value="wound">
                    {selectedWorkspaces.length >= 2 ? (
                      <ComparisonRowsInfectionType type="wound" ids={selectedWorkspaces.slice(0, COMPARE_LIMIT)} />
                    ) : (
                      <BarChart data={[{ name: 'Wound', value: analyticsData?.dailyCheckins?.infectionCounts?.wound ?? 0 }]} height={140} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Recent Documents"
              value={(analyticsData?.recentActivity?.documents || []).length}
              icon={FileText}
            />
            <MetricCard
              title="Active Users (7d)"
              value={userStats?.statistics?.activeUsersLast7Days ?? 0}
              icon={Users}
            />
            <MetricCard
              title="Uploads This Week"
              value={analyticsData?.overview?.documentsLast7Days ?? 0}
              icon={TrendingUp}
            />
            <MetricCard
              title="New Users This Week"
              value={userStats?.statistics?.newUsersLast7Days ?? 0}
              icon={Calendar}
            />
          </div>

          <ActivityFeed 
            items={analyticsData?.recentActivity?.documents || []}
            title="Recent Document Activity"
            maxItems={20}
          />
        </TabsContent>
      </Tabs>

      {/* Full comparison modal */}
      {showAllComparison && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-900 w-11/12 md:w-3/4 lg:w-2/3 p-4 rounded shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Workspace comparisons</h3>
              <div>
                <button className="px-3 py-1 rounded border" onClick={() => setShowAllComparison(false)}>Close</button>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Occupancy</h4>
              <ComparisonRows metric="occupancy" ids={selectedWorkspaces} />
              <h4 className="text-sm font-semibold mt-4">Safeguards</h4>
              <ComparisonRows metric="safeguards" ids={selectedWorkspaces} />
              <h4 className="text-sm font-semibold mt-4">Falls</h4>
              <ComparisonRows metric="falls" ids={selectedWorkspaces} />
              <h4 className="text-sm font-semibold mt-4">Wounds</h4>
              <ComparisonRows metric="wounds" ids={selectedWorkspaces} />
              <h4 className="text-sm font-semibold mt-4">Infections</h4>
              <ComparisonRows metric="infections" ids={selectedWorkspaces} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
