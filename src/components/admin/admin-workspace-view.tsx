"use client";
import React, { useMemo } from 'react';
import type { Workspace, Folder, Document } from '@/lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder as FolderIcon, FileText, FileSpreadsheet, FileX2, Home, ChevronRight, ArrowLeft, PlusSquare, Users, Tag, Clock, BarChart2 } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
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

  const { fileTypeCounts, recentUploads } = useMemo(() => {
    const ft: Record<string, number> = {};
    const uploads: Array<{ name: string; createdAt?: string }> = [];

    const walk = (items: (Folder | Document)[]) => {
      for (const it of items) {
        if (it.type === 'document') {
          const parts = (it.name || '').split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'unknown';
          ft[ext] = (ft[ext] || 0) + 1;
          uploads.push({ name: it.name || 'Untitled', createdAt: it.createdAt ? String(it.createdAt) : undefined });
        } else if (it.type === 'folder') {
          walk(it.items || []);
        }
      }
    };

    walk(workspace.folders || []);
    uploads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { fileTypeCounts: ft, recentUploads: uploads.slice(0, 5) };
  }, [workspace]);

  // compute occupancy percent if available on workspace
  const occupancyPercent = useMemo(() => {
    const w = workspace as any;
    if (typeof w.occupancy === 'number') return Math.round((w.occupancy || 0) * 100);
    if (typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number' && w.totalBeds > 0) {
      return Math.round((w.occupiedBeds / w.totalBeds) * 100);
    }
    return undefined;
  }, [workspace]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm">
        <div className="w-full mx-auto flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 rounded-md">
              <Home className="w-10 h-10 text-white/90" />
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">{workspace.name}</h2>
              <div className="mt-1 text-sm text-slate-200">Owner: {workspace.ownerId || '—'} · {totalFolders} folders · {totalDocuments} documents</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => { const n = window.prompt('New folder name'); if (n) onFolderAdd(n); }}> <PlusSquare className="w-4 h-4 mr-2" /> New folder</Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); }}>Share</Button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <FolderIcon className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="text-xs text-slate-300">Folders</div>
                  <div className="text-lg font-semibold">{totalFolders}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <FileText className="w-6 h-6 text-rose-400" />
                <div>
                  <div className="text-xs text-slate-300">Documents</div>
                  <div className="text-lg font-semibold">{totalDocuments}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <BarChart2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-300">Types</div>
                  <div className="text-lg font-semibold">{Object.keys(fileTypeCounts).length}</div>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                <div className="w-10 h-10">
                  <OccupancyPie percent={occupancyPercent ?? 0} size={44} strokeWidth={6} />
                </div>
                <div>
                  <div className="text-xs text-slate-300">Occupancy</div>
                  <div className="text-lg font-semibold">{typeof occupancyPercent === 'number' ? `${occupancyPercent}%` : 'n/a'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
  <div className="p-6 w-full mx-auto flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="mb-4">
            <div className="text-sm text-slate-500">Location</div>
            <nav className="text-sm text-muted-foreground mt-1">
              {breadcrumb.map((b, index) => (
                <span key={b.id} className="mr-2">{b.name}{index < breadcrumb.length - 1 ? ' / ' : ''}</span>
              ))}
            </nav>
          </div>

          <main className="overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {currentFolder.items?.map((item) => (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow transform hover:-translate-y-1 cursor-pointer min-h-[100px] w-full"
                  onClick={() => {
                    if (item.type === 'folder') {
                      pushFolder(item.id);
                      return;
                    }
                    // If it's a document, dispatch the shared navigation event so
                    // the admin page can listen and open DocumentView.
                    try {
                      const documentId = item.id;
                      if (typeof window !== 'undefined' && window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('navigate-to-document', { detail: { documentId, documentName: item.name } }));
                        try { localStorage.setItem('lastHighlightedDocumentId', documentId); } catch (e) {}
                        if (item.name) try { localStorage.setItem('lastHighlightedDocumentName', item.name); } catch (e) {}
                      }
                    } catch (e) {
                      // ignore
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded flex-shrink-0">
                        {item.type === 'folder' ? (
                          <FolderIcon className="w-7 h-7 text-yellow-500" />
                        ) : (
                          getFileIcon(item.fileType)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium break-words">{item.name}</p>
                        {item.type === 'folder' && (
                          <p className="text-sm text-muted-foreground">{item.items?.filter(c => c.type === 'document').length} document{(item.items?.filter(c => c.type === 'document').length === 1) ? '' : 's'}</p>
                        )}
                        {item.type === 'document' && (
                          <p className="text-sm text-muted-foreground">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </main>
        </div>

        <aside className="w-full lg:w-80">
          <div className="space-y-4">
            <Card>
              <CardHeader>Recent uploads</CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {recentUploads.length === 0 && <div className="text-sm text-muted-foreground">No recent uploads</div>}
                  {recentUploads.map((r, idx) => (
                    <li key={r.name + String(r.createdAt) + idx} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>Top file types</CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {Object.entries(fileTypeCounts).length === 0 && <div className="text-sm text-muted-foreground">No documents</div>}
                  {Object.entries(fileTypeCounts).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> {k}</div>
                      <div className="font-medium">{v}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* occupancy moved to header */}
          </div>
        </aside>
      </div>
    </div>
  );
}
