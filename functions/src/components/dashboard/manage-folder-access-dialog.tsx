
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Folder as FolderIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Team, Workspace, Folder, Document } from "@/lib/types";
import { cn } from "@/lib/utils";
import { sendFolderAccessEmail } from "@/actions/email";
import { useAuth } from "@/hooks/use-auth";

interface ManageFolderAccessDialogProps {
    children: React.ReactNode;
    team: Team;
    workspace: Workspace;
    onAccessUpdated: (teamId: string, accessibleFolderIds: string[]) => void;
}

interface FolderTreeProps {
    folders: (Folder | Document)[];
    selectedFolderIds: string[];
    onSelectionChange: (folderId: string, isSelected: boolean) => void;
    level?: number;
}

const FolderTree = ({ folders, selectedFolderIds, onSelectionChange, level = 0 }: FolderTreeProps) => {
    // Helper to find a folder by ID in the tree
    const findFolderById = (items: (Folder | Document)[], id: string): Folder | null => {
        for (const item of items) {
            if (item.type === 'folder') {
                if (item.id === id) return item;
                const found = findFolderById(item.items, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    return (
        <div className="space-y-2">
            {folders.map(item => {
                if (item.type !== 'folder') return null;
                const isSelected = selectedFolderIds.includes(item.id);
                
                // If a parent is selected, all its children should also be considered selected (visually disabled)
                const isParentSelected = item.parentId ? selectedFolderIds.includes(item.parentId) : false;

                return (
                    <div key={item.id} style={{ marginLeft: `${level * 1.5}rem` }}>
                        <div className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                            <Checkbox
                                id={`folder-${item.id}`}
                                checked={isSelected || isParentSelected}
                                disabled={isParentSelected}
                                onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
                            />
                            <label
                                htmlFor={`folder-${item.id}`}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                                    isParentSelected ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                )}
                            >
                                <FolderIcon className="w-4 h-4 text-yellow-500" />
                                {item.name}
                            </label>
                        </div>
                        {item.items && item.items.length > 0 && (
                             <FolderTree 
                                folders={item.items} 
                                selectedFolderIds={selectedFolderIds} 
                                onSelectionChange={onSelectionChange} 
                                level={level + 1} 
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};


export function ManageFolderAccessDialog({ children, team, workspace, onAccessUpdated }: ManageFolderAccessDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setSelectedFolderIds(team.accessibleFolderIds || []);
    }
  }, [isOpen, team.accessibleFolderIds])

  const findFolderById = (items: (Folder | Document)[], id: string): Folder | null => {
    for (const item of items) {
        if (item.type === 'folder') {
            if (item.id === id) return item;
            const found = findFolderById(item.items, id);
            if (found) return found;
        }
    }
    return null;
  };

  const handleSelectionChange = (folderId: string, isSelected: boolean) => {
    setSelectedFolderIds(prev => {
        let newSelection = [...prev];
        const folder = findFolderById(workspace.folders, folderId);
        
        const getChildFolderIds = (f: Folder): string[] => {
            let ids: string[] = [];
            f.items.forEach(i => {
                if (i.type === 'folder') {
                    ids.push(i.id);
                    ids = ids.concat(getChildFolderIds(i));
                }
            });
            return ids;
        }

        const childIds = folder ? getChildFolderIds(folder) : [];

        if (isSelected) {
            newSelection.push(folderId);
            // also select all children
            newSelection = [...newSelection, ...childIds];
        } else {
            newSelection = newSelection.filter(id => id !== folderId);
            // also deselect all children
            newSelection = newSelection.filter(id => !childIds.includes(id));
        }
        return [...new Set(newSelection)]; // Return unique ids
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const originalIds = new Set(team.accessibleFolderIds || []);
        const newIds = new Set(selectedFolderIds);
        const newlyGrantedIds = [...newIds].filter(id => !originalIds.has(id));

        // In a real app, you would save this to Firestore
        console.log(`Saving access for team ${team.name}:`, selectedFolderIds);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call to save permissions
        
        if (newlyGrantedIds.length > 0 && team.members.length > 0) {
            const newlyGrantedFolders = newlyGrantedIds
                .map(id => findFolderById(workspace.folders, id))
                .filter((f): f is Folder => f !== null);

            if (newlyGrantedFolders.length > 0) {
                console.log("Sending emails for new access to folders: ", newlyGrantedFolders.map(f => f.name));
                await sendFolderAccessEmail({
                    teamName: team.name,
                    folderNames: newlyGrantedFolders.map(f => f.name),
                    workspaceName: workspace.name,
                    grantedBy: user?.name || "An administrator",
                    recipientEmails: team.members.map(m => m.email).filter((e): e is string => !!e),
                });
                toast({ title: "Success!", description: `Folder access updated and notifications sent.` });
            } else {
                 toast({ title: "Success!", description: `Folder access for "${team.name}" has been updated.` });
            }
        } else {
             toast({ title: "Success!", description: `Folder access for "${team.name}" has been updated.` });
        }
        
        onAccessUpdated(team.id, selectedFolderIds);
        setIsOpen(false);
    } catch (error) {
      console.error("Failed to save folder access or send emails:", error);
      toast({
        title: "Save Failed",
        description: "There was an error updating permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Access for {team.name}</DialogTitle>
          <DialogDescription>
            Select the folders this team should be able to access. Selecting a parent folder grants access to all its subfolders.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 my-4 pr-6 border rounded-md">
            <FolderTree 
                folders={workspace.folders} 
                selectedFolderIds={selectedFolderIds} 
                onSelectionChange={handleSelectionChange} 
            />
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
