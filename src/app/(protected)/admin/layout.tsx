"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import AdminWorkspacesContext from '@/context/admin-workspaces';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [careHomes, setCareHomes] = React.useState<any[]>([]);
  const { user, loading: authLoading } = useAuth();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Wait for auth hydration; only fetch admin workspaces when we have a user
        if (authLoading) return;
        // If the user is not signed in, skip fetching
        if (!user) {
          if (mounted) {
            setWorkspaces([]);
            setCareHomes([]);
          }
          return;
        }

        const orgQuery = (user as any)?.organisationId ? `?orgId=${encodeURIComponent((user as any).organisationId)}` : '';
        const wsUrl = `/api/admin/workspaces${orgQuery}`;
        const wsResp = await fetch(wsUrl);
        if (wsResp && wsResp.ok) {
          const data = await wsResp.json();
          if (mounted) setWorkspaces(data.workspaces || []);
        } else {
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
  }, [user, authLoading]);

  // Handle navigation events from chat
  React.useEffect(() => {
    const handleNavigateToPolicies = () => {
      router.push('/admin/policies');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('navigate-to-policies', handleNavigateToPolicies);
      return () => window.removeEventListener('navigate-to-policies', handleNavigateToPolicies);
    }
  }, [router]);

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
                  case 'home':
                    router.push('/admin');
                    break;
                  case 'files':
                    router.push('/files');
                    break;
                  case 'policies':
                    router.push('/admin/policies');
                    break;
                  case 'appraisals':
                    router.push('/admin/appraisals');
                    break;
                  case 'supervision':
                    router.push('/admin/supervision');
                    break;
                  case 'workspaces':
                    router.push('/admin?view=workspaces');
                    break;
                  case 'care-homes':
                    router.push('/admin/care-homes');
                    break;
                  case 'teams':
                    router.push('/admin?view=teams');
                    break;
                  case 'rd-compliance-audit':
                    router.push('/admin/rd-compliance-audit');
                    break;
                  case 'documents':
                    router.push('/admin?view=documents');
                    break;
                  case 'tags':
                    router.push('/admin?view=tags');
                    break;
                  case 'settings':
                    router.push('/admin?view=settings');
                    break;
                  case 'renewals':
                    router.push('/admin/supervision');
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
          <TopNav onSettingsClick={() => { try { router.push('/admin?view=settings'); } catch (e) { console.error('Failed to open admin settings', e); } }} />
          <AdminWorkspacesContext.Provider value={workspaces}>
            {children}
          </AdminWorkspacesContext.Provider>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
