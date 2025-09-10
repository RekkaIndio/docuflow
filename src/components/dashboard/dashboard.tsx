
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import WorkspaceContext from '@/context/workspace';
import { AppSidebar } from "./app-sidebar";
import { getWorkspacesForUser, createWorkspace, deleteFolder, deleteDocument } from "@/lib/firestore";
import type { Document, Folder, Workspace } from "@/lib/types";
import { FileBrowser } from "./file-browser";
import { DocumentView } from "./document-view";
import findParentFolderByDocumentId from '@/lib/document-utils';
import { cn } from "@/lib/utils";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { MessageSquare, X } from "lucide-react";
import { ChatPanel } from "../chat/chat-panel";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { TeamsView } from "./teams-view";
import { DashboardHome } from "./dashboard-home";
import { SettingsView } from "./settings-view";
import { AllDocumentsView } from "./all-documents-view";
import { RenewalsView } from "./renewals-view";
import { TagsView } from "./tags-view";
import { StatsView } from "./stats-view";
import { TopNav } from "./top-nav";
import { NotificationsView } from "./notifications-view";
import { db } from '@/lib/firebase';
import { collection, query as fsQuery, where, onSnapshot } from 'firebase/firestore';
import { AccessibilityView } from "./accessibility-view";
// Outstanding Evidence view removed; evidence folders are now regular protected folders


function findAndAddDocument(folders: (Folder | Document)[], targetFolderId: string, document: Document): (Folder | Document)[] {
    return folders.map(item => {
        if (item.type === 'folder') {
            if (item.id === targetFolderId) {
                return {
                    ...item,
                    items: [document, ...item.items],
                };
            }
            // Recurse
            const updatedItems = findAndAddDocument(item.items, targetFolderId, document);
            if (updatedItems !== item.items) {
                 return { ...item, items: updatedItems };
            }
        }
        return item;
    });
}

function findAndAddFolder(items: (Folder | Document)[], parentId: string, newFolder: Folder): (Folder | Document)[] {
    if (parentId === 'root') {
        return [newFolder, ...items];
    }

    return items.map(item => {
        if (item.type === 'folder') {
            if (item.id === parentId) {
                // This is the parent folder, add the new folder to its items
                return {
                    ...item,
                    items: [newFolder, ...item.items],
                };
            } else if (item.items && item.items.length > 0) {
                // This is not the parent, but it has sub-folders. Recurse.
                const updatedItems = findAndAddFolder(item.items, parentId, newFolder);
                // If the recursive call made a change, return the updated item
                if (updatedItems !== item.items) {
                    return { ...item, items: updatedItems };
                }
            }
        }
        return item;
    });
}


function findAndRemoveItem(items: (Folder | Document)[], itemId: string): (Folder | Document)[] {
    return items.filter(item => item.id !== itemId).map(item => {
        if (item.type === 'folder') {
            return {
                ...item,
                items: findAndRemoveItem(item.items, itemId),
            };
        }
        return item;
    });
}

