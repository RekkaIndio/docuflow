'use client';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { getMonthlyActionPlan, updateActionPlanItemStatus, areAllAuditsCompleted, getCurrentMonthKey, MonthlyActionPlan, ActionPlanItem } from '@/lib/action-plans';
import { getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Clock, FileCheck, ChevronDown, ChevronRight, Users, Timer } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { workspaceCollectionPath, workspaceDocPath } from '@/lib/paths';
import { generateActionPlanPDF, getActionPlanPDFFilename, ActionPlanPDFData } from '@/lib/action-plan-pdf-generator';
import { db } from '@/lib/firebase';
import { finalizeActionPlan } from '@/actions/action-plans';
import { useToast } from '@/hooks/use-toast';

export default function ActionPlansPage() {
  const activeWorkspace = useWorkspace();
  const [actionPlan, setActionPlan] = useState<MonthlyActionPlan | null>(null);
  const [auditCompletionStatus, setAuditCompletionStatus] = useState<Record<string, boolean>>({});
  const [allAuditsCompleted, setAllAuditsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  
  // Teams and staff data
  const [teams, setTeams] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const { toast } = useToast();

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadActionPlanData();
    loadTeamsAndStaffData();
  }, [activeWorkspace?.id]);

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
      const plan = await getMonthlyActionPlan(activeWorkspace.id, currentMonthKey);
      setActionPlan(plan);

      // Load audit completion status
      const auditStatus = await getMonthlyAuditCompletionStatus(activeWorkspace.id);
      setAuditCompletionStatus(auditStatus);

      // Check if all audits are completed
      const allCompleted = await areAllAuditsCompleted(activeWorkspace.id, currentMonthKey);
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

  const loadTeamsAndStaffData = async () => {
    if (!activeWorkspace?.id) return;

    setLoadingTeams(true);
    try {
      // Load teams
  const teamsCollection = collection(db, workspaceCollectionPath(activeWorkspace.id, 'teams', (activeWorkspace as any).organisationId));
      const teamsSnapshot = await getDocs(teamsCollection);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'team'
      }));
      setTeams(teamsData);

      // Load staff data from workspace
  const workspaceRef = doc(db, workspaceDocPath(activeWorkspace.id, undefined, (activeWorkspace as any).organisationId));
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
  };  const handleItemStatusUpdate = async (itemId: string, status: 'pending' | 'in-progress' | 'completed') => {
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
      await updateActionPlanItemStatus(activeWorkspace.id, currentMonthKey, itemId, status);
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
          item.assignedTeam
        );

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
          assignedTeam
        );

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

  const getRAGColor = (rating?: string) => {
    switch (rating) {
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'amber': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getAvailableTeamsAndStaff = () => {
    const options: Array<{value: string, label: string, type: string}> = [];

    // Add teams
    teams.forEach(team => {
      if (team.name) {
        options.push({
          value: `team-${team.id}`,
          label: `${team.name} (Team)`,
          type: 'team'
        });
      }
    });

    // Add staff from different categories
    Object.entries(staffData).forEach(([category, staffList]) => {
      if (Array.isArray(staffList)) {
        staffList.forEach((staff: any) => {
          if (staff.name) {
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

  const canFinalizePlan = actionPlan && actionPlan.items && actionPlan.items.length > 0 && actionPlan.items.every(it => it.status === 'completed');

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white p-6 rounded-b-xl relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold leading-tight tracking-tight">Action Plans</h1>
              <p className="text-slate-200 text-base leading-relaxed">Track and correct issues identified from monthly audits to maintain compliance standards</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-white/6 rounded-lg border border-white/10 shadow-sm hover:bg-white/10 transition-colors duration-150">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-300" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Issues Found</div>
                    <div className="text-2xl font-bold text-white">{actionPlan?.totalItems || 0}</div>
                  </div>
                </div>
              </div>
              {canFinalizePlan && (
                <div>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
                    onClick={async () => {
                      if (!activeWorkspace?.id || !actionPlan) return;
                      try {
                        // Call server action to finalize and save PDF
                        const res = await finalizeActionPlan(activeWorkspace.id, currentMonthKey);
                        toast({ title: 'Action plan finalized', description: 'Saved to Action Plans folder.' });
                        // reload
                        loadActionPlanData();
                      } catch (e) {
                        console.error('Finalize failed', e);
                        toast({ title: 'Failed to finalize', description: 'See console for details.' });
                      }
                    }}
                  >
                    <FileCheck className="w-4 h-4" />
                    Complete action
                  </button>
                </div>
              )}
              <div className="p-3 bg-white/6 rounded-lg border border-white/10 shadow-sm hover:bg-white/10 transition-colors duration-150">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Pending</div>
                    <div className="text-2xl font-bold text-white">{(actionPlan?.totalItems || 0) - (actionPlan?.completedItems || 0)}</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white/6 rounded-lg border border-white/10 shadow-sm hover:bg-white/10 transition-colors duration-150">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Completed</div>
                    <div className="text-2xl font-bold text-white">{actionPlan?.completedItems || 0}</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white/6 rounded-lg border border-white/10 shadow-sm hover:bg-white/10 transition-colors duration-150">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileCheck className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium uppercase tracking-wide">Progress</div>
                    <div className="text-2xl font-bold text-white">{actionPlan?.progressPercent || 0}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  {/* Main Content Container */}
  <div className="pt-6 px-4">
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
                                try {
                                  const items = actionPlan.items.map(it => ({
                                    auditType: it.auditType,
                                    issue: it.issue,
                                    assigned: (() => {
                                      const opt = getAvailableTeamsAndStaff().find(o => o.value === it.assignedTeam);
                                      return opt ? opt.label : (it.assignedTeam || 'Unassigned');
                                    })(),
                                    ragRating: it.ragRating,
                                    status: it.status,
                                    completedAt: it.completedAt
                                  }));

                                  const pdfData: ActionPlanPDFData = {
                                    workspaceName: activeWorkspace?.name || 'Workspace',
                                    monthLabel: currentMonthName,
                                    generatedBy: activeWorkspace?.name || 'System',
                                    items
                                  };

                                  const pdfBuf = await generateActionPlanPDF(pdfData);
                                  // jsPDF returns an ArrayBuffer-like Uint8Array; cast to any for Blob constructor to avoid TS ArrayBuffer/SharedArrayBuffer mismatch
                                  const blob = new Blob([pdfBuf as any], { type: 'application/pdf' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = getActionPlanPDFFilename(activeWorkspace?.name || 'workspace', currentMonthName);
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error('Error generating Action Plan PDF:', error);
                                  alert('Failed to generate PDF. Check console for details.');
                                }
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
                              <th className="p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {actionPlan.items.map((item, idx) => (
                              <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-gray-100`}>
                                <td className="p-4 align-top text-sm text-gray-800">{item.auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                                <td className="p-4 align-top text-sm text-gray-700">{item.issue}</td>
                                <td className="p-4 align-top">
                                  <Select value={item.assignedTeam || ''} onValueChange={(v) => handleTeamAssignmentUpdate(item.id, v)} disabled={updatingItem === item.id || loadingTeams}>
                                    <SelectTrigger className="w-full max-w-xs">
                                      <SelectValue placeholder={loadingTeams ? 'Loading...' : (getAvailableTeamsAndStaff().find(opt => opt.value === item.assignedTeam)?.label || 'Unassigned')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableTeamsAndStaff().map(opt => (
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
                                                  ) : getAvailableTeamsAndStaff().length === 0 ? (
                                                    <SelectItem value="" disabled>
                                                      <div className="flex items-center gap-2">
                                                        <Users className="h-3 w-3" />
                                                        <span>No teams or staff available</span>
                                                      </div>
                                                    </SelectItem>
                                                  ) : (
                                                    getAvailableTeamsAndStaff().map((option) => (
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
                                                  Assigned: {getAvailableTeamsAndStaff().find(opt => opt.value === item.assignedTeam)?.label || item.assignedTeam}
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
      </div>
    </div>
  );
}