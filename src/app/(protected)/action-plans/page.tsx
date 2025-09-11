'use client';
import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/workspace';
import { getMonthlyActionPlan, updateActionPlanItemStatus, areAllAuditsCompleted, getCurrentMonthKey, MonthlyActionPlan, ActionPlanItem } from '@/lib/action-plans';
import { getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, FileCheck } from "lucide-react";

export default function ActionPlansPage() {
  const activeWorkspace = useWorkspace();
  const [actionPlan, setActionPlan] = useState<MonthlyActionPlan | null>(null);
  const [auditCompletionStatus, setAuditCompletionStatus] = useState<Record<string, boolean>>({});
  const [allAuditsCompleted, setAllAuditsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

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
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-b-2xl shadow-lg relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">Action Plans</h1>
          <p className="text-blue-100 mb-4">Track and correct issues identified from monthly audits</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              Current Month: {currentMonthName}
            </span>
            <span className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              Audits Completed: {completedAuditsCount}/{totalAuditsCount}
            </span>
            <span className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              Issues Found: {actionPlan?.totalItems || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-sm border mx-6 mb-6">
        <div className="max-w-7xl mx-auto p-6">
          <h2 className="text-xl font-semibold mb-4">Correction Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{actionPlan?.totalItems || 0}</div>
              <div className="text-sm text-gray-600">Issues Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(actionPlan?.totalItems || 0) - (actionPlan?.completedItems || 0)}
              </div>
              <div className="text-sm text-gray-600">Pending Corrections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{actionPlan?.completedItems || 0}</div>
              <div className="text-sm text-gray-600">Corrections Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{actionPlan?.progressPercent || 0}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Corrections Needed</span>
              <span>{actionPlan?.progressPercent || 0}% Complete</span>
            </div>
            <div className="w-full bg-red-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${actionPlan?.progressPercent || 0}%` }}
              ></div>
            </div>
            {!allAuditsCompleted && actionPlan && actionPlan.totalItems > 0 && (
              <div className="mt-2 text-xs text-amber-600 text-center">
                Complete all audits to enable correction actions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Plan Status */}
      {!allAuditsCompleted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg mx-6 mb-6">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Building Correction Plan</h3>
                <p className="text-amber-700 text-sm">
                  Complete all audits to see the full list of corrections needed. Currently showing {actionPlan?.totalItems || 0} issues from {completedAuditsCount} completed audits.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {allAuditsCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-lg mx-6 mb-6">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-green-800">All Audits Completed</h3>
                <p className="text-green-700 text-sm">
                                    Full correction plan is now available with {actionPlan?.totalItems || 0} issue{actionPlan?.totalItems !== 1 ? 's' : ''} to address.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionPlan && actionPlan.items.length > 0 ? (
        <div className="mx-6 mb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                Items Needing Correction
                {!allAuditsCompleted && actionPlan && actionPlan.totalItems > 0 && (
                  <span className="text-sm font-normal text-amber-600 ml-2">(Complete all audits to start corrections)</span>
                )}
              </h2>
              <div className="text-sm text-gray-600">
                {actionPlan?.items.filter(item => item.status !== 'completed').length || 0} pending corrections
              </div>
            </div>

            {/* Individual correction cards in responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {actionPlan.items.map((item) => {
                const isCompleted = item.status === 'completed';
                const isPending = item.status === 'pending';
                const isInProgress = item.status === 'in-progress';

                return (
                  <Card key={item.id} className={`group hover:shadow-xl transition-all duration-300 border ${
                    isCompleted
                      ? 'border-green-200/60 bg-green-50/90 backdrop-blur-sm shadow-lg hover:shadow-green-100/50'
                      : 'border-blue-200/60 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-blue-100/50'
                  } rounded-2xl`}>
                    <CardHeader className={`pb-3 border-b ${
                      isCompleted
                        ? 'border-green-100/80 bg-gradient-to-r from-green-50/40 to-transparent'
                        : 'border-blue-100/80 bg-gradient-to-r from-blue-50/40 to-transparent'
                    } rounded-t-2xl`}>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : isInProgress ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {item.auditType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Audit
                        <span className={`ml-auto px-3 py-1 text-xs font-medium rounded-full border ${
                          item.priority === 'high'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : item.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {item.priority.toUpperCase()} PRIORITY
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Issue Found:
                          </h4>
                          <p className={`text-sm leading-relaxed ${
                            isCompleted ? 'text-green-800' : 'text-gray-800'
                          }`}>
                            {item.question}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-sm flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-blue-500" />
                            What Needs Correcting:
                          </h4>
                          <p className={`text-sm leading-relaxed ${
                            isCompleted ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {item.issue}
                          </p>
                        </div>

                        {item.comment && item.comment.trim() !== '' && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 text-sm">📝 Additional Details:</h4>
                            <div className={`rounded-lg p-3 border-l-4 ${
                              isCompleted
                                ? 'bg-green-50/60 border-green-300 text-green-800'
                                : 'bg-gray-50 border-gray-300 text-gray-700'
                            }`}>
                              <p className="text-sm italic">"{item.comment}"</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              isCompleted
                                ? 'bg-green-100 text-green-800'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-800'
                                : allAuditsCompleted
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : allAuditsCompleted ? 'PENDING' : 'WAITING'}
                            </span>
                            {item.status === 'completed' && item.completedAt && (
                              <span className="text-xs text-green-600 font-medium">
                                ✅ {new Date(item.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {item.status !== 'completed' && (
                              <button
                                onClick={() => handleItemStatusUpdate(item.id, item.status === 'pending' ? 'in-progress' : 'completed')}
                                disabled={updatingItem === item.id || !allAuditsCompleted}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                                  item.status === 'pending'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
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
                                className="px-4 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {updatingItem === item.id ? 'Updating...' : 'Reopen Issue'}
                              </button>
                            )}
                          </div>
                        </div>

                        {!allAuditsCompleted && item.status === 'pending' && (
                          <div className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                            Complete all audits to enable corrections
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Corrections Needed</h3>
          <p className="text-gray-600">
            {completedAuditsCount === 0
              ? "Complete your first audit to identify any areas needing correction."
              : "All completed audits show compliance. Great job maintaining standards!"
            }
          </p>
        </div>
      )}
    </div>
  );
}