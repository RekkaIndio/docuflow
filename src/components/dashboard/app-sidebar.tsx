
"use client";

import React, { useState } from "react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  UsersRound,
  Folder as FolderIcon,
  LayoutDashboard,
  FileText,
  ChevronsUpDown,
  PanelLeft,
  PlusCircle,
  Plus,
  Tag,
  Accessibility,
  BarChart3,
  ClipboardList,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/icons/logo";
import type { Workspace } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
  } from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";


interface AppSidebarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onWorkspaceChange: (workspaceId: string) => void;
  setView: React.Dispatch<React.SetStateAction<'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'dependency-calculator' | 'daily' | 'notifications' | 'audits' | 'policies' | 'journal' | 'stats' | 'action-plans' | 'appraisals' | 'rotas' | 'lessons-rcas' | 'cqc-logs' | 'safeguarding-logs' | 'help'>>;
  onGoToFiles: () => void;
  onCreateWorkspace: (name: string) => void;
  dailyEntry?: any;
}

const NewWorkspaceDialog = ({ onCreate }: { onCreate: (name: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            await onCreate(name);
            toast({ title: "Success", description: "New workspace created." });
            setIsOpen(false);
            setName("");
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not create workspace.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {/* <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                     <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Create Workspace</span>
                </DropdownMenuItem> */}
            </DialogTrigger>
            <DialogContent>
                {/* <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                </DialogHeader>
                <Input 
                    placeholder="Workspace name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                /> */}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export function AppSidebar({
  workspaces,
  activeWorkspace,
  onWorkspaceChange,
  setView,
  onGoToFiles,
  onCreateWorkspace,
  dailyEntry,
  currentView,
}: AppSidebarProps & { currentView?: string }) {
  const { user, signOut } = useAuth();
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const [logsExpanded, setLogsExpanded] = useState(false);
  
  // Get organisation ID from active workspace
  const organisationId = (activeWorkspace as any)?.organisationId;
  const workspaceId = activeWorkspace?.id ?? null;
  
  // Load feature flags for the organisation
  const { isEnabled, loading: flagsLoading } = useFeatureFlags(organisationId, workspaceId);

  const handleNavigation = (action: () => void) => {
    action();
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check if today's daily check-in has been completed
  const todayKey = new Date().toISOString().split('T')[0];
  const isTodayCompleted = dailyEntry && dailyEntry.id === todayKey;

  return (
    <>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button variant="ghost" className="w-full justify-between h-12 px-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Logo className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex flex-col text-left overflow-hidden">
            <h2 className="text-md font-headline font-semibold truncate">
            {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
            </h2>
            <p className="text-xs text-muted-foreground">Workspace</p>
          </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleNavigation(() => onWorkspaceChange(ws.id))}
                disabled={activeWorkspace ? ws.id === activeWorkspace.id : false}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <NewWorkspaceDialog onCreate={onCreateWorkspace} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
      
      {/* Dashboard - Always visible (core feature) */}
      {isEnabled('dashboard') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('home'))} isActive={currentView === 'home'} className="text-lg h-14">
            <LayoutDashboard className="w-7 h-7 mr-2" />
            <div className="flex items-center gap-2">
              <span className="text-lg">Dashboard</span>
              {!isTodayCompleted && (
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Dependency Calculator */}
      {isEnabled('dependencyCalculator') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('dependency-calculator'))} isActive={currentView === 'dependency-calculator'} className="text-lg h-14">
            <UsersRound className="w-7 h-7 mr-2" />
            <span className="text-lg">Dependency</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Audits */}
      {isEnabled('audits') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('audits'))} isActive={currentView === 'audits'} className="text-lg h-14">
            <Tag className="w-7 h-7 mr-2" />
            <span className="text-lg">Audits</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Action Plans */}
      {isEnabled('actionPlans') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('action-plans'))} isActive={currentView === 'action-plans'} className="text-lg h-14">
            <ClipboardList className="w-7 h-7 mr-2" />
            <span className="text-lg">Action Plans</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {/* Journal */}
      {isEnabled('journal') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('journal'))} isActive={currentView === 'journal'} className="text-lg h-14">
            <NotebookPen className="w-7 h-7 mr-2" />
            <span className="text-lg">Journal</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {/* Logs - user-only feature */}
      {isEnabled('lessonsRcas') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => setLogsExpanded(!logsExpanded)} isActive={['lessons-rcas','cqc-logs','safeguarding-logs'].includes(String(currentView))} className="text-lg h-14">
            <FileText className="w-7 h-7 mr-2" />
            <span className="text-lg">Logs</span>
            {logsExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </SidebarMenuButton>
          {logsExpanded && (
            <SidebarMenuSub>
                <SidebarMenuSubItem>
                <SidebarMenuSubButton onClick={() => handleNavigation(() => setView('lessons-rcas'))} isActive={currentView === 'lessons-rcas'} className="text-base h-12">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>Lessons Learnt</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton onClick={() => handleNavigation(() => setView('cqc-logs'))} isActive={currentView === 'cqc-logs'} className="text-base h-12">
                  <ClipboardList className="w-5 h-5 mr-2" />
                  <span>CQC Logs</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton onClick={() => handleNavigation(() => setView('safeguarding-logs'))} isActive={currentView === 'safeguarding-logs'} className="text-base h-12">
                  <ClipboardList className="w-5 h-5 mr-2" />
                  <span>Safeguarding Logs</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      )}
      
      {/* Policies */}
      {isEnabled('policies') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('policies'))} isActive={currentView === 'policies'} className="text-lg h-14">
            <Tag className="w-7 h-7 mr-2" />
            <span className="text-lg">Policies</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Appraisals/Supervisions */}
      {isEnabled('appraisals') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('appraisals'))} isActive={currentView === 'appraisals'} className="text-lg h-14">
            <ClipboardList className="w-7 h-7 mr-2" />
            <span className="text-lg">Supervisions</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Rotas */}
      {isEnabled('rotas') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('rotas'))} isActive={currentView === 'rotas'} className="text-lg h-14">
            <Calendar className="w-7 h-7 mr-2" />
            <span className="text-lg">Rotas</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Files/Folders - Always visible (core feature) */}
      {isEnabled('files') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(onGoToFiles)} isActive={currentView === 'files'} className="text-lg h-14">
            <FolderIcon className="w-7 h-7 mr-2" />
            <span className="text-lg">Folders</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Teams */}
      {isEnabled('teams') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('teams'))} isActive={currentView === 'teams'} className="text-lg h-14">
            <UsersRound className="w-7 h-7 mr-2" />
            <span className="text-lg">Teams</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
      {/* Stats */}
      {isEnabled('stats') && (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => handleNavigation(() => setView('stats'))} isActive={currentView === 'stats'} className="text-lg h-14">
            <BarChart3 className="w-7 h-7 mr-2" />
            <span className="text-lg">Stats</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full flex justify-center py-2">
          {isEnabled('accessibility') && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleNavigation(() => setView('accessibility'))}
                  isActive={currentView === 'accessibility'}
                  className="h-12 w-12 justify-center rounded-full px-0 mx-auto bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label="Accessibility"
                  title="Accessibility"
                >
                  <Accessibility className="w-6 h-6" />
                  <span className="sr-only">Accessibility</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </div>
      </SidebarFooter>
      {/* Visible rail toggle between sidebar and content on desktop */}
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
