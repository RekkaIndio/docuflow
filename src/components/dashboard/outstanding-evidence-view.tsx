"use client";

import React from "react";
import type { Folder, Document } from "@/lib/types";
import {
  Folder as FolderIcon,
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileX2,
  MoreVertical,
  Share2,
  Trash2,
  Edit,
  ChevronRight,
  Home,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ShareDialog } from "./share-dialog";
import { SidebarTrigger } from "../ui/sidebar";
import { UploadButton } from "./upload-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { handleRename } from "@/lib/handleRename";
import { useToast } from "@/hooks/use-toast";

interface OutstandingEvidenceViewProps {
  folder: Folder;
  onSelect: (item: Folder | Document) => void;
  onDocumentAdd: (document: Document) => void;
  onFolderAdd: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
  onDocumentDelete: (document: Document) => void;
  breadcrumb: (Folder | { id: 'evidence-root', name: string, type: 'folder' })[];
  onBreadcrumbClick: (folderId: string) => void;
}

const getFileIcon = (fileType: Document["fileType"]) => {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-8 h-8 text-red-500" />;
    case "csv":
      return <FileSpreadsheet className="w-8 h-8 text-green-700" />;
    case "xlsx":
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    case "txt":
      return <FileIcon className="w-8 h-8 text-gray-500" />;
    default:
      return <FileX2 className="w-8 h-8 text-gray-400" />;
  }
};

export function OutstandingEvidenceView({
  folder,
  onSelect,
  onDocumentAdd,
  onFolderAdd,
  onFolderDelete,
  onDocumentDelete,
  breadcrumb,
  onBreadcrumbClick,
}: OutstandingEvidenceViewProps) {
  const isMobile = useIsMobile();

  // Highlighted document state
  const [highlightedDocId, setHighlightedDocId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && custom.detail.documentId) {
        setHighlightedDocId(custom.detail.documentId);
        setTimeout(() => {
          const el = document.getElementById(`doc-card-${custom.detail.documentId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    window.addEventListener('highlight-document', handler);
    return () => window.removeEventListener('highlight-document', handler);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {/* Sidebar toggle is provided by the Sidebar rail between sidebar and content */}
          <h1 className="text-2xl font-headline font-semibold">Outstanding Evidence</h1>
          <div className="flex items-center gap-1.5 text-sm sm:text-lg ml-4">
            {breadcrumb.map((b, index) => (
                <div key={b.id} className="flex items-center gap-1.5">
                    <Button 
                        variant="link" 
                        onClick={() => onBreadcrumbClick(b.id)}
                        className="p-0 font-semibold text-muted-foreground hover:text-primary disabled:text-foreground disabled:no-underline"
                        disabled={index === breadcrumb.length - 1}
                    >
                        {b.id === 'evidence-root' ? <Home className="w-4 h-4 sm:w-5 sm:h-5" /> : null}
                        <span className="max-w-[100px] sm:max-w-none truncate">{b.id === 'evidence-root' ? 'Evidence Home' : b.name}</span>
                    </Button>
                    {index < breadcrumb.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <UploadButton
                onDocumentAdd={onDocumentAdd}
                workspaceId={folder?.workspaceId}
                folderId={folder?.id === 'evidence-root' ? 'evidence-root' : folder?.id || 'evidence-root'}
            />
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folder?.items?.map((item) => (
            <Card
              key={item.id}
              id={item.type === 'document' ? `doc-card-${item.id}` : undefined}
              className={
                `hover:shadow-md transition-shadow cursor-pointer` +
                (item.type === 'document' && highlightedDocId === item.id ? ' ring-2 ring-primary ring-offset-2' : '')
              }
              onClick={() => onSelect(item)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  {item.type === "folder" ? (
                    <FolderIcon className="w-8 h-8 text-yellow-500" />
                  ) : (
                    getFileIcon(item.fileType)
                  )}
                  <ItemMenu item={item} onFolderDelete={onFolderDelete} onDocumentDelete={onDocumentDelete} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium truncate">{item.name}</p>
                {item.type === "document" && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Uploaded: {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                    {item.renewalDate && (
                      <p className="text-xs text-blue-700">Renewal: {new Date(item.renewalDate).toLocaleDateString()}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

const ItemMenu = ({ item, onFolderDelete, onDocumentDelete }: { item: Document | Folder, onFolderDelete: (folder: Folder) => void, onDocumentDelete: (document: Document) => void }) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check if this is one of the 5 fixed evidence folders
  const isFixedEvidenceFolder = item.type === 'folder' && [
    'evidence-safe', 
    'evidence-effective', 
    'evidence-caring', 
    'evidence-well-led', 
    'evidence-responsive'
  ].includes(item.id);

  const handleDelete = () => {
    if (item.type === 'folder') {
      onFolderDelete(item);
    } else if (item.type === 'document') {
      onDocumentDelete(item);
    }
  };

  const handleRenameSubmit = async () => {
    if (!newName.trim() || newName === item.name) {
      setRenameOpen(false);
      return;
    }
    setLoading(true);
    try {
      await handleRename({ id: item.id, type: item.type, workspaceId: (item as any).workspaceId }, newName.trim());
      toast({ title: "Renamed!", description: `Renamed to '${newName.trim()}'` });
      setRenameOpen(false);
    } catch (e) {
      toast({ title: "Rename failed", description: "Could not rename. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <ShareDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
          </ShareDialog>
          {/* Only show rename and delete for documents and non-fixed folders */}
          {!isFixedEvidenceFolder && (
            <>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DeleteDialog onConfirm={handleDelete}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DeleteDialog>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {!isFixedEvidenceFolder && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename {item.type === 'folder' ? 'Folder' : 'Document'}</DialogTitle>
            </DialogHeader>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); }}
              autoFocus
              disabled={loading}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleRenameSubmit} disabled={loading || !newName.trim() || newName === item.name}>
                {loading ? 'Renaming...' : 'Rename'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

function DeleteDialog({ children, onConfirm }: { children: React.ReactNode, onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item
            and all of its contents from our servers.
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
