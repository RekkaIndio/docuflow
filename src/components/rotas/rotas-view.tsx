"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Mail, Printer, Users, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../page-header";
import { SidebarTrigger } from "../ui/sidebar";
import type { Workspace } from "@/lib/types";
import { RotaGrid } from "./rota-grid";
import { ShiftLegend } from "./shift-legend";
import { StaffSummary } from "./staff-summary";
import { ContractedHoursSettings } from "./contracted-hours-settings";
import { PrintRota } from "./print-rota";
import { format, startOfWeek, addWeeks, subWeeks, addDays, startOfMonth, endOfMonth } from "date-fns";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath, workspaceCollectionPath } from "@/lib/paths";
import { useToast } from "@/hooks/use-toast";
import { sendRotaEmails } from "@/actions/rotas";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getShiftColorTheme, ShiftColorKey, DEFAULT_SHIFT_COLOR } from "./shift-colors";
import { ShiftPatternsDialog } from "./shift-patterns-dialog";
import type { StaffingSummary } from "@/lib/staffing/ndps";

export interface StaffMember {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  department: 'managers' | 'nurses' | 'ctms' | 'domestics' | 'maintenances' | 'kitchens' | 'activities';
  contractedHours?: number; // e.g., 40 hours per week
  hoursType?: 'weekly' | 'monthly'; // default to weekly
}

export interface ShiftPattern {
  id: string; // stored in shift.type for compatibility
  label: string;
  startTime: string;
  endTime: string;
  color: ShiftColorKey;
  description?: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  type: string; // pattern id or 'AnnualLeave'
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  date: string; // YYYY-MM-DD format
  notes?: string;
  leave?: {
    groupId: string;
    totalHours: number;
  };
}

export interface RotaData {
  id: string;
  workspaceId: string;
  weekStartDate: string; // YYYY-MM-DD
  shifts: Shift[];
  createdAt: string;
  updatedAt: string;
}

interface RotasViewProps {
  workspace: Workspace;
}
 
interface NDPSStaffingSummary {
  recommendedDay: number;
  recommendedNight: number;
  residentCount: number;
  generatedAt?: string | null;
}

const defaultShiftPatterns: ShiftPattern[] = [
  { id: 'AM', label: 'Morning', startTime: '07:00', endTime: '15:00', color: 'blue' },
  { id: 'PM', label: 'Afternoon', startTime: '15:00', endTime: '23:00', color: 'amber' },
  { id: 'Night', label: 'Night', startTime: '23:00', endTime: '07:00', color: 'indigo' },
  { id: 'Full', label: 'Full Day', startTime: '07:00', endTime: '23:00', color: 'green' },
];

type DependencyLevel = "" | "0" | "1" | "2" | "3" | "4" | "5";

const NPDS_FIELD_SECTIONS: Record<string, "BCN" | "SNN" | "THERAPY"> = {
  bcn_mobility: "BCN",
  bcn_transfers: "BCN",
  bcn_washing: "BCN",
  bcn_dressing: "BCN",
  bcn_toileting: "BCN",
  bcn_continence: "BCN",
  bcn_feeding: "BCN",
  bcn_turning: "BCN",
  bcn_getting_up: "BCN",
  bcn_bed_mobility: "BCN",
  bcn_walking: "BCN",
  bcn_stairs: "BCN",
  snn_breathing: "SNN",
  snn_drugs: "SNN",
  snn_skin_care: "SNN",
  snn_treatment: "SNN",
  snn_observation: "SNN",
  therapy_communication: "THERAPY",
  therapy_cognitive: "THERAPY",
  therapy_behaviour: "THERAPY",
};

const NDPS_STAFFING_RATIOS_DAY: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1 / 10,
  2: 1 / 6,
  3: 1 / 3,
  4: 1 / 1.5,
  5: 1.5,
};

const NDPS_STAFFING_RATIOS_NIGHT: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1 / 20,
  2: 1 / 12,
  3: 1 / 6,
  4: 1 / 3,
  5: 1,
};

function calculateNDPSScoreFromResident(resident: Record<string, unknown>): number {
  let bcnScore = 0;
  let snnScore = 0;
  let therapyScore = 0;

  for (const [fieldKey, section] of Object.entries(NPDS_FIELD_SECTIONS)) {
    const raw = resident[fieldKey];
    const value = typeof raw === "string" ? raw : raw !== undefined && raw !== null ? String(raw) : "";
    const numeric = Number.parseInt(value, 10);
    const score = Number.isFinite(numeric) ? Math.min(Math.max(numeric, 0), 5) : 0;

    if (section === "BCN") {
      bcnScore += score;
    } else if (section === "SNN") {
      snnScore += score;
    } else {
      therapyScore += score;
    }
  }

  return Math.min(bcnScore, 60) + Math.min(snnScore, 25) + Math.min(therapyScore, 15);
}

