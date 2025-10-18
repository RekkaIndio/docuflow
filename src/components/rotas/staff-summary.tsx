"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import type { StaffMember, Shift, ShiftPattern } from "./rotas-view";
import type { StaffingSummary } from "@/lib/staffing/ndps";
import { addDays, addWeeks, format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StaffSummaryProps {
  staff: StaffMember[];
  shifts: Shift[];
  weekStart: Date;
  weeksToShow: number;
  patterns: ShiftPattern[];
  staffingSummary: StaffingSummary | null;
}

export function StaffSummary({ staff, shifts, weekStart, weeksToShow, patterns, staffingSummary }: StaffSummaryProps) {
  const workingShifts = shifts.filter((shift) => shift.type !== 'AnnualLeave');
  const leaveShifts = shifts.filter((shift) => shift.type === 'AnnualLeave');

  const patternMap = new Map<string, ShiftPattern>();
  patterns.forEach((pattern) => patternMap.set(pattern.id, pattern));

  const parseTimeToMinutes = (time?: string | null) => {
    if (!time) return null;
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const classifyShift = (shift: Shift): 'Day' | 'Night' => {
    const pattern = patternMap.get(shift.type);
    const normalizedType = shift.type.toLowerCase();
    if (normalizedType.includes('night')) return 'Night';

    const startMinutes = parseTimeToMinutes(shift.startTime ?? pattern?.startTime ?? null);
    const endMinutes = parseTimeToMinutes(shift.endTime ?? pattern?.endTime ?? null);

    if (startMinutes === null) return 'Day';

    const startHour = Math.floor(startMinutes / 60);
    if (startHour >= 20 || startHour < 6) return 'Night';

    if (endMinutes !== null && endMinutes < startMinutes) {
      return 'Night';
    }

    return 'Day';
  };

  // Calculate shifts per staff member
  const staffShiftCounts = staff.map(member => {
    const memberShifts = workingShifts.filter(s => s.staffId === member.id);
    const memberLeaveHours = leaveShifts
      .filter(s => s.staffId === member.id)
      .reduce((total, leaveShift) => total + (leaveShift.leave?.totalHours ?? 0), 0);
    
    // Calculate total hours
    const totalHours = memberShifts.reduce((sum, shift) => {
      const [startHour, startMin] = (shift.startTime || '00:00').split(':').map(Number);
      const [endHour, endMin] = (shift.endTime || '00:00').split(':').map(Number);
      
      let hours = endHour - startHour;
      let minutes = endMin - startMin;
      
      // Handle overnight shifts
      if (hours < 0) {
        hours += 24;
      }
      
      if (minutes < 0) {
        hours -= 1;
        minutes += 60;
      }
      
      return sum + hours + (minutes / 60);
    }, 0);

    return {
      member,
      shiftCount: memberShifts.length,
      totalHours: Math.round(totalHours * 10) / 10,
      leaveHours: Math.round(memberLeaveHours * 10) / 10,
    };
  });

  // Sort by shift count descending
  const sortedStaff = [...staffShiftCounts].sort((a, b) => b.shiftCount - a.shiftCount);

  const totalShifts = workingShifts.length;
  const averageShiftsPerStaff = staff.length > 0 ? Math.round((totalShifts / staff.length) * 10) / 10 : 0;
  const totalLeaveHours = leaveShifts.reduce((total, leaveShift) => total + (leaveShift.leave?.totalHours ?? 0), 0);

  // Calculate coverage for each day
  const allDates: Date[] = [];
  for (let week = 0; week < weeksToShow; week++) {
    const weekStartDate = addWeeks(weekStart, week);
    for (let day = 0; day < 7; day++) {
      allDates.push(addDays(weekStartDate, day));
    }
  }

  const dateKeys = allDates.map((date) => format(date, 'yyyy-MM-dd'));
  const dateKeySet = new Set(dateKeys);
  const dayAssignments: Record<string, number> = {};
  const nightAssignments: Record<string, number> = {};

  dateKeys.forEach((key) => {
    dayAssignments[key] = 0;
    nightAssignments[key] = 0;
  });

  workingShifts.forEach((shift) => {
    if (!dateKeySet.has(shift.date)) return;
    const bucket = classifyShift(shift);
    if (bucket === 'Night') {
      nightAssignments[shift.date] = (nightAssignments[shift.date] ?? 0) + 1;
    } else {
      dayAssignments[shift.date] = (dayAssignments[shift.date] ?? 0) + 1;
    }
  });

  const dayCounts = dateKeys.map((key) => dayAssignments[key] ?? 0);
  const nightCounts = dateKeys.map((key) => nightAssignments[key] ?? 0);

  const averageDayStaff = dayCounts.length
    ? Math.round((dayCounts.reduce((sum, value) => sum + value, 0) / dayCounts.length) * 10) / 10
    : 0;
  const averageNightStaff = nightCounts.length
    ? Math.round((nightCounts.reduce((sum, value) => sum + value, 0) / nightCounts.length) * 10) / 10
    : 0;

  const lowestDayCover = dayCounts.length ? Math.min(...dayCounts) : 0;
  const lowestNightCover = nightCounts.length ? Math.min(...nightCounts) : 0;

  const requiredDayStaff = staffingSummary?.ndpsStaffing.Day ?? 0;
  const requiredNightStaff = staffingSummary?.ndpsStaffing.Night ?? 0;
  const dayDeficit = staffingSummary ? Math.max(0, requiredDayStaff - lowestDayCover) : 0;
  const nightDeficit = staffingSummary ? Math.max(0, requiredNightStaff - lowestNightCover) : 0;
  const meetsDayRequirement = staffingSummary ? dayDeficit === 0 : null;
  const meetsNightRequirement = staffingSummary ? nightDeficit === 0 : null;
  const isCompliant = Boolean(meetsDayRequirement && meetsNightRequirement);

  const generatedRelative = (() => {
    if (!staffingSummary) return null;
    const generatedDate = new Date(staffingSummary.generatedAt);
    if (Number.isNaN(generatedDate.getTime())) return null;
    return formatDistanceToNow(generatedDate, { addSuffix: true });
  })();

  const dailyCoverage = allDates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = workingShifts.filter(s => s.date === dateStr);
    return {
      date,
      shiftCount: dayShifts.length,
    };
  });

  const daysWithLowCoverage = dailyCoverage.filter(d => d.shiftCount < 3).length;
  const coveragePercentage = staff.length > 0 ? Math.min(100, Math.round((totalShifts / (staff.length * weeksToShow * 7)) * 100)) : 0;
  const expectedShiftsPerStaff = staff.length > 0 ? totalShifts / staff.length : 0;
  const dayDeficitLabel = dayDeficit > 0 ? `Add ${Math.ceil(dayDeficit)} for day cover` : null;
  const nightDeficitLabel = nightDeficit > 0 ? `Add ${Math.ceil(nightDeficit)} for night cover` : null;
  const actionItems = [dayDeficitLabel, nightDeficitLabel].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {staffingSummary ? (
        <Card className={isCompliant ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              NDPS Staffing Check
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Last generated {generatedRelative ?? 'recently'} • {staffingSummary.residentCount} resident{staffingSummary.residentCount === 1 ? '' : 's'} assessed • Nurses {staffingSummary.includeNurses ? 'included' : 'rolled into carers'}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              {isCompliant ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              )}
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-900">
                  {isCompliant
                    ? 'Your rota currently meets the NDPS recommended staffing levels.'
                    : 'Staffing is below the NDPS recommendation on some shifts.'}
                </p>
                {!isCompliant && actionItems.length > 0 && (
                  <ul className="list-disc pl-4 text-slate-700">
                    {actionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4" />
              Staffing Evidence
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Generate dependency scores to view recommended staffing levels alongside your rota.
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              The rota will surface NDPS recommendations once the dependency calculator has been saved for this workspace.
              Capture the latest resident assessments and this panel will compare required staff to scheduled cover automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Shifts</span>
              <span className="font-semibold">{totalShifts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Staff Members</span>
              <span className="font-semibold">{staff.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg per Staff</span>
              <span className="font-semibold">{averageShiftsPerStaff}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Annual Leave Hours</span>
        <span className="font-semibold">{Math.round(totalLeaveHours * 10) / 10}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-semibold">{coveragePercentage}%</span>
            </div>
            <Progress value={coveragePercentage} className="h-2" />
            {daysWithLowCoverage > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysWithLowCoverage} days with low coverage
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Staff Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStaff.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No staff assigned yet
            </div>
          ) : (
            <div className="space-y-3">
              {sortedStaff.slice(0, 10).map(({ member, shiftCount, totalHours, leaveHours }) => (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.roles}</div>
                    </div>
                    <div className="text-right ml-2">
                      <Badge variant={shiftCount > averageShiftsPerStaff ? "default" : "secondary"} className="text-xs">
                        {shiftCount} shifts
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {totalHours}h{leaveHours > 0 ? ` • ${leaveHours}h leave` : ''}
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={expectedShiftsPerStaff > 0 ? Math.min(100, (shiftCount / expectedShiftsPerStaff) * 100) : 0} 
                    className="h-1"
                  />
                </div>
              ))}
              {sortedStaff.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  + {sortedStaff.length - 10} more staff members
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
