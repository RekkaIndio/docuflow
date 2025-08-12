
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Folder } from "@/lib/types";
import { saveFolder } from "@/lib/firestore";

interface NewFolderDialogProps {
    children: React.ReactNode;
    workspaceId: string;
    parentId: string;
    onFolderCreated: (folder: Folder) => void;
}

export function NewFolderDialog({ children, workspaceId, parentId, onFolderCreated }: NewFolderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [folderName, setFolderName] = useState("");
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast({ title: "Folder name cannot be empty", variant: "destructive" });
      return;
    }
    
    setIsCreating(true);

    try {
        const newFolderData: Omit<Folder, 'id' | 'items'> = {
            name: folderName,
            type: 'folder',
            workspaceId,
            parentId: parentId === 'root' ? null : parentId,
        };

        const folderId = await saveFolder(newFolderData);

        const newFolder: Folder = {
            ...newFolderData,
            id: folderId,
            items: [],
        };
        
        onFolderCreated(newFolder);
        toast({ title: "Success!", description: `Folder "${folderName}" has been created.` });

        setFolderName("");
        setIsOpen(false);
    } catch (error) {
      console.error("Folder creation failed:", error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating your folder. Please try again.",
        variant: "destructive",
      });
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <Input 
                placeholder="Enter folder name..."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
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
          <Button onClick={handleCreate} disabled={isCreating || !folderName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Folder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
