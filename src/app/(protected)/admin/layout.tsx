"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import AdminWorkspacesContext from '@/context/admin-workspaces';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [careHomes, setCareHomes] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch admin workspaces (the same source the dashboard uses)
        const wsResp = await fetch('/api/admin/workspaces');
        if (wsResp && wsResp.ok) {
          const data = await wsResp.json();
          if (mounted) setWorkspaces(data.workspaces || []);
        } else {
          // fallback: empty
          if (mounted) setWorkspaces([]);
        }

        // Also fetch care homes (used by the care-homes page)
        const chResp = await fetch('/api/care-homes');
        if (chResp && chResp.ok) {
          const json = await chResp.json();
          if (mounted) setCareHomes(json.homes || []);
        } else {
          if (mounted) setCareHomes([]);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setWorkspaces([]);
          setCareHomes([]);
        }
      }
    })();
    return () => { mounted = false };
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <TooltipProvider>
        <Sidebar>
          <AdminSidebar
            workspaces={workspaces}
            activeWorkspace={workspaces[0] ?? { id: 'admin-placeholder', name: 'Admin', folders: [] }}
            onWorkspaceChange={() => {}}
            setView={(view) => {
              if (view === 'stats') router.push('/admin/stats');
              else if (view === 'home') router.push('/admin');
              else if (view === 'files') router.push('/files');
            }}
            onGoToFiles={() => router.push('/files')}
          />
        </Sidebar>

        <SidebarInset className="flex flex-col min-h-screen w-full overflow-hidden">
          <TopNav onSettingsClick={() => {}} />
          <AdminWorkspacesContext.Provider value={workspaces}>
            {children}
          </AdminWorkspacesContext.Provider>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
