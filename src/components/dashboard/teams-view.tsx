
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { mockUser } from "@/lib/data";
import { ArrowLeft, MoreVertical, Plus, Trash2, Edit, FolderLock } from "lucide-react";
import type { Workspace, Team } from "@/lib/types";
import { ManageFolderAccessDialog } from "./manage-folder-access-dialog";
import { NewTeamDialog } from "./new-team-dialog";
import { SidebarTrigger } from "../ui/sidebar";


interface TeamsViewProps {
    workspace: Workspace;
}

const initialMockTeams: Team[] = [
    {
        id: 'team-1',
        name: 'Engineering',
        members: [
            mockUser,
            { id: 'user-2', name: 'Jane Doe', email: 'jane.d@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=jane' },
            { id: 'user-3', name: 'Peter Jones', email: 'peter.j@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=peter' },
        ],
        folderCount: 2,
        accessibleFolderIds: ['folder-1', 'subfolder-1a'],
    },
    {
        id: 'team-2',
        name: 'Product & Design',
        members: [
            { id: 'user-4', name: 'Emily White', email: 'emily.w@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=emily' },
            { id: 'user-5', name: 'Chris Green', email: 'chris.g@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=chris' },
        ],
        folderCount: 1,
        accessibleFolderIds: ['folder-2'],
    }
]

export function TeamsView({ workspace }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>(initialMockTeams);

  const handleDeleteTeam = (teamId: string) => {
    // In a real app, you would also call a function to delete the team from Firestore.
    setTeams(prevTeams => prevTeams.filter(team => team.id !== teamId));
  };

  const handleAccessUpdated = (teamId: string, accessibleFolderIds: string[]) => {
    setTeams(prevTeams => 
        prevTeams.map(team => 
            team.id === teamId 
                ? { ...team, accessibleFolderIds, folderCount: accessibleFolderIds.length } 
                : team
        )
    );
  };
  
  const handleTeamCreated = (newTeam: Team) => {
    setTeams(prevTeams => [...prevTeams, newTeam]);
  };


  return (
    <div className="flex flex-col h-full bg-muted/20">
      <header className="bg-background p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
           <SidebarTrigger />
            <h1 className="text-xl font-headline font-semibold">Teams & Permissions</h1>
        </div>
        <div className="flex items-center gap-2">
            <NewTeamDialog onTeamCreated={handleTeamCreated}>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Team
                </Button>
            </NewTeamDialog>
        </div>
      </header>
       <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
                <Card key={team.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <CardTitle className="font-headline">{team.name}</CardTitle>
                             <TeamMenu 
                                team={team} 
                                workspace={workspace} 
                                onDelete={() => handleDeleteTeam(team.id)} 
                                onAccessUpdated={handleAccessUpdated}
                            />
                        </div>
                        <CardDescription>
                           {team.members.length} members have access to {team.folderCount} folders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex -space-x-2">
                           {team.members.map(member => (
                             <Avatar key={member.id} className="border-2 border-background">
                                <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name ?? undefined} />
                                <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                           ))}
                           {team.members.length > 4 && (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border-2 border-background text-xs font-medium text-muted-foreground">
                                    +{Math.max(0, team.members.length - 4)}
                               </div>
                           )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </main>
    </div>
  );
}


const TeamMenu = ({ team, workspace, onDelete, onAccessUpdated }: { team: Team, workspace: Workspace, onDelete: () => void, onAccessUpdated: (teamId: string, accessibleFolderIds: string[]) => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 -mt-2" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit Team Name
        </DropdownMenuItem>
        <ManageFolderAccessDialog team={team} workspace={workspace} onAccessUpdated={onAccessUpdated}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <FolderLock className="mr-2 h-4 w-4" />
                Manage Folder Access
            </DropdownMenuItem>
        </ManageFolderAccessDialog>
        <DeleteTeamDialog onConfirm={onDelete}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Team
            </DropdownMenuItem>
        </DeleteTeamDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


function DeleteTeamDialog({ children, onConfirm }: { children: React.ReactNode, onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this team?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the team and remove all associated permissions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
