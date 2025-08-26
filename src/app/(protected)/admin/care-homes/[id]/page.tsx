"use client";
import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Sparkline from '@/components/admin/sparkline';

export default function CareHomeOverviewPage() {
  const router = useRouter();
  const params: any = useParams();
  const id = params?.id || 'unknown';

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/care-homes/${id}/summary`);
        if (!resp.ok) {
          // fallback to mock data
          setData({
            id,
            name: `Care Home ${id}`,
            occupancy: 0.82,
            totalRooms: 40,
            occupiedRooms: 33,
            totalDocuments: 420,
            expiringDocuments: 6,
            recentUploads: [
              { id: 'd1', name: 'Medication List.pdf', createdAt: new Date().toISOString(), fileType: 'pdf' },
              { id: 'd2', name: 'Care Plan.docx', createdAt: new Date().toISOString(), fileType: 'docx' },
            ],
            timelineCounts: Array.from({ length: 30 }).map(() => Math.floor(Math.random() * 3)),
          });
          return;
        }
        const json = await resp.json();
        setData(json);
      } catch (e) {
        console.error(e);
        setData({ name: `Care Home ${id}`, occupancy: 0.5, totalRooms: 0, occupiedRooms: 0, totalDocuments: 0, expiringDocuments: 0, recentUploads: [], timelineCounts: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{data?.name || 'Care Home'}</h1>
          <div className="text-sm text-muted-foreground">ID: {id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/admin/care-homes')}>Back to list</Button>
          <Button onClick={() => alert('Trigger review flow (stub)')}>Request Review</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>Occupancy</CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{Math.round((data.occupancy || 0) * 100)}%</div>
            <div className="text-sm text-muted-foreground">{data.occupiedRooms}/{data.totalRooms} rooms occupied</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Expiring Documents (30d)</CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.expiringDocuments}</div>
            <div className="text-sm text-muted-foreground">Action required</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Total Documents</CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.totalDocuments}</div>
            <div className="text-sm text-muted-foreground">{data.recentUploads?.length || 0} recent uploads</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Activity (30d)</CardHeader>
          <CardContent>
            <Sparkline values={data.timelineCounts || []} width={200} height={40} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>Recent Uploads</CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.recentUploads || []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="truncate pr-2">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Actions</CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={() => alert('Export CSV (stub)')}>Export documents</Button>
              <Button onClick={() => alert('Send reminders (stub)')}>Send reminders</Button>
              <Button onClick={() => alert('Open renewals console (stub)')}>Open renewals</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
