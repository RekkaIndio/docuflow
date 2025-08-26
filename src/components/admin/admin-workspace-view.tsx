"use client";
import React, { useMemo } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import { Button } from '@/components/ui/button';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminWorkspaceViewProps {
  workspace: Workspace;
  onClose: () => void;
}

const getFileIcon = (fileType: Document['fileType']) => {
  switch (fileType) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'csv':
      return <FileSpreadsheet className="w-8 h-8 text-green-700" />;
    case 'xlsx':
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    default:
      return <FileX2 className="w-8 h-8 text-gray-400" />;
  }
};

export default function AdminWorkspaceView({ workspace, onClose }: AdminWorkspaceViewProps) {
  const isMobile = useIsMobile();
  const [stack, setStack] = React.useState<string[]>([]);

  const rootWrapper: Folder = React.useMemo(() => ({ id: 'root', name: workspace.name, type: 'folder', items: workspace.folders || [], workspaceId: workspace.id }), [workspace]);

  const getCurrentFolder = React.useCallback((): Folder => {
    if (stack.length === 0) return rootWrapper;
    let current: Folder | null = null;
    const find = (items: (Folder | Document)[], id: string): Folder | null => {
      for (const it of items) {
        if (it.type === 'folder' && it.id === id) return it as Folder;
        if (it.type === 'folder') {
          const sub = find(it.items, id);
          if (sub) return sub;
        }
      }
      return null;
    };
    current = find(workspace.folders || [], stack[stack.length - 1]) || null;
    return current || rootWrapper;
  }, [stack, workspace, rootWrapper]);

  const currentFolder = getCurrentFolder();

  const pushFolder = (id: string) => setStack(s => [...s, id]);
  const popFolder = () => setStack(s => s.slice(0, -1));

  // Simple in-memory folder creation for admin chat commands. This will
  // call setStack to navigate into the newly-created folder. Persistence
  // should be handled by a real API call; this keeps UI responsive while
  // admin prototypes are tested.
  const onFolderAdd = (folderName: string) => {
    // create a new folder object and append to current folder's items
    const newId = `folder-${Date.now()}`;
    const newFolder: Folder = { id: newId, name: folderName, type: 'folder', items: [], workspaceId: workspace.id } as Folder;

    // mutate workspace.folders in-memory — callers should persist this
    // in real implementation. If we're in a nested folder, find the
    // parent and push into its items, otherwise push to root workspace.folders.
    if (stack.length === 0) {
      if (!workspace.folders) workspace.folders = [];
      workspace.folders.push(newFolder as any);
    } else {
      // find parent folder and append
      const parentId = stack[stack.length - 1];
      const findAndAppend = (items: (Folder | Document)[]) => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === parentId) {
            it.items.push(newFolder as any);
            return true;
          }
          if (it.type === 'folder') {
            if (findAndAppend(it.items)) return true;
          }
        }
        return false;
      };
      findAndAppend(workspace.folders || []);
    }

    // navigate into the newly created folder
    pushFolder(newId);
  };

  const breadcrumb = React.useMemo(() => {
    const crumbs: { id: string; name: string }[] = [{ id: 'root', name: workspace.name }];
    if (stack.length > 0) {
      // Find names for ids in stack
      const findName = (items: (Folder | Document)[], id: string): string | null => {
        for (const it of items) {
          if (it.type === 'folder' && it.id === id) return it.name;
          if (it.type === 'folder') {
            const sub = findName(it.items, id);
            if (sub) return sub;
          }
        }
        return null;
      };
      for (const id of stack) {
        const n = findName(workspace.folders || [], id) || id;
        crumbs.push({ id, name: n });
      }
    }
    return crumbs;
  }, [stack, workspace]);

  const totalFolders = useMemo(() => workspace.folders?.length || 0, [workspace]);
  const totalDocuments = useMemo(() => {
    const countDocuments = (items: (Folder | Document)[]): number => {
      return items.reduce((count, item) => {
        if (item.type === 'document') return count + 1;
        if (item.type === 'folder') return count + countDocuments(item.items);
        return count;
      }, 0);
    };
    return countDocuments(workspace.folders || []);
  }, [workspace]);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { if (stack.length === 0) onClose(); else popFolder(); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <div className="text-lg font-semibold">{workspace.name}</div>
            <div className="text-sm text-muted-foreground">Owner: {workspace.ownerId || '—'} · {workspace.folders?.length || 0} folders</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="text-sm text-muted-foreground">
            {breadcrumb.map((b, index) => (
              <span key={b.id} className="mr-2">{b.name}{index < breadcrumb.length - 1 ? ' / ' : ''}</span>
            ))}
          </nav>
        </div>
      </header>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>Total Folders</CardHeader>
          <CardContent>{totalFolders}</CardContent>
        </Card>
        <Card>
          <CardHeader>Total Documents</CardHeader>
          <CardContent>{totalDocuments}</CardContent>
        </Card>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex h-full gap-4">
          <main className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {currentFolder.items?.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { if (item.type === 'folder') pushFolder(item.id); }}>
                  <CardHeader>
                    <div className="flex justify-between items-start p-3">
                      {item.type === 'folder' ? (
                        <FolderIcon className="w-8 h-8 text-yellow-500" />
                      ) : (
                        getFileIcon(item.fileType)
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium truncate">{item.name}</p>
                    {item.type === 'folder' && (
                      <p className="text-sm text-muted-foreground">{item.items?.filter(c => c.type === 'document').length} document{(item.items?.filter(c => c.type === 'document').length === 1) ? '' : 's'}</p>
                    )}
                    {item.type === 'document' && (
                      <p className="text-sm text-muted-foreground">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>

          {/* Admin chat side panel */}
          <aside className="w-96 hidden xl:block">
            <div className="h-full">
              <AdminChatPanel selectedItem={currentFolder} onFolderAdd={onFolderAdd} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
