"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import Sparkline from '@/components/admin/sparkline';
import { BarChart2 } from 'lucide-react';

export default function AdminStatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

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
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  const aggregated = React.useMemo(() => {
    const fileTypeCounts: Record<string, number> = {};
    const recentUploads: Array<{ id: string; name: string; createdAt: string; workspaceName: string }> = [];
    let totalFolders = 0;
    let totalDocuments = 0;

    for (const ws of workspaces) {
      totalFolders += (ws.folders?.length || 0);
      for (const folder of (ws.folders || [])) {
        for (const item of (folder.items || [])) {
          if (item.type === 'document') {
            totalDocuments += 1;
            const ft = item.fileType || 'unknown';
            fileTypeCounts[ft] = (fileTypeCounts[ft] || 0) + 1;
            recentUploads.push({ id: item.id, name: item.name, createdAt: item.createdAt, workspaceName: ws.name || ws.id });
          }
        }
      }
    }

    recentUploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topFileTypes = Object.entries(fileTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const days = 30;
    const today = new Date();
    const timelineLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      timelineLabels.push(d.toISOString().slice(0, 10));
    }

    const timelineCounts = timelineLabels.map(label => recentUploads.filter(r => r.createdAt.slice(0, 10) === label).length);

    return { fileTypeCounts, topFileTypes, recentUploads: recentUploads.slice(0, 10), totalFolders, totalDocuments, timelineLabels, timelineCounts };
  }, [workspaces]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin — Stats</h1>
      </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>Documents (last 30 days)</CardHeader>
              <CardContent>
                <Sparkline values={aggregated.timelineCounts} width={300} height={60} />
                <div className="text-xs text-muted-foreground mt-2">Documents in last 30 days: <span className="font-medium">{aggregated.timelineCounts.reduce((s: number, v: number) => s + v, 0)}</span></div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
