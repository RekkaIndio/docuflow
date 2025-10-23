"use client";

import React, { useEffect, useState, useCallback, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { collection, query as fsQuery, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { workspaceCollectionPath } from '@/lib/paths';
import { ensureOrgUserRecord } from '@/lib/firestore';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { FeatureGuard } from '@/components/feature-guard';
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

const DASHBOARD_VIEWS = [
  "home",
  "files",
  "documents",
  "tags",
  "teams",
  "settings",
  "renewals",
  "accessibility",
  "dependency-calculator",
  "daily",
  "notifications",
  "audits",
  "policies",
  "journal",
  "stats",
  "action-plans",
  "appraisals",
  "rotas",
  "lessons-rcas",
  "cqc-logs",
  "safeguarding-logs",
  "risk-assessment",
  "help",
] as const;

type DashboardView = (typeof DASHBOARD_VIEWS)[number];

const isDashboardView = (value: string | null): value is DashboardView => {
  return value !== null && (DASHBOARD_VIEWS as readonly string[]).includes(value);
};


export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<Folder | Document | null>(null);
  // evidenceSelected removed; evidence folders are part of the main folders tree
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setViewState] = useState<DashboardView>(() => {
    const initialParam = searchParams?.get('view') ?? null;
    return isDashboardView(initialParam) ? initialParam : 'home';
  });
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [breadcrumb, setBreadcrumb] = useState<(Folder | { id: 'root', name: string, type: 'folder' })[]>([]);
  const [lastChatDetail, setLastChatDetail] = useState<{ text?: string; documents?: any[] } | undefined>(undefined);
  const [dailyEntry, setDailyEntry] = useState<any | null>(null);
  // Ref used to store a short-lived hash marker when opening synthetic policy docs.
  const docHashRef = useRef<string | null>(null);
  // Remember the previous view when we open a synthetic policy document so the
  // in-app back arrow can return exactly where the user came from.
  const prevViewRef = useRef<string | null>(null);
  const pendingViewSyncRef = useRef<DashboardView | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingRouterUpdateRef = useRef<string | null>(null);

  useEffect(() => {
  const param = searchParams?.get('view') ?? null;
    const normalized = isDashboardView(param) ? param : 'home';

    if (pendingViewSyncRef.current && normalized === pendingViewSyncRef.current) {
      pendingViewSyncRef.current = null;
      return;
    }

    setViewState((current) => (current === normalized ? current : normalized));
  }, [searchParams]);

  // Sync view state to URL
  useEffect(() => {
    if (pendingRouterUpdateRef.current !== null) {
      const targetView = pendingRouterUpdateRef.current;
      pendingRouterUpdateRef.current = null;
      
      const params = new URLSearchParams(window.location.search);
      if (targetView === 'home') {
        params.delete('view');
      } else {
        params.set('view', targetView);
      }
      pendingViewSyncRef.current = targetView as DashboardView;
      const query = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
      });
    }
  }, [view, pathname, router, startTransition]);

  const setView = useCallback<React.Dispatch<React.SetStateAction<DashboardView>>>(
    (next) => {
      setViewState((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;
        // Schedule router update for next effect
        pendingRouterUpdateRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  // Primitive workspace identifiers to avoid repeated optional chaining and
  // to allow stable primitive deps in hooks.
    const workspaceId = activeWorkspace?.id ?? null;
    const organisationId = (activeWorkspace as any)?.organisationId || undefined;

  // Load feature flags for the organisation
    const { isEnabled } = useFeatureFlags(organisationId, workspaceId);


  useEffect(() => {
    const handleChatResponse = (event: any) => {
      const detail = event?.detail;
      if (detail && (typeof detail.text === 'string' || Array.isArray(detail.documents))) {
        setLastChatDetail({ text: detail.text, documents: detail.documents || [] });
      }
    };

    // Listen for unread notifications count for the active workspace
    let unsub: (() => void) | undefined;
    let dailyUnsub: (() => void) | undefined;
      if (typeof window !== 'undefined') {
        window.addEventListener('chat-response', handleChatResponse as EventListener);
      }
    // Ensure org user record exists before attaching org-scoped listeners so
    // the subscription won't fail with permission-denied when the org user
    // document is missing.
    (async () => {
      try {
        if (workspaceId && organisationId && user?.id) {
          await ensureOrgUserRecord(user.id, organisationId, user as any);
        }
      } catch (e) {
        // Non-fatal; proceed without blocking attaching listeners
        // Debug logging removed
      }
    })();
    if (workspaceId && organisationId) {
      // Use org-aware collection paths to avoid invalid document references
      const notificationsPath = workspaceCollectionPath(workspaceId, 'notifications', organisationId);
      if (notificationsPath) {
        try {
          const notificationsCol = collection(db, notificationsPath);
          const q = fsQuery(notificationsCol, where('read', '==', false));
          unsub = onSnapshot(q, (snap: any) => {
            setUnreadNotifications(snap.size);
          }, (err: any) => {
            console.error('Failed to listen for unread notifications', err);
            // Don't set unsub here as it might cause issues
          });
        } catch (e) {
          console.error('Failed to attach notifications listener (invalid path?)', e);
        }
      }

      // Listen for latest daily checkin entry using collection->doc pattern
      try {
        const dailyPath = workspaceCollectionPath(workspaceId, 'daily-checkins', organisationId);
        if (dailyPath) {
          const dailyCol = collection(db, dailyPath);
          const dailyQ = fsQuery(dailyCol, orderBy('createdAt', 'desc'), limit(1));
          dailyUnsub = onSnapshot(dailyQ, (snap) => {
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              setDailyEntry({ id: docSnap.id, ...docSnap.data() });
            } else {
              setDailyEntry(null);
            }
          }, (err) => {
            console.error('Failed to listen to daily-checkins', err);
            // Reset daily entry on error to avoid stale state
            setDailyEntry(null);
          });
        }
      } catch (e) {
        console.error('Failed to attach daily-checkins listener', e);
      }
    } else {
      setUnreadNotifications(0);
      setDailyEntry(null);
    }
    return () => {
      if (unsub) unsub();
      if (dailyUnsub) dailyUnsub();
      if (typeof window !== 'undefined') {
        try { window.removeEventListener('chat-response', handleChatResponse as EventListener); } catch (e) {}
      }
    };
  }, [workspaces, workspaceId, organisationId]);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for auth hydration so we have server-side user.organisationId available
      if (authLoading) return;
      if (!user) return;
      setLoading(true);
      
  // Pass the server-hydrated organisationId to avoid client-side reads that may be denied
  const orgId = (user as any)?.organisationId;
  let userWorkspaces = await getWorkspacesForUser(user.id, orgId || undefined);

      // If we were redirected from accept-invite (just signed in via magic-link),
      // wait a short while for admin writes (workspace.members updates) to become visible.
      const awaiting = typeof window !== 'undefined' ? window.localStorage.getItem('awaitingWorkspace') : null;
      if (awaiting === '1' && Array.isArray(userWorkspaces) && userWorkspaces.length === 0) {
        // Poll until workspace appears or timeout (5s, 500ms intervals)
        const start = Date.now();
        const timeout = 5000;
        const interval = 500;
        while (Date.now() - start < timeout) {
          await new Promise(r => setTimeout(r, interval));
          try {
            const refreshed = await getWorkspacesForUser(user.id, orgId || undefined);
            if (Array.isArray(refreshed) && refreshed.length > 0) {
              userWorkspaces = refreshed;
              break;
            }
          } catch (e) {
            // ignore and retry
          }
        }
        try { if (typeof window !== 'undefined') window.localStorage.removeItem('awaitingWorkspace'); } catch (e) {}
      }
      
      // Only create a workspace if we are sure the user has none and the query did not fail due to permissions
      if (Array.isArray(userWorkspaces) && userWorkspaces.length === 0) {
        // Add a guard: check if this is the first load, and not a refresh after a failed query
        // Optionally, check for a flag in localStorage/sessionStorage to avoid repeated creation
        if (!window.localStorage.getItem('workspaceCreated')) {
          try {
            const newWorkspace = await handleCreateWorkspace(`${user.name || 'My'}'s Workspace`);
            userWorkspaces = [newWorkspace];
            window.localStorage.setItem('workspaceCreated', 'true');
          } catch (err) {
            console.error('Workspace creation failed:', err);
          }
        } else {
          console.warn('Workspace creation skipped: already attempted in this session.');
        }
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

      // If accept-invite stored an assignedWorkspaceId, prefer that workspace when selecting
      let assignedWorkspaceId: string | null = null;
      try { if (typeof window !== 'undefined') assignedWorkspaceId = window.localStorage.getItem('assignedWorkspaceId'); } catch (e) { assignedWorkspaceId = null; }

  try {
    // Debug logging removed: previously logged fetched workspace ids for debugging
  } catch(e) {}
  setWorkspaces(userWorkspaces);
      if (assignedWorkspaceId) {
        const found = userWorkspaces.find(ws => ws.id === assignedWorkspaceId) || null;
        if (found) {
          setActiveWorkspace(found);
        } else {
          setActiveWorkspace(userWorkspaces[0]);
        }
        try { if (typeof window !== 'undefined') window.localStorage.removeItem('assignedWorkspaceId'); } catch (e) {}
      } else {
        setActiveWorkspace(userWorkspaces[0]);
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Add event listener for document navigation from chat
  useEffect(() => {
    // Listen for hash changes so we can restore state when user presses back
    const handleHashChange = () => {
      try {
        const currentHash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
        const known = docHashRef.current || (typeof window !== 'undefined' ? (window as any).__docuflow_doc_hash : null);
        if (known && currentHash !== known) {
          // Clear stored markers
          docHashRef.current = null;
          try { if (typeof window !== 'undefined') { (window as any).__docuflow_doc_hash = null; } } catch (e) {}
          // Only switch back to policies if we're currently showing files
          // (i.e., the document view). This avoids surprising behaviour.
          setSelected(null);
          setView('policies');
        }
      } catch (e) {
        // ignore
      }
    };

  if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange);
    }

    const handleDocumentNavigation = async (event: CustomEvent) => {
      const { documentId, documentName, policyFile } = event.detail || {};

      // If a policyFile is provided, open the policy PDF as a synthetic Document inside the app
      if (policyFile) {
        if (!activeWorkspace) return; // require an active workspace to show DocumentView

        // Try to load the published policy metadata from the server so we can prefer
        // the signed pdfPath/storagePath that admin UI uses. Fall back to the
        // public /policies/... path if nothing is available.
        let resolvedDownloadUrl: string | undefined = undefined;
        let resolvedStoragePath: string | undefined = undefined;
        try {
          const baseName = policyFile.replace(/\.pdf$/i, '');
          const searchResp = await fetch('/api/policies/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: baseName }),
          });
          if (searchResp.ok) {
            const json = await searchResp.json();
            const results = json.results || [];
            // Try to find an exact id match first
            const exact = results.find((r: any) => (r.id === baseName) || (r.policyName === baseName));
            const policyData = exact || results[0];
            if (policyData) {
              // prefer pdfPath (signed/public URL) then storagePath
              if (policyData.pdfPath) resolvedDownloadUrl = policyData.pdfPath;
              if (!resolvedDownloadUrl && policyData.downloadUrl) resolvedDownloadUrl = policyData.downloadUrl;
              if (policyData.storagePath) resolvedStoragePath = policyData.storagePath;
            }
          }
        } catch (e) {
          // ignore and fall back to public path
        }

        const doc: Document = {
          id: `policy:${policyFile}`,
          name: documentName || policyFile.replace(/[-_]/g, ' ').replace('.pdf', ''),
          type: 'document',
          fileType: 'pdf',
          createdAt: new Date().toISOString(),
          owner: user || { id: 'system', name: 'Policy Library', email: null, avatarUrl: null },
          workspaceId: activeWorkspace.id,
          folderId: null,
          // Prefer the signed/pdfPath if the server returned one; otherwise fall back to the public path
          downloadUrl: resolvedDownloadUrl || `/policies/${policyFile}`,
          storagePath: resolvedStoragePath,
        } as Document;

  setLastChatDetail(undefined);
  // store where we came from so the back button returns there
  prevViewRef.current = view || 'home';
  setSelected(doc as Document);
  setView('files');

        // Add a small hash marker so the browser back button can return
        // to the policies view. We use a predictable prefix so it's easy
        // to recognise in hashchange handler. We don't want to interfere
        // with Next.js router history entries.
        try {
          if (typeof window !== 'undefined') {
            const marker = `docuflow:policy:${policyFile}`;
            // set hash so back button will change it
            window.location.hash = marker;
            // remember marker locally so handler can compare
            docHashRef.current = marker;
            try { (window as any).__docuflow_doc_hash = marker; } catch (e) {}
          }
        } catch (e) {
          // ignore
        }

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

        // Also notify other parts of the UI (chat panel, policies page, etc.) that
        // this document is now the active document. Persist to sessionStorage so
        // components mounted after navigation can restore the active doc.
        try {
          if (typeof window !== 'undefined') {
            try {
              window.dispatchEvent(new CustomEvent('set-active-document', {
                detail: {
                  documentId: document.id,
                  documentName: document.name,
                  documentData: document,
                }
              }));
            } catch (e) {
              // best-effort - ignore
            }

            try {
              if (window.sessionStorage) {
                window.sessionStorage.setItem('docuflow.activeDocument', JSON.stringify(document));
              }
            } catch (e) {
              // ignore storage errors
            }
          }
        } catch (e) {
          // ignore
        }

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
      // EventListener must be synchronous and accept Event. wrap the async
      // handler so we can call it and catch errors. Keep a stable reference
      // so removeEventListener can unregister it later.
      const navListener = (ev: Event) => {
        void handleDocumentNavigation(ev as CustomEvent).catch((err) => {
          console.error('navigate-to-document handler error', err);
        });
      };

      window.addEventListener('navigate-to-document', navListener as EventListener);
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

      // Listen for navigate-to-rotas events from staffing card
      const handleRotasNavigation = (ev: CustomEvent) => {
        setView('rotas');
      };

      window.addEventListener('navigate-to-rotas', handleRotasNavigation as EventListener);

      // Listen for navigate-to-appraisals events from chat
      const handleAppraisalsNavigation = (ev: CustomEvent) => {
        setView('appraisals');
      };

      window.addEventListener('navigate-to-appraisals', handleAppraisalsNavigation as EventListener);

      // Listen for navigate-to-action-plans events from chat
      const handleActionPlansNavigation = (ev: CustomEvent) => {
        setView('action-plans');
      };

      window.addEventListener('navigate-to-action-plans', handleActionPlansNavigation as EventListener);

      // Listen for navigate-to-folder events (e.g. from the Lessons/RCA page)
      const handleNavigateToFolder = (ev: CustomEvent) => {
        const { folderId } = ev.detail || {};
        if (!folderId || !activeWorkspace) return;
        // Find the folder in the workspace and select it
        const folder = findItemById(activeWorkspace.folders, folderId);
        if (folder && folder.type === 'folder') {
          setSelected(folder);
          setView('files');
        }
      };

      window.addEventListener('navigate-to-folder', handleNavigateToFolder as EventListener);

      // Listen for navigate-to-admin events from chat
      const handleAdminNavigation = (ev: CustomEvent) => {
        setView('settings'); // Admin functionality is under settings
      };

      window.addEventListener('navigate-to-admin', handleAdminNavigation as EventListener);

      // Listen for navigate-to-dashboard events from chat
      const handleDashboardNavigation = (ev: CustomEvent) => {
        setView('home');
      };

      window.addEventListener('navigate-to-dashboard', handleDashboardNavigation as EventListener);

      // Listen for navigate-to-policies events from chat
      const handlePoliciesNavigation = (ev: CustomEvent) => {
        setView('policies');
      };

      window.addEventListener('navigate-to-policies', handlePoliciesNavigation as EventListener);

      const handleJournalNavigation = (ev: CustomEvent) => {
        setView('journal');
      };

      window.addEventListener('navigate-to-journal', handleJournalNavigation as EventListener);

      return () => {
        window.removeEventListener('navigate-to-document', navListener as EventListener);
        window.removeEventListener('navigate-to-workspace', handleWorkspaceNavigation as EventListener);
        window.removeEventListener('navigate-to-audits', handleAuditsNavigation as EventListener);
        window.removeEventListener('navigate-to-rotas', handleRotasNavigation as EventListener);
        window.removeEventListener('navigate-to-appraisals', handleAppraisalsNavigation as EventListener);
        window.removeEventListener('navigate-to-action-plans', handleActionPlansNavigation as EventListener);
        window.removeEventListener('navigate-to-admin', handleAdminNavigation as EventListener);
        window.removeEventListener('navigate-to-dashboard', handleDashboardNavigation as EventListener);
        window.removeEventListener('navigate-to-policies', handlePoliciesNavigation as EventListener);
        window.removeEventListener('navigate-to-journal', handleJournalNavigation as EventListener);
        try { window.removeEventListener('hashchange', handleHashChange); } catch (e) {}
        try { delete (window as any).__docuflow_set_doc_hash; } catch (e) {}
        try { delete (window as any).__docuflow_doc_hash; } catch (e) {}
      };
    }
  // Include view/user/workspaces so handlers capture the latest state (avoid stale closures)
  // Use stable primitive dependencies so the dependency array length stays constant
  }, [workspaceId, view, user?.id, workspaces.length]);

  const handleCreateWorkspace = async (name: string): Promise<Workspace> => {
    if (!user) throw new Error("User not authenticated");
    const newWorkspaceData: Omit<Workspace, 'id' | 'folders'> = {
        name: name,
        ownerId: user.id,
        members: [user.id],
    };
    // Pass the organisationId if available to prefer org-scoped workspaces
    const orgId = (user as any)?.organisationId;
    const newWorkspace = await createWorkspace(newWorkspaceData, orgId || undefined);
    
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
      const orgIdForDelete = document.organisationId ?? activeWorkspace.organisationId ?? null;
      await deleteDocument(activeWorkspace.id, document.id, orgIdForDelete);
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
      throw error;
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
    // All folders can now be deleted

    try {
        await deleteFolder(activeWorkspace.id, folder.id, organisationId);
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
        // Re-throw the error so the UI can handle it
        throw error;
    }
  };

  // Evidence document delete now uses generic handlers (evidence removed)

  const getRootFolder = (): Folder => {
    // Always return a Folder object so downstream UI can render safely even
    // when the activeWorkspace hasn't hydrated yet.
    return {
      id: 'root',
      name: activeWorkspace?.name || 'Workspace',
      type: 'folder',
      items: activeWorkspace?.folders || [],
      workspaceId: activeWorkspace?.id || '',
    } as Folder;
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


  if (loading) {
    return <LoadingDashboard />;
  }

  // NOTE: Do not early-return when there's no activeWorkspace. We render the full
  // dashboard layout so invited users (who may not have a hydrated activeWorkspace
  // immediately) still see the app UI. The app will select an active workspace
  // once workspaces are loaded.

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
      return (
        <FeatureGuard feature="dashboard" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          <DashboardHome 
            workspace={activeWorkspace} 
            onSelect={handleSelect} 
            onDocumentAdd={handleDocumentAdd} 
            onFolderAdd={handleFolderAdd} 
          />
        </FeatureGuard>
      );
        case 'daily':
            return (
                <FeatureGuard feature="dailyCheckins" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const DailyPage = require("./daily").default;
                      return <DailyPage workspaceId={activeWorkspace?.id} />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
    case 'teams':
      return (
        <FeatureGuard feature="teams" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {activeWorkspace ? <TeamsView workspace={activeWorkspace} /> : <div className="p-6">No workspace</div>}
        </FeatureGuard>
      );
    case 'settings':
      return (
        <FeatureGuard feature="settings" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {activeWorkspace ? <SettingsView workspace={activeWorkspace} /> : <div className="p-6">No workspace</div>}
        </FeatureGuard>
      );
    case 'accessibility':
      return (
        <FeatureGuard feature="accessibility" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {activeWorkspace ? (
            <React.Suspense fallback={<div>Loading...</div>}>
              {(() => {
                const AccessibilityViewComp = require("./accessibility-view").default;
                return <AccessibilityViewComp workspace={activeWorkspace} />;
              })()}
            </React.Suspense>
          ) : <div className="p-6">No workspace</div>}
        </FeatureGuard>
      );
    case 'help':
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          {(() => {
            const HelpPage = require("@/app/(protected)/help/page").default;
            return <HelpPage />;
          })()}
        </React.Suspense>
      );
    case 'notifications':
      return (
        <FeatureGuard feature="notifications" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {workspaceId ? <NotificationsView workspaceId={workspaceId} onBack={() => setView('home')} /> : <div className="p-6">No workspace</div>}
        </FeatureGuard>
      );
    case 'documents':
      return activeWorkspace ? (
        <AllDocumentsView 
          key={activeWorkspace.folders.map(f=>f.id).join('-') + '-' + activeWorkspace.folders.length}
          workspace={activeWorkspace} 
          onSelect={handleSelect} 
        />
      ) : <div className="p-6">No workspace</div>;
    case 'tags':
      return (
        <FeatureGuard feature="tags" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {activeWorkspace ? <TagsView workspace={activeWorkspace} onSelectDocument={handleSelect} /> : <div className="p-6">No workspace</div>}
        </FeatureGuard>
      );
    case 'renewals':
      return (
        <FeatureGuard feature="renewals" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {workspaceId ? <RenewalsView workspaceId={workspaceId} onSelectDocument={handleSelect} /> : null}
        </FeatureGuard>
      );
  /* Outstanding Evidence removed; evidence folders are part of main folders */
    case 'files':
      return (
        <FeatureGuard feature="files" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          {selected?.type === "document" ? (() => {
                // Use a custom onBack that prefers prevViewRef (if set) to return
                // the user to the Policies page when they opened a policy from there.
                const onDocBack = () => {
                  if (prevViewRef.current === 'policies') {
                    setSelected(null);
                    setView('policies');
                    prevViewRef.current = null;
                  } else {
                    handleBackToFileBrowser();
                  }
                };
                return <DocumentView document={selected} onBack={onDocBack} responseDetail={lastChatDetail} isChatOpen={isChatOpen} />;
            })() : (
        <FileBrowser
          key={activeWorkspace ? activeWorkspace.folders.map(f=>f.id).join('-') + '-' + activeWorkspace.folders.length : 'no-ws'}
          folder={currentFolder as Folder}
          onSelect={handleSelect}
          onDocumentAdd={handleDocumentAdd}
          onFolderAdd={handleFolderAdd}
          onFolderDelete={handleFolderDelete}
          onDocumentDelete={handleDocumentDelete}
          onDocumentUpdate={handleDocumentUpdate}
          breadcrumb={breadcrumb}
          onBreadcrumbClick={handleBreadcrumbClick}
          organisationId={organisationId || null}
        />
      )}
        </FeatureGuard>
      );
        case 'dependency-calculator':
            return (
                <FeatureGuard feature="dependencyCalculator" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const DependencyCalculatorPage = require("@/app/(protected)/dashboard/dependency-calculator/page").default;
                      return <DependencyCalculatorPage />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
        case 'audits':
            return (
                <FeatureGuard feature="audits" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const AuditsPage = require("@/app/audits/page").default;
                      return <AuditsPage />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
    case 'stats':
      return (
        <FeatureGuard feature="stats" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          <StatsView workspaceId={workspaceId ?? undefined} organisationId={organisationId ?? undefined} />
        </FeatureGuard>
      );
        case 'policies':
            return (
                <FeatureGuard feature="policies" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const PoliciesPage = require("@/app/policies/page").default;
                      return <PoliciesPage />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
    case 'journal':
      return (
        <FeatureGuard feature="journal" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
          <React.Suspense fallback={<div>Loading...</div>}>
            {(() => {
              const JournalPage = require('@/app/(protected)/journal/page').default;
              return <JournalPage />;
            })()}
          </React.Suspense>
        </FeatureGuard>
      );
        case 'appraisals':
            return (
                <FeatureGuard feature="appraisals" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const AppraisalsPage = require("@/app/(protected)/appraisals/page").default;
                      return <AppraisalsPage />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
        case 'action-plans':
            return (
                <FeatureGuard feature="actionPlans" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const ActionPlansPage = require("@/app/(protected)/action-plans/page").default;
                      return <ActionPlansPage />;
                    })()}
                  </React.Suspense>
                </FeatureGuard>
            );
        case 'rotas':
            return (
              <FeatureGuard feature="rotas" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
                {activeWorkspace ? (
                  <React.Suspense fallback={<div>Loading...</div>}>
                    {(() => {
                      const { RotasView } = require("@/components/rotas/rotas-view");
                      return <RotasView workspace={activeWorkspace} />;
                    })()}
                  </React.Suspense>
                ) : (
                  <div className="container mx-auto py-8 px-4">
                    <div className="text-center">
                      <p className="text-muted-foreground">Please select a workspace to view rotas</p>
                    </div>
                  </div>
                )}
              </FeatureGuard>
            );
      case 'lessons-rcas':
        return (
          <FeatureGuard feature="lessonsRcas" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
            <React.Suspense fallback={<div>Loading...</div>}>
              {(() => {
                const LessonsPage = require('@/app/(protected)/lessons-rcas/page').default;
                return <LessonsPage />;
              })()}
            </React.Suspense>
          </FeatureGuard>
        );
      case 'risk-assessment':
        return (
          <FeatureGuard feature="riskAssessment" organisationId={organisationId} workspaceId={workspaceId} onNavigateBack={() => setView('home')}>
            <React.Suspense fallback={<div>Loading...</div>}>
              {(() => {
                const RiskAssessmentPage = require('@/app/(protected)/risk-assessment/page').default;
                return <RiskAssessmentPage />;
              })()}
            </React.Suspense>
          </FeatureGuard>
        );
      case 'cqc-logs':
        return (
          <FeatureGuard feature="lessonsRcas" organisationId={organisationId} onNavigateBack={() => setView('home')}>
            <React.Suspense fallback={<div>Loading...</div>}>
              {(() => {
                const CqcLogsPage = require("@/app/(protected)/cqc-logs/page").default;
                return <CqcLogsPage />;
              })()}
            </React.Suspense>
          </FeatureGuard>
        );
      case 'safeguarding-logs':
        return (
          <FeatureGuard feature="lessonsRcas" organisationId={organisationId} onNavigateBack={() => setView('home')}>
            <React.Suspense fallback={<div>Loading...</div>}>
              {(() => {
                const SafeguardingLogsPage = require("@/app/(protected)/safeguarding-logs/page").default;
                return <SafeguardingLogsPage />;
              })()}
            </React.Suspense>
          </FeatureGuard>
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
            currentView={view}
            onGoToFiles={handleGoToFiles} 
            onCreateWorkspace={handleCreateWorkspace}
            dailyEntry={dailyEntry}
           />
        </Sidebar>

        <SidebarInset className="flex flex-col min-h-screen w-full">
                <TopNav
                  onSettingsClick={() => setView('settings')}
                  onNotificationsClick={() => setView('notifications')}
                  onHelpClick={() => setView('help')}
                  unreadCount={unreadNotifications}
                  workspaceId={workspaceId}
                  organisationId={organisationId}
                />
            <div className={cn(
              "flex-1 w-full",
              // Add bottom padding on mobile when chat is closed to ensure content isn't hidden behind chat button
              isMobile && !isChatOpen && isEnabled('chatPanel') && "pb-20"
            )}>
                {renderContent()}
            </div>
        </SidebarInset>

        {/* Chat Panel - Only render if feature is enabled */}
        {isEnabled('chatPanel') && (
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
                {selected !== null && (
                  <ChatPanel 
                    selectedItem={selected!}
                    organisationId={organisationId}
                    onFolderAdd={async (folderName: string) => {
                            if (!workspaceId) return;
                            const currentSelected = selected;
                            // parentId: if selected is folder, use its id, else root
                            const parentId = currentSelected && currentSelected.type === 'folder' ? currentSelected.id : 'root';
                            // Simulate folder creation as in FileBrowser/NewFolderDialog
                            const newFolderData = {
                              name: folderName,
                              type: 'folder' as const,
                              workspaceId: workspaceId,
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
                    disabled={!workspaceId}
                    aria-label="Open chat"
                  >
                    <MessageSquare className={cn(
                      isMobile ? "w-5 h-5" : "w-6 h-6"
                    )} />
                  </Button>
                </div>
              </TooltipTrigger>
              {!workspaceId && (
                <TooltipContent side={isMobile ? "top" : "left"}>
                    <p>Please create or select a workspace to use chat.</p>
                </TooltipContent>
              )}
            </Tooltip>
            )}
          </div>
        )}
        </TooltipProvider>
      </SidebarProvider>
    </WorkspaceContext.Provider>
  );
}
