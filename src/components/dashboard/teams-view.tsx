"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, MoreVertical, Plus, Trash2, Edit, FolderLock, Users } from "lucide-react";
import type { Workspace, Team } from "@/lib/types";
import { ManageFolderAccessDialog } from "./manage-folder-access-dialog";
import { NewTeamDialog } from "./new-team-dialog";
import { SidebarTrigger } from "../ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";


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
    emails: ['engineering@example.com'],
    workspaceId: '', // Set as needed
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
    emails: ['productdesign@example.com'],
    workspaceId: '', // Set as needed
  }
]

export function TeamsView({ workspace }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsCollection = collection(db, "teams");
        const teamsSnapshot = await getDocs(teamsCollection);
        // map docs to include id from Firestore doc id
        let fetchedTeams = teamsSnapshot.docs.map((d) => {
          const data = d.data() as any;
          const accessibleFolderIds = Array.isArray(data.accessibleFolderIds) ? data.accessibleFolderIds : [];
          const emails = Array.isArray(data.emails) ? data.emails : [];
          const members = Array.isArray(data.members) ? data.members : [];
          const folderCount = typeof data.folderCount === "number" ? data.folderCount : accessibleFolderIds.length || 0;
          // Patch: always set workspaceId
          if (!data.workspaceId || data.workspaceId !== workspace.id) {
            // Patch Firestore to set workspaceId if missing or incorrect
            const teamRef = doc(db, "teams", data.id ?? d.id);
            setDoc(teamRef, { ...data, workspaceId: workspace.id }, { merge: true });
          }
          return {
            id: data.id ?? d.id,
            name: data.name ?? "Untitled Team",
            members,
            folderCount,
            accessibleFolderIds,
            emails,
            workspaceId: workspace.id,
          } as Team;
        });

        // Ensure Admin, Staff, and Inspection teams exist for this workspace
        const requiredTeams = [
          { name: "Admin", id: `admin-${workspace.id}` },
          { name: "Staff", id: `staff-${workspace.id}` },
          { name: "Inspection", id: `inspection-${workspace.id}` },
        ];
        const teamsToCreate = requiredTeams.filter(rt => !fetchedTeams.some(t => t.name === rt.name && t.workspaceId === workspace.id));
        for (const team of teamsToCreate) {
          const newTeam: Team = {
            id: team.id,
            name: team.name,
            members: [],
            folderCount: 0,
            accessibleFolderIds: [],
            emails: [],
            workspaceId: workspace.id,
          };
          // Add to Firestore
          const teamRef = doc(db, "teams", newTeam.id);
          await setDoc(teamRef, newTeam);
          fetchedTeams.push(newTeam);
        }
        setTeams(fetchedTeams);
      } catch (error) {
        console.error("Error fetching teams from Firestore:", error);
      }
    };

    fetchTeams();
  }, [workspace.id]);

  const handleDeleteTeam = (teamId: string) => {
    // optimistic UI
    setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
    (async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        await deleteDoc(teamRef);
      } catch (error) {
        console.error("Error deleting team:", error);
        // Could refetch or revert optimistic change; for now refetch all teams
        try {
          const teamsCollection = collection(db, "teams");
          const teamsSnapshot = await getDocs(teamsCollection);
          const fetchedTeams = teamsSnapshot.docs.map((d) => {
            const data = d.data() as Team;
            return { ...data, id: data.id ?? d.id } as Team;
          });
          setTeams(fetchedTeams);
        } catch (e) {
          console.error("Error refetching teams after delete failure:", e);
        }
      }
    })();
  };

  const handleAccessUpdated = (teamId: string, accessibleFolderIds: string[]) => {
    // optimistic UI update
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, accessibleFolderIds, folderCount: accessibleFolderIds.length }
          : team
      )
    );
    // persist to Firestore
    (async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, {
          accessibleFolderIds,
          folderCount: accessibleFolderIds.length,
        });
      } catch (error) {
        console.error("Error updating team access in Firestore:", error);
      }
    })();
  };

  const handleTeamCreated = (newTeam: Team) => {
    // create team in Firestore and add to UI optimistically
    const tmpId = newTeam.id ?? `team-${Date.now()}`;
    const teamToAdd = { ...newTeam, id: tmpId } as Team;
    setTeams((prevTeams) => [...prevTeams, teamToAdd]);
    (async () => {
      try {
        const teamRef = doc(db, "teams", teamToAdd.id);
        await setDoc(teamRef, teamToAdd);
      } catch (error) {
        console.error("Error creating team in Firestore:", error);
      }
    })();
  };

  const handleAddEmail = (teamId: string, email: string) => {
    // optimistic UI update
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, emails: [...(team.emails || []), email] }
          : team
      )
    );
    // use atomic arrayUnion to avoid race conditions
    (async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, { emails: arrayUnion(email) });
      } catch (error) {
        console.error("Error adding email to team in Firestore:", error);
      }
    })();
  };

  const handleRemoveEmail = (teamId: string, email: string) => {
    setTeams((prevTeams) =>
      prevTeams.map((team: Team) =>
        team.id === teamId
          ? { ...team, emails: (team.emails || []).filter((e: string) => e !== email) }
          : team
      )
    );
    (async () => {
      try {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, { emails: arrayRemove(email) });
      } catch (error) {
        console.error("Error removing email from team in Firestore:", error);
      }
    })();
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Full-width themed header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">Teams & Permissions</h2>
              <div className="text-slate-200 text-base leading-relaxed">Manage team access and folder permissions across your workspace</div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <NewTeamDialog onTeamCreated={handleTeamCreated}>
              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                <Plus className="mr-2 h-4 w-4" />
                Create New Team
              </Button>
            </NewTeamDialog>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team: Team) => (
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
                <div className="mb-4">
                  <h4 className="text-sm font-semibold">Emails</h4>
                  <ul className="list-disc pl-5">
                    {(team.emails || []).length === 0 ? (
                      <li className="text-sm text-muted-foreground">No emails added</li>
                    ) : (
                      (team.emails || []).map((email: string) => (
                        <li key={email} className="flex justify-between items-center">
                          <span>{email}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmail(team.id, email)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Add email"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const input = e.target as HTMLInputElement;
                          handleAddEmail(team.id, input.value);
                          input.value = "";
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        handleAddEmail(team.id, input.value);
                        input.value = "";
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {team.members.map((member) => (
                    <Avatar
                      key={member.id}
                      className="border-2 border-background"
                    >
                      <AvatarImage
                        src={member.avatarUrl ?? undefined}
                        alt={member.name ?? undefined}
                      />
                      <AvatarFallback>
                        {member.name?.charAt(0)}
                      </AvatarFallback>
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
