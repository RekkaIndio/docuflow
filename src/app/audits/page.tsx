
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
    
    return (
      <div className={`w-full p-4 border rounded-lg shadow-sm text-left flex items-start gap-4 ${
        isCompleted 
          ? 'bg-green-50 border-green-200' 
          : 'bg-white hover:shadow-md cursor-pointer'
      }`}>
        <div className={`w-2.5 h-12 rounded ${isCompleted ? 'bg-green-600' : colorClass}`} />
        <div className="flex-1">
          <div className={`text-lg font-medium ${isCompleted ? 'text-green-700' : ''}`}>
            {title}
          </div>
          <div className={`text-sm mt-1 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
            {description}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                ✓ Completed
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditAudit(auditType);
                }}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={onClick}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start
            </button>
          )}
        </div>
      </div>
    );
  };

  if (currentView === 'infection-control') {
    return (
      <div>
        <button 
          onClick={() => setCurrentView('list')} 
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
          className="mb-4 p-2 text-blue-600 hover:text-blue-800"
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
    return { text: 'text-red-800', bg: 'bg-red-100' };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audits are completed monthly. Completed audits will become available again next month.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Current month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          <p className="text-muted-foreground">Next reset: {resetDate.toLocaleDateString()}</p>
          <div className="flex justify-end mt-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCountdownColor(daysRemaining).bg} ${getCountdownColor(daysRemaining).text}`}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
          </div>
        </div>
      </div>
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
  );
}
