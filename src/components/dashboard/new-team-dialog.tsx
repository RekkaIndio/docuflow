"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure this is the correct path to your Firebase config
import { workspaceCollectionPath } from '@/lib/paths';

interface NewTeamDialogProps {
  children: React.ReactNode;
  onTeamCreated: (team: Team) => void;
  workspaceId?: string;
}

export function NewTeamDialog({ children, onTeamCreated, workspaceId }: NewTeamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [emails, setEmails] = useState<string[]>([]); // State for email addresses
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast({ title: "Team name cannot be empty", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "You must be logged in to create a team.", variant: "destructive" });
      return;
    }

    setIsCreating(true);

    try {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: teamName,
        members: [user],
        folderCount: 0,
        accessibleFolderIds: [],
        emails: emails,
        workspaceId: workspaceId ?? user.id ?? '',
      };

      // Save the team to Firestore under workspace subcollection if workspaceId available
      if (workspaceId) {
        const teamRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'teams')), newTeam.id);
        await setDoc(teamRef, newTeam);
      } else {
        const teamRef = doc(db, "teams", newTeam.id);
        await setDoc(teamRef, newTeam);
      }

      onTeamCreated(newTeam);
      toast({ title: "Success!", description: `Team "${teamName}" has been created.` });

      setTeamName("");
      setEmails([]); // Reset emails
      setIsOpen(false);
    } catch (error) {
      console.error("Team creation failed:", error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating your team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Give your new team a name. You can invite members and set permissions later.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name" className="sr-only">
                Team Name
              </Label>
              <Input
                id="team-name"
                placeholder="e.g. 'Marketing Department'"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="team-emails" className="sr-only">
                Team Emails
              </Label>
              <Input
                id="team-emails"
                placeholder="Enter email addresses, separated by commas"
                value={emails.join(", ")}
                onChange={(e) => setEmails(e.target.value.split(",").map((email) => email.trim()))}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="space-x-3 justify-end">
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreating} className="min-w-[100px]">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={isCreating || !teamName.trim()} className="min-w-[140px]">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Team"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
