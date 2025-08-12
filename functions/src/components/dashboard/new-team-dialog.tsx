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

interface NewTeamDialogProps {
    children: React.ReactNode;
    onTeamCreated: (team: Team) => void;
}

export function NewTeamDialog({ children, onTeamCreated }: NewTeamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
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
        // In a real app, you would call a firestore function to save the team
        // and get back a proper ID. For now, we simulate this.
        await new Promise(resolve => setTimeout(resolve, 500));

        const newTeam: Team = {
            id: `team-${Date.now()}`,
            name: teamName,
            members: [user],
            folderCount: 0,
            accessibleFolderIds: [],
        };
        
        onTeamCreated(newTeam);
        toast({ title: "Success!", description: `Team "${teamName}" has been created.` });

        setTeamName("");
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
            <Label htmlFor="team-name" className="sr-only">Team Name</Label>
            <Input 
                id="team-name"
                placeholder="e.g. 'Marketing Department'"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                    }
                }}
            />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreating}>Cancel</Button>
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
