"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AdminWorkspaceView from '@/components/admin/admin-workspace-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export default function AdminPage() {
  const { user, loading } = useAuth();
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

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        {/* Provide a safe default activeWorkspace to avoid runtime null dereference in the sidebar */}
        {/** If no workspaces are present yet, pass a lightweight placeholder workspace object */}
  <AdminSidebar
          workspaces={workspaces}
          activeWorkspace={workspaces[0] ?? { id: 'admin-placeholder', name: 'Admin', folders: [] }}
          onWorkspaceChange={() => {}}
          setView={() => {}}
          onGoToFiles={() => {}}
        />
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen w-full overflow-hidden">
        <TopNav onSettingsClick={() => {}} />
        <div className="p-6">
          {!selectedWorkspace ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Showing <span className="font-medium">{workspaces.length}</span> workspaces</p>
                  </div>

                  {workspaces.length === 0 ? (
                    <div className="rounded border p-6 text-center text-muted-foreground">No workspaces found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workspaces.map((ws) => (
                        <Card key={ws.id} className="hover:shadow-lg transition-shadow">
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
                </div>
              )}
            </>
          ) : (
            <div className="h-[calc(100vh-64px)]">
              <AdminWorkspaceView workspace={selectedWorkspace} onClose={() => setSelectedWorkspace(null)} />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
