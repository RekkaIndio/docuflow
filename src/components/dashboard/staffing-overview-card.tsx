"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { workspaceDocPath, workspaceCollectionPath } from "@/lib/paths";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface StaffingOverviewCardProps {
  workspaceId?: string;
  orgId?: string | null;
  onNavigateToRotas?: () => void;
  className?: string;
}

interface StaffMember {
  id: string;
  name: string;
  department: string;
  contractedHours?: number;
}

interface Shift {
  staffId: string;
  startTime?: string;
  endTime?: string;
  date: string;
}

function calculateShiftHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    return 0;
  }
  
  let hours = endHour - startHour;
  let minutes = endMin - startMin;
  
  // Handle overnight shifts
  if (hours < 0) {
    hours += 24;
  }
  
  const totalHours = hours + (minutes / 60);
  return isNaN(totalHours) ? 0 : totalHours;
}

export function StaffingOverviewCard({ workspaceId, orgId, onNavigateToRotas, className }: StaffingOverviewCardProps) {
  const [loading, setLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);
  const [shiftsThisWeek, setShiftsThisWeek] = useState(0);
  const [totalHoursScheduled, setTotalHoursScheduled] = useState(0);
  const [coveragePercentage, setCoveragePercentage] = useState(0);
  const [understaffedDays, setUnderstaffedDays] = useState(0);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const loadStaffingData = async () => {
      try {
        setLoading(true);

        // Load staff from workspace
        const workspaceRef = doc(db, workspaceDocPath(workspaceId, undefined, orgId || undefined));
        const workspaceSnap = await getDoc(workspaceRef);
        
        const allStaff: StaffMember[] = [];
        
        if (workspaceSnap.exists()) {
          const data = workspaceSnap.data();
          const departments = ['managers', 'nurses', 'ctms', 'domestics', 'maintenances', 'kitchens', 'activities'];
          
          departments.forEach(dept => {
            if (data[dept] && Array.isArray(data[dept])) {
              data[dept].forEach((member: any) => {
                allStaff.push({
                  id: member.id,
                  name: member.name,
                  department: dept,
                  contractedHours: member.contractedHours
                });
              });
            }
          });
        }

        setTotalStaff(allStaff.length);

        // Get current week boundaries
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        // Load rota data for current week
        const rotaRef = doc(db, workspaceDocPath(workspaceId, undefined, orgId || undefined), 'rotas', weekKey);
        const rotaSnap = await getDoc(rotaRef);

        let shifts: Shift[] = [];
        if (rotaSnap.exists()) {
          const rotaData = rotaSnap.data();
          shifts = rotaData.shifts || [];
        }

        setShiftsThisWeek(shifts.length);

        // Calculate total hours scheduled
        const totalHours = shifts.reduce((sum, shift) => {
          if (shift.startTime && shift.endTime) {
            return sum + calculateShiftHours(shift.startTime, shift.endTime);
          }
          return sum;
        }, 0);
        setTotalHoursScheduled(Math.round(totalHours));

        // Calculate coverage percentage (shifts per day vs expected minimum)
        const expectedShiftsPerDay = Math.max(3, Math.floor(allStaff.length * 0.4)); // At least 40% of staff per day
        const daysInWeek = 7;
        const weekDates = Array.from({ length: daysInWeek }, (_, i) => 
          format(addDays(weekStart, i), 'yyyy-MM-dd')
        );

        const shiftsPerDay = weekDates.map(date => 
          shifts.filter(s => s.date === date).length
        );

        const avgShiftsPerDay = shiftsPerDay.reduce((a, b) => a + b, 0) / daysInWeek;
        const coverage = Math.min(100, Math.round((avgShiftsPerDay / expectedShiftsPerDay) * 100));
        setCoveragePercentage(coverage);

        // Count understaffed days (less than expected minimum)
        const understaffed = shiftsPerDay.filter(count => count < expectedShiftsPerDay).length;
        setUnderstaffedDays(understaffed);

      } catch (error) {
        console.error('Failed to load staffing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStaffingData();
  }, [workspaceId, orgId]);

  const handleNavigate = () => {
    if (onNavigateToRotas) {
      onNavigateToRotas();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("navigate-to-rotas"));
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-white shadow-xl transition-all duration-300 hover:shadow-2xl cursor-pointer",
        className,
      )}
      onClick={handleNavigate}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 shadow-md" />
      <CardHeader className="pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">Staffing Overview</CardTitle>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
            className="ml-2"
          >
            View rotas
          </Button>
        </div>
        <CardDescription className="text-sm text-slate-500">
          This week's rota summary and staffing levels at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading staffing data...</div>
        ) : totalStaff === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-600 mb-4">No staff members found.</p>
            <p className="text-xs text-slate-500">Add staff in the Teams section to start scheduling rotas.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 border border-blue-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Total Staff</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{totalStaff}</p>
                <p className="text-xs text-blue-600 mt-1">Active team members</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100/50 p-4 border border-cyan-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs font-medium text-cyan-700">This Week</span>
                </div>
                <p className="text-2xl font-bold text-cyan-900">{shiftsThisWeek}</p>
                <p className="text-xs text-cyan-600 mt-1">Shifts scheduled</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-teal-50 to-teal-100/50 p-4 border border-teal-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-medium text-teal-700">Hours</span>
                </div>
                <p className="text-2xl font-bold text-teal-900">{totalHoursScheduled}h</p>
                <p className="text-xs text-teal-600 mt-1">Total scheduled</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 border border-emerald-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Coverage</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{coveragePercentage}%</p>
                <p className="text-xs text-emerald-600 mt-1">Weekly average</p>
              </div>
            </div>

            {/* Alerts/Status */}
            {understaffedDays > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
                <div className="p-1.5 rounded-lg bg-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    {understaffedDays} day{understaffedDays > 1 ? 's' : ''} understaffed
                  </p>
                  <p className="text-xs text-amber-700">
                    Review the rota to ensure adequate coverage throughout the week.
                  </p>
                </div>
              </div>
            )}

            {understaffedDays === 0 && shiftsThisWeek > 0 && (
              <div className="flex items-center justify-center rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-emerald-700">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold">All days adequately staffed this week</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