function findItemById(items: (Folder | Document)[], itemId: string): Folder | Document | null {
    if (itemId === 'root') return null; // Root isn't a real item in the array
    for (const item of items) {
        if (item.id === itemId) {
            return item;
        }
        if (item.type === 'folder') {
            const found = findItemById(item.items, itemId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}


const LoadingDashboard = () => (
    <SidebarProvider defaultOpen>
        <Sidebar>
             <div className="flex flex-col p-4 gap-4">
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-6 w-3/5" />
            </div>
            <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </Sidebar>
        <SidebarInset>
            <div className="p-4">
                <Skeleton className="h-10 w-1/4 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        </SidebarInset>
    </SidebarProvider>
)


export function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<Folder | Document | null>(null);
  // evidenceSelected removed; evidence folders are part of the main folders tree
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'dependency-calculator' | 'daily' | 'notifications' | 'audits' | 'policies' | 'stats' | 'action-plans'>('home');
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [breadcrumb, setBreadcrumb] = useState<(Folder | { id: 'root', name: string, type: 'folder' })[]>([]);
  const [lastChatDetail, setLastChatDetail] = useState<{ text?: string; documents?: any[] } | undefined>(undefined);


  useEffect(() => {
    const handleChatResponse = (event: any) => {
      const detail = event?.detail;
      if (detail && (typeof detail.text === 'string' || Array.isArray(detail.documents))) {
        setLastChatDetail({ text: detail.text, documents: detail.documents || [] });
      }
    };

    // Listen for unread notifications count for the active workspace
    let unsub: (() => void) | undefined;
      if (typeof window !== 'undefined') {
        window.addEventListener('chat-response', handleChatResponse as EventListener);
      }
    if (activeWorkspace) {
      const q = fsQuery(collection(db, `workspaces/${activeWorkspace.id}/notifications`), where('read', '==', false));
      unsub = onSnapshot(q, (snap: any) => {
        setUnreadNotifications(snap.size);
      }, (err: any) => {
        console.error('Failed to listen for unread notifications', err);
      });
    } else {
      setUnreadNotifications(0);
    }
    return () => {
      if (unsub) unsub();
      if (typeof window !== 'undefined') {
        try { window.removeEventListener('chat-response', handleChatResponse as EventListener); } catch (e) {}
      }
    };
  }, [workspaces, activeWorkspace]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      
      let userWorkspaces = await getWorkspacesForUser(user.id);
      
      if (!userWorkspaces || userWorkspaces.length === 0) {
        console.log("No workspaces found, creating a new one.");
        const newWorkspace = await handleCreateWorkspace(`${user.name || 'My'}'s Workspace`);
        userWorkspaces = [newWorkspace];
      }

  // evidenceFolders removed: evidence folders are now created as protected folders (server-side)

      // Initialize protected (immutable) folders in the main folders list if not present
      const protectedFoldersTemplate = (workspaceId: string): any[] => [
  // The former "Outstanding Evidence" group is a single protected folder containing five protected child folders
  {
    id: 'outstanding-evidence',
    name: 'Outstanding Evidence',
    type: 'folder',
    workspaceId,
    parentId: null,
    items: [
      { id: 'evidence-safe', name: 'Safe', type: 'folder', items: [], workspaceId, parentId: 'outstanding-evidence' },
      { id: 'evidence-effective', name: 'Effective', type: 'folder', items: [], workspaceId, parentId: 'outstanding-evidence' },
      { id: 'evidence-caring', name: 'Caring', type: 'folder', items: [], workspaceId, parentId: 'outstanding-evidence' },
      { id: 'evidence-well-led', name: 'Well-led', type: 'folder', items: [], workspaceId, parentId: 'outstanding-evidence' },
      { id: 'evidence-responsive', name: 'Responsive', type: 'folder', items: [], workspaceId, parentId: 'outstanding-evidence' },
    ],
  },
        {
          id: 'audits',
          name: 'Audits',
          type: 'folder',
          items: [
            { id: 'audits-managers-monthly-audit', name: "Managers' Monthly Audit", type: 'folder', items: [], workspaceId, parentId: 'audits' },
            { id: 'audits-audits', name: 'Audits', type: 'folder', items: [], workspaceId, parentId: 'audits' },
          ],
          workspaceId,
          parentId: null,
        },
        {
          id: 'complaints-and-compliments',
          name: 'Complaints and Compliments',
          type: 'folder',
          items: [
            { id: 'complaints', name: 'Complaints', type: 'folder', items: [], workspaceId, parentId: 'complaints-and-compliments' },
            { id: 'compliments', name: 'Compliments', type: 'folder', items: [], workspaceId, parentId: 'complaints-and-compliments' },
          ],
          workspaceId,
          parentId: null,
        },
        {
          id: 'surveys',
          name: 'Surveys',
          type: 'folder',
          items: [
            { id: 'surveys-staff', name: 'Staff', type: 'folder', items: [], workspaceId, parentId: 'surveys' },
            { id: 'surveys-residents', name: 'Residents', type: 'folder', items: [], workspaceId, parentId: 'surveys' },
            { id: 'surveys-professional', name: 'Professional', type: 'folder', items: [], workspaceId, parentId: 'surveys' },
            { id: 'surveys-relatives', name: 'Relatives', type: 'folder', items: [], workspaceId, parentId: 'surveys' },
          ],
          workspaceId,
          parentId: null,
        },
        { id: 'rd-compliance-report', name: 'Rd compliance report', type: 'folder', items: [], workspaceId, parentId: null },
        {
          id: 'action-plans',
          name: 'Action plans',
          type: 'folder',
          items: [
            { id: 'action-plans-external', name: 'External', type: 'folder', items: [], workspaceId, parentId: 'action-plans' },
            { id: 'action-plans-internal', name: 'Internal', type: 'folder', items: [], workspaceId, parentId: 'action-plans' },
          ],
          workspaceId,
          parentId: null,
        },
        { id: 'cqc-notifications', name: 'Cqc notifications', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'safeguards', name: 'Safeguards', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'riddor', name: 'RIDDOR', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'hdp', name: 'HDP', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'sip', name: 'SIP', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'pr-submissions', name: 'PR submissions', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'business-continuity-plan', name: 'Business continuity plan', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'service-user-guide', name: 'Service user guide', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'statement-of-purpose', name: 'Statement of purpose', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'lessons-learnt', name: 'Lessons learnt', type: 'folder', items: [], workspaceId, parentId: null },
        { id: 'rcas', name: 'RCAs', type: 'folder', items: [], workspaceId, parentId: null },
      ];

      userWorkspaces = userWorkspaces.map(ws => {
        // Ensure protectedFolders only added once
        const existingProtectedIds = new Set(ws.folders.map(f => f.id));
        const toAdd = protectedFoldersTemplate(ws.id).filter((pf: any) => !existingProtectedIds.has(pf.id));
        // Prepend the protected folders so they appear first
        return { ...ws, folders: [...toAdd, ...(ws.folders || [])] };
      });

      setWorkspaces(userWorkspaces);
      setActiveWorkspace(userWorkspaces[0]);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Add event listener for document navigation from chat
  useEffect(() => {
    const handleDocumentNavigation = (event: CustomEvent) => {
      const { documentId, documentName, policyFile } = event.detail || {};

      // If a policyFile is provided, open the policy PDF as a synthetic Document inside the app
      if (policyFile) {
        if (!activeWorkspace) return; // require an active workspace to show DocumentView
        const doc: Document = {
          id: `policy:${policyFile}`,
          name: documentName || policyFile.replace(/[-_]/g, ' ').replace('.pdf', ''),
          type: 'document',
          fileType: 'pdf',
          createdAt: new Date().toISOString(),
          owner: user || { id: 'system', name: 'Policy Library', email: null, avatarUrl: null },
          workspaceId: activeWorkspace.id,
          folderId: null,
          // Use a public URL; DocumentPreview/PdfPreview will handle fetching it
          downloadUrl: `/policies/${policyFile}`,
        } as Document;

        setLastChatDetail(undefined);
        setSelected(doc as Document);
        setView('files');

        // dispatch highlight so file browser (if visible) can react
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: doc.id } })); } catch (e) {}
        }

        return;
      }
      
      if (!activeWorkspace) return;
      
      // Find the document in the workspace
      const findDocument = (items: (Folder | Document)[]): Document | null => {
        for (const item of items) {
          if (item.type === 'document' && item.id === documentId) {
            return item;
          }
          if (item.type === 'folder') {
            const found = findDocument(item.items);
            if (found) return found;
          }
        }
        return null;
      };
      
      const document = findDocument(activeWorkspace.folders);
      if (document) {
        // Select the document itself so the dashboard will render DocumentView for it
        // Clear any previous chat snippets so the newly-opened document starts with a fresh snippet state
        setLastChatDetail(undefined);
        setSelected(document as Document);
        setView('files');

        // Still dispatch highlight so any file browser can scroll/highlight the item
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); } catch (e) {}
        }
      } else {
        // Document not found, show a toast or fallback behavior
        console.warn(`Document ${documentId} (${documentName}) not found in workspace`);
        
        // For demo purposes, show a helpful message
        if (typeof window !== 'undefined') {
        
          window.alert(`Document "${documentName || documentId}" not found in the current workspace.\n\nThis might be because:\n- The document hasn't been uploaded yet\n- You don't have access to this document\n- The document was moved or deleted\n\nIn a real application, this would show proper error handling or redirect to an upload page.`);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('navigate-to-document', handleDocumentNavigation as EventListener);
      // Also listen for workspace navigation events (from admin chat)
      const handleWorkspaceNavigation = (ev: CustomEvent) => {
        const { workspaceId, workspaceName } = ev.detail || {};
        if (!workspaceId) return;
        const ws = workspaces.find(w => w.id === workspaceId) || null;
        if (ws) {
          setActiveWorkspace(ws);
          setSelected(null);
          setView('home');
        } else {
          console.warn('Workspace not found for navigate-to-workspace:', workspaceId, workspaceName);
        }
      };

      window.addEventListener('navigate-to-workspace', handleWorkspaceNavigation as EventListener);

      // Listen for navigate-to-audits events from compliance cards
      const handleAuditsNavigation = (ev: CustomEvent) => {
        const { auditType } = ev.detail || {};
        setView('audits');
        // The audit type is stored in localStorage by the dashboard-home component
        // The audits page will check this and open the specific audit
      };

      window.addEventListener('navigate-to-audits', handleAuditsNavigation as EventListener);

      return () => {
        window.removeEventListener('navigate-to-document', handleDocumentNavigation as EventListener);
        window.removeEventListener('navigate-to-workspace', handleWorkspaceNavigation as EventListener);
        window.removeEventListener('navigate-to-audits', handleAuditsNavigation as EventListener);
      };
    }
  }, [activeWorkspace]);

  const handleCreateWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error("User not authenticated");
    const newWorkspaceData: Omit<Workspace, 'id' | 'folders'> = {
        name: name,
        ownerId: user.id,
        members: [user.id],
    };
    const newWorkspace = await createWorkspace(newWorkspaceData);
    
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspace(newWorkspace);
    setView('home');

    return newWorkspace;
  };


  const handleWorkspaceChange = (workspaceId: string) => {
    const newActiveWorkspace = workspaces.find(ws => ws.id === workspaceId);
    if (newActiveWorkspace) {
        setActiveWorkspace(newActiveWorkspace);
        setSelected(null); // Reset selection
    // evidenceSelected removed; evidence folders are part of the main folders tree
        setView('home'); // Go to home of new workspace
    }
  };

  const getBreadcrumbPath = useCallback((folderId: string | null | undefined): (Folder | { id: 'root', name: string, type: 'folder' })[] => {
      if (!activeWorkspace) return [];
      
    const root = { id: 'root', name: activeWorkspace.name, type: 'folder' as const, items: activeWorkspace.folders };
    if (!folderId || folderId === 'root') {
      return [root];
    }

      const findPath = (items: (Folder | Document)[], id: string): Folder[] => {
          for (const item of items) {
              if (item.id === id && item.type === 'folder') {
                  return [item];
              }
              if (item.type === 'folder') {
                  const path = findPath(item.items, id);
                  if (path.length > 0) {
                      return [item, ...path];
                  }
              }
          }
          return [];
      }
      
      const path = findPath(activeWorkspace.folders, folderId);
  return [root, ...path];

  }, [activeWorkspace]);

  // evidence breadcrumb path removed


  useEffect(() => {
    // Breadcrumbs are based only on the main folders selection now
    if (selected?.type === 'folder') {
      setBreadcrumb(getBreadcrumbPath(selected.id));
    } else if (selected?.type === 'document') {
      setBreadcrumb(getBreadcrumbPath(selected.folderId));
    } else if (activeWorkspace) {
      setBreadcrumb(getBreadcrumbPath('root'));
    }
  }, [selected, activeWorkspace, getBreadcrumbPath]);


  const handleSelect = (item: Folder | Document) => {
    setSelected(item);
    setIsChatOpen(false);
    setView('files'); // Switch to files view when a folder/doc is selected from a non-files view
  };

  const handleDocumentAdd = (document: Document) => {
    if (!document.folderId) {
        console.error("Cannot add document without a folderId");
        return;
    }
  setActiveWorkspace(prev => {
    if (!prev) return null;

    let newFolders;
    if (document.folderId === 'root') {
      newFolders = [document, ...prev.folders] as (Folder | Document)[];
    } else {
      newFolders = findAndAddDocument(prev.folders, document.folderId!, document) as Folder[];
    }

    let newSelected = selected;
    // If we are in the folder the doc was added to, refresh the selection
    if (selected?.id === document.folderId && document.folderId) {
      if (document.folderId === 'root') {
        // Create a fresh root wrapper that contains the updated folders so FileBrowser sees the new list
        newSelected = { id: 'root', name: prev.name, type: 'folder', items: newFolders, workspaceId: prev.id } as Folder;
      } else {
        const parentFolder = findItemById(newFolders, document.folderId!);
        if (parentFolder) newSelected = parentFolder;
      }
    }

    setSelected(newSelected)
    return { ...prev, folders: newFolders };
  });
  }

  const handleFolderAdd = (folder: Folder) => {
    if (!folder.parentId && folder.parentId !== null) {
        console.error("Cannot add folder without a parentId");
        return;
    }
    // Update workspace and selection together so the UI shows the new folder immediately.
  setActiveWorkspace(prev => {
    if (!prev) return null;

    const newFolders = findAndAddFolder(prev.folders, folder.parentId || 'root', folder) as Folder[];
    const newWorkspace = { ...prev, folders: newFolders };

    // If the current selection is the parent folder (or root), update selection to the
    // new parent reference from the updated workspace so children render immediately.
    let newSelected = selected;
    const parentIdKey = folder.parentId || 'root';
    if (selected?.id === parentIdKey) {
      if (parentIdKey === 'root') {
        // Create a fresh root wrapper that contains the updated folders
        newSelected = { id: 'root', name: newWorkspace.name, type: 'folder', items: newWorkspace.folders, workspaceId: newWorkspace.id } as Folder;
      } else {
        const updatedParentFolder = findItemById(newFolders, selected.id);
        if (updatedParentFolder) {
          newSelected = updatedParentFolder;
        }
      }
    }

    // Apply selection update synchronously alongside workspace update.
    setSelected(newSelected);

    return newWorkspace;
  });
};
  const handleDocumentDelete = async (document: Document) => {
    if (!activeWorkspace) return;
    try {
      await deleteDocument(activeWorkspace.id, document.id);
      // Update workspace and selection together so the UI updates immediately.
      setActiveWorkspace(prev => {
        if (!prev) return null;
        const newFolders = findAndRemoveItem(prev.folders, document.id) as Folder[];
        const newWorkspace = { ...prev, folders: newFolders };

        // Update selection: build a fresh root wrapper from the updated workspace so selection
        // changes reference the new folders (avoid reading stale activeWorkspace)
        const newRoot: Folder = { id: 'root', name: newWorkspace.name, type: 'folder', items: newWorkspace.folders, workspaceId: newWorkspace.id } as Folder;
        if (selected?.id === document.id) {
          setSelected(newRoot);
          setView('files');
        } else if (selected) {
          const updatedSelectedItem = findItemById(newFolders, selected.id);
          if (updatedSelectedItem) {
            setSelected(updatedSelectedItem.type === 'folder' ? { ...updatedSelectedItem, items: updatedSelectedItem.items } : updatedSelectedItem);
          } else {
            setSelected(newRoot);
            setView('files');
          }
        }

        return newWorkspace;
      });
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  // Immutable update for a single document (e.g., renewalDate changed)
  const handleDocumentUpdate = (document: Document) => {
    if (!activeWorkspace) return;
    setActiveWorkspace(prev => {
      if (!prev) return null;
      // Replace the document in the folders tree immutably
      const replaceDoc = (items: (Folder | Document)[]): (Folder | Document)[] => {
        return items.map(item => {
          if (item.type === 'document' && item.id === document.id) {
            return { ...item, ...document };
          }
          if (item.type === 'folder') {
            const updatedItems = replaceDoc(item.items);
            if (updatedItems !== item.items) return { ...item, items: updatedItems };
          }
          return item;
        });
      };

      const newFolders = replaceDoc(prev.folders) as Folder[];
      const newWorkspace = { ...prev, folders: newFolders };

      // If the selected item is the updated document, update selection to the new object
      if (selected?.id === document.id) {
        setSelected(document);
      } else if (selected && selected.type === 'folder') {
        // If the selected folder contains this document, replace the selected folder reference
  const updatedParent = findParentFolderByDocumentId(newFolders, document.id);
        if (updatedParent && selected.id === updatedParent.id) {
          setSelected({ ...updatedParent, items: updatedParent.items });
        }
      }

      return newWorkspace;
    });
  };

  const handleFolderDelete = async (folder: Folder) => {
    if (!activeWorkspace) return;
    // Prevent deletion of protected/immutable folders
    const protectedIds = [
      'outstanding-evidence',
      'evidence-safe', 'evidence-effective', 'evidence-caring', 'evidence-well-led', 'evidence-responsive',
      'audits', 'audits-managers-monthly-audit', 'audits-audits',
      'complaints-and-compliments', 'complaints', 'compliments',
      'surveys', 'surveys-staff', 'surveys-residents', 'surveys-professional', 'surveys-relatives',
      'rd-compliance-report', 'action-plans', 'action-plans-external', 'action-plans-internal',
      'cqc-notifications', 'safeguards', 'riddor', 'hdp', 'sip', 'pr-submissions', 'business-continuity-plan',
      'service-user-guide', 'statement-of-purpose', 'lessons-learnt', 'rcas'
    ];

    if (protectedIds.includes(folder.id)) {
      console.warn("Attempted to delete protected folder:", folder.id);
      return;
    }

    try {
        await deleteFolder(activeWorkspace.id, folder.id);
    // Update workspace and selection together so UI removes the folder immediately.
    setActiveWorkspace(prev => {
      if (!prev) return null;
      const newFolders = findAndRemoveItem(prev.folders, folder.id) as Folder[];
      const newWorkspace = { ...prev, folders: newFolders };

      const newRoot: Folder = { id: 'root', name: newWorkspace.name, type: 'folder', items: newWorkspace.folders, workspaceId: newWorkspace.id } as Folder;
      if (selected?.id === folder.id) {
        // If the deleted folder was selected, go back to root file browser
        setSelected(newRoot);
        setView('files');
      } else if (selected) {
        const updatedSelectedItem = findItemById(newFolders, selected.id);
        if (updatedSelectedItem) {
          setSelected(updatedSelectedItem.type === 'folder' ? { ...updatedSelectedItem, items: updatedSelectedItem.items } : updatedSelectedItem);
        } else {
          setSelected(newRoot);
          setView('files');
        }
      }

      return newWorkspace;
    });

    } catch (error) {
        console.error("Failed to delete folder:", error);
    }
  };

  // Evidence document delete now uses generic handlers (evidence removed)

  const getRootFolder = (): Folder | undefined => {
    if (activeWorkspace) {
        return { 
            id: 'root', 
            name: activeWorkspace.name, 
            type: 'folder', 
            items: activeWorkspace.folders, 
            workspaceId: activeWorkspace.id 
        };
    }
    return undefined;
  }

  const handleBackToFileBrowser = () => {
    const rootFolder = getRootFolder();
    if (rootFolder) {
        setSelected(rootFolder);
        setView('files');
    }
  };
  const handleGoToFiles = () => {
    const rootFolder = getRootFolder();
    if (rootFolder) {
        setSelected(rootFolder);
        setView('files');
    }
  }

  const handleChatButtonClick = () => {
    // Allow opening chat at the workspace (root) level even when nothing is specifically selected.
    // If there's an explicit selection, use it; otherwise fall back to the workspace root folder.
    const currentSelected = selected || getRootFolder();
    if (currentSelected) {
      setSelected(currentSelected);
      setIsChatOpen(true);
    }
  };

  const handleBreadcrumbClick = (folderId: string) => {
    if (folderId === 'root') {
        setSelected(getRootFolder()!);
    } else {
        const folder = findItemById(activeWorkspace?.folders || [], folderId);
        if (folder && folder.type === 'folder') {
            setSelected(folder);
        }
    }
    setView('files');
  }


  if (loading || !activeWorkspace) {
    return <LoadingDashboard />;
  }

  let currentFolder: Folder | undefined;
  if (selected?.type === 'folder') {
      currentFolder = selected;
  } else if (selected?.type === 'document' && activeWorkspace) {
      const findParent = (items: (Folder | Document)[]): Folder | undefined => {
          for (const item of items) {
              if (item.type === 'folder') {
                  if (item.items.some(child => child.id === selected.id)) {
                      return item;
                  }
                  const found = findParent(item.items);
                  if (found) return found;
              }
          }
          return undefined;
      }
      currentFolder = findParent(activeWorkspace.folders);
      if(!currentFolder) {
         currentFolder = getRootFolder();
      }
  } else {
      currentFolder = getRootFolder();
  }


  const renderContent = () => {
  switch (view) {
        case 'home':
            return <DashboardHome 
                        workspace={activeWorkspace} 
                        onSelect={handleSelect} 
                        onDocumentAdd={handleDocumentAdd} 
                        onFolderAdd={handleFolderAdd} 
                    />;
        case 'daily':
            return (
                <React.Suspense fallback={<div>Loading...</div>}>
                  {(() => {
                    const DailyPage = require("./daily").default;
                    return <DailyPage workspaceId={activeWorkspace?.id} />;
                  })()}
                </React.Suspense>
            );
        case 'teams':
            return <TeamsView workspace={activeWorkspace} />;
        case 'settings':
            return <SettingsView workspace={activeWorkspace} />;
        case 'accessibility':
            return <AccessibilityView workspace={activeWorkspace} />;
    case 'notifications':
      return activeWorkspace ? <NotificationsView workspaceId={activeWorkspace.id} onBack={() => setView('home')} /> : <div className="p-6">No workspace</div>;
    case 'documents':
      return <AllDocumentsView 
        key={activeWorkspace.folders.map(f=>f.id).join('-') + '-' + activeWorkspace.folders.length}
        workspace={activeWorkspace} 
        onSelect={handleSelect} 
      />;
        case 'tags':
            return <TagsView workspace={activeWorkspace} onSelectDocument={handleSelect} />;
    case 'renewals':
      return activeWorkspace ? <RenewalsView workspaceId={activeWorkspace.id} onSelectDocument={handleSelect} /> : null;
  /* Outstanding Evidence removed; evidence folders are part of main folders */
    case 'files':
            if (selected?.type === "document") {
                return <DocumentView document={selected} onBack={handleBackToFileBrowser} responseDetail={lastChatDetail} isChatOpen={isChatOpen} />;
            }
      return (
        <FileBrowser
          key={activeWorkspace.folders.map(f=>f.id).join('-') + '-' + activeWorkspace.folders.length}
          folder={currentFolder as Folder}
          onSelect={handleSelect}
          onDocumentAdd={handleDocumentAdd}
          onFolderAdd={handleFolderAdd}
          onFolderDelete={handleFolderDelete}
          onDocumentDelete={handleDocumentDelete}
          onDocumentUpdate={handleDocumentUpdate}
          breadcrumb={breadcrumb}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      );
        case 'dependency-calculator':
            return (
                <React.Suspense fallback={<div>Loading...</div>}>
                  {(() => {
                    const DependencyCalculatorPage = require("@/app/(protected)/dashboard/dependency-calculator/page").default;
                    return <DependencyCalculatorPage />;
                  })()}
                </React.Suspense>
            );
        case 'audits':
            return (
                <React.Suspense fallback={<div>Loading...</div>}>
                  {(() => {
                    const AuditsPage = require("@/app/audits/page").default;
                    return <AuditsPage />;
                  })()}
                </React.Suspense>
            );
        case 'stats':
            return <StatsView workspaceId={activeWorkspace?.id} />;
        case 'policies':
            return (
                <React.Suspense fallback={<div>Loading...</div>}>
                  {(() => {
                    const PoliciesPage = require("@/app/policies/page").default;
                    return <PoliciesPage />;
                  })()}
                </React.Suspense>
            );
        case 'action-plans':
            return (
                <React.Suspense fallback={<div>Loading...</div>}>
                  {(() => {
                    const ActionPlansPage = require("@/app/(protected)/action-plans/page").default;
                    return <ActionPlansPage />;
                  })()}
                </React.Suspense>
            );
        default:
             return <DashboardHome 
                        workspace={activeWorkspace} 
                        onSelect={handleSelect} 
                        onDocumentAdd={handleDocumentAdd} 
                        onFolderAdd={handleFolderAdd} 
                    />;
    }
  };


  return (
    <WorkspaceContext.Provider value={activeWorkspace}>
      <SidebarProvider defaultOpen={!isMobile}>
        <TooltipProvider>
        <Sidebar>
          <AppSidebar 
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onWorkspaceChange={handleWorkspaceChange}
            setView={setView} 
            onGoToFiles={handleGoToFiles} 
            onCreateWorkspace={handleCreateWorkspace}
           />
        </Sidebar>

        <SidebarInset className="flex flex-col min-h-screen w-full overflow-hidden">
                <TopNav onSettingsClick={() => setView('settings')} onNotificationsClick={() => setView('notifications')} unreadCount={unreadNotifications} workspaceId={activeWorkspace?.id} />
            <div className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden w-full",
              // Add bottom padding on mobile when chat is closed to ensure content isn't hidden behind chat button
              isMobile && !isChatOpen && "pb-20"
            )}>
                {renderContent()}
            </div>
        </SidebarInset>

        <div
          className={cn(
            "fixed z-50 transition-all duration-300 ease-in-out",
            // Mobile positioning - always visible, safer positioning
            isMobile
              ? isChatOpen && selected
                ? "bottom-0 right-0 left-0 h-[70vh] max-h-[600px]"
                : "bottom-4 right-4 w-auto h-auto"
              : // Desktop positioning 
                isChatOpen && selected
                ? "bottom-4 right-4 w-[500px] h-[650px]"
                : "bottom-4 right-4 w-auto h-auto"
          )}
        >
          {isChatOpen && selected ? (
            <Card className={cn(
              "h-full flex flex-col shadow-2xl",
              isMobile && "rounded-t-lg rounded-b-none border-b-0"
            )}>
              <div className="flex items-center justify-between p-2 border-b">
                <h3 className="font-semibold px-2 truncate">Chat with {selected?.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                  className={cn(isMobile && "h-8 w-8")}
                >
                  <X className={cn("w-5 h-5", isMobile && "w-4 h-4")} />
                </Button>
              </div>
              {(selected !== null) && (
                <ChatPanel 
                  selectedItem={selected!}
                  onFolderAdd={async (folderName: string) => {
                          if (!activeWorkspace) return;
                          const currentSelected = selected;
                          // parentId: if selected is folder, use its id, else root
                          const parentId = currentSelected && currentSelected.type === 'folder' ? currentSelected.id : 'root';
                          // Simulate folder creation as in FileBrowser/NewFolderDialog
                          const newFolderData = {
                            name: folderName,
                            type: 'folder' as const,
                            workspaceId: activeWorkspace.id,
                            parentId: parentId === 'root' ? null : parentId,
                          };
                          // saveFolder returns id, but we want to use handleFolderAdd for state
                          const { saveFolder } = await import("@/lib/firestore");
                          const folderId = await saveFolder(newFolderData);
                          const newFolder = {
                            ...newFolderData,
                            id: folderId,
                            items: [],
                          } as Folder;
                          handleFolderAdd(newFolder);
                        }}
                />
              )}
            </Card>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn({ "cursor-not-allowed": !selected })}
                >
                  <Button
                    size={isMobile ? "default" : "lg"}
                    className={cn(
                      "rounded-full shadow-lg transition-all duration-200",
                      isMobile
                        ? "w-14 h-14" // Smaller on mobile but still easily tappable
                        : "w-16 h-16"
                    )}
                    onClick={handleChatButtonClick}
                    // Allow chat button across the dashboard (site-wide). Chat will open at the workspace root
                    // when no specific folder/document is selected. Keep disabled only if there's no active workspace.
                    disabled={!activeWorkspace}
                    aria-label="Open chat"
                  >
                    <MessageSquare className={cn(
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    )} />
                  </Button>
                </div>
              </TooltipTrigger>
              {!activeWorkspace && (
                <TooltipContent side={isMobile ? "top" : "left"}>
                    <p>Please create or select a workspace to use chat.</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
        </TooltipProvider>
      </SidebarProvider>
    </WorkspaceContext.Provider>
  );
}
