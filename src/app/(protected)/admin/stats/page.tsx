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
  const [loadingData, setLoadingData] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
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

  // If we are still loading and don't have any data, show a spinner.
  if (loadingData && !userStats && !analyticsData) {
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

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Statistics Suite</h1>
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
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={userStats?.statistics?.totalUsers ?? 0}
              change={`+${userStats?.statistics?.newUsersLast30Days ?? 0} this month`}
              changeType="positive"
              icon={Users}
            />
            <MetricCard
              title="Total Documents"
              value={analyticsData?.overview?.totalDocuments ?? 0}
              change={`+${analyticsData?.overview?.documentsLast30Days ?? 0} this month`}
              changeType="positive"
              icon={FileText}
            />
            <MetricCard
              title="Total Workspaces"
              value={analyticsData?.overview?.totalWorkspaces ?? 0}
              icon={Folder}
            />
            <MetricCard
              title="Storage Used"
              value={analyticsData?.overview?.totalStorageUsage ?? '0 MB'}
              icon={Database}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  User Registrations (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={registrationTrends} height={200} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Uploads (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={documentTrends} height={200} color="#10b981" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  File Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={fileTypeChartData} size={180} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Care Homes Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    title="Total Care Homes"
                    value={analyticsData?.careHomes?.totalCareHomes ?? 0}
                    size="sm"
                  />
                  <MetricCard
                    title="Average Occupancy"
                    value={`${(((analyticsData?.careHomes?.averageOccupancy ?? 0) * 100)).toFixed(1)}%`}
                    size="sm"
                  />
                  <MetricCard
                    title="Total Beds"
                    value={analyticsData?.careHomes?.totalBeds ?? 0}
                    size="sm"
                  />
                  <MetricCard
                    title="Renewal Backlog"
                    value={analyticsData?.careHomes?.totalRenewalBacklog ?? 0}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Documents"
              value={analyticsData?.overview?.totalDocuments ?? 0}
              icon={FileText}
            />
            <MetricCard
              title="This Month"
              value={analyticsData?.overview?.documentsLast30Days ?? 0}
              change={analyticsData?.trends?.growthRate30Days ?? '0%'}
              changeType="positive"
              icon={Calendar}
            />
            <MetricCard
              title="This Week"
              value={analyticsData?.overview?.documentsLast7Days ?? 0}
              icon={Clock}
            />
            <MetricCard
              title="Storage Usage"
              value={analyticsData?.overview?.totalStorageUsage ?? '0 MB'}
              icon={Database}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Upload Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={documentTrends} height={250} color="#3b82f6" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={fileTypeChartData} height={250} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(analyticsData?.distributions?.topTags || []).map((tag) => (
                  <Badge key={tag.tag} variant="secondary">
                    {tag.tag} ({tag.count})
                  </Badge>
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
    </div>
  );
}
