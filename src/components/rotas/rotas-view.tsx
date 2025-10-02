"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Printer, Users, Plus, Clock } from "lucide-react";
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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { workspaceDocPath } from "@/lib/paths";

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

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  type: 'AM' | 'PM' | 'Night' | 'Full';
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  date: string; // YYYY-MM-DD format
  notes?: string;
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

const defaultShiftTimes = {
  AM: { start: '07:00', end: '15:00' },
  PM: { start: '15:00', end: '23:00' },
  Night: { start: '23:00', end: '07:00' },
  Full: { start: '07:00', end: '23:00' },
};

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

  const workspaceId = workspace?.id || '';
  const organisationId = (workspace as any)?.organisationId || '';

  // Load contracted hours settings
  useEffect(() => {
    const loadContractedHours = async () => {
      if (!workspaceId) return;
      
      try {
        const configRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'contracted-hours');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          setContractedHoursConfig(configSnap.data() as Record<string, { contractedHours: number; hoursType: 'weekly' | 'monthly' }>);
        }
      } catch (error) {
        console.error('Failed to load contracted hours:', error);
      }
    };
    
    loadContractedHours();
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

  const handleAddShift = async (date: string, staffId: string, staffName: string, type: 'AM' | 'PM' | 'Night' | 'Full', startTime?: string, endTime?: string) => {
    const shift: Shift = {
      id: `${staffId}-${date}-${type}-${Date.now()}`,
      staffId,
      staffName,
      type,
      startTime: startTime || defaultShiftTimes[type].start,
      endTime: endTime || defaultShiftTimes[type].end,
      date,
      notes: '',
    };

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

  // Merge contracted hours config with staff data
  const staffWithContractedHours = allStaff.map(staff => {
    const config = contractedHoursConfig[staff.id];
    return {
      ...staff,
      contractedHours: config?.contractedHours || 40,
      hoursType: config?.hoursType || 'weekly' as const,
    };
  });

  const filteredStaff = selectedDepartment === 'all' 
    ? staffWithContractedHours 
    : staffWithContractedHours.filter(s => s.department === selectedDepartment);

  // Get all shifts for the current period
  const allShifts = rotaData.flatMap(r => r.shifts);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <PageHeader
        title="Staff Rotas"
        subtitle="Manage and schedule staff shifts"
        leading={<CalendarIcon className="text-white w-6 h-6" />}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3" onClick={handleExportPDF}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="h-8 sm:h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-3">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <SidebarTrigger />
          </>
        }
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6 max-w-[1800px] mx-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'schedule' | 'hours')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="hours">Contracted Hours</TabsTrigger>
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
              <ShiftLegend />

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
                    calculateStaffHours={(staffId: string) => calculateStaffWeeklyHours(staffId, currentWeekStart, allShifts)}
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
      />
    </div>
  );
}
