"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, ShieldCheck, CheckCircle2, OctagonAlert } from "lucide-react";
import type { StaffMember, Shift } from "./rotas-view";
import { addDays, addWeeks, format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface NDPSStaffingSummary {
  recommendedDay: number;
  recommendedNight: number;
  residentCount: number;
  generatedAt?: string | null;
}

interface StaffSummaryProps {
  staff: StaffMember[];
  shifts: Shift[];
  weekStart: Date;
  weeksToShow: number;
  staffingSummary: NDPSStaffingSummary | null;
}

function parseTimeString(time?: string | null) {
  if (!time) return null;
  const [hourPart = "", minutePart = ""] = time.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { hour, minute };
}

function calculateShiftDurationHours(shift: Shift): number {
  const start = parseTimeString(shift.startTime);
  const end = parseTimeString(shift.endTime);
  if (!start || !end) return 0;

  let hours = end.hour - start.hour;
  let minutes = end.minute - start.minute;

  if (hours < 0 || (hours === 0 && minutes < 0)) {
    hours += 24;
  }

  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }

  const total = hours + minutes / 60;
  return total > 0 ? Math.round(total * 100) / 100 : 0;
}

function isNightShift(shift: Shift): boolean {
  const type = (shift.type || "").toLowerCase();
  if (type.includes("night")) return true;

  const start = parseTimeString(shift.startTime);
  const end = parseTimeString(shift.endTime);
  if (!start || !end) return false;

  if (end.hour < start.hour || (end.hour === start.hour && end.minute < start.minute)) {
    return true;
  }

  return start.hour >= 20 || start.hour < 6;
}

function formatStaffValue(value: number): string {
  const rounded = Math.max(0, Math.round(value * 10) / 10);
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function StaffSummary({ staff, shifts, weekStart, weeksToShow, staffingSummary }: StaffSummaryProps) {
  const workingShifts = shifts.filter((shift) => shift.type !== 'AnnualLeave');
  const leaveShifts = shifts.filter((shift) => shift.type === 'AnnualLeave');

  // Calculate shifts per staff member
  const staffShiftCounts = staff.map(member => {
    const memberShifts = workingShifts.filter(s => s.staffId === member.id);
    const memberLeaveHours = leaveShifts
      .filter(s => s.staffId === member.id)
      .reduce((total, leaveShift) => total + (leaveShift.leave?.totalHours ?? 0), 0);
    
    // Calculate total hours
    const totalHours = memberShifts.reduce((sum, shift) => sum + calculateShiftDurationHours(shift), 0);

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
  const visibleDateSet = new Set<string>();
  for (let week = 0; week < weeksToShow; week++) {
    const weekStartDate = addWeeks(weekStart, week);
    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(weekStartDate, day);
      allDates.push(currentDate);
      visibleDateSet.add(format(currentDate, 'yyyy-MM-dd'));
    }
  }

  const dailyCoverage = allDates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = workingShifts.filter(s => s.date === dateStr);
    return {
      date,
      shiftCount: dayShifts.length,
    };
  });

  const numDays = visibleDateSet.size;
  const daysWithLowCoverage = dailyCoverage.filter(d => d.shiftCount < 3).length;
  const coveragePercentage = staff.length > 0 && numDays > 0 ? Math.min(100, Math.round((totalShifts / (staff.length * numDays)) * 100)) : 0;
  const expectedShiftsPerStaff = staff.length > 0 ? totalShifts / staff.length : 0;

  let totalDayHours = 0;
  let totalNightHours = 0;

  workingShifts.forEach((shift) => {
    if (!visibleDateSet.has(shift.date)) return;
    const duration = calculateShiftDurationHours(shift);
    if (duration <= 0) return;
    if (isNightShift(shift)) {
      totalNightHours += duration;
    } else {
      totalDayHours += duration;
    }
  });

  const dayShiftEquivalent = numDays > 0 ? totalDayHours / 12 : 0;
  const nightShiftEquivalent = numDays > 0 ? totalNightHours / 12 : 0;
  const averageDayStaff = numDays > 0 ? dayShiftEquivalent / numDays : 0;
  const averageNightStaff = numDays > 0 ? nightShiftEquivalent / numDays : 0;

  const recommendedDay = staffingSummary?.recommendedDay ?? 0;
  const recommendedNight = staffingSummary?.recommendedNight ?? 0;
  const residentCount = staffingSummary?.residentCount ?? 0;
  const hasStaffingSummary = Boolean(staffingSummary);
  const COMPLIANCE_BUFFER = 0.05;

  const meetsDay = hasStaffingSummary ? averageDayStaff + COMPLIANCE_BUFFER >= recommendedDay : false;
  const meetsNight = hasStaffingSummary ? averageNightStaff + COMPLIANCE_BUFFER >= recommendedNight : false;
  const isCompliant = hasStaffingSummary ? meetsDay && meetsNight : false;

  const generatedRelative = staffingSummary?.generatedAt
    ? (() => {
        const parsed = new Date(staffingSummary.generatedAt as string);
        return Number.isNaN(parsed.getTime()) ? null : formatDistanceToNow(parsed, { addSuffix: true });
      })()
    : null;

  const totalLeaveHoursRounded = Math.round(totalLeaveHours * 10) / 10;

  return (
    <div className="space-y-4">
      {hasStaffingSummary ? (
        <Card className={isCompliant ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              NDPS Staffing Check
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {residentCount > 0 ? `${residentCount} resident${residentCount === 1 ? "" : "s"} assessed` : "Dependency data available"}
              {generatedRelative ? ` • Updated ${generatedRelative}` : ""}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl ${
                isCompliant
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                  : "border-amber-300 bg-amber-100 text-amber-700"
              }`}
              aria-hidden="true"
            >
              {isCompliant ? <CheckCircle2 className="h-7 w-7" /> : <OctagonAlert className="h-7 w-7" />}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 text-sm text-slate-900">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Day required</div>
                <div className="font-semibold">{recommendedDay}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Night required</div>
                <div className="font-semibold">{recommendedNight}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Day scheduled</div>
                <div className="font-semibold">{formatStaffValue(averageDayStaff)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Night scheduled</div>
                <div className="font-semibold">{formatStaffValue(averageNightStaff)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              NDPS Staffing Check
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Generate dependency scores to compare rota staffing against NDPS recommendations.
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Save the dependency calculator for this workspace to unlock automatic staffing compliance checks here.
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
              <span className="font-semibold">{totalLeaveHoursRounded}</span>
            </div>
          </div>

          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-semibold">{coveragePercentage}%</span>
            </div>
            <Progress value={coveragePercentage} className="h-2" />
            {daysWithLowCoverage > 0 && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
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
            <div className="py-6 text-center text-sm text-muted-foreground">
              No staff assigned yet
            </div>
          ) : (
            <div className="space-y-3">
              {sortedStaff.slice(0, 10).map(({ member, shiftCount, totalHours, leaveHours }) => (
                <div key={member.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.roles}</div>
                    </div>
                    <div className="ml-2 text-right">
                      <Badge variant={shiftCount > averageShiftsPerStaff ? "default" : "secondary"} className="text-xs">
                        {shiftCount} shifts
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {totalHours}h{leaveHours > 0 ? ` • ${leaveHours}h leave` : ""}
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
                <p className="pt-2 text-center text-xs text-muted-foreground">
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
