'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { getMonthlyActionPlan, updateActionPlanItemStatus, areAllAuditsCompleted, getCurrentMonthKey, MonthlyActionPlan, ActionPlanItem, listMonthlyActionPlans, getAuditSnapshotById } from '@/lib/action-plans';
import { getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Clock, FileCheck, ChevronDown, ChevronRight, Users, Timer, FileText, Loader2, Info } from "lucide-react";
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { generateActionPlanPDF, getActionPlanPDFFilename, ActionPlanPDFData } from '@/lib/action-plan-pdf-generator';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '../../../components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const getMonthLabelFromKey = (monthKey: string) => {
  const [yearPart, monthPart] = monthKey.split('-');
  const monthIndex = Number(monthPart) - 1;

  if (!yearPart || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }

  return `${MONTH_LABELS[monthIndex]} ${yearPart}`;
};

export default function ActionPlansPage() {
  const activeWorkspace = useWorkspace();
  const organisationId = activeWorkspace?.organisationId || null;
  const [actionPlan, setActionPlan] = useState<MonthlyActionPlan | null>(null);
  const [auditCompletionStatus, setAuditCompletionStatus] = useState<Record<string, boolean>>({});
  const [allAuditsCompleted, setAllAuditsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [tab, setTab] = useState<'current' | 'tracker'>('current');
  const [historicalPlans, setHistoricalPlans] = useState<MonthlyActionPlan[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [selectedHistoricalPlan, setSelectedHistoricalPlan] = useState<MonthlyActionPlan | null>(null);
  
  // Teams and staff data
  const [teams, setTeams] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditModalLoading, setAuditModalLoading] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState<ActionPlanItem | null>(null);
  const [selectedAuditSnapshot, setSelectedAuditSnapshot] = useState<Record<string, any> | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const { toast } = useToast();

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const plansByYear = useMemo(() => {
    return historicalPlans.reduce((acc, plan) => {
      const year = plan.monthKey.slice(0, 4);
      if (!acc[year]) {
        acc[year] = {};
      }
      acc[year][plan.monthKey] = plan;
      return acc;
    }, {} as Record<string, Record<string, MonthlyActionPlan>>);
  }, [historicalPlans]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    historicalPlans.forEach(plan => {
      years.add(plan.monthKey.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [historicalPlans]);

  useEffect(() => {
    loadActionPlanData();
    loadTeamsAndStaffData();
    loadHistoricalPlans();
    setSelectedHistoricalPlan(null);
  }, [activeWorkspace?.id]);

  useEffect(() => {
    setAuditModalOpen(false);
    setAuditModalLoading(false);
    setSelectedAuditItem(null);
    setSelectedAuditSnapshot(null);
    setAuditError(null);
  }, [selectedHistoricalPlan?.monthKey]);

  // Add event listeners for chat commands
  useEffect(() => {
    const handleNavigateToActionPlans = (event: CustomEvent) => {
      // Already on action plans page, could scroll to top or refresh data
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Add event listener
    window.addEventListener('navigate-to-action-plans', handleNavigateToActionPlans as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('navigate-to-action-plans', handleNavigateToActionPlans as EventListener);
    };
  }, []);

  const loadActionPlanData = async () => {
    if (!activeWorkspace?.id) return;

    setLoading(true);
    try {
      // Load action plan
  const plan = await getMonthlyActionPlan(activeWorkspace.id, currentMonthKey, organisationId);
      setActionPlan(plan);

      // Load audit completion status
  const auditStatus = await getMonthlyAuditCompletionStatus(activeWorkspace.id, organisationId);
      setAuditCompletionStatus(auditStatus);

      // Check if all audits are completed
  const allCompleted = await areAllAuditsCompleted(activeWorkspace.id, currentMonthKey, organisationId);
      setAllAuditsCompleted(allCompleted);

      // Initialize expanded sections - expand sections with high priority items by default
      if (plan?.items) {
        const groupedByType = plan.items.reduce((groups, item) => {
          if (!groups[item.auditType]) groups[item.auditType] = [];
          groups[item.auditType].push(item);
          return groups;
        }, {} as Record<string, ActionPlanItem[]>);

        const initialExpanded = Object.keys(groupedByType).reduce((acc, auditType) => {
          const hasHighPriority = groupedByType[auditType].some(item => item.priority === 'high');
          const hasInProgressItems = groupedByType[auditType].some(item => item.status === 'in-progress');
          acc[auditType] = hasHighPriority || hasInProgressItems;
          return acc;
        }, {} as Record<string, boolean>);

        setExpandedSections(initialExpanded);
      }
    } catch (error) {
      console.error('Failed to load action plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalPlans = async () => {
    if (!activeWorkspace?.id) return;

    setHistoricalLoading(true);
    try {
      const plans = await listMonthlyActionPlans(activeWorkspace.id, organisationId);
      const sortedPlans = [...plans].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      setHistoricalPlans(sortedPlans);
      setSelectedHistoricalPlan(prev => {
        if (!prev) {
          return null;
        }
        return sortedPlans.find(plan => plan.monthKey === prev.monthKey) || null;
      });
    } catch (error) {
      console.error('Failed to load historical action plans:', error);
      toast({
        title: 'Unable to load action plans',
        description: 'Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setHistoricalLoading(false);
    }
  };

  const loadTeamsAndStaffData = async () => {
    if (!activeWorkspace?.id) return;

    setLoadingTeams(true);
    try {
      const teamsCollection = collection(db, workspaceCollectionPath(activeWorkspace.id, 'teams', organisationId));
      const teamsSnapshot = await getDocs(teamsCollection);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'team'
      }));
      setTeams(teamsData);

      const workspaceRef = doc(db, workspaceDocPath(activeWorkspace.id, undefined, organisationId));
      const workspaceSnap = await getDoc(workspaceRef);

      if (workspaceSnap.exists()) {
        const data = workspaceSnap.data();
        const staff = {
          managers: data.managers || [],
          nurses: data.nurses || [],
          ctms: data.ctms || [],
          domestics: data.domestics || [],
          maintenances: data.maintenances || [],
          kitchens: data.kitchens || [],
          activities: data.activities || []
        };
        setStaffData(staff);
      }
    } catch (error) {
      console.error('Failed to load teams and staff data:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleItemStatusUpdate = async (itemId: string, status: 'pending' | 'in-progress' | 'completed') => {
    if (!activeWorkspace?.id || !actionPlan) return;
    // Keep a snapshot for rollback in case the server update fails
    const prevPlan = actionPlan;

    // Immediately mark as updating
    setUpdatingItem(itemId);

    // Apply optimistic update locally so UI responds immediately
    setActionPlan(prev => {
      if (!prev) return prev;

      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : item.completedAt
          };
        }
        return item;
      });

      const completedItems = updatedItems.filter(item => item.status === 'completed').length;
      const progressPercent = prev.totalItems > 0 ? Math.round((completedItems / prev.totalItems) * 100) : 0;

      return {
        ...prev,
        items: updatedItems,
        completedItems,
        progressPercent,
        updatedAt: new Date().toISOString()
      };
    });

    try {
      await updateActionPlanItemStatus(
        activeWorkspace.id,
        currentMonthKey,
        itemId,
        status,
        undefined,
        undefined,
        undefined,
        undefined,
        organisationId
      );
      await loadHistoricalPlans();
    } catch (error) {
      console.error('Failed to update item status:', error);
      // Rollback optimistic update
      setActionPlan(prevPlan);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRAGRatingUpdate = async (itemId: string, ragRating: 'red' | 'amber' | 'green') => {
    if (!activeWorkspace?.id || !actionPlan) return;

    setUpdatingItem(itemId);
    try {
      const item = actionPlan.items.find(item => item.id === itemId);
      if (item) {
        await updateActionPlanItemStatus(
          activeWorkspace.id,
          currentMonthKey,
          itemId,
          item.status,
          item.assignedTo,
          item.dueDate,
          ragRating,
          item.assignedTeam,
          organisationId
        );
        await loadHistoricalPlans();

        // Update local state optimistically
        setActionPlan(prev => {
          if (!prev) return prev;

          const updatedItems = prev.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                ragRating
              };
            }
            return item;
          });

          return {
            ...prev,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };
        });
      }
    } catch (error) {
      console.error('Failed to update RAG rating:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleTeamAssignmentUpdate = async (itemId: string, assignedTeam: string) => {
    if (!activeWorkspace?.id || !actionPlan) return;

    setUpdatingItem(itemId);
    try {
      const item = actionPlan.items.find(item => item.id === itemId);
      if (item) {
        await updateActionPlanItemStatus(
          activeWorkspace.id,
          currentMonthKey,
          itemId,
          item.status,
          item.assignedTo,
          item.dueDate,
          item.ragRating,
          assignedTeam,
          organisationId
        );
        await loadHistoricalPlans();

        // Update local state optimistically
        setActionPlan(prev => {
          if (!prev) return prev;

          const updatedItems = prev.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                assignedTeam
              };
            }
            return item;
          });

          return {
            ...prev,
            items: updatedItems,
            updatedAt: new Date().toISOString()
          };
        });
      }
    } catch (error) {
      console.error('Failed to update team assignment:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const openAuditModalForItem = async (planMonthKey: string, item: ActionPlanItem) => {
    if (!activeWorkspace?.id) return;

    setSelectedAuditItem(item);
    setAuditModalOpen(true);
    setAuditModalLoading(true);
    setAuditError(null);
    setSelectedAuditSnapshot(null);

    if (!item.auditId) {
      const message = 'This action item was created manually and is not linked to a saved audit.';
      setAuditError(message);
      setAuditModalLoading(false);
      return;
    }

    try {
      const snapshot = await getAuditSnapshotById(
        activeWorkspace.id,
        planMonthKey,
        item.auditType,
        item.auditId,
        organisationId
      );

      if (!snapshot) {
        setAuditError('Audit record not found in the archive.');
      } else {
        setSelectedAuditSnapshot(snapshot);
      }
    } catch (error) {
      console.error('Failed to load audit snapshot for action plan item:', error);
      setAuditError('Unable to load audit details. Please try again.');
    } finally {
      setAuditModalLoading(false);
    }
  };

  const handleHistoricalItemClick = async (item: ActionPlanItem) => {
    if (!selectedHistoricalPlan) return;
    await openAuditModalForItem(selectedHistoricalPlan.monthKey, item);
  };

  const handleCurrentItemClick = async (item: ActionPlanItem) => {
    const monthKey = actionPlan?.monthKey || currentMonthKey;
    await openAuditModalForItem(monthKey, item);
  };

  const handleAuditModalOpenChange = (open: boolean) => {
    if (!open) {
      setAuditModalOpen(false);
      setAuditModalLoading(false);
      setSelectedAuditItem(null);
      setSelectedAuditSnapshot(null);
      setAuditError(null);
    }
  };

  const formatAuditTypeLabel = (type: string) => {
    return type.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldLabel = (label: string) => {
    return label
      .replace(/[-_]/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();

    if (value && typeof value === 'object') {
      if (typeof (value as any).toDate === 'function') {
        try {
          return (value as any).toDate().toLocaleString();
        } catch (error) {
          return String((value as any).toDate());
        }
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        const mapped = value.map(item => {
          if (item === null || item === undefined) return 'Not provided';
          if (typeof item === 'object') {
            return JSON.stringify(item, null, 2);
          }
          return String(item);
        });
        return mapped.join('\n');
      }

      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  const renderFieldValue = (displayValue: string) => {
    if (/\n/.test(displayValue)) {
      return (
        <pre className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
          {displayValue}
        </pre>
      );
    }

    return <span className="text-sm text-gray-700">{displayValue}</span>;
  };

  const getRAGColor = (rating?: string) => {
    switch (rating) {
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'amber': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const downloadActionPlanPDF = async (plan: MonthlyActionPlan, monthLabel: string) => {
    try {
      const items = plan.items.map(it => {
        const assignment = assignmentOptions.find(option => option.value === it.assignedTeam);
        return {
          auditType: it.auditType,
          issue: it.issue,
          assigned: assignment ? assignment.label : (it.assignedTeam || 'Unassigned'),
          ragRating: it.ragRating,
          status: it.status,
          completedAt: it.completedAt
        };
      });

      const pdfData: ActionPlanPDFData = {
        workspaceName: activeWorkspace?.name || 'Workspace',
        monthLabel,
        generatedBy: activeWorkspace?.name || 'System',
        items
      };

      const pdfBuf = await generateActionPlanPDF(pdfData);
      const blob = new Blob([pdfBuf as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getActionPlanPDFFilename(activeWorkspace?.name || 'workspace', monthLabel);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Action Plan PDF:', error);
      toast({
        title: 'Unable to generate PDF',
        description: 'Please try again shortly.',
        variant: 'destructive'
      });
    }
  };

  const getRAGDays = (rating?: string) => {
    switch (rating) {
      case 'red': return 7;
      case 'amber': return 14;
      case 'green': return 30;
      default: return null;
    }
  };

  const toggleSection = (auditType: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [auditType]: !prev[auditType]
    }));
  };

  // Group action plan items by audit type
  const groupedItems = actionPlan?.items.reduce((groups, item) => {
    const type = item.auditType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, ActionPlanItem[]>) || {};

  // Get section stats
  const getSectionStats = (items: ActionPlanItem[]) => {
    const total = items.length;
    const completed = items.filter(item => item.status === 'completed').length;
    const inProgress = items.filter(item => item.status === 'in-progress').length;
    const pending = items.filter(item => item.status === 'pending').length;
    const highPriority = items.filter(item => item.priority === 'high').length;
    
    return { total, completed, inProgress, pending, highPriority };
  };

  const getStatusColor = (status: string, allAuditsCompleted?: boolean) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': 
        if (allAuditsCompleted === false) {
          return 'bg-amber-100 text-amber-800';
        }
        return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedAuditsCount = Object.values(auditCompletionStatus).filter(Boolean).length;
  const totalAuditsCount = Object.keys(auditCompletionStatus).length;

  const assignmentOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; type: string }> = [];

    teams.forEach(team => {
      if (team?.id && team.name) {
        options.push({
          value: `team-${team.id}`,
          label: `${team.name} (Team)`,
          type: 'team'
        });
      }
    });

    Object.entries(staffData || {}).forEach(([category, staffList]) => {
      if (Array.isArray(staffList)) {
        staffList.forEach((staff: any) => {
          if (staff?.id && staff.name) {
            options.push({
              value: `${category}-${staff.id}`,
              label: `${staff.name} (${category.charAt(0).toUpperCase() + category.slice(1)})`,
              type: category
            });
          }
        });
      }
    });

    return options;
  }, [teams, staffData]);

  const auditSummary = useMemo(() => {
    if (!selectedAuditSnapshot) return [] as Array<{ label: string; value: string }>;

    const entries = [
      { label: 'Audit Date', value: selectedAuditSnapshot.auditDate },
      { label: 'Completed By', value: selectedAuditSnapshot.completedBy },
      {
        label: 'Home',
        value: selectedAuditSnapshot.home || selectedAuditSnapshot.facility || selectedAuditSnapshot.location
      },
      selectedAuditSnapshot.scorePercent !== undefined && selectedAuditSnapshot.scorePercent !== null
        ? { label: 'Score', value: `${selectedAuditSnapshot.scorePercent}%` }
        : null,
      selectedAuditSnapshot.yesCount !== undefined && selectedAuditSnapshot.totalCount !== undefined
        ? { label: 'Responses', value: `${selectedAuditSnapshot.yesCount} / ${selectedAuditSnapshot.totalCount}` }
        : null,
      { label: 'Snapshot Created', value: selectedAuditSnapshot.snapshotCreatedAt }
    ].filter(Boolean) as Array<{ label: string; value: unknown }>;

    return entries.map(entry => ({
      label: entry.label,
      value: formatFieldValue(entry.value)
    }));
  }, [selectedAuditSnapshot]);

  const topLevelDetails = useMemo(() => {
    if (!selectedAuditSnapshot) return [] as Array<{ label: string; value: string }>;

    const ignoreKeys = new Set([
      'data',
      'auditType',
      'monthKey',
      'snapshotCreatedAt',
      'organisationId',
      'orgId',
      'workspaceId',
      'id',
      'scorePercent',
      'yesCount',
      'totalCount',
      'completedBy',
      'auditDate',
      'home',
      'facility',
      'location'
    ]);

    return Object.entries(selectedAuditSnapshot)
      .filter(([key, value]) => !ignoreKeys.has(key) && typeof value !== 'function')
      .map(([key, value]) => ({
        label: formatFieldLabel(key),
        value: formatFieldValue(value)
      }));
  }, [selectedAuditSnapshot]);

  const auditResponses = useMemo(() => {
    if (!selectedAuditSnapshot || !selectedAuditSnapshot.data || typeof selectedAuditSnapshot.data !== 'object') {
      return [] as Array<{ key: string; label: string; value: string }>;
    }

    return Object.entries(selectedAuditSnapshot.data as Record<string, unknown>)
      .filter(([key]) => key !== '_embeddedImages')
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: formatFieldValue(value)
      }));
  }, [selectedAuditSnapshot]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Monthly Action Plans" subtitle={currentMonthName} />

      <div className="px-4 pt-6 pb-12">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'current' | 'tracker')} className="w-full">
          <TabsList className="grid h-auto items-center w-full max-w-md grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm mb-6">
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="current">
              Current Plan
            </TabsTrigger>
            <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="tracker">
              History & Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
        {/* Action Plan Status */}
        <div className="w-full mb-6">
          {!allAuditsCompleted && (
            <div className="rounded-lg border-l-4 border-amber-400/70 bg-amber-50/60 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-400/80 rounded-lg flex items-center justify-center text-white">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-0.5">Building Correction Plan</h3>
                  <p className="text-sm text-amber-800/90">Complete outstanding audits to unlock correction actions and assignments.</p>
                </div>
              </div>
            </div>
          )}

          {allAuditsCompleted && (
            <div className="rounded-lg border-l-4 border-green-400/70 bg-green-50/60 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500/80 rounded-lg flex items-center justify-center text-white">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 mb-0.5">All Audits Completed</h3>
                  <p className="text-sm text-green-800/90">Great — you can now create and assign corrective actions.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        {actionPlan && actionPlan.items.length > 0 ? (
          <div className="w-full mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Action Items — {currentMonthName}</h2>
                    <div className="text-sm text-gray-500">{actionPlan?.totalItems || 0} issues — {actionPlan?.completedItems || 0} completed</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">Progress: {actionPlan?.progressPercent || 0}%</div>
                            <div className="text-sm text-gray-500">View: <span className="ml-1 font-medium text-gray-700">Table</span></div>
                            <button
                              onClick={async () => {
                                if (!actionPlan) return;
                                await downloadActionPlanPDF(actionPlan, currentMonthName);
                              }}
                              className="ml-4 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            >
                              Download PDF
                            </button>
                  </div>
                </div>
              </div>

              {/* Optional table view (simplified) */}
              {viewMode === 'table' && (
                <div className="p-4">
                  <div className="overflow-x-auto p-4">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full table-auto border-collapse">
                          <thead>
                            <tr className="text-left text-sm text-gray-600">
                              <th className="p-4 w-1/6">Audit Type</th>
                              <th className="p-4 w-2/5">Issue</th>
                              <th className="p-4 w-1/4">Assigned</th>
                              <th className="p-4 w-1/6">RAG</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {actionPlan.items.map((item, idx) => (
                              <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-gray-100`}>
                                <td className="p-4 align-top text-sm text-gray-800">
                                  <button
                                    type="button"
                                    onClick={() => handleCurrentItemClick(item)}
                                    className="text-left text-indigo-600 hover:text-indigo-700 hover:underline"
                                  >
                                    {item.auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </button>
                                </td>
                                <td className="p-4 align-top text-sm text-gray-700">{item.issue}</td>
                                <td className="p-4 align-top">
                                  <Select value={item.assignedTeam || ''} onValueChange={(v) => handleTeamAssignmentUpdate(item.id, v)} disabled={updatingItem === item.id || loadingTeams}>
                                    <SelectTrigger className="w-full max-w-xs">
                                      <SelectValue placeholder={loadingTeams ? 'Loading...' : (assignmentOptions.find(opt => opt.value === item.assignedTeam)?.label || 'Unassigned')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {assignmentOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-4 align-top">
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        aria-label="Red priority"
                                        name={`rag-${item.id}`}
                                        value="red"
                                        checked={item.ragRating === 'red'}
                                        onChange={() => handleRAGRatingUpdate(item.id, 'red')}
                                        disabled={updatingItem === item.id}
                                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                                      />
                                      <span className="sr-only">Red - 7 days</span>
                                      <span className="ml-2 w-3 h-3 bg-red-500 rounded-full" aria-hidden="true"></span>
                                    </label>

                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        aria-label="Amber priority"
                                        name={`rag-${item.id}`}
                                        value="amber"
                                        checked={item.ragRating === 'amber'}
                                        onChange={() => handleRAGRatingUpdate(item.id, 'amber')}
                                        disabled={updatingItem === item.id}
                                        className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 focus:ring-yellow-500"
                                      />
                                      <span className="sr-only">Amber - 14 days</span>
                                      <span className="ml-2 w-3 h-3 bg-yellow-500 rounded-full" aria-hidden="true"></span>
                                    </label>

                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        aria-label="Green priority"
                                        name={`rag-${item.id}`}
                                        value="green"
                                        checked={item.ragRating === 'green'}
                                        onChange={() => handleRAGRatingUpdate(item.id, 'green')}
                                        disabled={updatingItem === item.id}
                                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                      />
                                      <span className="sr-only">Green - 30 days</span>
                                      <span className="ml-2 w-3 h-3 bg-green-500 rounded-full" aria-hidden="true"></span>
                                    </label>
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  <div className="flex items-center gap-3">
                                    {item.status !== 'completed' ? (
                                      <button
                                        onClick={() => handleItemStatusUpdate(item.id, 'completed')}
                                        disabled={updatingItem === item.id}
                                        className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
                                      >
                                        {updatingItem === item.id ? 'Updating...' : 'Mark as Completed'}
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          disabled={true}
                                          className="px-4 py-2 rounded bg-green-600 text-white text-sm"
                                        >
                                          Completed
                                        </button>
                                        <button
                                          onClick={() => handleItemStatusUpdate(item.id, 'pending')}
                                          disabled={updatingItem === item.id}
                                          className="px-3 py-2 rounded bg-gray-600 text-white text-sm"
                                        >
                                          Reopen
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                </div>
              )}

              {/* Grouped sections by audit type (hidden when table-only) */}
              <div className="p-4 space-y-4 hidden">
                {Object.entries(groupedItems).map(([auditType, items]) => {
                  const stats = getSectionStats(items);
                  const isExpanded = expandedSections[auditType];
                  const sectionTitle = auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div key={auditType} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 overflow-hidden hover:shadow-lg transition-all duration-200">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(auditType)}
                        className="w-full p-4 text-left bg-gradient-to-r from-gray-50 via-blue-50/30 to-indigo-50/20 hover:from-gray-100 hover:via-blue-50/50 hover:to-indigo-50/30 rounded-t-xl transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-white" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {sectionTitle} Audit
                              </h3>
                              <span className="text-sm text-gray-600">
                                {stats.total} item{stats.total !== 1 ? 's' : ''} found
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            {stats.highPriority > 0 && (
                              <span className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 px-3 py-1 rounded-full border border-red-300 font-medium shadow-sm">
                                {stats.highPriority} High Priority
                              </span>
                            )}
                            {stats.completed > 0 && (
                              <span className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1 rounded-full border border-green-300 font-medium shadow-sm">
                                {stats.completed} Completed
                              </span>
                            )}
                            {stats.inProgress > 0 && (
                              <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-3 py-1 rounded-full border border-blue-300 font-medium shadow-sm">
                                {stats.inProgress} In Progress
                              </span>
                            )}
                            {stats.pending > 0 && (
                              <span className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-3 py-1 rounded-full border border-gray-300 font-medium shadow-sm">
                                {stats.pending} Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200/50 bg-gradient-to-b from-white/50 to-gray-50/30 p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {items.map((item) => {
                              const isCompleted = item.status === 'completed';
                              const isPending = item.status === 'pending';
                              const isInProgress = item.status === 'in-progress';

                              return (
                                <Card key={item.id} className={`group hover:shadow-xl transition-all duration-300 overflow-hidden ${
                                  isCompleted
                                    ? 'border-green-300/60 bg-gradient-to-br from-green-50/90 via-emerald-50/60 to-green-100/40 shadow-lg hover:shadow-green-200/50'
                                    : isInProgress
                                    ? 'border-blue-300/60 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-blue-100/40 shadow-lg hover:shadow-blue-200/50'
                                    : 'border-gray-300/60 bg-gradient-to-br from-white/90 via-gray-50/60 to-slate-100/40 shadow-lg hover:shadow-gray-200/50'
                                } rounded-2xl backdrop-blur-sm`}>
                                  <CardHeader className={`pb-3 border-b ${
                                    isCompleted
                                      ? 'border-green-200/60 bg-gradient-to-r from-green-100/60 via-emerald-50/40 to-transparent'
                                      : isInProgress
                                      ? 'border-blue-200/60 bg-gradient-to-r from-blue-100/60 via-indigo-50/40 to-transparent'
                                      : 'border-gray-200/60 bg-gradient-to-r from-gray-100/60 via-slate-50/40 to-transparent'
                                  } rounded-t-2xl`}>
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                                        isCompleted
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                          : isInProgress
                                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                          : 'bg-gradient-to-r from-red-500 to-rose-600'
                                      }`}>
                                        {isCompleted ? (
                                          <CheckCircle className="h-4 w-4 text-white" />
                                        ) : isInProgress ? (
                                          <Clock className="h-4 w-4 text-white" />
                                        ) : (
                                          <AlertCircle className="h-4 w-4 text-white" />
                                        )}
                                      </div>
                                      <span className="text-gray-800">{item.auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Audit</span>
                                      <span className={`ml-auto px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                                        item.priority === 'high'
                                          ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 border border-red-300'
                                          : item.priority === 'medium'
                                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border border-yellow-300'
                                          : 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300'
                                      }`}>
                                        {item.priority.toUpperCase()} PRIORITY
                                      </span>
                                    </CardTitle>
                                  </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="space-y-5">
                                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-200/50">
                                        <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                                          <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                                            <AlertCircle className="h-3 w-3 text-white" />
                                          </div>
                                          Issue Found
                                        </h4>
                                        <p className={`text-sm leading-relaxed font-medium ${
                                          isCompleted ? 'text-green-800' : 'text-gray-800'
                                        }`}>
                                          {item.question}
                                        </p>
                                      </div>

                                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50">
                                        <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                            <FileCheck className="h-3 w-3 text-white" />
                                          </div>
                                          What Needs Correcting
                                        </h4>
                                        <p className={`text-sm leading-relaxed font-medium ${
                                          isCompleted ? 'text-green-700' : 'text-gray-700'
                                        }`}>
                                          {item.issue}
                                        </p>
                                      </div>

                                      {item.comment && item.comment.trim() !== '' && (
                                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50">
                                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                              <span className="text-white text-xs">📝</span>
                                            </div>
                                            Additional Details
                                          </h4>
                                          <div className={`rounded-lg p-3 border-l-4 ${
                                            isCompleted
                                              ? 'bg-green-50/80 border-green-400 text-green-800'
                                              : 'bg-purple-50/80 border-purple-400 text-purple-800'
                                          }`}>
                                            <p className="text-sm italic font-medium">"{item.comment}"</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* RAG Rating and Team Assignment */}
                                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50">
                                        <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                                          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                                            <Timer className="h-3 w-3 text-white" />
                                          </div>
                                          Assignment & Timeline
                                        </h4>
                                        <div className="space-y-3">
                                          {/* RAG Rating Selector */}
                                          <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium text-gray-700 min-w-fit">Priority Level:</label>
                                            <div className="flex gap-4">
                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="radio"
                                                  aria-label="Red priority"
                                                  name={`rag-${item.id}`}
                                                  value="red"
                                                  checked={item.ragRating === 'red'}
                                                  onChange={() => handleRAGRatingUpdate(item.id, 'red')}
                                                  disabled={updatingItem === item.id}
                                                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                                                />
                                                <span className="sr-only">Red - 7 days</span>
                                                <span className="ml-2 w-3 h-3 bg-red-500 rounded-full" aria-hidden="true"></span>
                                              </label>

                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="radio"
                                                  aria-label="Amber priority"
                                                  name={`rag-${item.id}`}
                                                  value="amber"
                                                  checked={item.ragRating === 'amber'}
                                                  onChange={() => handleRAGRatingUpdate(item.id, 'amber')}
                                                  disabled={updatingItem === item.id}
                                                  className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 focus:ring-yellow-500"
                                                />
                                                <span className="sr-only">Amber - 14 days</span>
                                                <span className="ml-2 w-3 h-3 bg-yellow-500 rounded-full" aria-hidden="true"></span>
                                              </label>

                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="radio"
                                                  aria-label="Green priority"
                                                  name={`rag-${item.id}`}
                                                  value="green"
                                                  checked={item.ragRating === 'green'}
                                                  onChange={() => handleRAGRatingUpdate(item.id, 'green')}
                                                  disabled={updatingItem === item.id}
                                                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                                                />
                                                <span className="sr-only">Green - 30 days</span>
                                                <span className="ml-2 w-3 h-3 bg-green-500 rounded-full" aria-hidden="true"></span>
                                              </label>
                                            </div>
                                          </div>

                                          {/* Team/Person Assignment */}
                                          <div className="flex items-center gap-3">
                                            <label className="text-sm font-medium text-gray-700 min-w-fit">Assign to:</label>
                                            <div className="flex items-center gap-2 flex-1">
                                              <Select
                                                value={item.assignedTeam || ''}
                                                onValueChange={(value) => handleTeamAssignmentUpdate(item.id, value)}
                                                disabled={updatingItem === item.id || loadingTeams}
                                              >
                                                <SelectTrigger className="w-full">
                                                  <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select team or person"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {loadingTeams ? (
                                                    <SelectItem value="" disabled>
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Loading teams...</span>
                                                      </div>
                                                    </SelectItem>
                                                  ) : assignmentOptions.length === 0 ? (
                                                    <SelectItem value="" disabled>
                                                      <div className="flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        <span>No teams or staff available</span>
                                                      </div>
                                                    </SelectItem>
                                                  ) : (
                                                    assignmentOptions.map((option) => (
                                                      <SelectItem key={option.value} value={option.value}>
                                                        <div className="flex items-center gap-2">
                                                          <Users className="h-3 w-3" />
                                                          <span>{option.label}</span>
                                                        </div>
                                                      </SelectItem>
                                                    ))
                                                  )}
                                                </SelectContent>
                                              </Select>
                                              <button
                                                onClick={() => loadTeamsAndStaffData()}
                                                disabled={loadingTeams}
                                                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Refresh teams and staff"
                                              >
                                                {loadingTeams ? (
                                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                  </svg>
                                                )}
                                              </button>
                                            </div>
                                          </div>

                                          {/* Current Assignment Display */}
                                          {(item.ragRating || item.assignedTeam) && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                                              {item.ragRating && (
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getRAGColor(item.ragRating)}`}>
                                                  {item.ragRating.toUpperCase()} - {getRAGDays(item.ragRating)} days
                                                </span>
                                              )}
                                              {item.assignedTeam && (
                                                <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
                                                  Assigned: {assignmentOptions.find(opt => opt.value === item.assignedTeam)?.label || item.assignedTeam}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>                                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <span className={`px-4 py-2 text-xs font-bold rounded-full shadow-sm ${
                                              isCompleted
                                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-900 border border-green-300'
                                                : isInProgress
                                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300'
                                                : allAuditsCompleted
                                                ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border border-gray-300'
                                                : 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300'
                                            }`}>
                                              {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : allAuditsCompleted ? 'PENDING' : 'WAITING'}
                                            </span>
                                            {item.status === 'completed' && item.completedAt && (
                                              <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                                                <span className="text-xs text-green-700 font-medium">
                                                  ✅ {new Date(item.completedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex gap-2">
                                            {item.status !== 'completed' && (
                                              <button
                                                onClick={() => handleItemStatusUpdate(item.id, item.status === 'pending' ? 'in-progress' : 'completed')}
                                                disabled={updatingItem === item.id || !allAuditsCompleted}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm whitespace-nowrap ${
                                                  item.status === 'pending'
                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed'
                                                }`}
                                              >
                                                {updatingItem === item.id ? (
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Updating...
                                                  </div>
                                                ) : !allAuditsCompleted ? (
                                                  'Complete All Audits First'
                                                ) : item.status === 'pending' ? (
                                                  'Start Correction'
                                                ) : (
                                                  'Mark as Corrected'
                                                )}
                                              </button>
                                            )}
                                            {item.status === 'completed' && (
                                              <button
                                                onClick={() => handleItemStatusUpdate(item.id, 'pending')}
                                                disabled={updatingItem === item.id}
                                                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                                              >
                                                {updatingItem === item.id ? 'Updating...' : 'Reopen Issue'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {!allAuditsCompleted && item.status === 'pending' && (
                                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-300 backdrop-blur-sm">
                                          <div className="flex items-center justify-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                            <span className="text-sm text-amber-800 font-medium">Complete all audits to enable corrections</span>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            </div>
          ) : (
          <div className="w-full px-6 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Corrections Needed</h3>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  {completedAuditsCount === 0
                    ? "Complete your first audit to identify any areas needing correction."
                    : "All completed audits show compliance. Great job maintaining standards!"
                  }
                </p>
              </div>
            </div>
          </div>
        )}
              </>
            )}
          </TabsContent>

          <TabsContent value="tracker">
            <div className="space-y-8 pb-10">
              {historicalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {availableYears.map(year => (
                      <div key={year} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">{year} Action Plans</h2>
                            <p className="text-sm text-gray-500">Select a month to review saved action plans.</p>
                          </div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{historicalPlans.filter(plan => plan.monthKey.startsWith(year)).length} saved</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {MONTH_LABELS.map((monthLabel, index) => {
                            const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                            const plan = plansByYear[year]?.[monthKey];
                            const isSelected = selectedHistoricalPlan?.monthKey === monthKey;
                            const isCurrentMonth = monthKey === currentMonthKey;
                            const hasPlan = Boolean(plan);
                            return (
                              <button
                                key={monthKey}
                                type="button"
                                onClick={() => {
                                  if (plan) {
                                    setSelectedHistoricalPlan(plan);
                                  }
                                }}
                                disabled={!hasPlan}
                                className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                                  hasPlan
                                    ? 'bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'
                                    : 'bg-slate-50 border-dashed border-gray-300 text-gray-400 cursor-not-allowed'
                                } ${
                                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-semibold ${hasPlan ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {MONTH_SHORT_LABELS[index]}
                                  </span>
                                  {hasPlan ? (
                                    <span className="text-xs font-medium text-indigo-600">
                                      {plan?.progressPercent ?? 0}%
                                    </span>
                                  ) : (
                                    <span className="text-xs">No plan</span>
                                  )}
                                </div>
                                {hasPlan && (
                                  <div className="mt-3 space-y-2">
                                    <div className="text-xs text-gray-600">
                                      {plan?.completedItems || 0} / {plan?.totalItems || 0} completed
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {plan?.isComplete && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-green-700 bg-green-100 rounded-full">
                                          <CheckCircle className="h-3 w-3" />
                                          Finalised
                                        </span>
                                      )}
                                      {isCurrentMonth && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-100 rounded-full">
                                          <Clock className="h-3 w-3" />
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    {selectedHistoricalPlan ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">Action Plan — {getMonthLabelFromKey(selectedHistoricalPlan.monthKey)}</h3>
                            <p className="text-sm text-gray-600">
                              {selectedHistoricalPlan.totalItems} issues — {selectedHistoricalPlan.completedItems} completed
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Progress {selectedHistoricalPlan.progressPercent || 0}%
                            </span>
                            <button
                              onClick={async () => {
                                await downloadActionPlanPDF(selectedHistoricalPlan, getMonthLabelFromKey(selectedHistoricalPlan.monthKey));
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                            >
                              <FileCheck className="h-4 w-4" />
                              Download PDF
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {selectedHistoricalPlan.items.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleHistoricalItemClick(item)}
                              className="w-full text-left rounded-xl border border-gray-200 p-4 bg-white shadow-sm transition-all hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">{item.issue}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </div>
                                </div>
                                <span className={`px-2 py-1 text-[11px] font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                  {item.status.replace('-', ' ').toUpperCase()}
                                </span>
                              </div>

                              <p className="text-sm text-gray-600 mb-4">{item.question}</p>

                              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className={`px-2 py-1 rounded-full border ${
                                  item.priority === 'high'
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : item.priority === 'medium'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-green-200 bg-green-50 text-green-700'
                                }`}>
                                  Priority {item.priority.toUpperCase()}
                                </span>
                                {item.ragRating && (
                                  <span className={`px-2 py-1 rounded-full border ${getRAGColor(item.ragRating)}`}>
                                    {item.ragRating.toUpperCase()}{getRAGDays(item.ragRating) ? ` • ${getRAGDays(item.ragRating)} days` : ''}
                                  </span>
                                )}
                                {item.assignedTeam && (
                                  <span className="px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                                    Assigned: {assignmentOptions.find(option => option.value === item.assignedTeam)?.label || item.assignedTeam}
                                  </span>
                                )}
                                {item.completedAt && (
                                  <span className="px-2 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
                                    Completed {new Date(item.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between text-xs text-indigo-600">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <FileText className="h-3.5 w-3.5" />
                                  View audit details
                                </span>
                                <span className="text-[11px] text-gray-400">Click to open</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-14 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm">Select a month from the tracker to review its action plan.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={auditModalOpen} onOpenChange={handleAuditModalOpenChange}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {selectedAuditItem ? `${formatAuditTypeLabel(selectedAuditItem.auditType)} Audit` : 'Audit details'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              {selectedHistoricalPlan
                ? `Captured as part of the ${getMonthLabelFromKey(selectedHistoricalPlan.monthKey)} action plan.`
                : 'Review the saved audit snapshot.'}
            </DialogDescription>
          </DialogHeader>

          {auditModalLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <span className="text-sm">Loading audit details…</span>
            </div>
          ) : auditError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {auditError}
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-6 py-1">
                {selectedAuditItem && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Action plan context</p>
                    <h4 className="mt-2 text-base font-semibold text-gray-900">{selectedAuditItem.issue}</h4>
                    <p className="mt-1 text-sm text-gray-700">{selectedAuditItem.question}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={`px-3 py-1 rounded-full border ${getStatusColor(selectedAuditItem.status)} bg-white/80 font-semibold`}>Status {selectedAuditItem.status.replace('-', ' ').toUpperCase()}</span>
                      <span className={`px-3 py-1 rounded-full border ${
                        selectedAuditItem.priority === 'high'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : selectedAuditItem.priority === 'medium'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                      }`}>
                        Priority {selectedAuditItem.priority.toUpperCase()}
                      </span>
                      {selectedAuditItem.ragRating && (
                        <span className={`px-3 py-1 rounded-full border ${getRAGColor(selectedAuditItem.ragRating)}`}>
                          {selectedAuditItem.ragRating.toUpperCase()}{getRAGDays(selectedAuditItem.ragRating) ? ` • ${getRAGDays(selectedAuditItem.ragRating)} days` : ''}
                        </span>
                      )}
                      {selectedAuditItem.assignedTeam && (
                        <span className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                          Assigned: {assignmentOptions.find(option => option.value === selectedAuditItem.assignedTeam)?.label || selectedAuditItem.assignedTeam}
                        </span>
                      )}
                      {selectedAuditItem.completedAt && (
                        <span className="px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
                          Completed {new Date(selectedAuditItem.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {auditSummary.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                      <Info className="h-4 w-4 text-indigo-600" />
                      Snapshot summary
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {auditSummary.map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                          <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topLevelDetails.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Additional details
                    </div>
                    <div className="space-y-3">
                      {topLevelDetails.map(detail => (
                        <div key={detail.label} className="rounded-lg border border-gray-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{detail.label}</p>
                          <div className="mt-2">{renderFieldValue(detail.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResponses.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
                      <FileCheck className="h-4 w-4 text-indigo-600" />
                      Audit responses
                    </div>
                    <div className="space-y-3">
                      {auditResponses.map(response => (
                        <div key={response.key} className="rounded-lg border border-gray-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{response.label}</p>
                          <div className="mt-2">{renderFieldValue(response.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {auditResponses.length === 0 && !auditModalLoading && !auditError && (
                  <p className="text-sm text-gray-500">No question-level responses were stored for this audit.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}