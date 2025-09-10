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
import type { Team, Workspace } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Ensure this is the correct path to your Firebase config

interface NewTeamDialogProps {
    children: React.ReactNode;
    onTeamCreated: (team: Team) => void;
    workspace: Workspace;
}

export function NewTeamDialog({ children, onTeamCreated, workspace }: NewTeamDialogProps) {
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
        emails: emails.filter(email => email.trim() !== ""), // Filter out empty emails
        workspaceId: workspace.id,
      };

      // Save the team to Firestore
      const teamRef = doc(db, "teams", newTeam.id);
      await setDoc(teamRef, newTeam);
      console.log("Team saved to Firestore:", newTeam);

      onTeamCreated(newTeam);
      toast({ title: "Success!", description: `Team "${teamName}" has been created.` });

      setTeamName("");
      setEmails([]); // Reset emails
      setIsOpen(false);
    } catch (error: any) {
      console.error("Team creation failed:", error);
      const errorMessage = error?.message || "There was an error creating your team. Please try again.";
      toast({
        title: "Creation Failed",
        description: errorMessage,
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
          <Label htmlFor="team-name" className="sr-only">
            Team Name
          </Label>
          <Input
            id="team-name"
            placeholder="e.g. 'Marketing Department'"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
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
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreating}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={isCreating || !teamName.trim()}>
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
