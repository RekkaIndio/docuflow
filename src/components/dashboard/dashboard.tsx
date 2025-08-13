
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { getWorkspacesForUser, createWorkspace, deleteFolder, deleteDocument } from "@/lib/firestore";
import type { Document, Folder, Workspace } from "@/lib/types";
import { FileBrowser } from "./file-browser";
import { DocumentView } from "./document-view";
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
import { TopNav } from "./top-nav";
import { AccessibilityView } from "./accessibility-view";


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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility'>('home');
  const [breadcrumb, setBreadcrumb] = useState<(Folder | { id: 'root', name: string, type: 'folder' })[]>([]);


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

      setWorkspaces(userWorkspaces);
      setActiveWorkspace(userWorkspaces[0]);
      setLoading(false);
    }
    fetchData();
  }, [user])

  // Add event listener for document navigation from chat
  useEffect(() => {
    const handleDocumentNavigation = (event: CustomEvent) => {
      const { documentId, documentName } = event.detail;
      
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
        handleSelect(document);
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
      
      return () => {
        window.removeEventListener('navigate-to-document', handleDocumentNavigation as EventListener);
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


  useEffect(() => {
    if(selected?.type === 'folder') {
      setBreadcrumb(getBreadcrumbPath(selected.id));
    } else if (selected?.type === 'document') {
       setBreadcrumb(getBreadcrumbPath(selected.folderId));
    } else if (activeWorkspace) {
       setBreadcrumb(getBreadcrumbPath('root'))
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
        if(document.folderId === 'root'){
             newFolders = [document, ...prev.folders] as (Folder | Document)[];
        } else {
            newFolders = findAndAddDocument(prev.folders, document.folderId!, document) as Folder[];
        }
        
        let newSelected = selected;
        // If we are in the folder the doc was added to, refresh the selection
    if (selected?.id === document.folderId && document.folderId) {
      const parentFolder = findItemById(newFolders, document.folderId!);
      if (parentFolder) newSelected = parentFolder;
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

    setActiveWorkspace(prev => {
        if (!prev) return null;

        const newFolders = findAndAddFolder(prev.folders, folder.parentId || 'root', folder) as Folder[];
        const newWorkspace = { ...prev, folders: newFolders };

        // After updating the main workspace, check if we need to update the selected item.
        if (selected?.id === (folder.parentId || 'root')) {
            const updatedParentFolder = findItemById(newFolders, selected.id);
            if (updatedParentFolder) {
                 // Call setSelected in a separate state update to ensure it reflects the new workspace state
                queueMicrotask(() => setSelected(updatedParentFolder));
            }
        }
        
        return newWorkspace;
    });
};


  const handleDocumentDelete = async (document: Document) => {
    if (!activeWorkspace) return;
    try {
      await deleteDocument(activeWorkspace.id, document.id);
      let newWorkspace: Workspace | null = null;
      setActiveWorkspace(prev => {
        if (!prev) return null;
        // Ensure a new folders array reference
        const newFolders = [...findAndRemoveItem(prev.folders, document.id)] as Folder[];
        newWorkspace = { ...prev, folders: newFolders };
        return { ...newWorkspace }; // force new object reference
      });
      // After workspace update, update selection if needed
      setTimeout(() => {
        if (!newWorkspace) return;
        if (selected?.id === document.id) {
          handleBackToFileBrowser();
        } else if (selected) {
          const updatedSelectedItem = findItemById(newWorkspace.folders, selected.id);
          if (updatedSelectedItem) {
            if (updatedSelectedItem.type === 'folder') {
              setSelected({ ...updatedSelectedItem, items: updatedSelectedItem.items });
            } else {
              setSelected(updatedSelectedItem);
            }
          } else {
            handleBackToFileBrowser();
          }
        }
      }, 0);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleFolderDelete = async (folder: Folder) => {
    if (!activeWorkspace) return;
    try {
        await deleteFolder(activeWorkspace.id, folder.id);
        
    let newWorkspace: Workspace | null = null;
    setActiveWorkspace(prev => {
      if (!prev) return null;
      const newFolders = findAndRemoveItem(prev.folders, folder.id) as Folder[];
      newWorkspace = { ...prev, folders: newFolders };
      return newWorkspace;
    });
    // After workspace update, update selection
    setTimeout(() => {
      if (!newWorkspace) return;
      if (selected?.id === folder.id) {
        handleBackToFileBrowser();
      } else if (selected) {
        const updatedSelectedItem = findItemById(newWorkspace.folders, selected.id);
        if (updatedSelectedItem) {
          if (updatedSelectedItem.type === 'folder') {
            setSelected({ ...updatedSelectedItem, items: updatedSelectedItem.items });
          } else {
            setSelected(updatedSelectedItem);
          }
        } else {
          handleBackToFileBrowser();
        }
      }
    }, 0);

    } catch (error) {
        console.error("Failed to delete folder:", error);
    }
  };

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
    if (selected) {
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
        case 'teams':
            return <TeamsView workspace={activeWorkspace} />;
        case 'settings':
            return <SettingsView workspace={activeWorkspace} />;
        case 'accessibility':
            return <AccessibilityView workspace={activeWorkspace} />;
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
    case 'files':
            if (selected?.type === "document") {
                return <DocumentView document={selected} onBack={handleBackToFileBrowser} />;
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
          breadcrumb={breadcrumb}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
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
            <TopNav onSettingsClick={() => setView('settings')} />
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
                <h3 className="font-semibold px-2 truncate">Chat with {selected.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                  className={cn(isMobile && "h-8 w-8")}
                >
                  <X className={cn("w-5 h-5", isMobile && "w-4 h-4")} />
                </Button>
              </div>
              <ChatPanel 
                selectedItem={selected}
                onFolderAdd={async (folderName: string) => {
                  if (!activeWorkspace) return;
                  // parentId: if selected is folder, use its id, else root
                  const parentId = selected && selected.type === 'folder' ? selected.id : 'root';
                  // Simulate folder creation as in FileBrowser/NewFolderDialog
                  const newFolderData = {
                    name: folderName,
                    type: 'folder' as const,
                    workspaceId: activeWorkspace.id,
                    parentId: parentId === 'root' ? null : parentId,
                  };
                  // saveFolder returns id, but we want to use handleFolderAdd for state
                  // Import saveFolder at top if not already
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
                    disabled={!selected || view !== 'files'}
                    aria-label="Open chat"
                  >
                    <MessageSquare className={cn(
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    )} />
                  </Button>
                </div>
              </TooltipTrigger>
              {(!selected || view !== 'files') && (
                <TooltipContent side={isMobile ? "top" : "left"}>
                    {view !== 'files' 
                        ? <p>Chat is only available in the Folders or Documents view.</p> 
                        : <p>Please select a document or folder to start chatting.</p>
                    }
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
