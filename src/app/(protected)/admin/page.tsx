"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import AdminWorkspaceView from '@/components/admin/admin-workspace-view';
import { DocumentView } from '@/components/dashboard/document-view';
import { TeamsView } from '@/components/dashboard/teams-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, MapPin, BarChart2, Download, MessageSquare, X, ArrowLeft, BarChart3, TrendingUp, TrendingDown, Plus, MoreVertical, Edit, Trash2, Target, AlertTriangle } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from '@/components/dashboard/overview-cards';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Sparkline from '@/components/admin/sparkline';
import { ChatPanel } from '@/components/chat/chat-panel';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import type { Folder, Document } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      // not signed in
      router.push('/login');
      return;
    }
    // Simple client-side role check: we expect admin users to have role 'Admin' on their user doc
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const resp = await fetch('/api/admin/workspaces');
        if (!resp.ok) {
          console.error('Failed to fetch workspaces');
          setWorkspaces([]);
          return;
        }
        const data = await resp.json();
        setWorkspaces(data.workspaces || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };

    // Only fetch if current user looks like an admin (client-side). This is a convenience
    // check only; server must also protect this route in production.
    (async () => {
      try {
        if (!user) return;
        // read view param from URL (e.g., /admin?view=teams)
        try {
          const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const v = params?.get('view');
          if (v && ['home','files','documents','tags','teams','settings','renewals','accessibility','stats'].includes(v)) {
            setAdminView(v as any);
          }
        } catch (e) {
          // ignore
        }
        // fetch user record to check role
        const userResp = await fetch(`/api/users/${user.id}`);
        if (!userResp.ok) {
          // fallback: still fetch workspaces but warn
          await fetchData();
          return;
        }
        const userData = await userResp.json();
        // Allow dev-mode cookie 'isAdmin=1' as a fallback when the Firestore user
        // record doesn't have role set to 'Admin'. This mirrors the middleware
        // behaviour which also accepts the cookie when firebase-admin isn't
        // configured locally.
        const hasDevAdminCookie = typeof document !== 'undefined' && document.cookie.includes('isAdmin=1');
        if (userData?.role === 'Admin' || hasDevAdminCookie) {
          await fetchData();
        } else {
          // not an admin
          router.push('/');
        }
      } catch (e) {
        console.error(e);
        await fetchData();
      }
    })();
  }, [user, loading, router]);

  // Listen for navigate-to-workspace events (from admin chat) so chat can open a workspace
  React.useEffect(() => {
    const handleNavigateToWorkspace = (ev: any) => {
      const detail = ev?.detail || {};
      const id = detail.workspaceId;
      const name = detail.workspaceName;
      if (!id && !name) return;
      // find by id first, then by case-insensitive name
      let found = workspaces.find(w => w.id === id);
      if (!found && name) {
        found = workspaces.find(w => (w.name || '').toLowerCase() === String(name).toLowerCase());
      }
      if (found) {
        setSelectedWorkspace(found);
        setAdminView('home');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('navigate-to-workspace', handleNavigateToWorkspace as EventListener);
      // Listen for centralized navigation events emitted by the AdminLayout so
      // the page can react (close selected workspace/document when navigating
      // back to dashboard, etc.). This keeps layout-driven router.push in
      // sync with this page's local state.
      const handleAdminSetView = (ev: any) => {
        try {
          const v = ev?.detail?.view;
          if (!v) return;
          if (['home','files','documents','tags','teams','settings','renewals','accessibility','stats'].includes(v)) {
            setAdminView(v as any);
            // If navigating back to the top-level admin dashboard, clear the
            // selected workspace/document so AdminWorkspaceView closes.
            if (v === 'home') {
              setSelectedWorkspace(null);
              setSelectedDocument(null);
            }
            // If navigating to files view we keep selected workspace so the
            // files view can be shown if desired.
          }
        } catch (e) {
          // ignore
        }
      };
      window.addEventListener('admin-set-view', handleAdminSetView as EventListener);
      return () => window.removeEventListener('navigate-to-workspace', handleNavigateToWorkspace as EventListener);
    }
  }, [workspaces]);

  const [selectedWorkspace, setSelectedWorkspace] = React.useState<any | null>(null);
  const [selectedWorkspaceForTeams, setSelectedWorkspaceForTeams] = React.useState<any | null>(null);
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [lastChatDetail, setLastChatDetail] = React.useState<{ text?: string; documents?: any[] } | undefined>(undefined);
  type AdminViewType = 'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'stats';
  const [adminView, setAdminView] = React.useState<AdminViewType>('home');
  const [regionFilter, setRegionFilter] = React.useState<string[]>((['All']));
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const [newWorkspaceOwner, setNewWorkspaceOwner] = React.useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);
  
  // Rename workspace state
  const [isRenameWorkspaceOpen, setIsRenameWorkspaceOpen] = React.useState(false);
  const [renameWorkspaceData, setRenameWorkspaceData] = React.useState<{id: string, currentName: string} | null>(null);
  const [newRenameWorkspaceName, setNewRenameWorkspaceName] = React.useState('');
  const [isRenamingWorkspace, setIsRenamingWorkspace] = React.useState(false);
  
  // Delete workspace state
  const [isDeleteWorkspaceOpen, setIsDeleteWorkspaceOpen] = React.useState(false);
  const [deleteWorkspaceData, setDeleteWorkspaceData] = React.useState<{id: string, name: string} | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = React.useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = React.useState(false);

  // Client-side mount state to prevent hydration mismatches
  const [isMounted, setIsMounted] = React.useState(false);

  // Aggregate audit score state
  const [aggregateAuditData, setAggregateAuditData] = React.useState<{
    totalYesCount: number;
    totalQuestions: number;
    overallPercentage: number | null;
    auditsCompleted: number;
    totalAudits: number;
    workspacesWithData: number;
  }>({
    totalYesCount: 0,
    totalQuestions: 0,
    overallPercentage: null,
    auditsCompleted: 0,
    totalAudits: 0,
    workspacesWithData: 0
  });

  // Aggregate wounds data state
  const [aggregateWoundsData, setAggregateWoundsData] = React.useState<{
    total: number;
    pressure: number;
    break: number;
    fracture: number;
    bruise: number;
    skintear: number;
    workspacesWithData: number;
  }>({
    total: 0,
    pressure: 0,
    break: 0,
    fracture: 0,
    bruise: 0,
    skintear: 0,
    workspacesWithData: 0
  });

  // Helper: return a folder-like object for the selected workspace (chat expects a Folder)
  const getWorkspaceRootForChat = (ws: any) => ({ id: ws?.id || 'admin-root', name: ws?.name || 'Admin', type: 'folder' as const, items: ws?.folders || [], workspaceId: ws?.id || 'admin' });

  // Function to create a new workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !newWorkspaceOwner.trim()) {
      alert('Please provide both workspace name and owner ID');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const response = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          ownerId: newWorkspaceOwner.trim(),
          members: [newWorkspaceOwner.trim()],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      const data = await response.json();
      
      // Refresh the workspaces list
      const workspacesResponse = await fetch('/api/admin/workspaces');
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }

      // Reset form and close dialog
      setNewWorkspaceName('');
      setNewWorkspaceOwner('');
      setIsCreateWorkspaceOpen(false);

      alert(`Workspace "${data.workspace?.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  // Function to rename a workspace
  const handleRenameWorkspace = async () => {
    if (!renameWorkspaceData || !newRenameWorkspaceName.trim()) {
      alert('Please provide a valid workspace name');
      return;
    }

    setIsRenamingWorkspace(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${renameWorkspaceData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newRenameWorkspaceName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename workspace');
      }

      // Refresh the workspaces list
      const workspacesResponse = await fetch('/api/admin/workspaces');
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }

      // Reset form and close dialog
      setNewRenameWorkspaceName('');
      setRenameWorkspaceData(null);
      setIsRenameWorkspaceOpen(false);

      alert(`Workspace renamed to "${newRenameWorkspaceName.trim()}" successfully!`);
    } catch (error) {
      console.error('Error renaming workspace:', error);
      alert(`Failed to rename workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRenamingWorkspace(false);
    }
  };

  // Function to delete a workspace
  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspaceData || deleteConfirmationName.trim() !== deleteWorkspaceData.name) {
      alert('Please type the exact workspace name to confirm deletion');
      return;
    }

    setIsDeletingWorkspace(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${deleteWorkspaceData.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workspace');
      }

      // Refresh the workspaces list
      const workspacesResponse = await fetch('/api/admin/workspaces');
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json();
        setWorkspaces(workspacesData.workspaces || []);
      }

      // Reset form and close dialog
      setDeleteConfirmationName('');
      setDeleteWorkspaceData(null);
      setIsDeleteWorkspaceOpen(false);

      alert(`Workspace "${deleteWorkspaceData.name}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      alert(`Failed to delete workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  // Helper functions to open rename/delete dialogs
  const openRenameDialog = (workspace: any) => {
    setRenameWorkspaceData({ id: workspace.id, currentName: workspace.name || workspace.id });
    setNewRenameWorkspaceName(workspace.name || workspace.id);
    setIsRenameWorkspaceOpen(true);
  };

  const openDeleteDialog = (workspace: any) => {
    setDeleteWorkspaceData({ id: workspace.id, name: workspace.name || workspace.id });
    setDeleteConfirmationName('');
    setIsDeleteWorkspaceOpen(true);
  };

  // Function to calculate aggregate audit scores across all workspaces
  const calculateAggregateAuditScores = async () => {
    if (!workspaces || workspaces.length === 0) {
      setAggregateAuditData({
        totalYesCount: 0,
        totalQuestions: 0,
        overallPercentage: null,
        auditsCompleted: 0,
        totalAudits: 0,
        workspacesWithData: 0
      });
      return;
    }

    let totalYesCount = 0;
    let totalQuestions = 0;
    let totalAuditsCompleted = 0;
    let workspacesWithData = 0;

    const auditTypes = [
      'care-plan', 'health-safety', 'maintenance', 'restrictive-practice',
      'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen'
    ];

    try {
      // Fetch audit data for each workspace
      const auditPromises = workspaces.map(async (workspace: any) => {
        try {
          const auditRef = doc(db, `workspaces/${workspace.id}/settings`, 'audit_latest_scores');
          const auditSnap = await getDoc(auditRef);
          
          if (auditSnap.exists()) {
            const data = auditSnap.data();
            let workspaceYesCount = 0;
            let workspaceQuestions = 0;
            let workspaceAuditsCompleted = 0;

            auditTypes.forEach(auditType => {
              const auditData = data?.[auditType];
              if (auditData && typeof auditData.yesCount === 'number' && typeof auditData.totalCount === 'number') {
                workspaceYesCount += auditData.yesCount;
                workspaceQuestions += auditData.totalCount;
                workspaceAuditsCompleted += 1;
              }
            });

            if (workspaceQuestions > 0) {
              workspacesWithData += 1;
            }

            return {
              yesCount: workspaceYesCount,
              questions: workspaceQuestions,
              auditsCompleted: workspaceAuditsCompleted
            };
          }
          return { yesCount: 0, questions: 0, auditsCompleted: 0 };
        } catch (error) {
          console.warn(`Failed to fetch audit data for workspace ${workspace.id}:`, error);
          return { yesCount: 0, questions: 0, auditsCompleted: 0 };
        }
      });

      const results = await Promise.all(auditPromises);
      
      results.forEach(result => {
        totalYesCount += result.yesCount;
        totalQuestions += result.questions;
        totalAuditsCompleted += result.auditsCompleted;
      });

      const overallPercentage = totalQuestions > 0 ? Math.round((totalYesCount / totalQuestions) * 100) : null;

      setAggregateAuditData({
        totalYesCount,
        totalQuestions,
        overallPercentage,
        auditsCompleted: totalAuditsCompleted,
        totalAudits: auditTypes.length * workspaces.length,
        workspacesWithData
      });

    } catch (error) {
      console.error('Failed to calculate aggregate audit scores:', error);
      setAggregateAuditData({
        totalYesCount: 0,
        totalQuestions: 0,
        overallPercentage: null,
        auditsCompleted: 0,
        totalAudits: 0,
        workspacesWithData: 0
      });
    }
  };

  // Function to calculate aggregate wounds data across all workspaces
  const calculateAggregateWoundsData = async () => {
    if (!workspaces || workspaces.length === 0) {
      setAggregateWoundsData({
        total: 0,
        pressure: 0,
        break: 0,
        fracture: 0,
        bruise: 0,
        skintear: 0,
        workspacesWithData: 0
      });
      return;
    }

    let totalPressure = 0;
    let totalBreak = 0;
    let totalFracture = 0;
    let totalBruise = 0;
    let totalSkintear = 0;
    let workspacesWithData = 0;

    try {
      // Fetch wounds data from daily-checkins for each workspace
      const woundsPromises = workspaces.map(async (workspace: any) => {
        try {
          // Get daily-checkins from the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
          const q = query(colRef, where('createdAt', '>=', thirtyDaysAgo));
          const snaps = await getDocs(q);
          
          let workspacePressure = 0;
          let workspaceBreak = 0;
          let workspaceFracture = 0;
          let workspaceBruise = 0;
          let workspaceSkintear = 0;

          if (!snaps.empty) {
            snaps.forEach(snap => {
              const d: any = snap.data();
              const wounds = d.wounds?.types || {};
              
              workspacePressure += Number(wounds.pressure || 0);
              workspaceBreak += Number(wounds.break || 0);
              workspaceFracture += Number(wounds.fracture || 0);
              workspaceBruise += Number(wounds.bruise || 0);
              workspaceSkintear += Number(wounds.skintear || 0);
            });

            if (workspacePressure > 0 || workspaceBreak > 0 || workspaceFracture > 0 || workspaceBruise > 0 || workspaceSkintear > 0) {
              workspacesWithData += 1;
            }
          }

          return {
            pressure: workspacePressure,
            break: workspaceBreak,
            fracture: workspaceFracture,
            bruise: workspaceBruise,
            skintear: workspaceSkintear
          };
        } catch (error) {
          console.warn(`Failed to fetch wounds data for workspace ${workspace.id}:`, error);
          return { pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 };
        }
      });

      const results = await Promise.all(woundsPromises);
      
      results.forEach(result => {
        totalPressure += result.pressure;
        totalBreak += result.break;
        totalFracture += result.fracture;
        totalBruise += result.bruise;
        totalSkintear += result.skintear;
      });

      const total = totalPressure + totalBreak + totalFracture + totalBruise + totalSkintear;

      setAggregateWoundsData({
        total,
        pressure: totalPressure,
        break: totalBreak,
        fracture: totalFracture,
        bruise: totalBruise,
        skintear: totalSkintear,
        workspacesWithData
      });

    } catch (error) {
      console.error('Failed to calculate aggregate wounds data:', error);
      setAggregateWoundsData({
        total: 0,
        pressure: 0,
        break: 0,
        fracture: 0,
        bruise: 0,
        skintear: 0,
        workspacesWithData: 0
      });
    }
  };

  // Effect to calculate aggregate audit scores when workspaces change
  React.useEffect(() => {
    if (workspaces.length > 0) {
      calculateAggregateAuditScores();
      calculateAggregateWoundsData();
    }
  }, [workspaces]);

  // Set mounted state to prevent hydration mismatches
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Function to get gradient colors based on score percentage (copied from dashboard-home.tsx)
  const getGradientColors = (score: number | null) => {
    if (score === null) return { start: '#e5e7eb', end: '#cbd5e1' }; // Gray gradient for N/A
    if (score >= 80) return { start: '#34d399', end: '#059669' }; // Green gradient for high scores
    if (score >= 20) return { start: '#fbbf24', end: '#d97706' }; // Amber gradient for medium scores  
    return { start: '#f87171', end: '#dc2626' }; // Red gradient for low scores
  };

  // Function to get color based on score percentage (copied from dashboard-home.tsx)
  const getScoreColor = (score: number | null) => {
    if (score === null) return '#cbd5e1'; // Gray for N/A
    if (score >= 80) return '#10b981'; // Green for high scores (80%+)
    if (score >= 20) return '#f59e0b'; // Amber for medium scores (20-79%)
    return '#ef4444'; // Red for low scores (0-19%)
  };

  // Derived metrics from workspaces
  const aggregated = React.useMemo(() => {
    const fileTypeCounts: Record<string, number> = {};
    const recentUploads: Array<{ id: string; name: string; createdAt: string; workspaceName: string }> = [];
    const workspaceDocCounts: Array<{ id: string; name: string; count: number }> = [];
    let totalFolders = 0;
    let totalDocuments = 0;

    for (const ws of workspaces) {
      totalFolders += (ws.folders?.length || 0);
      let wsDocCount = 0;
      for (const folder of (ws.folders || [])) {
        for (const item of (folder.items || [])) {
          if (item.type === 'document') {
            wsDocCount += 1;
            totalDocuments += 1;
            const ft = item.fileType || 'unknown';
            fileTypeCounts[ft] = (fileTypeCounts[ft] || 0) + 1;
            recentUploads.push({ id: item.id, name: item.name, createdAt: item.createdAt, workspaceName: ws.name || ws.id });
          }
        }
      }
      workspaceDocCounts.push({ id: ws.id, name: ws.name || ws.id, count: wsDocCount });
    }

    recentUploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topFileTypes = Object.entries(fileTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topWorkspaces = workspaceDocCounts.sort((a, b) => b.count - a.count).slice(0, 5);

    // Build region map
    const regions: Record<string, { workspaces: any[]; totalFolders: number; totalDocuments: number }> = {};
    for (const ws of workspaces) {
      const region = ws.region || 'Unspecified';
      if (!regions[region]) regions[region] = { workspaces: [], totalFolders: 0, totalDocuments: 0 };
      regions[region].workspaces.push(ws);
      regions[region].totalFolders += (ws.folders?.length || 0);
      // count docs in ws
      let wsDocs = 0;
      for (const folder of (ws.folders || [])) {
        for (const item of (folder.items || [])) {
          if (item.type === 'document') wsDocs += 1;
        }
      }
      regions[region].totalDocuments += wsDocs;
    }

    // build last 30 days timeline
    const days = 30;
    const today = new Date();
    const timelineLabels: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      timelineLabels.push(d.toISOString().slice(0, 10));
    }

    const timelineCounts = timelineLabels.map(label => recentUploads.filter(r => r.createdAt.slice(0, 10) === label).length);

    return { fileTypeCounts, topFileTypes, recentUploads: recentUploads.slice(0, 10), topWorkspaces, totalFolders, totalDocuments, regions, timelineLabels, timelineCounts };
  }, [workspaces]);

  const filteredWorkspaces = React.useMemo(() => {
    if (!aggregated || !aggregated.regions) return workspaces;
    if (regionFilter.includes('All') || regionFilter.length === 0) return workspaces;
    const set = new Set(regionFilter);
    const res: any[] = [];
    for (const r of Object.keys(aggregated.regions)) {
      if (set.has(r)) res.push(...(aggregated.regions[r].workspaces || []));
    }
    return res;
  }, [aggregated, regionFilter, workspaces]);

  // Listen for chat responses and navigate-to-document events so the admin
  // area can open DocumentView when requested by the AdminChatPanel.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChatResponse = (event: any) => {
      const detail = event?.detail;
      if (detail && (typeof detail.text === 'string' || Array.isArray(detail.documents))) {
        setLastChatDetail({ text: detail.text, documents: detail.documents || [] });
      }
    };

  const handleDocumentNavigation = async (event: CustomEvent) => {
      const { documentId, documentName } = event.detail || {};
      if (!selectedWorkspace) return;

      const findDocument = (items: (Folder | Document)[]): Document | null => {
        for (const item of items) {
          if ((item as any).type === 'document' && (item as Document).id === documentId) {
            return item as Document;
          }
          if ((item as any).type === 'folder') {
            const found = findDocument((item as Folder).items || []);
            if (found) return found;
          }
        }
        return null;
      };

      const document = findDocument(selectedWorkspace.folders || []);
      if (document) {
        setLastChatDetail(undefined);
        setSelectedDocument(document as Document);
        setAdminView('files');
        try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId } })); } catch (e) {}
      } else {
        // Attempt cross-workspace resolution via server-side search
        try {
          const q = documentId || documentName || '';
          if (q) {
            const resp = await fetch('/api/search-documents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: q, searchAll: true }),
            });
            if (resp.ok) {
              const json = await resp.json();
              const results = json?.results || [];
              const best = results[0];
              if (best) {
                // best should contain workspaceId and document fields returned by searchDocumentsInWorkspace
                const wsId = best.workspaceId || best.workspace || null;
                // Try to find the workspace in our loaded list and set it active so UI context matches
                const ws = workspaces.find(w => w.id === wsId) || null;
                if (ws) setSelectedWorkspace(ws);

                // Normalize document object to our Document type shape as much as possible
                const docObj: Document = {
                  id: best.id || best.documentId || best.document_id || '',
                  name: best.name || best.title || best.documentName || '',
                  type: 'document',
                  fileType: best.fileType || (best.name && best.name.split('.').pop()?.toLowerCase() as any) || 'pdf',
                  createdAt: best.createdAt || new Date().toISOString(),
                  owner: best.owner || { id: best.ownerId || 'unknown', name: best.ownerName || 'Unknown', email: null, avatarUrl: null },
                  extractedJson: best.extractedJson || best.documentJson || best.extracted || undefined,
                  summary: best.summary || undefined,
                  embedding: best.embedding || undefined,
                  workspaceId: wsId || undefined,
                  folderId: best.folderId || best.folder_id || null,
                  storagePath: best.storagePath || best.path || undefined,
                  tags: best.tags || undefined,
                  renewalDate: best.renewalDate || undefined,
                } as Document;

                setLastChatDetail(undefined);
                setSelectedDocument(docObj);
                setAdminView('files');
                try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: docObj.id } })); } catch (e) {}
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Cross-workspace document lookup failed', e);
        }

        console.warn(`Document ${documentId} (${documentName}) not found in selected workspace`);
        try { window.alert(`Document "${documentName || documentId}" not found in the selected workspace.`); } catch (e) {}
      }
    };

    // Create wrappers so we can register EventListener (non-async) while delegating
    // to our async handler for the navigate event.
    const navWrapper = (evt: Event) => {
      try {
        // Cast to CustomEvent to access .detail
        handleDocumentNavigation(evt as CustomEvent).catch((err) => console.error('navigate handler error', err));
      } catch (e) {
        console.error('navigate-to-document wrapper error', e);
      }
    };

    window.addEventListener('chat-response', handleChatResponse as EventListener);
    window.addEventListener('navigate-to-document', navWrapper as EventListener);

    return () => {
      try { window.removeEventListener('chat-response', handleChatResponse as EventListener); } catch (e) {}
      try { window.removeEventListener('navigate-to-document', navWrapper as EventListener); } catch (e) {}
    };
  }, [selectedWorkspace]);

  // Care-homes style overview: total beds, occupied and average occupancy
  const careOverview = React.useMemo(() => {
    if (!workspaces || workspaces.length === 0) return { totalHomes: 0, totalBeds: 0, totalOccupied: 0, averageOccupancy: 0 };

    const homesWithBeds = workspaces.filter(w => typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number');
    const totalBeds = homesWithBeds.reduce((s, w) => s + (w.totalBeds || 0), 0);
    const totalOccupied = homesWithBeds.reduce((s, w) => s + (w.occupiedBeds || 0), 0);

    // For homes without explicit bed counts, use occupancy percentage if available
    const homesWithPercentage = workspaces.filter(w => !(typeof w.totalBeds === 'number' && typeof w.occupiedBeds === 'number') && typeof w.occupancy === 'number');
    const percentageOccupancy = homesWithPercentage.length ? (homesWithPercentage.reduce((s, w) => s + (w.occupancy || 0), 0) / homesWithPercentage.length) : 0;

    const averageOccupancy = totalBeds > 0 ? (totalOccupied / totalBeds) : percentageOccupancy;

    return { totalHomes: workspaces.length, totalBeds, totalOccupied, averageOccupancy };
  }, [workspaces]);

  return (
    <>
      <div className="p-6">
        {/* Simple header */}
        {!selectedWorkspace ? (
          // Top-level switch for admin views
          adminView === 'teams' ? (
            // Teams admin view
            <>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                  {selectedWorkspaceForTeams ? (
                    // Show the full TeamsView for a selected workspace with a header/back button
                    <div className="h-[calc(100vh-64px)] flex flex-col">
                      <header className="bg-background p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedWorkspaceForTeams(null)}>
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col">
                            <div className="text-lg font-semibold">Teams — {selectedWorkspaceForTeams.name || selectedWorkspaceForTeams.id}</div>
                            <div className="text-sm text-muted-foreground">Manage teams and permissions for this workspace</div>
                          </div>
                        </div>
                        <div />
                      </header>
                      <main className="flex-1 overflow-y-auto">
                        <TeamsView workspace={selectedWorkspaceForTeams} />
                      </main>
                    </div>
                  ) : (
                    // Show workspaces list with Manage Teams button
                    <>
                      {workspaces.length === 0 ? (
                        <div className="rounded border p-6 text-center text-muted-foreground">No workspaces found.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredWorkspaces.map((ws: any) => (
                            <Card key={ws.id} className={cn('hover:shadow-lg transition-shadow', ws.region ? '' : 'opacity-90') }>
                              <CardHeader className="flex items-center justify-between w-full px-4 py-3 rounded-t-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                                <div className="flex-1 min-w-0 text-lg font-semibold truncate text-left">{ws.name || ws.id}</div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge variant="secondary">{ws.folders?.length || 0} folders</Badge>
                                  <Button onClick={() => setSelectedWorkspaceForTeams(ws)}>Manage Teams</Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openRenameDialog(ws)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => openDeleteDialog(ws)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="mt-2 text-sm text-muted-foreground space-y-2">
                                  {(ws.folders || []).slice(0, 6).map((f: any) => (
                                    <div key={f.id} className="flex items-center justify-between">
                                      <div className="truncate">{f.name}</div>
                                      <div className="text-xs text-muted-foreground">{(f.items || []).filter((it: any) => it.type === 'document').length} docs</div>
                                    </div>
                                  ))}
                                  {(ws.folders || []).length > 6 && <div className="text-xs text-muted-foreground">And more...</div>}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : adminView === 'stats' ? (
            // Stats admin view
            <>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                  {/* Overview Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium">Total Workspaces</div>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{workspaces.length}</div>
                        <p className="text-xs text-muted-foreground">
                          Active organisations
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium">Total Documents</div>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{aggregated.totalDocuments}</div>
                        <p className="text-xs text-muted-foreground">
                          Across all workspaces
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium">Total Folders</div>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{aggregated.totalFolders}</div>
                        <p className="text-xs text-muted-foreground">
                          Organisation units
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="text-sm font-medium">Avg Occupancy</div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{Math.round((careOverview.averageOccupancy || 0) * 100)}%</div>
                        <p className="text-xs text-muted-foreground">
                          {careOverview.totalOccupied}/{careOverview.totalBeds} beds
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts and Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Document Upload Timeline */}
                    <Card>
                      <CardHeader>
                        <div className="text-lg font-semibold">Document Upload Trend</div>
                        <div className="text-sm text-muted-foreground">Last 30 days</div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-end justify-center">
                          <Sparkline values={aggregated.timelineCounts} width={400} height={200} />
                        </div>
                      </CardContent>
                    </Card>

                    {/* File Type Distribution */}
                    <Card>
                      <CardHeader>
                        <div className="text-lg font-semibold">File Type Distribution</div>
                        <div className="text-sm text-muted-foreground">Most common document types</div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aggregated.topFileTypes.map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                <span className="text-sm font-medium">{type.toUpperCase()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-muted-foreground">{count} files</div>
                                <div className="text-xs text-muted-foreground">
                                  ({Math.round((count / aggregated.totalDocuments) * 100)}%)
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Regional Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Regional Distribution */}
                    <Card>
                      <CardHeader>
                        <div className="text-lg font-semibold">Regional Distribution</div>
                        <div className="text-sm text-muted-foreground">Workspaces by region</div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(aggregated.regions || {}).map(([region, data]) => (
                            <div key={region} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{region}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                  {data.workspaces.length} workspaces
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {data.totalDocuments} docs
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Performing Workspaces */}
                    <Card>
                      <CardHeader>
                        <div className="text-lg font-semibold">Top Workspaces</div>
                        <div className="text-sm text-muted-foreground">By document count</div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aggregated.topWorkspaces.slice(0, 8).map((workspace, index) => (
                            <div key={workspace.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm font-medium truncate">{workspace.name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {workspace.count} documents
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </>
          ) : (
            // Default dashboard / files view (unchanged)
            <>
              {loadingData ? (
                <div>Loading...</div>
              ) : (
                <>
                      {/* Dark hero header like workspace view */}
                      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-b-lg shadow-sm mb-6">
                        <div className="w-full mx-auto flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/5 rounded-md">
                              <Users className="w-10 h-10 text-white/90" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold leading-tight">Admin Dashboard</h2>
                              <div className="mt-1 text-sm text-slate-200">Admin overview · {workspaces.length} workspaces · {aggregated.totalFolders} folders · {aggregated.totalDocuments} documents</div>
                              <div className="mt-3 flex items-center gap-2">
                                <Button size="sm" onClick={() => { /* noop for now */ }}>Refresh</Button>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-4">
                            <div className="grid grid-cols-4 gap-3">
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Workspaces</div>
                                  <div className="text-lg font-semibold">{workspaces.length}</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Folders</div>
                                  <div className="text-lg font-semibold">{aggregated.totalFolders}</div>
                                </div>
                              </div>
                              <div className="p-3 bg-white/5 rounded flex items-center gap-3">
                                <div>
                                  <div className="text-xs text-slate-300">Documents</div>
                                  <div className="text-lg font-semibold">{aggregated.totalDocuments}</div>
                                </div>
                              </div>
                              <div className="p-4 bg-white/6 rounded-lg flex items-center gap-4 shadow-md">
                                <div className="flex items-center justify-center w-16 h-16 bg-white/5 rounded-full">
                                  <OccupancyPie percent={Math.round((careOverview.averageOccupancy || 0) * 100)} size={64} strokeWidth={8} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs text-slate-300">Overall Occupancy</div>
                                  <div className="text-2xl font-bold leading-tight text-white">{Math.round((careOverview.averageOccupancy || 0) * 100)}%</div>
                                  <div className="text-sm text-slate-200">{careOverview.totalOccupied}/{careOverview.totalBeds} beds</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <BarChart2 className="w-6 h-6 text-primary" />
                          <h1 className="text-2xl font-bold">Overview</h1>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button onClick={() => setIsCreateWorkspaceOpen(true)} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create Workspace
                          </Button>
                          <p className="text-sm text-muted-foreground">Showing <span className="font-medium">{workspaces.length}</span> workspaces</p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <select multiple value={regionFilter} onChange={(e) => {
                              const opts = Array.from(e.currentTarget.selectedOptions).map(o => o.value);
                              setRegionFilter(opts);
                            }} className="text-sm bg-background border rounded px-2 py-1">
                              <option value="All">All regions</option>
                              {Object.keys(aggregated.regions || {}).map(r => (
                                <option key={r} value={r}>{r} ({aggregated.regions[r].workspaces.length})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardHeader className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                              <span>Wounds</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                className="text-xs text-muted-foreground flex items-center gap-1" 
                                onClick={() => calculateAggregateWoundsData()}
                                title="Refresh wounds data"
                              >
                                <TrendingUp className="w-4 h-4" /> Refresh
                              </button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {isMounted && aggregateWoundsData.total > 0 ? (
                                <>
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-medium">Total</span>
                                    <span className="text-lg font-bold">{aggregateWoundsData.total}</span>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span className="text-muted-foreground">Pressure</span>
                                      </div>
                                      <span className="font-medium">{aggregateWoundsData.pressure}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                        <span className="text-muted-foreground">Break</span>
                                      </div>
                                      <span className="font-medium">{aggregateWoundsData.break}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                        <span className="text-muted-foreground">Fracture</span>
                                      </div>
                                      <span className="font-medium">{aggregateWoundsData.fracture}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        <span className="text-muted-foreground">Bruise</span>
                                      </div>
                                      <span className="font-medium">{aggregateWoundsData.bruise}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-muted-foreground">Skintear</span>
                                      </div>
                                      <span className="font-medium">{aggregateWoundsData.skintear}</span>
                                    </div>
                                  </div>
                                  <div className="border-t pt-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Workspaces with data:</span>
                                      <span>{aggregateWoundsData.workspacesWithData}/{workspaces.length}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-sm text-muted-foreground">
                                    {!isMounted ? 'Loading...' : 'No wounds data available'}
                                  </div>
                                  {isMounted && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Record wound incidents in workspaces to see aggregate data
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-muted-foreground" />
                              <span>Overall Audit Score</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                className="text-xs text-muted-foreground flex items-center gap-1" 
                                onClick={() => calculateAggregateAuditScores()}
                                title="Refresh audit data"
                              >
                                <TrendingUp className="w-4 h-4" /> Refresh
                              </button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {isMounted && aggregateAuditData.overallPercentage !== null ? (
                                <>
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                      style={{
                                        background: `linear-gradient(135deg, ${getGradientColors(aggregateAuditData.overallPercentage).start}, ${getGradientColors(aggregateAuditData.overallPercentage).end})`
                                      }}
                                    >
                                      {aggregateAuditData.overallPercentage}%
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Yes Responses:</span>
                                      <span className="font-medium">{aggregateAuditData.totalYesCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Total Questions:</span>
                                      <span className="font-medium">{aggregateAuditData.totalQuestions}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Audits Completed:</span>
                                      <span className="font-medium">{aggregateAuditData.auditsCompleted}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Workspaces with Data:</span>
                                      <span className="font-medium">{aggregateAuditData.workspacesWithData}/{workspaces.length}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-sm text-muted-foreground">
                                    {!isMounted ? 'Loading...' : 'No audit data available'}
                                  </div>
                                  {isMounted && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Complete audits in workspaces to see aggregate scores
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border">
                          <CardHeader className="flex items-center justify-between">
                            <div>Low Occupancy</div>
                            <div className="text-xs text-muted-foreground">Watchlist</div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(workspaces || []).slice().sort((a,b) => {
                                const av = typeof a.occupancy === 'number' ? a.occupancy : (a.totalBeds ? (a.occupiedBeds || 0) / a.totalBeds : 1);
                                const bv = typeof b.occupancy === 'number' ? b.occupancy : (b.totalBeds ? (b.occupiedBeds || 0) / b.totalBeds : 1);
                                return av - bv;
                              }).slice(0,3).map((w: any) => (
                                <div key={`low-${w.id}`} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 flex items-center justify-center bg-slate-50 rounded-full">
                                      <OccupancyPie percent={Math.round(((typeof w.occupancy === 'number' ? w.occupancy : (w.totalBeds ? (w.occupiedBeds||0)/w.totalBeds : 0)) || 0) * 100)} size={56} strokeWidth={8} />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{w.name || w.id}</div>
                                      <div className="text-xs text-muted-foreground">{Math.round(((typeof w.occupancy === 'number' ? w.occupancy : (w.totalBeds ? (w.occupiedBeds||0)/w.totalBeds : 0)) || 0) * 100)}% occupied</div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">{w.totalBeds ? `${w.occupiedBeds || 0}/${w.totalBeds}` : 'n/a'}</div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    
                  </div>

                  {workspaces.length === 0 ? (
                    <div className="rounded border p-6 text-center text-muted-foreground">No workspaces found.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredWorkspaces.map((ws: any) => (
                        <Card key={ws.id} className={cn('hover:shadow-lg transition-shadow', ws.region ? '' : 'opacity-90') }>
                          <CardHeader className="flex items-center justify-between w-full px-4 py-3 rounded-t-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                            <div className="flex-1 min-w-0 text-lg font-semibold truncate text-left">{ws.name || ws.id}</div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="secondary">{ws.folders?.length || 0} folders</Badge>
                              <Button onClick={() => setSelectedWorkspace(ws)}>Open</Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openRenameDialog(ws)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(ws)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="mt-2 text-sm text-muted-foreground space-y-2">
                              {(ws.folders || []).slice(0, 6).map((f: any) => (
                                <div key={f.id} className="flex items-center justify-between">
                                  <div className="truncate">{f.name}</div>
                                  <div className="text-xs text-muted-foreground">{(f.items || []).filter((it: any) => it.type === 'document').length} docs</div>
                                </div>
                              ))}
                              {(ws.folders || []).length > 6 && <div className="text-xs text-muted-foreground">And more...</div>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )
        ) : (
          <div className="h-[calc(100vh-64px)]">
            {selectedDocument ? (
              <DocumentView
                document={selectedDocument}
                onBack={() => setSelectedDocument(null)}
                responseDetail={lastChatDetail}
                isChatOpen={isChatOpen}
              />
            ) : (
              <AdminWorkspaceView workspace={selectedWorkspace} onClose={() => setSelectedWorkspace(null)} />
            )}
          </div>
        )}
      </div>
  {/* Floating chat button and overlay (admin) */}
  <div className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out",
        isMobile
          ? isChatOpen
            ? "bottom-0 right-0 left-0 h-[70vh] max-h-[600px]"
            : "bottom-4 right-4 w-auto h-auto"
          : isChatOpen
            ? "bottom-4 right-4 w-[500px] h-[650px]"
            : "bottom-4 right-4 w-auto h-auto"
      )}>
        {isChatOpen ? (
          <div className="h-full">
            <div className="h-full flex flex-col shadow-2xl bg-white rounded-lg">
              <div className="flex items-center justify-between p-2 border-b">
                <h3 className="font-semibold px-2 truncate">Admin Chat</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
                <div className="p-2 h-full">
                <AdminChatPanel selectedItem={getWorkspaceRootForChat(selectedWorkspace || { id: 'admin-root', name: 'Admin', folders: [] })} onFolderAdd={() => { /* noop for now */ }} />
              </div>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  size={isMobile ? "default" : "lg"}
                  className={cn(
                    "rounded-full shadow-lg transition-all duration-200",
                    isMobile ? "w-14 h-14" : "w-16 h-16"
                  )}
                  onClick={() => setIsChatOpen(true)}
                  aria-label="Open admin chat"
                >
                  <MessageSquare className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side={isMobile ? "top" : "left"}>
              <p>Open admin chat</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for organizing documents and teams.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="workspace-name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="workspace-name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                className="col-span-3"
                disabled={isCreatingWorkspace}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="workspace-owner" className="text-right text-sm font-medium">
                Owner ID
              </label>
              <Input
                id="workspace-owner"
                value={newWorkspaceOwner}
                onChange={(e) => setNewWorkspaceOwner(e.target.value)}
                placeholder="Enter owner user ID"
                className="col-span-3"
                disabled={isCreatingWorkspace}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateWorkspaceOpen(false);
                setNewWorkspaceName('');
                setNewWorkspaceOwner('');
              }}
              disabled={isCreatingWorkspace}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={isCreatingWorkspace || !newWorkspaceName.trim() || !newWorkspaceOwner.trim()}
            >
              {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Workspace Dialog */}
      <Dialog open={isRenameWorkspaceOpen} onOpenChange={setIsRenameWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Workspace</DialogTitle>
            <DialogDescription>
              Change the name of "{renameWorkspaceData?.currentName}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="rename-workspace-name" className="text-right text-sm font-medium">
                New Name
              </label>
              <Input
                id="rename-workspace-name"
                value={newRenameWorkspaceName}
                onChange={(e) => setNewRenameWorkspaceName(e.target.value)}
                placeholder="Enter new workspace name"
                className="col-span-3"
                disabled={isRenamingWorkspace}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameWorkspaceOpen(false);
                setNewRenameWorkspaceName('');
                setRenameWorkspaceData(null);
              }}
              disabled={isRenamingWorkspace}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameWorkspace}
              disabled={isRenamingWorkspace || !newRenameWorkspaceName.trim()}
            >
              {isRenamingWorkspace ? 'Renaming...' : 'Rename Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <Dialog open={isDeleteWorkspaceOpen} onOpenChange={setIsDeleteWorkspaceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the workspace "{deleteWorkspaceData?.name}" and all its contents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              To confirm deletion, please type the workspace name exactly as shown:
            </div>
            <div className="font-mono text-sm bg-muted p-2 rounded">
              {deleteWorkspaceData?.name}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="delete-confirmation" className="text-right text-sm font-medium">
                Confirm
              </label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmationName}
                onChange={(e) => setDeleteConfirmationName(e.target.value)}
                placeholder="Type workspace name here"
                className="col-span-3"
                disabled={isDeletingWorkspace}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteWorkspaceOpen(false);
                setDeleteConfirmationName('');
                setDeleteWorkspaceData(null);
              }}
              disabled={isDeletingWorkspace}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={isDeletingWorkspace || deleteConfirmationName.trim() !== deleteWorkspaceData?.name}
            >
              {isDeletingWorkspace ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
