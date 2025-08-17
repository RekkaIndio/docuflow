
"use client";

import React, { useState } from "react";
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
  LogOut,
  Folder as FolderIcon,
  LayoutDashboard,
  FileText,
  ChevronsUpDown,
  PlusCircle,
  Plus,
  Tag,
  Accessibility,
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


interface AppSidebarProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onWorkspaceChange: (workspaceId: string) => void;
  setView: (view: 'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'dependency-calculator') => void;
  onGoToFiles: () => void;
  onCreateWorkspace: (name: string) => void;
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
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                     <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Create Workspace</span>
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                </DialogHeader>
                <Input 
                    placeholder="Workspace name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
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
}: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavigation = (action: () => void) => {
    action();
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
                        {activeWorkspace.name}
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
                disabled={ws.id === activeWorkspace.id}
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
      
      <SidebarMenuItem>
         <SidebarMenuButton onClick={() => handleNavigation(() => setView('home'))} className="text-lg h-14">
          <LayoutDashboard className="w-7 h-7 mr-2" />
          <span className="text-lg">Dashboard</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
         <SidebarMenuButton onClick={() => handleNavigation(onGoToFiles)} className="text-lg h-14">
          <FolderIcon className="w-7 h-7 mr-2" />
          <span className="text-lg">Folders</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => handleNavigation(() => setView('renewals'))} className="text-lg h-14">
          <FileText className="w-7 h-7 mr-2" />
          <span className="text-lg">Renewals</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
         <SidebarMenuButton onClick={() => handleNavigation(() => setView('documents'))} className="text-lg h-14">
          <FileText className="w-7 h-7 mr-2" />
          <span className="text-lg">Documents</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
  {/* Outstanding Evidence removed - folders moved into main folders list */}
             <SidebarMenuItem>
        <SidebarMenuButton onClick={() => handleNavigation(() => setView('teams'))} className="text-lg h-14">
          <UsersRound className="w-7 h-7 mr-2" />
          <span className="text-lg">Teams</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {/* Settings & Accessibility moved to footer */}
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => handleNavigation(() => setView('dependency-calculator'))} className="text-lg h-14">
          <UsersRound className="w-7 h-7 mr-2" />
          <span className="text-lg">Dependency Calculator</span>
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
              <SidebarMenuButton onClick={() => handleNavigation(() => setView('settings'))} className="text-lg h-12">
                <Settings className="w-6 h-6 mr-2" />
                <span className="text-sm">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </>
  );
}

