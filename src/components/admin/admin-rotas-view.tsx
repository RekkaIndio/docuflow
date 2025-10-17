"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Workspace } from "@/lib/types";
import { RotaGrid } from "../rotas/rota-grid";
import { ShiftLegend } from "../rotas/shift-legend";
import { StaffSummary } from "../rotas/staff-summary";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath } from "@/lib/paths";
import { getShiftColorTheme, ShiftColorKey, DEFAULT_SHIFT_COLOR } from "../rotas/shift-colors";

export interface StaffMember {
  id: string;
  name: string;
  roles: string;
  email: string;
  phone: string;
  department: 'managers' | 'nurses' | 'ctms' | 'domestics' | 'maintenances' | 'kitchens' | 'activities';
  contractedHours?: number;
  hoursType?: 'weekly' | 'monthly';
}

export interface ShiftPattern {
  id: string;
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
  type: string;
  startTime?: string;
  endTime?: string;
  date: string;
  notes?: string;
  leave?: {
    groupId: string;
    totalHours: number;
  };
}

export interface RotaData {
  id: string;
  workspaceId: string;
  weekStartDate: string;
  shifts: Shift[];
  createdAt: string;
  updatedAt: string;
}

interface AdminRotasViewProps {
  workspace: Workspace;
}

const defaultShiftPatterns: ShiftPattern[] = [
  { id: 'AM', label: 'Morning', startTime: '07:00', endTime: '15:00', color: 'blue' },
  { id: 'PM', label: 'Afternoon', startTime: '15:00', endTime: '23:00', color: 'amber' },
  { id: 'Night', label: 'Night', startTime: '23:00', endTime: '07:00', color: 'indigo' },
  { id: 'Full', label: 'Full Day', startTime: '07:00', endTime: '23:00', color: 'green' },
];

// Calculate hours between two time strings (HH:mm format)
function calculateShiftHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    return 0;
  }

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

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

export function AdminRotasView({ workspace }: AdminRotasViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeksToShow, setWeeksToShow] = useState(1);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [rotaData, setRotaData] = useState<RotaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [contractedHoursConfig, setContractedHoursConfig] = useState<Record<string, { contractedHours: number; hoursType: 'weekly' | 'monthly' }>>({});
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

  // Load contracted hours settings
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

  // Load rota data for the current period
  useEffect(() => {
    const loadRotaData = async () => {
      if (!workspaceId) return;

      try {
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

  // Merge contracted hours config with staff data
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading rota data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Shift Legend */}
      <ShiftLegend patterns={shiftPatterns} onEdit={() => {}} />

      {/* Rota Grid and Staff Summary */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <RotaGrid
            weekStart={currentWeekStart}
            weeksToShow={weeksToShow}
            staff={filteredStaff}
            shifts={allShifts}
            onAddShift={() => {}} // Read-only - no add functionality
            onDeleteShift={() => {}} // Read-only - no delete functionality
            patterns={shiftPatterns}
            calculateStaffHours={(staffId: string) => calculateStaffWeeklyHours(staffId, currentWeekStart, allShifts)}
            readOnly={true} // Add readOnly prop to RotaGrid
          />
        </div>

        <div className="hidden sm:block w-80">
          <StaffSummary
            staff={filteredStaff}
            shifts={allShifts}
            weekStart={currentWeekStart}
            weeksToShow={weeksToShow}
          />
        </div>
      </div>
    </div>
  );
}