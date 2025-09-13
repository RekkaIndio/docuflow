
'use client';
import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWorkspace } from '@/context/workspace';
import { getAuditSchedule, setAuditSchedule, getAuditStatus, getMonthlyAuditCompletionStatus } from '@/lib/firestore';
import AccidentIncidentAuditPage from "./accident-incident/page";
import CallBellMonitoringAuditPage from "./call-bell-monitoring/page";
import CarePlanAuditPage from "./care-plan/page";
import EquipmentAuditPage from "./equipment/page";
import FireSafetyAuditPage from "./fire-safety/page";
import HandHygieneAuditPage from "./hand-hygiene/page";
import HealthSafetyAuditPage from "./health-safety/page";
import InfectionControlAuditPage from "./infection-control/page";
import KitchenAuditPage from "./kitchen/page";
import MaintenanceAuditPage from "./maintenance/page";
import ManagersWeeklyAuditPage from "./managers-weekly/page";
import MealtimeAuditPage from "./mealtime/page";
import NightVisitAuditPage from "./night-visit/page";
import RestrictivePracticeAuditPage from "./restrictive-practice/page";
import StaffFileAuditPage from "./staff-file/page";
import WeightMonitoringAuditPage from "./weight-monitoring/page";
import WoundMonitoringAuditPage from "./wound-monitoring/page";
import RiskRegisterAuditPage from "./risk-register/page";

export default function AuditsPage() {
  const activeWorkspace = useWorkspace();
  const [auditScheduleMap, setAuditScheduleMap] = useState<Record<string, string | null>>({});
  const [auditStatusMap, setAuditStatusMap] = useState<Record<string, string>>({});
  const [monthlyCompletionStatus, setMonthlyCompletionStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    if (!activeWorkspace?.id) return;
    
    // Load monthly completion status
    const loadMonthlyStatus = async () => {
      try {
        const status = await getMonthlyAuditCompletionStatus(activeWorkspace.id);
        if (mounted) setMonthlyCompletionStatus(status);
      } catch (e) {
        console.warn('Failed to load monthly audit completion status', e);
      }
    };
    
    loadMonthlyStatus();
    
    try {
      const schedRef = doc(db, `workspaces/${activeWorkspace.id}/settings`, 'audit_schedule');
      const statusRef = doc(db, `workspaces/${activeWorkspace.id}/settings`, 'audit_status');

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
  const [currentView, setCurrentView] = useState<'list' | 'accident-incident' | 'call-bell-monitoring' | 'care-plan' | 'equipment' | 'fire-safety' | 'hand-hygiene' | 'health-safety' | 'infection-control' | 'kitchen' | 'maintenance' | 'managers-weekly' | 'night-visit' | 'restrictive-practice' | 'staff-file' | 'weight-monitoring' | 'wound-monitoring' | 'mealtime' | 'risk-register'>('list');

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

  const handleAuditCardClick = (auditType: string) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    if (isCompleted) {
      // Show message that audit is completed for this month
      alert('This audit has already been completed for this month. You can edit it if needed.');
      return;
    }
    // Allow opening if not completed
    setCurrentView(auditType as any);
  };

  const handleEditAudit = (auditType: string) => {
    setCurrentView(auditType as any);
  };

  const AuditCard = ({ 
    auditType, 
    title, 
    description, 
    colorClass,
    onClick 
  }: { 
    auditType: string;
    title: string;
    description: string;
    colorClass: string;
    onClick: () => void;
  }) => {
    const isCompleted = monthlyCompletionStatus[auditType];
    // If there are fewer than 5 days remaining until reset and the audit is not completed,
    // mark it as urgent (red highlight)
    const isUrgent = !isCompleted && typeof daysRemaining === 'number' && daysRemaining < 5;

    return (
      <div className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${isCompleted ? 'ring-2 ring-green-200' : isUrgent ? 'ring-2 ring-red-200' : ''}`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-900 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-900 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {/* Top accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${isCompleted ? 'from-green-500 to-green-600' : isUrgent ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'}`}></div>

        <div className="p-6 relative z-10">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-3 rounded-xl bg-gradient-to-br ${isCompleted ? 'from-green-100 to-green-200' : isUrgent ? 'from-red-100 to-red-200' : 'from-blue-100 to-blue-200'} shadow-sm`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isCompleted ? 'text-green-600' : isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold text-gray-900 ${isCompleted ? 'text-green-800' : ''} group-hover:text-gray-800 transition-colors`}>
                {title}
              </h3>
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
                </div>
              ) : (
                <button
                  onClick={onClick}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${
                    isUrgent 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  Start Audit
                </button>
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
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <InfectionControlAuditPage />
      </div>
    );
  }

  if (currentView === 'accident-incident') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <AccidentIncidentAuditPage />
      </div>
    );
  }

  if (currentView === 'call-bell-monitoring') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <CallBellMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'care-plan') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <CarePlanAuditPage />
      </div>
    );
  }

  if (currentView === 'equipment') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <EquipmentAuditPage />
      </div>
    );
  }

  if (currentView === 'fire-safety') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <FireSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'hand-hygiene') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <HandHygieneAuditPage />
      </div>
    );
  }

  if (currentView === 'health-safety') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <HealthSafetyAuditPage />
      </div>
    );
  }

  if (currentView === 'kitchen') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <KitchenAuditPage />
      </div>
    );
  }

  if (currentView === 'maintenance') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <MaintenanceAuditPage />
      </div>
    );
  }

  if (currentView === 'managers-weekly') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <ManagersWeeklyAuditPage />
      </div>
    );
  }

  if (currentView === 'mealtime') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <MealtimeAuditPage />
      </div>
    );
  }

  if (currentView === 'night-visit') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <NightVisitAuditPage />
      </div>
    );
  }

  if (currentView === 'restrictive-practice') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <RestrictivePracticeAuditPage />
      </div>
    );
  }

  if (currentView === 'weight-monitoring') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <WeightMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'staff-file') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <StaffFileAuditPage />
      </div>
    );
  }

  if (currentView === 'wound-monitoring') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <WoundMonitoringAuditPage />
      </div>
    );
  }

  if (currentView === 'risk-register') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-primary hover:text-primary/80"
        >
          ← Back to Audits
        </button>
        <RiskRegisterAuditPage />
      </div>
    );
  }

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

  return (
    <div>
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-8 rounded-b-2xl shadow-lg relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full translate-y-32 -translate-x-32"></div>
        </div>
        <div className="w-full mx-auto flex items-start justify-between gap-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight font-headline">Audits</h2>
              <div className="text-primary-foreground/80 text-base leading-relaxed">Complete monthly compliance audits and track performance</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-4">
              <p className="text-primary-foreground/80">Current month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-primary-foreground/80">Next reset: {resetDate.toLocaleDateString()}</p>
              <div className="flex justify-end mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AuditCard
          auditType="accident-incident"
          title="Accident and Incident Audit"
          description="Record and review accidents and incidents"
          colorClass="bg-blue-600"
          onClick={() => handleAuditCardClick('accident-incident')}
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
    </div>
  );
}