function getNDPSBandFromScore(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score <= 20) return 1;
  if (score <= 40) return 2;
  if (score <= 60) return 3;
  if (score <= 80) return 4;
  return 5;
}

function calculateNDPSStaffingForResidents(residents: Array<Record<string, unknown>>): { Day: number; Night: number } {
  if (residents.length === 0) {
    return { Day: 0, Night: 0 };
  }

  const bandCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const resident of residents) {
    const score = calculateNDPSScoreFromResident(resident);
    const band = getNDPSBandFromScore(score);
    bandCounts[band] += 1;
  }

  let dayStaff = 0;
  let nightStaff = 0;

  // Object.keys returns string[] which doesn't match the numeric union keys (1|2|3|4|5).
  // Use Object.entries and convert the key to a number to satisfy TypeScript.
  for (const [bandKeyStr, count] of Object.entries(bandCounts) as [string, number][]) {
    const band = Number(bandKeyStr) as 1 | 2 | 3 | 4 | 5;
    dayStaff += count * NDPS_STAFFING_RATIOS_DAY[band];
    nightStaff += count * NDPS_STAFFING_RATIOS_NIGHT[band];
  }

  const hasResidents = residents.length > 0;
  const minDay = hasResidents ? 2 : 0;
  const minNight = hasResidents ? 2 : 0;
  const requiredDay = Math.ceil(dayStaff);
  const requiredNight = Math.ceil(nightStaff);

  return {
    Day: Math.max(minDay, requiredDay),
    Night: Math.max(minNight, requiredNight),
  };
}

// Calculate hours between two time strings (HH:mm format)
function calculateShiftHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Check for invalid numbers
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    return 0;
  }

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  // Handle overnight shifts (e.g., 23:00 to 07:00)
  if (hours < 0) {
    hours += 24;
  }

  const totalHours = hours + (minutes / 60);
  return isNaN(totalHours) ? 0 : totalHours;
}

// Calculate total scheduled hours for a staff member in current week
function calculateStaffWeeklyHours(staffId: string, weekStartDate: Date, allShifts: Shift[]): number {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekDates: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    weekDates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'));
  }
  
  const staffShifts = allShifts.filter(
    shift => shift.staffId === staffId && weekDates.includes(shift.date)
  );
  
  return staffShifts.reduce((total, shift) => {
    if (shift.startTime && shift.endTime) {
      return total + calculateShiftHours(shift.startTime, shift.endTime);
    }
    return total;
  }, 0);
}

