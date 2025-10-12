'use client';
import React, { useEffect, useState } from "react";
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceCollectionPath } from '@/lib/paths';
import { useWorkspace } from '@/context/workspace';
import { getAuditSchedule, setAuditSchedule, getAuditStatus, getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import AccidentIncidentAuditPage from "./accident-incident/page";
import CallBellMonitoringAuditPage from "./call-bell-monitoring/page";
import CarePlanAuditPage from "./care-plan/page";
import MedicationAuditPage from "./medication/page";
import AuditHeader from '@/components/audit-header';
import EquipmentAuditPage from "./equipment/page";
import FireSafetyAuditPage from "./fire-safety/page";
import HandHygieneAuditPage from "./hand-hygiene/page";
import HealthSafetyAuditPage from "./health-safety/page";
import InfectionControlAuditPage from "./infection-control/page";
import KitchenAuditPage from "./kitchen/page";
import MaintenanceAuditPage from "./maintenance/page";
import ManagersWeeklyAuditPage from "./managers-weekly/page";
import ManagersMonthlyAuditPage from "./managers-monthly/page";
import MealtimeAuditPage from "./mealtime/page";
import NightVisitAuditPage from "./night-visit/page";
import RestrictivePracticeAuditPage from "./restrictive-practice/page";
import StaffFileAuditPage from "./staff-file/page";
import WeightMonitoringAuditPage from "./weight-monitoring/page";
import WoundMonitoringAuditPage from "./wound-monitoring/page";
import RiskRegisterAuditPage from "./risk-register/page";
import PageHeader from '@/components/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AuditsPage() {
  const activeWorkspace = useWorkspace();
  const [auditScheduleMap, setAuditScheduleMap] = useState<Record<string, string | null>>({});
  const [auditStatusMap, setAuditStatusMap] = useState<Record<string, string>>({});
  const [monthlyCompletionStatus, setMonthlyCompletionStatus] = useState<Record<string, boolean>>({});
  const [monthlySnapshotsCount, setMonthlySnapshotsCount] = useState<Record<string, number>>({});
  const [pendingCreateAuditType, setPendingCreateAuditType] = useState<string | null>(null);
  const [accidentAuditStartFresh, setAccidentAuditStartFresh] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!activeWorkspace?.id) return;
    
    // Load monthly completion status
    const loadMonthlyStatus = async () => {
      try {
        const status = await getMonthlyAuditCompletionStatus(activeWorkspace.id, activeWorkspace.organisationId || null);
        if (mounted) setMonthlyCompletionStatus(status);
        // also compute snapshots counts for progress indicators
        try {
          const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
          const snaps = await getMonthlyAuditSnapshots(activeWorkspace.id, undefined, activeWorkspace.organisationId || null);
          const counts: Record<string, number> = {};
          Object.keys(snaps || {}).forEach(k => { counts[k] = Array.isArray(snaps[k]) ? snaps[k].length : 0; });
          if (mounted) setMonthlySnapshotsCount(counts);
        } catch (e) {
          console.warn('Failed to load monthly snapshots for progress', e);
        }
      } catch (e) {
        console.warn('Failed to load monthly audit completion status', e);
      }
    };
    
    loadMonthlyStatus();
    
  try {
  const settingsCol = collection(db, workspaceCollectionPath(activeWorkspace.id, 'settings', activeWorkspace.organisationId));
  const schedRef = doc(settingsCol, 'audit_schedule');
  const statusRef = doc(settingsCol, 'audit_status');

  const unsubSched = onSnapshot(schedRef, (snap) => {
        if (!mounted) return;
        if (!snap.exists()) return setAuditScheduleMap({});
        setAuditScheduleMap(snap.data() as Record<string, string | null>);
      }, (err) => console.warn('Audit schedule snapshot error', err));

  const unsubStatus = onSnapshot(statusRef, (snap) => {
        if (!mounted) return;
        if (!snap.exists()) return setAuditStatusMap({});
        setAuditStatusMap(snap.data() as Record<string, string>);
        // Reload monthly status when audit status changes
        loadMonthlyStatus();
      }, (err) => console.warn('Audit status snapshot error', err));

      return () => {
        mounted = false;
        unsubSched();
        unsubStatus();
      };
    } catch (e) {
      console.warn('Failed to subscribe to audit schedules/status', e);
    }
  }, [activeWorkspace?.id]);
  const [currentView, setCurrentView] = useState<'list' | 'accident-incident' | 'call-bell-monitoring' | 'care-plan' | 'medication' | 'equipment' | 'fire-safety' | 'hand-hygiene' | 'health-safety' | 'infection-control' | 'kitchen' | 'maintenance' | 'managers-weekly' | 'managers-monthly' | 'night-visit' | 'restrictive-practice' | 'staff-file' | 'weight-monitoring' | 'wound-monitoring' | 'mealtime' | 'risk-register'>('list');

  // Check if we should auto-open a specific audit (from compliance card clicks)
  useEffect(() => {
    const openAuditType = localStorage.getItem('openAuditType');
    if (openAuditType) {
      // Clear the stored audit type
      localStorage.removeItem('openAuditType');
      // Set the current view to the specified audit type
  if (openAuditType === 'accident-incident' || 
          openAuditType === 'call-bell-monitoring' ||
          openAuditType === 'care-plan' ||
      openAuditType === 'medication' ||
      openAuditType === 'managers-monthly' ||
          openAuditType === 'equipment' ||
          openAuditType === 'fire-safety' ||
          openAuditType === 'hand-hygiene' ||
          openAuditType === 'health-safety' ||
          openAuditType === 'infection-control' ||
          openAuditType === 'kitchen' ||
          openAuditType === 'maintenance' ||
          openAuditType === 'managers-weekly' ||
          openAuditType === 'night-visit' ||
          openAuditType === 'restrictive-practice' ||
          openAuditType === 'staff-file' ||
          openAuditType === 'weight-monitoring' ||
          openAuditType === 'wound-monitoring' ||
          openAuditType === 'mealtime' ||
          openAuditType === 'risk-register') {
        setCurrentView(openAuditType as any);
      }
    }
  }, []);

  const handleAuditCardClick = (auditType: string, options?: { bypassCompletionCheck?: boolean; startFresh?: boolean }) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    if (isCompleted && !options?.bypassCompletionCheck) {
      alert('This audit has already been completed for this month. You can edit it if needed.');
      return;
    }
    setAccidentAuditStartFresh(auditType === 'accident-incident' ? !!options?.startFresh : false);
    setCurrentView(auditType as any);
  };

  const handleEditAudit = (auditType: string) => {
    setAccidentAuditStartFresh(false);
    setCurrentView(auditType as any);
  };

  // Calculate next reset date (7th of next month) and days remaining
  const calculateResetInfo = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Determine the next reset date (7th of next month, or this month if we haven't passed the 7th yet)
    let resetMonth = currentMonth;
    let resetYear = currentYear;
    
    if (currentDay >= 7) {
      // If we've passed the 7th this month, next reset is 7th of next month
      resetMonth = currentMonth + 1;
      if (resetMonth > 11) {
        resetMonth = 0;
        resetYear = currentYear + 1;
      }
    }
    
    const resetDate = new Date(resetYear, resetMonth, 7);
    const timeDiff = resetDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return { resetDate, daysRemaining };
  };

  const { resetDate, daysRemaining } = calculateResetInfo();
  
  // Determine color based on days remaining
  const getCountdownColor = (days: number) => {
    if (days > 15) return { text: 'text-green-800', bg: 'bg-green-100' };
    if (days > 5) return { text: 'text-amber-800', bg: 'bg-amber-100' };
    return { text: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const AuditCard = ({ 
    auditType, 
    title, 
    description, 
    colorClass,
    onClick,
    onCreateNew,
  }: { 
    auditType: string;
    title: string;
    description: string;
    colorClass: string;
    onClick: () => void;
    onCreateNew?: () => void;
  }) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    const snapshotCount = monthlySnapshotsCount[auditType] ?? 0;
    const progressPercent = auditType === 'managers-weekly' ? Math.min(100, Math.round((snapshotCount / 4) * 100)) : undefined;
    // If there are fewer than 5 days remaining until reset and the audit is not completed,
    // mark it as urgent (red highlight)
    const isUrgent = !isCompleted && typeof daysRemaining === 'number' && daysRemaining < 5;

    return (
      <div className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${isCompleted ? 'ring-2 ring-green-200' : isUrgent ? 'ring-2 ring-red-200' : ''} min-h-[170px] flex flex-col justify-between`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-900 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-900 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {/* Top accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${isCompleted ? 'from-green-500 to-green-600' : isUrgent ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'}`}></div>

        <div className="p-6 relative z-10 flex-1 flex">
          <div className="flex items-start gap-4 w-full">
            {/* Icon */}
            <div className={`p-3 rounded-xl bg-gradient-to-br ${isCompleted ? 'from-green-100 to-green-200' : isUrgent ? 'from-red-100 to-red-200' : 'from-blue-100 to-blue-200'} shadow-sm`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isCompleted ? 'text-green-600' : isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className={`text-lg font-semibold text-gray-900 ${isCompleted ? 'text-green-800' : ''} group-hover:text-gray-800 transition-colors`}>
                  {title}
                </h3>
                {auditType === 'managers-weekly' && !isCompleted && typeof progressPercent === 'number' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{progressPercent}%</span>
                )}
              </div>
              <p className={`text-sm text-gray-600 mt-1 ${isCompleted ? 'text-green-700' : ''} group-hover:text-gray-700 transition-colors`}>
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {isCompleted ? (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completed
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAudit(auditType);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                  >
                    Edit
                  </button>
                  {onCreateNew && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateNew();
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-sm"
                    >
                      Create New
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                      isUrgent 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    }`}
                  >
                    Start Audit
                  </button>
                  {onCreateNew && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateNew();
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-sm"
                    >
                      Create New
                    </button>
                  )}
                </div>
              )}
              {/* Show progress bar for managers-weekly */}
              {auditType === 'managers-weekly' && !isCompleted && (
                <div className="mt-3 w-40">
                  <div className="text-xs text-gray-600 mb-1">Progress: {snapshotCount}/4</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-blue-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  

  if (currentView === 'infection-control') {
    return (
      <div>
        <AuditHeader title="Infection Control Audit" subtitle="Procedures for infection prevention" onBack={() => setCurrentView('list')} />
        <InfectionControlAuditPage />
      </div>
    );
  }

  if (currentView === 'call-bell-monitoring') {
    return (
      <div>
        <AuditHeader title="Call Bell Monitoring Audit" subtitle="Monitor and log call bell responses" onBack={() => setCurrentView('list')} />
        <CallBellMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'care-plan') {
    return (
      <div>
        <AuditHeader title="Care Plan Audit" subtitle="Review resident care plans" onBack={() => setCurrentView('list')} />
        <CarePlanAuditPage />
      </div>
    );
  }

  if (currentView === 'medication') {
    return (
      <div>
        <AuditHeader title="Medication Audit" subtitle="Medication management and safety" onBack={() => setCurrentView('list')} />
        <MedicationAuditPage />
      </div>
    );
  }

  if (currentView === 'equipment') {
    return (
      <div>
        <AuditHeader title="Equipment Audit" subtitle="Check equipment safety and maintenance" onBack={() => setCurrentView('list')} />
        <EquipmentAuditPage />
      </div>
    );
  }

  if (currentView === 'fire-safety') {
    return (
      <div>
        <AuditHeader title="Fire Safety Audit" subtitle="Ensure fire safety compliance" onBack={() => setCurrentView('list')} />
        <FireSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'hand-hygiene') {
    return (
      <div>
        <AuditHeader title="Hand Hygiene Audit" subtitle="Track hand hygiene practices" onBack={() => setCurrentView('list')} />
        <HandHygieneAuditPage />
      </div>
    );
  }

  if (currentView === 'health-safety') {
    return (
      <div>
        <AuditHeader title="Health and Safety Audit" subtitle="General health and safety checks" onBack={() => setCurrentView('list')} />
        <HealthSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'kitchen') {
    return (
      <div>
        <AuditHeader title="Kitchen & Kitchenettes Audit" subtitle="Food safety and kitchen cleanliness" onBack={() => setCurrentView('list')} />
        <KitchenAuditPage />
      </div>
    );
  }

  if (currentView === 'maintenance') {
    return (
      <div>
        <AuditHeader title="Maintenance Audit" subtitle="Building and facility maintenance checks" onBack={() => setCurrentView('list')} />
        <MaintenanceAuditPage />
      </div>
    );
  }

  if (currentView === 'managers-weekly') {
    return (
      <div>
        <AuditHeader title="Weekly Managers Walkaround Audit" subtitle="Weekly leadership checks" onBack={() => setCurrentView('list')} />
        <ManagersWeeklyAuditPage />
      </div>
    );
  }

  if (currentView === 'mealtime') {
    return (
      <div>
        <AuditHeader title="Meal Time Audit" subtitle="Monitor meal service quality" onBack={() => setCurrentView('list')} />
        <MealtimeAuditPage />
      </div>
    );
  }

  if (currentView === 'managers-monthly') {
    return (
      <div>
        <AuditHeader title="Managers Monthly Audit" subtitle="Comprehensive monthly leadership checks" onBack={() => setCurrentView('list')} />
        <ManagersMonthlyAuditPage />
      </div>
    );
  }

  if (currentView === 'night-visit') {
    return (
      <div>
        <AuditHeader title="Night Visit Audit" subtitle="Night-time checks and observations" onBack={() => setCurrentView('list')} />
        <NightVisitAuditPage />
      </div>
    );
  }

  if (currentView === 'restrictive-practice') {
    return (
      <div>
        <AuditHeader title="Restrictive Practice Audit" subtitle="Assess restrictive practice use" onBack={() => setCurrentView('list')} />
        <RestrictivePracticeAuditPage />
      </div>
    );
  }

  if (currentView === 'weight-monitoring') {
    return (
      <div>
        <AuditHeader title="Weight Monitoring Audit" subtitle="Track resident weight changes" onBack={() => setCurrentView('list')} />
        <WeightMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'staff-file') {
    return (
      <div>
        <AuditHeader title="Staff File Audit" subtitle="Check staff records and training" onBack={() => setCurrentView('list')} />
        <StaffFileAuditPage />
      </div>
    );
  }

  if (currentView === 'wound-monitoring') {
    return (
      <div>
        <AuditHeader title="Wound Monitoring Audit" subtitle="Record wound status and care" onBack={() => setCurrentView('list')} />
        <WoundMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'risk-register') {
    return (
      <div>
        <AuditHeader title="Risk Register" subtitle="Overview of resident risks and mitigations" onBack={() => setCurrentView('list')} />
        <RiskRegisterAuditPage />
      </div>
    );
  }
  

  // Handle different audit views
  if (currentView === 'accident-incident') {
    return (
      <div>
        <AuditHeader
          title="Accident and Incident Audit"
          subtitle="Record and review accidents and incidents"
          onBack={() => {
            setAccidentAuditStartFresh(false);
            setCurrentView('list');
          }}
        />
        <AccidentIncidentAuditPage startFresh={accidentAuditStartFresh} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audits"
        subtitle="Complete monthly compliance audits and track performance"
        gradientClass="from-primary to-accent"
        textClass="text-primary-foreground"
        leading={(
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground w-6 h-6">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        actions={(
          <div className="text-right">
            <div className="flex flex-col items-end h-10 sm:h-12 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-sm">
              <div className="text-primary-foreground/80 text-xs">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-primary-foreground/80 text-xs">Next: {resetDate.toLocaleDateString()}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>
        )}
      />

      <div className="p-6">
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AuditCard
          auditType="accident-incident"
          title="Accident and Incident Audit"
          description="Record and review accidents and incidents"
          colorClass="bg-blue-600"
          onClick={() => handleAuditCardClick('accident-incident')}
          onCreateNew={() => setPendingCreateAuditType('accident-incident')}
        />

        <AuditCard
          auditType="call-bell-monitoring"
          title="Call Bell Monitoring Audit"
          description="Monitor and log call bell responses"
          colorClass="bg-purple-600"
          onClick={() => handleAuditCardClick('call-bell-monitoring')}
        />

        <AuditCard
          auditType="care-plan"
          title="Care Plan Audit"
          description="Review resident care plans"
          colorClass="bg-green-600"
          onClick={() => handleAuditCardClick('care-plan')}
        />

        <AuditCard
          auditType="medication"
          title="Medication Audit"
          description="Medication management and safety"
          colorClass="bg-emerald-600"
          onClick={() => handleAuditCardClick('medication')}
        />

        <AuditCard
          auditType="equipment"
          title="Equipment Audit"
          description="Check equipment safety and maintenance"
          colorClass="bg-orange-600"
          onClick={() => handleAuditCardClick('equipment')}
        />

        <AuditCard
          auditType="fire-safety"
          title="Fire Safety Audit"
          description="Ensure fire safety compliance"
          colorClass="bg-red-600"
          onClick={() => handleAuditCardClick('fire-safety')}
        />

        <AuditCard
          auditType="hand-hygiene"
          title="Hand Hygiene Audit"
          description="Track hand hygiene practices"
          colorClass="bg-teal-600"
          onClick={() => handleAuditCardClick('hand-hygiene')}
        />

        <AuditCard
          auditType="health-safety"
          title="Health and Safety Audit"
          description="General health and safety checks"
          colorClass="bg-fuchsia-600"
          onClick={() => handleAuditCardClick('health-safety')}
        />

        <AuditCard
          auditType="infection-control"
          title="Infection Control Audit"
          description="Procedures for infection prevention"
          colorClass="bg-sky-600"
          onClick={() => handleAuditCardClick('infection-control')}
        />

        <AuditCard
          auditType="kitchen"
          title="Kitchen & Kitchenettes Audit"
          description="Food safety and kitchen cleanliness"
          colorClass="bg-amber-600"
          onClick={() => handleAuditCardClick('kitchen')}
        />

        <AuditCard
          auditType="maintenance"
          title="Maintenance Audit"
          description="Building and facility maintenance checks"
          colorClass="bg-emerald-600"
          onClick={() => handleAuditCardClick('maintenance')}
        />

        <AuditCard
          auditType="mealtime"
          title="Meal Time Audit"
          description="Monitor meal service quality"
          colorClass="bg-sky-600"
          onClick={() => handleAuditCardClick('mealtime')}
        />

        <AuditCard
          auditType="weight-monitoring"
          title="Weight Monitoring Audit"
          description="Track resident weight changes"
          colorClass="bg-amber-600"
          onClick={() => handleAuditCardClick('weight-monitoring')}
        />

        <AuditCard
          auditType="wound-monitoring"
          title="Wound Monitoring Audit"
          description="Record wound status and care"
          colorClass="bg-pink-600"
          onClick={() => handleAuditCardClick('wound-monitoring')}
        />

        <AuditCard
          auditType="night-visit"
          title="Night Visit Audit"
          description="Night-time checks and observations"
          colorClass="bg-rose-600"
          onClick={() => handleAuditCardClick('night-visit')}
        />

        <AuditCard
          auditType="managers-weekly"
          title="Weekly Managers Walkaround Audit"
          description="Weekly leadership checks"
          colorClass="bg-slate-600"
          onClick={() => handleAuditCardClick('managers-weekly')}
        />

        <AuditCard
          auditType="managers-monthly"
          title="Managers Monthly Audit"
          description="Comprehensive monthly leadership checks"
          colorClass="bg-slate-700"
          onClick={() => handleAuditCardClick('managers-monthly')}
        />

        <AuditCard
          auditType="restrictive-practice"
          title="Restrictive Practice Audit"
          description="Assess restrictive practice use"
          colorClass="bg-violet-600"
          onClick={() => handleAuditCardClick('restrictive-practice')}
        />

        <AuditCard
          auditType="staff-file"
          title="Staff File Audit"
          description="Check staff records and training"
          colorClass="bg-indigo-600"
          onClick={() => handleAuditCardClick('staff-file')}
        />

        <AuditCard
          auditType="risk-register"
          title="Risk Register"
          description="Overview of resident risks and mitigations"
          colorClass="bg-stone-600"
          onClick={() => handleAuditCardClick('risk-register')}
        />
      </div>
      {/* Audit scheduling controls - shown below the grid */}
      {/* Audit schedule cards removed as requested */}
      <p className="mt-8 text-muted-foreground">Select an audit type to begin.</p>
      </div>
      <AlertDialog open={!!pendingCreateAuditType} onOpenChange={(open) => { if (!open) setPendingCreateAuditType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new Accident/Incident Audit?</AlertDialogTitle>
            <AlertDialogDescription>
              Beginning a fresh audit clears the current form so you can capture a brand new incident report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCreateAuditType) {
                  handleAuditCardClick(pendingCreateAuditType, { bypassCompletionCheck: true, startFresh: true });
                }
                setPendingCreateAuditType(null);
              }}
            >
              Create New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
