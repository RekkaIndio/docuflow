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
              // Centralized navigation for admin sidebar views.
              // Map views to either dedicated routes or the admin page with a query param.
              // This ensures clicking buttons always results in a router.push call.
              try {
                switch (view) {
                  case 'stats':
                    router.push('/admin/stats');
                    break;
                  case 'home':
                    router.push('/admin');
                    break;
                  case 'files':
                    router.push('/files');
                    break;
                  case 'care-homes':
                    router.push('/admin/care-homes');
                    break;
                  case 'teams':
                  case 'documents':
                  case 'tags':
                  case 'settings':
                  case 'renewals':
                  case 'accessibility':
                    // These views are rendered inside the admin page via a `view` query param
                    router.push(`/admin?view=${encodeURIComponent(view)}`);
                    break;
                  default:
                    // Unknown view: log to help debug and fall back to admin root
                    // (do not throw so UI remains responsive)
                    // eslint-disable-next-line no-console
                    console.warn('AdminLayout.setView: unknown view', view);
                    router.push('/admin');
                }
                // Emit an event so any admin page consumers can react to the
                // centralized navigation (for example closing an open
                // workspace view in the admin page which is stored in
                // component state). This keeps navigation user-friendly when
                // the layout and page state are decoupled.
                try {
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('admin-set-view', { detail: { view } }));
                  }
                } catch (e) {
                  // noop
                }
              } catch (e) {
                // If router.push fails for any reason, log and navigate to admin root
                // eslint-disable-next-line no-console
                console.error('Failed to navigate to admin view', view, e);
                try { router.push('/admin'); } catch (_) {}
              }
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