export function RotasView({ workspace }: RotasViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weeksToShow, setWeeksToShow] = useState(1); // For multi-week view
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [rotaData, setRotaData] = useState<RotaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'schedule' | 'hours'>('schedule');
  const [contractedHoursConfig, setContractedHoursConfig] = useState<Record<string, { contractedHours: number; hoursType: 'weekly' | 'monthly' }>>({});
  const [staffingSummary, setStaffingSummary] = useState<NDPSStaffingSummary | null>(null);
  const { toast } = useToast();
  const [isEmailing, startEmailRotaTransition] = useTransition();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailWeeksToSend, setEmailWeeksToSend] = useState<number>(1);
  const [isPatternsDialogOpen, setIsPatternsDialogOpen] = useState(false);
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>(defaultShiftPatterns);

  const workspaceId = workspace?.id || '';
  const organisationId = (workspace as any)?.organisationId || '';

  const patternMap = useMemo(() => {
    const map = new Map<string, ShiftPattern>();
    shiftPatterns.forEach((pattern) => {
      map.set(pattern.id, pattern);
    });
    return map;
  }, [shiftPatterns]);
  // Listen for shift pattern configuration updates
  useEffect(() => {
    if (!workspaceId) return;

    const patternsRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'shift-patterns');
    const unsub = onSnapshot(
      patternsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { patterns?: ShiftPattern[] };
          if (Array.isArray(data?.patterns) && data.patterns.length > 0) {
            const hydrated = data.patterns.map((pattern) => ({
              ...pattern,
              startTime: pattern.startTime || '07:00',
              endTime: pattern.endTime || '15:00',
              color: (pattern.color as ShiftColorKey) || DEFAULT_SHIFT_COLOR,
            }));
            setShiftPatterns(hydrated);
            return;
          }
        }
        setShiftPatterns(defaultShiftPatterns);
      },
      (error) => {
        console.error('Failed to load shift patterns:', error);
        setShiftPatterns(defaultShiftPatterns);
      }
    );

    return () => unsub();
  }, [workspaceId, organisationId]);

  // Load contracted hours settings and subscribe for realtime updates so
  // changes made from the Teams view are reflected immediately in Rotas.
  useEffect(() => {
    if (!workspaceId) return;
    const configRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'contracted-hours');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setContractedHoursConfig(snap.data() as Record<string, { contractedHours: number; hoursType: 'weekly' | 'monthly' }>);
      } else {
        setContractedHoursConfig({});
      }
    }, (err) => {
      console.error('Failed to listen to contracted hours:', err);
    });

    return () => unsub();
  }, [workspaceId, organisationId]);

  // Listen for staffing summary generated by the dependency calculator
  useEffect(() => {
    if (!workspaceId) {
      setStaffingSummary(null);
      return;
    }

    const summaryDocPath = workspaceDocPath(workspaceId, undefined, organisationId);
    if (!summaryDocPath) {
      setStaffingSummary(null);
      return;
    }

    const summaryRef = doc(db, summaryDocPath, 'rotas', 'staffing-summary');
    const unsubscribe = onSnapshot(summaryRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as StaffingSummary;
        setStaffingSummary({
          recommendedDay: data.ndpsStaffing?.Day ?? 0,
          recommendedNight: data.ndpsStaffing?.Night ?? 0,
          residentCount: data.residentCount ?? 0,
          generatedAt: data.generatedAt ?? null,
        });
      } else {
        setStaffingSummary(null);
      }
    }, (error) => {
      console.error('Failed to load staffing summary:', error);
      setStaffingSummary(null);
    });

    return () => unsubscribe();
  }, [workspaceId, organisationId]);

  // Load staff from workspace
  useEffect(() => {
    const loadStaff = async () => {
      if (!workspaceId) return;
      
      try {
        const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId));
        const workspaceSnap = await getDoc(workspaceRef);
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const staff: StaffMember[] = [
            ...(data.managers || []).map((m: any) => ({ ...m, department: 'managers' as const })),
            ...(data.nurses || []).map((n: any) => ({ ...n, department: 'nurses' as const })),
            ...(data.ctms || []).map((c: any) => ({ ...c, department: 'ctms' as const })),
            ...(data.domestics || []).map((d: any) => ({ ...d, department: 'domestics' as const })),
            ...(data.maintenances || []).map((m: any) => ({ ...m, department: 'maintenances' as const })),
            ...(data.kitchens || []).map((k: any) => ({ ...k, department: 'kitchens' as const })),
            ...(data.activities || []).map((a: any) => ({ ...a, department: 'activities' as const })),
          ];
          setAllStaff(staff);
        }
      } catch (error) {
        console.error('Failed to load staff:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStaff();
  }, [workspaceId, organisationId]);

  useEffect(() => {
    if (!workspaceId) {
      setStaffingSummary(null);
      return;
    }

    const dependencyPath = workspaceCollectionPath(workspaceId, 'dependency_calculator', organisationId || null);
    if (!dependencyPath) {
      setStaffingSummary(null);
      return;
    }

    const dependencyRef = doc(db, dependencyPath, 'default');
    const unsubscribe = onSnapshot(
      dependencyRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStaffingSummary(null);
          return;
        }

        const data = snapshot.data() as Record<string, unknown>;
        const residentsRaw = (data as any)?.residents;
        const residents = Array.isArray(residentsRaw) ? (residentsRaw as Array<Record<string, unknown>>) : [];

        if (residents.length === 0) {
          setStaffingSummary(null);
          return;
        }

        const recommended = calculateNDPSStaffingForResidents(residents);

        const resolveTimestamp = (value: unknown): string | null => {
          if (!value) return null;
          if (typeof value === 'string') {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
          if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
            try {
              return (value as { toDate: () => Date }).toDate().toISOString();
            } catch {
              return null;
            }
          }
          return null;
        };

        const updatedAtIso = resolveTimestamp((data as any)?.updatedAt) ?? resolveTimestamp((data as any)?.savedAt);

        setStaffingSummary({
          recommendedDay: recommended.Day,
          recommendedNight: recommended.Night,
          residentCount: residents.length,
          generatedAt: updatedAtIso,
        });
      },
      (error) => {
        console.error('Failed to load dependency staffing summary:', error);
        setStaffingSummary(null);
      }
    );

    return () => unsubscribe();
  }, [workspaceId, organisationId]);

  // Load rota data for the current period
  useEffect(() => {
    const loadRotaData = async () => {
      if (!workspaceId) return;
      
      try {
        // Load rotas for the visible weeks
        const rotasToLoad: RotaData[] = [];
        for (let i = 0; i < weeksToShow; i++) {
          const weekStart = addWeeks(currentWeekStart, i);
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          const rotaRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', weekKey);
          const rotaSnap = await getDoc(rotaRef);
          
          if (rotaSnap.exists()) {
            rotasToLoad.push(rotaSnap.data() as RotaData);
          } else {
            // Create empty rota for this week
            const emptyRota: RotaData = {
              id: weekKey,
              workspaceId,
              weekStartDate: weekKey,
              shifts: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            rotasToLoad.push(emptyRota);
          }
        }
        setRotaData(rotasToLoad);
      } catch (error) {
        console.error('Failed to load rota data:', error);
      }
    };
    
    loadRotaData();
  }, [workspaceId, organisationId, currentWeekStart, weeksToShow]);

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleAddShift = async (
    date: string,
    staffId: string,
    staffName: string,
    type: Shift['type'],
    startTime?: string,
    endTime?: string,
    leaveMeta?: Shift['leave'],
  ) => {
    const isStandardShift = type !== 'AnnualLeave';
    const shift: Shift = {
      id: `${staffId}-${date}-${type}-${Date.now()}`,
      staffId,
      staffName,
      type,
      date,
      notes: '',
    };

    if (isStandardShift) {
      const pattern = patternMap.get(type);
      const fallback = defaultShiftPatterns.find((p) => p.id === type);
      shift.startTime = startTime ?? pattern?.startTime ?? fallback?.startTime ?? '07:00';
      shift.endTime = endTime ?? pattern?.endTime ?? fallback?.endTime ?? '15:00';
    }

    if (leaveMeta && type === 'AnnualLeave') {
      shift.leave = leaveMeta;
    }

    // Find the rota for this date
    const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Update local state optimistically
    setRotaData(prev => {
      const updatedRotas = [...prev];
      const rotaIndex = updatedRotas.findIndex(r => r.weekStartDate === weekKey);
      
      if (rotaIndex >= 0) {
        updatedRotas[rotaIndex] = {
          ...updatedRotas[rotaIndex],
          shifts: [...updatedRotas[rotaIndex].shifts, shift],
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new rota if it doesn't exist
        updatedRotas.push({
          id: weekKey,
          workspaceId,
          weekStartDate: weekKey,
          shifts: [shift],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      return updatedRotas;
    });

    // Save to Firestore
    try {
      const rotaIndex = rotaData.findIndex(r => r.weekStartDate === weekKey);
      const updatedRota = rotaIndex >= 0 
        ? { ...rotaData[rotaIndex], shifts: [...rotaData[rotaIndex].shifts, shift], updatedAt: new Date().toISOString() }
        : {
            id: weekKey,
            workspaceId,
            weekStartDate: weekKey,
            shifts: [shift],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      
      const rotaRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', weekKey);
      await setDoc(rotaRef, updatedRota);
    } catch (error) {
      console.error('Failed to save shift:', error);
      // Revert optimistic update on error
      setRotaData(prev => prev);
    }
  };

  const handleDeleteShift = async (shiftId: string, date: string) => {
    const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Update local state optimistically
    setRotaData(prev => {
      const updatedRotas = [...prev];
      const rotaIndex = updatedRotas.findIndex(r => r.weekStartDate === weekKey);
      
      if (rotaIndex >= 0) {
        updatedRotas[rotaIndex] = {
          ...updatedRotas[rotaIndex],
          shifts: updatedRotas[rotaIndex].shifts.filter(s => s.id !== shiftId),
          updatedAt: new Date().toISOString(),
        };
      }
      
      return updatedRotas;
    });

    // Save to Firestore
    try {
      const rotaIndex = rotaData.findIndex(r => r.weekStartDate === weekKey);
      if (rotaIndex >= 0) {
        const updatedRota = {
          ...rotaData[rotaIndex],
          shifts: rotaData[rotaIndex].shifts.filter(s => s.id !== shiftId),
          updatedAt: new Date().toISOString(),
        };
        
        const rotaRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', weekKey);
        await setDoc(rotaRef, updatedRota);
      }
    } catch (error) {
      console.error('Failed to delete shift:', error);
    }
  };

  const handleContractedHoursUpdate = async () => {
    // Reload contracted hours settings from Firestore
    try {
      const configRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'contracted-hours');
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        setContractedHoursConfig(configSnap.data() as Record<string, { contractedHours: number; hoursType: 'weekly' | 'monthly' }>);
      }
    } catch (error) {
      console.error('Failed to reload contracted hours:', error);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Merge contracted hours config with staff data.
  // Preference order: explicit rota config (contracted-hours doc) -> staff record on workspace -> default 40/week.
  const staffWithContractedHours = allStaff.map(staff => {
    const config = contractedHoursConfig[staff.id];
    const contractedHours = config?.contractedHours ?? staff.contractedHours ?? 40;
    const hoursType = (config?.hoursType ?? staff.hoursType) || ('weekly' as const);
    return {
      ...staff,
      contractedHours,
      hoursType,
    };
  });

  const filteredStaff = selectedDepartment === 'all' 
    ? staffWithContractedHours 
    : staffWithContractedHours.filter(s => s.department === selectedDepartment);

  // Get all shifts for the current period
  const allShifts = rotaData.flatMap(r => r.shifts);

  const handleOpenEmailDialog = () => {
    if (!workspaceId) {
      toast({
        title: 'Workspace not available',
        description: 'Please select a workspace before emailing the rota.',
        variant: 'destructive',
      });
      return;
    }

    if (allShifts.length === 0) {
      toast({
        title: 'No shifts to email',
        description: 'Assign at least one shift before emailing the rota to staff.',
      });
      return;
    }

    setEmailWeeksToSend(Math.max(1, weeksToShow));
    setIsEmailDialogOpen(true);
  };

  const handleEmailRota = (weeksCount: number) => {
    if (!workspaceId) {
      toast({
        title: 'Workspace not available',
        description: 'Please select a workspace before emailing the rota.',
        variant: 'destructive',
      });
      return;
    }

    startEmailRotaTransition(async () => {
      try {
        const result = await sendRotaEmails({
          workspaceId,
          organisationId: organisationId || null,
          workspaceName: workspace.name || 'Workspace',
          weekStartKey: format(currentWeekStart, 'yyyy-MM-dd'),
          weeksToShow: weeksCount,
        });

        setIsEmailDialogOpen(false);

        if (result.successCount === 0) {
          toast({
            title: 'No rota emails sent',
            description: 'No staff had shifts in the selected period.',
          });
          return;
        }

        const detailParts: string[] = [];
        if (result.skippedWithoutEmail > 0) {
          detailParts.push(`${result.skippedWithoutEmail} missing email`);
        }
        if (result.failureCount > 0) {
          detailParts.push(`${result.failureCount} failed to queue`);
        }

        toast({
          title: 'Rota emails sent',
          description: detailParts.length > 0
            ? `Notified ${result.successCount} staff; ${detailParts.join(', ')}.`
            : `Notified ${result.successCount} staff successfully.`,
        });
      } catch (error) {
        console.error('Failed to send rota emails', error);
        toast({
          title: 'Failed to email rota',
          description: error instanceof Error ? error.message : 'Something went wrong while emailing the rota.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSaveShiftPatterns = async (patternsToSave: ShiftPattern[]) => {
    if (!workspaceId) {
      toast({
        title: 'Workspace missing',
        description: 'Select a workspace before updating shift patterns.',
        variant: 'destructive',
      });
      return;
    }

    const sanitizedPatterns = patternsToSave.map((pattern) => {
      const { id, label, startTime, endTime } = pattern;
      const color = (pattern.color as ShiftColorKey) || DEFAULT_SHIFT_COLOR;
      const description = pattern.description?.trim();
      return description
        ? { id, label, startTime, endTime, color, description }
        : { id, label, startTime, endTime, color };
    });

    setShiftPatterns(sanitizedPatterns);

    try {
      const patternsRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'shift-patterns');
      await setDoc(patternsRef, {
        patterns: sanitizedPatterns,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast({
        title: 'Shift patterns updated',
        description: 'New shift types are ready to use.',
      });
      setIsPatternsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save shift patterns:', error);
      toast({
        title: 'Could not save patterns',
        description: error instanceof Error ? error.message : 'Something went wrong while saving the shift types.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <PageHeader
        title="Staff Rotas"
        subtitle="Manage and schedule staff shifts"
        leading={<CalendarIcon className="text-white w-6 h-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3"
              onClick={handleOpenEmailDialog}
              disabled={isEmailing}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isEmailing ? 'Emailing...' : 'Email Rota'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3"
              onClick={handleExportPDF}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <SidebarTrigger />
          </div>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6 max-w-[1800px] mx-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'schedule' | 'hours')}>
            <TabsList className="grid h-auto items-center w-full max-w-md grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="schedule">Schedule</TabsTrigger>
              <TabsTrigger className="rounded-xl px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="hours">Contracted Hours</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-6 mt-6">
              {/* Navigation and Controls */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-col items-center min-w-[200px]">
                        <h2 className="text-lg font-semibold">
                          {format(currentWeekStart, 'MMMM yyyy')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Week of {format(currentWeekStart, 'MMM d')} - {format(addDays(addWeeks(currentWeekStart, weeksToShow - 1), 6), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button variant="outline" size="icon" onClick={handleNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={handleToday}>
                        Today
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 border rounded-lg p-1 bg-background">
                        <Button 
                          variant={weeksToShow === 1 ? "default" : "ghost"} 
                          size="sm"
                          onClick={() => setWeeksToShow(1)}
                        >
                          1 Week
                        </Button>
                        <Button 
                          variant={weeksToShow === 2 ? "default" : "ghost"} 
                          size="sm"
                          onClick={() => setWeeksToShow(2)}
                        >
                          2 Weeks
                        </Button>
                        <Button 
                          variant={weeksToShow === 4 ? "default" : "ghost"} 
                          size="sm"
                          onClick={() => setWeeksToShow(4)}
                        >
                          4 Weeks
                        </Button>
                      </div>

                      <select 
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="border rounded-lg p-2 bg-background"
                      >
                        <option value="all">All Departments</option>
                        <option value="managers">Managers</option>
                        <option value="nurses">Nurses</option>
                        <option value="ctms">CTMs</option>
                        <option value="domestics">Domestics</option>
                        <option value="maintenances">Maintenances</option>
                        <option value="kitchens">Kitchens</option>
                        <option value="activities">Activities</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shift Legend - Moved to top for easier access */}
              <ShiftLegend patterns={shiftPatterns} onEdit={() => setIsPatternsDialogOpen(true)} />

              {/* Rota Grid and Staff Summary */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <RotaGrid
                    weekStart={currentWeekStart}
                    weeksToShow={weeksToShow}
                    staff={filteredStaff}
                    shifts={allShifts}
                    onAddShift={handleAddShift}
                    onDeleteShift={handleDeleteShift}
                    patterns={shiftPatterns}
                    calculateStaffHours={(staffId: string) => calculateStaffWeeklyHours(staffId, currentWeekStart, allShifts)}
                  />
                </div>

                <div className="hidden sm:block w-80">
                  <StaffSummary 
                    staff={filteredStaff}
                    shifts={allShifts}
                    weekStart={currentWeekStart}
                    weeksToShow={weeksToShow}
                    staffingSummary={staffingSummary}
                    patterns={shiftPatterns}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="mt-6">
              <ContractedHoursSettings 
                staff={allStaff}
                workspaceId={workspace.id}
                organisationId={workspace.organisationId || undefined}
                onUpdate={handleContractedHoursUpdate}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Print-only view */}
      <PrintRota 
        weekStart={currentWeekStart}
        weeksToShow={weeksToShow}
        staff={filteredStaff}
        shifts={allShifts}
        workspaceName={workspace.name || 'Care Home'}
        patterns={shiftPatterns}
      />

      <Dialog open={isEmailDialogOpen} onOpenChange={(open) => !isEmailing && setIsEmailDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email rota</DialogTitle>
            <DialogDescription>Select how many weeks to include in the emails.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {[1, 2, 4].map((option) => (
              <Button
                key={option}
                type="button"
                variant={emailWeeksToSend === option ? 'default' : 'outline'}
                onClick={() => setEmailWeeksToSend(option)}
                disabled={isEmailing}
              >
                {option} Week{option > 1 ? 's' : ''}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isEmailing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleEmailRota(emailWeeksToSend)}
              disabled={isEmailing}
            >
              {isEmailing ? 'Sending...' : 'Send emails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShiftPatternsDialog
        open={isPatternsDialogOpen}
        onOpenChange={setIsPatternsDialogOpen}
        patterns={shiftPatterns}
        onSave={handleSaveShiftPatterns}
      />
    </div>
  );
}
