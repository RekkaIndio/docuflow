
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
    // If a highlight was dispatched shortly before this component mounted, pick it up
    try {
      const last = typeof window !== 'undefined' ? localStorage.getItem('lastHighlightedDocumentId') : null;
      if (last) {
        setHighlightedDocId(last);
        setTimeout(() => {
          const el = document.getElementById(`doc-card-${last}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          try {
            const name = typeof window !== 'undefined' ? localStorage.getItem('lastHighlightedDocumentName') || undefined : undefined;
            const el2 = findCardElementByDocumentName(name as string | undefined);
            if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {}
        }, 100);
      }
    } catch (e) {}
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

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {/* Hide SidebarTrigger on mobile since we have it in TopNav */}
          {!isMobile && <SidebarTrigger />}
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
        <div className="flex items-center gap-2">
           <NewFolderDialog
                workspaceId={folder?.workspaceId || ""}
                parentId={folder?.id || 'root'}
                onFolderCreated={onFolderAdd}
              >
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Folder
                </Button>
            </NewFolderDialog>
            <UploadButton
                onDocumentAdd={onDocumentAdd}
                workspaceId={folder?.workspaceId}
                folderId={folder?.id || 'root'}
            />
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
                    {item.items?.filter(child => child.type === 'document').length} document{item.items?.filter(child => child.type === 'document').length === 1 ? '' : 's'}
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

  // Protected folder ids for the main folders view (immutable)
  const protectedFolderIds = item.type === 'folder' && [
    'audits', 'audits-managers-monthly-audit', 'audits-audits',
    'complaints-and-compliments', 'complaints', 'compliments',
    'surveys', 'surveys-staff', 'surveys-residents', 'surveys-professional', 'surveys-relatives',
    'rd-compliance-report', 'action-plans', 'action-plans-external', 'action-plans-internal',
    'cqc-notifications', 'safeguards', 'riddor', 'hdp', 'sip', 'pr-submissions', 'business-continuity-plan',
    'service-user-guide', 'statement-of-purpose', 'lessons-learnt', 'rcas'
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
            <DeleteDialog onConfirm={handleDelete}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DeleteDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
