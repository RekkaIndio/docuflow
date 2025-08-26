"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAdminWorkspaces } from '@/context/admin-workspaces';
import { Button } from '@/components/ui/button';

export default function CareHomesPage() {
  const router = useRouter();
  const [homes, setHomes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const adminWorkspaces = useAdminWorkspaces();
  const [devHomes, setDevHomes] = React.useState<any[]>([]);
  const [occupancyValues, setOccupancyValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const fetchHomes = async () => {
      setLoading(true);
      try {
        // Map admin workspaces (preserve occupancy if available)
        const adminMapped = (adminWorkspaces || []).map((w: any) => ({
          id: w.id,
          name: w.name || w.title || 'Workspace',
          region: w.region || '',
          occupancy: w.occupancy !== undefined ? w.occupancy : null,
          renewalBacklog: (w.folders && Array.isArray(w.folders)) ? w.folders.length : 0,
          complianceScore: w.complianceScore || 0,
          _isAdminWorkspace: true,
        }));

        // Always fetch dev-mode care-homes (editable)
        const resp = await fetch('/api/care-homes');
        let mappedCH: any[] = [];
        if (resp && resp.ok) {
          const json = await resp.json();
          mappedCH = (json.homes || []).map((h: any) => ({ ...h, _isAdminWorkspace: false }));
          // initialize occupancyValues for editable homes as strings, but don't overwrite if already set
          const initial: Record<string, string> = {};
          for (const h of mappedCH) {
            initial[h.id] = String(Math.round((h.occupancy || 0) * 100));
          }
          setOccupancyValues(prev => Object.keys(prev).length ? prev : initial);
        }

        // Combine: admin workspaces first, then dev care-homes
        const combined = [...adminMapped, ...mappedCH];
        setHomes(combined);
        setDevHomes(mappedCH);
        // initialize occupancyValues for admin and dev homes as strings, but don't overwrite if already set
        const initialAll: Record<string, string> = {};
        for (const h of combined) {
          initialAll[h.id] = h.occupancy !== null && h.occupancy !== undefined ? String(Math.round((h.occupancy || 0) * 100)) : '';
        }
        setOccupancyValues(prev => Object.keys(prev).length ? prev : initialAll);
      } catch (e) {
        console.error(e);
        setHomes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomes();
  }, [adminWorkspaces]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Care Homes</h1>
        <div>
          <Button onClick={() => router.push('/admin/care-homes/new')}>Add Care Home</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {homes.map(h => (
            <Card key={h.id}>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold cursor-pointer" onClick={() => router.push(`/admin/care-homes/${h.id}`)}>{h.name}</div>
                  <div className="text-sm text-muted-foreground">{h.region}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">{Math.round((h.occupancy || 0) * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Occupancy</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">Renewal backlog: <strong>{h.renewalBacklog}</strong></div>
                  <div className="text-sm">Compliance: <strong>{h.complianceScore}%</strong></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={occupancyValues[h.id] ?? ''}
                    onChange={(e) => setOccupancyValues(prev => ({ ...prev, [h.id]: e.target.value }))}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <Button onClick={async () => {
                    const raw = occupancyValues[h.id];
                    const val = Number(raw);
                    if (raw === undefined || raw === null || raw === '') {
                      alert('Enter a number between 0 and 100');
                      return;
                    }
                    if (isNaN(val) || val < 0 || val > 100) {
                      alert('Enter a number between 0 and 100');
                      return;
                    }
                    try {
                      let updated: any = null;
                      if (h._isAdminWorkspace) {
                        const resp = await fetch(`/api/admin/workspaces/${h.id}`, { method: 'PATCH', body: JSON.stringify({ occupancy: val / 100 }), headers: { 'Content-Type': 'application/json' } });
                        if (!resp.ok) throw new Error('Failed to update admin workspace');
                        updated = await resp.json();
                        // update the combined homes list
                        setHomes(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                      } else {
                        const resp = await fetch(`/api/care-homes/${h.id}`, { method: 'PATCH', body: JSON.stringify({ occupancy: val / 100 }), headers: { 'Content-Type': 'application/json' } });
                        if (!resp.ok) throw new Error('Failed to update');
                        updated = await resp.json();
                        // optimistic update: update devHomes and full homes list
                        setDevHomes(prev => prev.map(p => p.id === updated.id ? updated : p));
                        setHomes(prev => prev.map(p => p.id === updated.id ? updated : p));
                      }
                      // reflect the saved value as rounded percent
                      setOccupancyValues(prev => ({ ...prev, [updated.id]: String(Math.round((updated.occupancy || 0) * 100)) }));
                    } catch (e) {
                      console.error(e);
                      alert('Failed to update occupancy');
                    }
                  }}>Save</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
