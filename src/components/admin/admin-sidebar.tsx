"use client";

import React from "react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Settings,
  UsersRound,
  Folder as FolderIcon,
  LayoutDashboard,
  FileText,
  ChevronsUpDown,
  PanelLeft,
  Accessibility,
  BarChart2,
  Building2,
  Tag,
  ClipboardCheck,
} from "lucide-react";
import Link from 'next/link';
import { Logo } from "@/components/icons/logo";
import { usePathname } from 'next/navigation';
import type { Workspace } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onWorkspaceChange: (workspaceId: string) => void;
  setView: (view: 'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'care-homes' | 'workspaces' | 'policies' | 'appraisals' | 'supervision' | 'rd-compliance-audit' | 'analytics') => void;
  onGoToFiles: () => void;
}

export function AdminSidebar({
  workspaces,
  activeWorkspace,
  onWorkspaceChange,
  setView,
  onGoToFiles,
}: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const pathname = usePathname();

  const handleNavigation = (action: () => void) => {
    action();
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path + '/');
  }

  return (
    <>
      <SidebarHeader>
        <div className="w-full flex items-center justify-between">
          <Button variant="ghost" className="w-full justify-between h-12 px-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Logo className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="flex flex-col text-left overflow-hidden">
                <h2 className="text-md font-headline font-semibold truncate">CG360</h2>
                <p className="text-xs text-muted-foreground">Admin Workspace</p>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('home'))} isActive={isActive('/admin')} className="text-lg h-14">
              <LayoutDashboard className="w-7 h-7 mr-2" />
              <span className="text-lg">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('appraisals'))} isActive={isActive('/admin/appraisals')} className="text-lg h-14">
              <FolderIcon className="w-7 h-7 mr-2" />
              <span className="text-lg">Appraisals</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('supervision'))} isActive={isActive('/admin/supervision')} className="text-lg h-14">
              <FileText className="w-7 h-7 mr-2" />
              <span className="text-lg">Supervision</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('rd-compliance-audit'))} isActive={isActive('/admin/rd-compliance-audit')} className="text-lg h-14">
              <ClipboardCheck className="w-7 h-7 mr-2" />
              <span className="text-lg">RD Compliance Audit</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('analytics'))} isActive={isActive('/admin/analytics')} className="text-lg h-14">
              <BarChart2 className="w-7 h-7 mr-2" />
              <span className="text-lg">Analytics</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('workspaces'))} className="text-lg h-14">
              <Building2 className="w-7 h-7 mr-2" />
              <span className="text-lg">Workspaces</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('care-homes'))} isActive={isActive('/admin/care-homes')} className="text-lg h-14">
              <UsersRound className="w-7 h-7 mr-2" />
              <span className="text-lg">Occupancy</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => { setView('policies'); })} className="text-lg h-14">
              <Tag className="w-7 h-7 mr-2" />
              <span className="text-lg">Policies</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleNavigation(() => setView('teams'))} className="text-lg h-14">
              <UsersRound className="w-7 h-7 mr-2" />
              <span className="text-lg">Teams</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleNavigation(() => setView('accessibility'))} className="text-lg h-12">
                <Accessibility className="w-6 h-6 mr-2" />
                <span className="text-sm">Accessibility</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              {/* Use next/link for admin settings so navigation uses client router and updates URL. */}
              <SidebarMenuButton asChild className="text-lg h-12">
                <Link
                  href="/admin?view=settings"
                  className="flex items-center w-full"
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('admin-set-view', { detail: { view: 'settings' } }));
                      }
                    } catch (e) {}
                  }}
                >
                  <Settings className="w-6 h-6 mr-2" />
                  <span className="text-sm">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      <button
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        onClick={() => toggleSidebar?.()}
        className={`absolute z-40 ${state === 'collapsed' ? '-right-6' : '-right-3'} top-4 hidden h-8 w-8 items-center justify-center rounded-r-md bg-white border shadow md:flex`}
      >
        <PanelLeft className="w-4 h-4 text-muted-foreground" />
        <span className="sr-only">Toggle sidebar</span>
      </button>
    </>
  );
}
