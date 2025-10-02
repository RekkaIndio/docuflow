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
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { NewFolderDialog } from "./new-folder-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import PageHeader from '../page-header';

interface FileBrowserProps {
  folder: Folder;
  onSelect: (item: Folder | Document) => void;
  onDocumentAdd: (document: Document) => void;
  onFolderAdd: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
  onDocumentDelete: (document: Document) => void;
  onDocumentUpdate?: (document: Document) => void;
  breadcrumb: (Folder | { id: 'root', name: string, type: 'folder' })[];
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

export function FileBrowser({
  folder,
  onSelect,
  onDocumentAdd,
  onFolderAdd,
  onFolderDelete,
  onDocumentDelete,
  onDocumentUpdate,
  breadcrumb,
  onBreadcrumbClick,
}: FileBrowserProps) {
  const isMobile = useIsMobile();


  // Highlighted document state
  const [highlightedDocId, setHighlightedDocId] = React.useState<string | null>(null);
  // Helper: find a card element by a fuzzy document name match (case-insensitive).
  const findCardElementByDocumentName = (name?: string): HTMLElement | null => {
    if (!name) return null;
    try {
      const matches = Array.from(
        document.querySelectorAll('.card-content p, .card-content .font-medium, .font-medium')
      ).filter(el => el.textContent && el.textContent.trim().toLowerCase().includes(name.toLowerCase()));
      if (matches.length > 0) {
        const el2 = (matches[0] as HTMLElement).closest('.card') as HTMLElement | null;
        return el2;
      }
    } catch (e) {}
    return null;
  };
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && custom.detail.documentId) {
        setHighlightedDocId(custom.detail.documentId);
        setTimeout(() => {
          const el = document.getElementById(`doc-card-${custom.detail.documentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          // Fallback: try to find by name if name persisted
          try {
            const name = typeof window !== 'undefined' ? localStorage.getItem('lastHighlightedDocumentName') || undefined : undefined;
            const el2 = findCardElementByDocumentName(name as string | undefined);
            if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {}
        }, 100);
      }
    };
    window.addEventListener('highlight-document', handler);
    // Note: we intentionally do NOT auto-apply a previously stored highlight here.
    // Highlights should only be applied in response to an explicit "highlight-document" event
    // so opening a folder does not accidentally highlight a random document.
    return () => window.removeEventListener('highlight-document', handler);
  }, []);

  // If a highlight id exists but the element wasn't present yet (e.g., highlight fired before folder re-render),
  // try again when folder items change or when highlightedDocId changes.
  React.useEffect(() => {
    if (!highlightedDocId) return;
    const tryScroll = () => {
      const el = document.getElementById(`doc-card-${highlightedDocId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };

    // Try now, then again shortly after to handle late DOM updates
    if (tryScroll()) return;
    const t1 = setTimeout(() => tryScroll(), 150);
    const t2 = setTimeout(() => tryScroll(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [highlightedDocId, folder?.items?.length]);

  // Clear any existing highlight when the folder changes so opening a folder
  // starts with no highlighted document (we haven't asked anything yet).
  React.useEffect(() => {
    setHighlightedDocId(null);
    try {
      if (typeof window !== 'undefined') {
        // Keep localStorage entry for historical reasons, but do not auto-apply it.
        // Optionally remove it to avoid confusion in future mounts:
        // localStorage.removeItem('lastHighlightedDocumentId');
      }
    } catch (e) {}
  }, [folder?.id]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Files & Folders"
        subtitle="Browse and organise your documents and folders"
        leading={(
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-6 h-6">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        actions={(
          <>
            <NewFolderDialog
               workspaceId={folder?.workspaceId || ""}
               parentId={folder?.id || 'root'}
               onFolderCreated={onFolderAdd}
             >
              <Button variant="outline" size="sm" className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3">
                <Plus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </NewFolderDialog>
            <UploadButton
               onDocumentAdd={onDocumentAdd}
               workspaceId={folder?.workspaceId}
               folderId={folder?.id || 'root'}
               size="sm"
             />
          </>
        )}
      />

      <div className="flex-1 bg-background">
        <header className="p-4 border-b flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-2 text-lg font-semibold">
            {/* Sidebar toggle is provided by the Sidebar rail between sidebar and content */}
            <div className="flex items-center gap-1.5 text-sm sm:text-lg">
              {breadcrumb.map((b, index) => (

                <div key={b.id} className="flex items-center gap-1.5">
                    <Button 
                        variant="link" 
                        onClick={() => onBreadcrumbClick(b.id)}
                        className="p-0 font-semibold text-muted-foreground hover:text-primary disabled:text-foreground disabled:no-underline"
                        disabled={index === breadcrumb.length - 1}
                    >
                        {b.id === 'root' ? <Home className="w-4 h-4 sm:w-5 sm:h-5" /> : null}
                        <span className="max-w-[100px] sm:max-w-none truncate">{b.id === 'root' ? 'Home' : b.name}</span>
                    </Button>
                    {index < breadcrumb.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folder?.items?.map((item, idx) => (
            <Card
              key={item.id}
              id={item.type === 'document' ? `doc-card-${item.id}` : undefined}
              className={
                `hover:shadow-md transition-shadow cursor-pointer` +
                (item.type === 'document' && highlightedDocId === item.id ? ' ring-2 ring-primary ring-offset-2' : '')
              }
              onClick={e => {
                // Prevent navigation if click originated from menu/dialog/calendar
                if ((e.target as HTMLElement).closest('.no-nav')) return;
                onSelect(item);
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  {item.type === "folder" ? (
                    <FolderIcon className="w-8 h-8 text-yellow-500" />
                  ) : (
                    getFileIcon(item.fileType)
                  )}
                  <ItemMenu
                    item={item}
                    onFolderDelete={onFolderDelete}
                    onDocumentDelete={onDocumentDelete}
                    updateItem={(updatedDoc) => {
                      // Merge any returned fields (name, renewalDate, etc.) into the item
                      if (item.type === 'document' && updatedDoc && onDocumentUpdate) {
                        onDocumentUpdate({ ...(item as Document), ...updatedDoc });
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium truncate">{item.name}</p>
                {item.type === "folder" && (
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const getTotalDocumentCount = (folder: Folder): number => {
                        let count = 0;
                        folder.items?.forEach(child => {
                          if (child.type === 'document') {
                            count++;
                          } else if (child.type === 'folder') {
                            count += getTotalDocumentCount(child);
                          }
                        });
                        return count;
                      };
                      const totalCount = getTotalDocumentCount(item);
                      return `${totalCount} document${totalCount === 1 ? '' : 's'}`;
                    })()}
                  </p>
                )}
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
    </div>
  );
}


import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { handleRename } from "@/lib/handleRename";
import { setDocumentRenewalDate } from "@/lib/setDocumentRenewalDate";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

const ItemMenu = ({ item, onFolderDelete, onDocumentDelete, updateItem }: { item: Document | Folder, onFolderDelete: (folder: Folder) => void, onDocumentDelete: (document: Document) => void, updateItem?: (updatedDoc: Partial<Document> & { id: string, type: 'document' | 'folder' }) => void }) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [newName, setNewName] = useState(item.name);
  // Only for documents
  // Only for documents. No preselected date unless one exists.
  const [renewalDate, setRenewalDate] = useState<string>(item.type === 'document' && item.renewalDate ? new Date(item.renewalDate).toISOString().substring(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  // Controlled state for delete confirmation dialog (required to type folder name)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isDeleteMatch = deleteInput === item.name;

  // All folders are now editable and deletable
  const protectedFolderIds = false;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (item.type === 'folder') {
        await onFolderDelete(item);
        toast({ title: "Folder deleted", description: `Successfully deleted "${item.name}"` });
      } else if (item.type === 'document') {
        await onDocumentDelete(item);
        toast({ title: "Document deleted", description: `Successfully deleted "${item.name}"` });
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({ 
        title: "Delete failed", 
        description: `Could not delete "${item.name}". Please try again.`, 
        variant: "destructive" 
      });
      throw error; // Re-throw to prevent dialog from closing
    } finally {
      setDeleteLoading(false);
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
      // Update parent state for documents so the new name appears immediately
      if (item.type === 'document' && updateItem) {
        // Only send the changed fields so parent merges correctly
        updateItem({ id: item.id, name: newName.trim(), type: 'document' });
      }
      setRenameOpen(false);
    } catch (e) {
      toast({ title: "Rename failed", description: "Could not rename. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handler for setting renewal date (documents only)
  const handleRenewalSubmit = async () => {
    if (!renewalDate || item.type !== 'document') {
      setRenewalOpen(false);
      return;
    }
    setLoading(true);
    try {
      await setDocumentRenewalDate((item as any).workspaceId, item.id, renewalDate);
      toast({ title: "Renewal Date Set!", description: `Renewal date set to ${renewalDate}` });
      setRenewalOpen(false);
  if (updateItem) updateItem({ id: item.id, type: 'document', renewalDate });
    } catch (e) {
      toast({ title: "Failed to set renewal date", description: "Could not set renewal date. Please try again.", variant: "destructive" });
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
          { !protectedFolderIds && (
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}
          {/* Add Set Renewal Date for documents only */}
          {item.type === 'document' && (
            <DropdownMenuItem onSelect={e => { e.preventDefault(); e.stopPropagation(); setRenewalOpen(true); }} className="no-nav">
              <FileText className="mr-2 h-4 w-4 text-blue-700" />
              Set Renewal Date
            </DropdownMenuItem>
          )}
          { !protectedFolderIds && (
            <DropdownMenuItem onSelect={(e: any) => { e?.preventDefault?.(); e?.stopPropagation?.(); setDeleteOpen(true); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
           )}
        </DropdownMenuContent>
      </DropdownMenu>
    {/* Controlled delete dialog placed outside the dropdown so it isn't unmounted when the menu closes */}
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="no-nav">
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <p className="text-sm text-muted-foreground">To delete this {item.type}, type its name (<strong>{item.name}</strong>) below. This action cannot be undone.</p>
        </DialogHeader>
        <Input
          placeholder="Type folder name"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
          className="mt-4"
          disabled={deleteLoading}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={async () => {
              if (!isDeleteMatch || deleteLoading) return;
              try {
                await handleDelete();
                setDeleteOpen(false);
                setDeleteInput("");
              } catch (error) {
                // Error already handled in handleDelete, don't close dialog
              }
            }}
            disabled={!isDeleteMatch || deleteLoading}
            className={isDeleteMatch ? "bg-primary hover:bg-primary/90" : "bg-muted cursor-not-allowed"}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
      {/* Rename Dialog */}
      {!protectedFolderIds && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
    <DialogContent className="no-nav">
          <DialogHeader>
            <DialogTitle>Rename {item.type === 'folder' ? 'Folder' : 'Document'}</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
      onChange={e => setNewName(e.target.value)}
      className="no-nav"
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
      {/* Set Renewal Date Dialog (documents only) */}
      {item.type === 'document' && (
        <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
          <DialogContent className="no-nav">
            <DialogHeader>
              <DialogTitle>Set Renewal Date</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Manual input for date */}
              <Input
                type="date"
                value={renewalDate}
                onChange={e => setRenewalDate(e.target.value)}
                disabled={loading}
                className="no-nav w-full"
                style={{ maxWidth: 220 }}
              />
              {/* Calendar picker for date */}
              <Calendar
                mode="single"
                selected={renewalDate ? new Date(renewalDate + 'T00:00:00') : undefined}
                onSelect={date => {
                  if (!date) return setRenewalDate("");
                  // Fix timezone offset by using local date
                  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setRenewalDate(local.toISOString().substring(0, 10));
                }}
                disabled={loading}
                className="no-nav"
                fromYear={new Date().getFullYear() - 2}
                toYear={new Date().getFullYear() + 2}
                captionLayout="dropdown"
                showOutsideDays={true}
              />
              <p className="text-sm text-muted-foreground">Selected: {renewalDate || 'None'}</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleRenewalSubmit} disabled={loading || !renewalDate}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

function LockFolderButton({ folderName, onLock }: { folderName: string, onLock: () => void }) {
  return (
    <DropdownMenuItem
      onClick={() => {
        onLock();
      }}
      className="text-muted focus:text-muted"
    >
      <ShieldCheck className="mr-2 h-4 w-4" />
      Lock Folder
    </DropdownMenuItem>
  );
}

