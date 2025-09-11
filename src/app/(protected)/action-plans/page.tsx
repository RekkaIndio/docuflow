'use client';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { getMonthlyActionPlan, updateActionPlanItemStatus, areAllAuditsCompleted, getCurrentMonthKey, MonthlyActionPlan, ActionPlanItem } from '@/lib/action-plans';
import { getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, FileCheck, ChevronDown, ChevronRight } from "lucide-react";

export default function ActionPlansPage() {
  const activeWorkspace = useWorkspace();
  const [actionPlan, setActionPlan] = useState<MonthlyActionPlan | null>(null);
  const [auditCompletionStatus, setAuditCompletionStatus] = useState<Record<string, boolean>>({});
  const [allAuditsCompleted, setAllAuditsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadActionPlanData();
  }, [activeWorkspace?.id]);

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

  const handleItemStatusUpdate = async (itemId: string, status: 'pending' | 'in-progress' | 'completed') => {
    if (!activeWorkspace?.id || !actionPlan) return;

    setUpdatingItem(itemId);
    try {
      await updateActionPlanItemStatus(activeWorkspace.id, currentMonthKey, itemId, status);
      await loadActionPlanData(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to update item status:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
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
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
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
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
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
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
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
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all duration-200">
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
      <div className="pt-8">
        {/* Action Plan Status */}
        <div className="w-full px-6 mb-6">
          {!allAuditsCompleted && (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200/60 rounded-xl shadow-lg backdrop-blur-sm">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">Building Correction Plan</h3>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      Complete all audits to see the full list of corrections needed. Currently showing <strong>{actionPlan?.totalItems || 0} issues</strong> from <strong>{completedAuditsCount} completed audits</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {allAuditsCompleted && (
            <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border border-green-200/60 rounded-xl shadow-lg backdrop-blur-sm">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">All Audits Completed</h3>
                    <p className="text-green-800 text-sm leading-relaxed">
                      Full correction plan is now available with <strong>{actionPlan?.totalItems || 0} issue{actionPlan?.totalItems !== 1 ? 's' : ''}</strong> to address.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Items */}
        {actionPlan && actionPlan.items.length > 0 ? (
          <div className="w-full px-6 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 p-6 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FileCheck className="h-4 w-4 text-white" />
                      </div>
                      Items Needing Correction
                    </h2>
                    {!allAuditsCompleted && actionPlan && actionPlan.totalItems > 0 && (
                      <p className="text-sm text-amber-600 mt-1 ml-11">Complete all audits to start corrections</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        const allExpanded = Object.keys(groupedItems).every(key => expandedSections[key]);
                        const newState = Object.keys(groupedItems).reduce((acc, key) => {
                          acc[key] = !allExpanded;
                          return acc;
                        }, {} as Record<string, boolean>);
                        setExpandedSections(newState);
                      }}
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
                    >
                      {Object.keys(groupedItems).every(key => expandedSections[key]) ? 'Collapse All' : 'Expand All'}
                    </button>
                    <div className="bg-white/70 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200">
                      <div className="text-sm font-medium text-gray-700">
                        {actionPlan?.items.filter(item => item.status !== 'completed').length || 0} pending corrections
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grouped sections by audit type */}
              <div className="p-6 space-y-4">
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
                                      )}                                      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
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