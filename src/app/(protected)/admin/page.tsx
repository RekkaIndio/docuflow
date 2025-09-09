"use client";
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import AdminWorkspaceView from '@/components/admin/admin-workspace-view';
import AdminWorkspacesView from '@/components/admin/admin-workspaces-view';
import AdminDashboardHeader from '@/components/admin/admin-dashboard-header';
import AdminOverviewCards from '@/components/admin/admin-overview-cards';
import AdminStaffingChart from '@/components/admin/admin-staffing-chart';
import AdminSystemMetrics from '@/components/admin/admin-system-metrics';
import AdminRecentActivity from '@/components/admin/admin-recent-activity';
import AdminLowOccupancy from '@/components/admin/admin-low-occupancy';
import { DocumentView } from '@/components/dashboard/document-view';
import { TeamsView } from '@/components/dashboard/teams-view';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin, BarChart2, Download, MessageSquare, X, ArrowLeft, BarChart3, TrendingUp, TrendingDown, Plus, MoreVertical, Edit, Trash2, Target, AlertTriangle, UserCheck } from 'lucide-react';
import OccupancyPie from '@/components/admin/occupancy-pie';
import OverviewCards from '@/components/dashboard/overview-cards';
import AdminSettings from '@/components/admin/admin-settings';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Sparkline from '@/components/admin/sparkline';
import { ChatPanel } from '@/components/chat/chat-panel';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import type { Folder, Document } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import WoundsDetailModal from '@/components/admin/wounds-detail-modal';
import FallsDetailModal from '@/components/admin/falls-detail-modal';
import InfectionsDetailModal from '@/components/admin/infections-detail-modal';
import AuditDetailModal from '@/components/admin/audit-detail-modal';

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
          if (v && ['home','files','documents','tags','teams','settings','renewals','accessibility','stats','workspaces','policies'].includes(v)) {
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
          if (['home','files','documents','tags','teams','settings','renewals','accessibility','stats','workspaces','policies'].includes(v)) {
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
      return () => {
        window.removeEventListener('navigate-to-workspace', handleNavigateToWorkspace as EventListener);
        window.removeEventListener('admin-set-view', handleAdminSetView as EventListener);
      };
    }
  }, [workspaces]);

  const [selectedWorkspace, setSelectedWorkspace] = React.useState<any | null>(null);
  const [selectedWorkspaceForTeams, setSelectedWorkspaceForTeams] = React.useState<any | null>(null);
  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [lastChatDetail, setLastChatDetail] = React.useState<{ text?: string; documents?: any[] } | undefined>(undefined);
  type AdminViewType = 'home' | 'files' | 'documents' | 'tags' | 'teams' | 'settings' | 'renewals' | 'accessibility' | 'stats' | 'workspaces' | 'policies';
  const [adminView, setAdminView] = React.useState<AdminViewType>('home');
  const [regionFilter, setRegionFilter] = React.useState<string[]>((['All']));
  // Workspace management moved to AdminWorkspacesView component

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

  // Aggregate falls data state
  const [aggregateFallsData, setAggregateFallsData] = React.useState<{
    totalFalls: number;
    workspacesWithData: number;
  }>({
    totalFalls: 0,
    workspacesWithData: 0
  });

  const [aggregateInfectionData, setAggregateInfectionData] = React.useState<{
    totalInfections: number;
    uti: number;
    chest: number;
    wound: number;
    workspacesWithData: number;
  }>({
    totalInfections: 0,
    uti: 0,
    chest: 0,
    wound: 0,
    workspacesWithData: 0
  });

  // Aggregate staffing data state
  const [aggregateStaffingData, setAggregateStaffingData] = React.useState<{
    totalDay: number;
    totalNight: number;
    averageDay: number;
    averageNight: number;
    workspacesWithData: number;
  }>({
    totalDay: 0,
    totalNight: 0,
    averageDay: 0,
    averageNight: 0,
    workspacesWithData: 0
  });

  // Enhanced staffing chart state
  const [staffingTimeframe, setStaffingTimeframe] = React.useState<'day' | 'week' | 'month'>('week');
  const [staffingHistory, setStaffingHistory] = React.useState<Array<{ date: string; day: number; night: number; total: number }>>([]);
  const [staffingLoading, setStaffingLoading] = React.useState(false);

  // Modal state management
  const [isWoundsModalOpen, setIsWoundsModalOpen] = React.useState(false);
  const [isFallsModalOpen, setIsFallsModalOpen] = React.useState(false);
  const [isInfectionsModalOpen, setIsInfectionsModalOpen] = React.useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false);

  // Helper: return a folder-like object for the selected workspace (chat expects a Folder)
  const getWorkspaceRootForChat = (ws: any) => ({ id: ws?.id || 'admin-root', name: ws?.name || 'Admin', type: 'folder' as const, items: ws?.folders || [], workspaceId: ws?.id || 'admin' });

  // Workspace management (create/rename/delete) moved to AdminWorkspacesView

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
      'fire-safety', 'infection-control', 'mealtime', 'night-visit', 'staff-file', 'kitchen', 'falls'
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

  // Function to calculate aggregate staffing data across all workspaces
  const calculateAggregateStaffingData = async () => {
    if (!workspaces || workspaces.length === 0) {
      setAggregateStaffingData({
        totalDay: 0,
        totalNight: 0,
        averageDay: 0,
        averageNight: 0,
        workspacesWithData: 0
      });
      setStaffingHistory([]);
      return;
    }

    setStaffingLoading(true);

    try {
      let totalDayStaff = 0;
      let totalNightStaff = 0;
      let workspacesWithData = 0;
      const allStaffingHistory: Array<{ date: string; day: number; night: number; total: number; workspaceId: string }> = [];

      // Calculate date range based on timeframe
      let startDate = new Date();
      switch (staffingTimeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
      
      // Process each workspace sequentially
      for (const workspace of workspaces) {
        try {
          const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
          const snap = await getDocs(colRef);
          
          const historyData: Array<{ date: string; day: number; night: number; total: number }> = [];
          let latestStaffingDay = 0;
          let latestStaffingNight = 0;
          let latestTimestamp = 0;
          
          if (!snap.empty) {
            snap.docs.forEach((doc, index) => {
              const data = doc.data();
              console.log(`� Document ${index + 1}/${snap.docs.length} for ${workspace.id}:`, {
                id: doc.id,
                hasStaffingDay: 'staffingDay' in data,
                hasStaffingNight: 'staffingNight' in data,
                staffingDay: data.staffingDay,
                staffingNight: data.staffingNight,
                hasStaffingObject: 'staffing' in data,
                staffingObject: data.staffing,
                createdAt: data.createdAt?.toDate?.()?.toISOString(),
                allFields: Object.keys(data)
              });
              
              // Use exact same parsing logic as individual workspace
              const day = parseInt(String(data.staffingDay || data.staffing?.day || '0')) || 0;
              const night = parseInt(String(data.staffingNight || data.staffing?.night || '0')) || 0;
              const total = day + night;
              
              console.log(`🔢 Parsed values for ${workspace.id}, doc ${doc.id}: day=${day}, night=${night}, total=${total}`);
              
              const recordDate = data.createdAt ? 
                (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) :
                new Date(data.recordedAt || Date.now());
              
              const timestamp = recordDate.getTime();
              
              // Only include data within timeframe
              if (timestamp >= startDate.getTime()) {
                historyData.push({
                  date: recordDate.toISOString().split('T')[0],
                  day,
                  night,
                  total
                });
              }
              
              // Track latest by timestamp for current totals
              if (timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestStaffingDay = day;
                latestStaffingNight = night;
              }
            });
          } else {
          }
          
          // Add to totals
          totalDayStaff += latestStaffingDay;
          totalNightStaff += latestStaffingNight;
          
          if (latestStaffingDay > 0 || latestStaffingNight > 0) {
            workspacesWithData += 1;
          }
          
          // Add workspace history to aggregate
          allStaffingHistory.push(...historyData.map(h => ({ ...h, workspaceId: workspace.id })));
          
        } catch (error) {
          console.warn(`Failed to fetch staffing data for workspace ${workspace.id}:`, error);
        }
      }

      const averageDay = workspacesWithData > 0 ? Math.round(totalDayStaff / workspacesWithData * 10) / 10 : 0;
      const averageNight = workspacesWithData > 0 ? Math.round(totalNightStaff / workspacesWithData * 10) / 10 : 0;

      // Group and aggregate history by date (same logic as individual workspace)
      const groupedHistory = allStaffingHistory.reduce((acc, curr) => {
        if (!acc[curr.date]) {
          acc[curr.date] = { date: curr.date, day: 0, night: 0, total: 0 };
        }
        acc[curr.date].day += curr.day;
        acc[curr.date].night += curr.night;
        acc[curr.date].total += curr.total;
        return acc;
      }, {} as Record<string, { date: string; day: number; night: number; total: number }>);

      const sortedHistory = Object.values(groupedHistory).sort((a, b) => a.date.localeCompare(b.date));

      setAggregateStaffingData({
        totalDay: totalDayStaff,
        totalNight: totalNightStaff,
        averageDay,
        averageNight,
        workspacesWithData
      });

      setStaffingHistory(sortedHistory);

    } catch (error) {
      console.error('❌ Failed to calculate aggregate staffing data:', error);
      setAggregateStaffingData({
        totalDay: 0,
        totalNight: 0,
        averageDay: 0,
        averageNight: 0,
        workspacesWithData: 0
      });
      setStaffingHistory([]);
    } finally {
      setStaffingLoading(false);
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

  // Function to calculate aggregate falls data across all workspaces
  const calculateAggregateFallsData = async () => {
    if (!workspaces || workspaces.length === 0) {
      setAggregateFallsData({
        totalFalls: 0,
        workspacesWithData: 0
      });
      return;
    }

    let totalFalls = 0;
    let workspacesWithData = 0;

    try {
      // Fetch falls data from daily-checkins for each workspace
      const fallsPromises = workspaces.map(async (workspace: any) => {
        try {
          const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
          // Get all daily-checkins to ensure we don't miss any due to date filtering issues
          const snaps = await getDocs(colRef);
          
          let workspaceFalls = 0;

          if (!snaps.empty) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            snaps.forEach(snap => {
              const d: any = snap.data();
              
              // Filter by date on client side to handle different date formats
              let documentDate: Date | null = null;
              if (d.createdAt) {
                if (d.createdAt.toDate) {
                  // Firestore Timestamp
                  documentDate = d.createdAt.toDate();
                } else if (d.createdAt instanceof Date) {
                  documentDate = d.createdAt;
                } else if (typeof d.createdAt === 'string') {
                  documentDate = new Date(d.createdAt);
                }
              }
              
              // Only include documents from the last 30 days
              if (!documentDate || documentDate >= thirtyDaysAgo) {
                // Falls data is stored as an object with count property
                let falls = 0;
                if (d.falls && typeof d.falls === 'object') {
                  falls = Number(d.falls.count || 0);
                } else {
                  // Fallback for other possible formats
                  falls = Number(d.falls || d.fallsCount || 0);
                }
                workspaceFalls += falls;
                
                // Log for debugging
                if (falls > 0) {
                  console.log(`Falls found in workspace ${workspace.id}:`, falls, 'on date:', documentDate);
                }
              }
            });

            if (workspaceFalls > 0) {
              workspacesWithData += 1;
            }
          }

          return {
            falls: workspaceFalls
          };
        } catch (error) {
          console.warn(`Failed to fetch falls data for workspace ${workspace.id}:`, error);
          return { falls: 0 };
        }
      });

      const results = await Promise.all(fallsPromises);
      
      results.forEach(result => {
        totalFalls += result.falls;
      });

      console.log('Falls data aggregation completed:', { totalFalls, workspacesWithData, workspaceCount: workspaces.length });

      setAggregateFallsData({
        totalFalls,
        workspacesWithData
      });

    } catch (error) {
      console.error('Failed to calculate aggregate falls data:', error);
      setAggregateFallsData({
        totalFalls: 0,
        workspacesWithData: 0
      });
    }
  };

  // Function to calculate aggregate infection data across all workspaces
  const calculateAggregateInfectionData = async () => {
    if (!workspaces || workspaces.length === 0) {
      setAggregateInfectionData({
        totalInfections: 0,
        uti: 0,
        chest: 0,
        wound: 0,
        workspacesWithData: 0
      });
      return;
    }

    let totalUti = 0;
    let totalChest = 0;
    let totalWound = 0;
    let workspacesWithData = 0;

    try {
      // Fetch infection data from daily-checkins for each workspace
      const infectionPromises = workspaces.map(async (workspace: any) => {
        try {
          const colRef = collection(db, `workspaces/${workspace.id}/daily-checkins`);
          // Get all daily-checkins to ensure we don't miss any due to date filtering issues
          const snaps = await getDocs(colRef);
          
          let workspaceUti = 0;
          let workspaceChest = 0;
          let workspaceWound = 0;

          if (!snaps.empty) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            snaps.forEach(snap => {
              const d: any = snap.data();
              
              // Filter by date on client side to handle different date formats
              let documentDate: Date | null = null;
              if (d.createdAt) {
                if (d.createdAt.toDate) {
                  // Firestore Timestamp
                  documentDate = d.createdAt.toDate();
                } else if (d.createdAt instanceof Date) {
                  documentDate = d.createdAt;
                } else if (typeof d.createdAt === 'string') {
                  documentDate = new Date(d.createdAt);
                }
              }
              
              // Only include documents from the last 30 days
              if (!documentDate || documentDate >= thirtyDaysAgo) {
                // Infection data is stored in infections object
                if (d.infections) {
                  workspaceUti += Number(d.infections.uti || 0);
                  workspaceChest += Number(d.infections.chest || 0);
                  workspaceWound += Number(d.infections.wound || 0);
                }
              }
            });

            if (workspaceUti > 0 || workspaceChest > 0 || workspaceWound > 0) {
              workspacesWithData += 1;
            }
          }

          return {
            uti: workspaceUti,
            chest: workspaceChest,
            wound: workspaceWound
          };
        } catch (error) {
          console.warn(`Failed to fetch infection data for workspace ${workspace.id}:`, error);
          return { uti: 0, chest: 0, wound: 0 };
        }
      });

      const results = await Promise.all(infectionPromises);
      
      results.forEach(result => {
        totalUti += result.uti;
        totalChest += result.chest;
        totalWound += result.wound;
      });

      const totalInfections = totalUti + totalChest + totalWound;

      console.log('Infection data aggregation completed:', { totalInfections, totalUti, totalChest, totalWound, workspacesWithData, workspaceCount: workspaces.length });

      setAggregateInfectionData({
        totalInfections,
        uti: totalUti,
        chest: totalChest,
        wound: totalWound,
        workspacesWithData
      });

    } catch (error) {
      console.error('Failed to calculate aggregate infection data:', error);
      setAggregateInfectionData({
        totalInfections: 0,
        uti: 0,
        chest: 0,
        wound: 0,
        workspacesWithData: 0
      });
    }
  };

  // Effect to calculate aggregate audit scores when workspaces change
  React.useEffect(() => {
    if (workspaces.length > 0) {
      calculateAggregateAuditScores();
      calculateAggregateWoundsData();
      calculateAggregateStaffingData();
      calculateAggregateFallsData();
      calculateAggregateInfectionData();
    }
  }, [workspaces, staffingTimeframe]);

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
      const { documentId, documentName, policyFile, policyUrl } = event.detail || {};
      // If an admin policy card dispatched navigation, synthesize a Document
      // and open it inside the Admin UI (DocumentView) so behavior matches the
      // user-side (no external tab). This requires no selectedWorkspace; we'll
      // attach it to the currently selected workspace if present.
      if (policyFile || policyUrl) {
        try {
          const docId = `policy:${policyFile || (policyUrl || '').split('/').pop()}`;
          const docName = documentName || (policyFile || (policyUrl || '').split('/').pop()) || 'Policy Document';
          
          const syntheticDoc: Document = {
            id: docId,
            name: docName,
            type: 'document',
            fileType: 'pdf',
            createdAt: new Date().toISOString(),
            owner: user || { id: 'system', name: 'Policy Library', email: null, avatarUrl: null },
            workspaceId: selectedWorkspace ? selectedWorkspace.id : 'admin',
            folderId: null,
            downloadUrl: policyUrl || `/policies/${policyFile}`,
          } as unknown as Document;

          setLastChatDetail(undefined);
          setSelectedDocument(syntheticDoc as any);
          setAdminView('files');

          try { window.dispatchEvent(new CustomEvent('highlight-document', { detail: { documentId: syntheticDoc.id } })); } catch (e) {}
          return;
        } catch (e) {
          console.warn('Failed to open policy inside admin UI', e);
        }
      }
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
         handleDocumentNavigation(evt as CustomEvent).catch((err) => console.error('navigate handler error', err));
       } catch (e) {
         console.error('navigate-to-document wrapper error', e);
       }
     };    window.addEventListener('chat-response', handleChatResponse as EventListener);
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
                                      <DropdownMenuItem onClick={() => { setAdminView('workspaces'); window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } })); }}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Rename / Manage
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => { setAdminView('workspaces'); window.dispatchEvent(new CustomEvent('navigate-to-workspace', { detail: { workspaceId: ws.id, workspaceName: ws.name } })); }}
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
          ) : adminView === 'workspaces' ? (
            // Dedicated Workspaces page moved into its own component
            <AdminWorkspacesView />
          ) : adminView === 'settings' ? (
            // Admin settings / superuser tools
            <div>
              <AdminSettings workspaces={workspaces} />
            </div>
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
            ) : adminView === 'policies' ? (
              <React.Suspense fallback={<div>Loading...</div>}>
                {(() => {
                  const PoliciesPage = require('@/app/(protected)/admin/policies/page').default;
                  return <PoliciesPage />;
                })()}
              </React.Suspense>
            ) : (
            // Default dashboard / files view (unchanged)
            <>
              {loadingData ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <div className="text-lg font-semibold">Loading admin dashboard...</div>
                    <div className="text-sm text-muted-foreground">Fetching workspace data</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Enhanced Dashboard Header */}
                  <AdminDashboardHeader
                    workspaceCount={workspaces.length}
                    totalFolders={aggregated.totalFolders}
                    totalDocuments={aggregated.totalDocuments}
                    averageOccupancy={careOverview.averageOccupancy}
                    totalOccupied={careOverview.totalOccupied}
                    totalBeds={careOverview.totalBeds}
                    onRefresh={async () => {
                      calculateAggregateAuditScores();
                      calculateAggregateWoundsData();
                      calculateAggregateStaffingData();
                      calculateAggregateFallsData();
                      calculateAggregateInfectionData();
                    }}
                  />

                  {/* Main Overview Cards */}
                  <AdminOverviewCards
                    aggregateWoundsData={aggregateWoundsData}
                    aggregateAuditData={aggregateAuditData}
                    aggregateFallsData={aggregateFallsData}
                    aggregateInfectionData={aggregateInfectionData}
                    workspaceCount={workspaces.length}
                    isMounted={isMounted}
                    onRefreshWounds={calculateAggregateWoundsData}
                    onRefreshAudits={calculateAggregateAuditScores}
                    onRefreshFalls={calculateAggregateFallsData}
                    onRefreshInfections={calculateAggregateInfectionData}
                    onOpenWoundsModal={() => setIsWoundsModalOpen(true)}
                    onOpenFallsModal={() => setIsFallsModalOpen(true)}
                    onOpenInfectionsModal={() => setIsInfectionsModalOpen(true)}
                    onOpenAuditModal={() => setIsAuditModalOpen(true)}
                  />

                  {/* Enhanced Staffing Chart */}
                  <AdminStaffingChart
                    aggregateStaffingData={aggregateStaffingData}
                    staffingHistory={staffingHistory}
                    staffingTimeframe={staffingTimeframe}
                    staffingLoading={staffingLoading}
                    workspaceCount={workspaces.length}
                    onTimeframeChange={setStaffingTimeframe}
                    onRefresh={calculateAggregateStaffingData}
                  />

                  {/* Additional Analytics Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Recent Activity */}
                    <AdminRecentActivity 
                      workspaces={workspaces}
                      aggregated={aggregated}
                    />

                    {/* Low Occupancy Alert */}
                    <AdminLowOccupancy workspaces={workspaces} />
                  </div>



                  {/* Workspaces moved to dedicated Workspaces page - dashboard now shows only overview stats */}
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

      {/* Workspace create/rename/delete dialogs moved to AdminWorkspacesView */}

      {/* Detail Modals */}
      <WoundsDetailModal
        isOpen={isWoundsModalOpen}
        onClose={() => setIsWoundsModalOpen(false)}
        aggregateWoundsData={aggregateWoundsData}
        workspaces={workspaces}
      />

      <FallsDetailModal
        isOpen={isFallsModalOpen}
        onClose={() => setIsFallsModalOpen(false)}
        aggregateFallsData={aggregateFallsData}
        workspaces={workspaces}
      />

      <InfectionsDetailModal
        isOpen={isInfectionsModalOpen}
        onClose={() => setIsInfectionsModalOpen(false)}
        aggregateInfectionData={aggregateInfectionData}
        workspaces={workspaces}
      />

      <AuditDetailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        aggregateAuditData={aggregateAuditData}
        workspaces={workspaces}
      />
    </>
  );
}
function orderBy(arg0: string, arg1: string): import("@firebase/firestore").QueryConstraint {
  throw new Error('Function not implemented.');
}

