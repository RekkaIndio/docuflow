"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock } from "lucide-react";
import type { StaffMember, Shift } from "./rotas-view";
import { addDays, addWeeks, format, isSameDay, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface StaffSummaryProps {
  staff: StaffMember[];
  shifts: Shift[];
  weekStart: Date;
  weeksToShow: number;
}

export function StaffSummary({ staff, shifts, weekStart, weeksToShow }: StaffSummaryProps) {
  // Calculate shifts per staff member
  const staffShiftCounts = staff.map(member => {
    const memberShifts = shifts.filter(s => s.staffId === member.id);
    
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
    };
  });

  // Sort by shift count descending
  const sortedStaff = [...staffShiftCounts].sort((a, b) => b.shiftCount - a.shiftCount);

  const totalShifts = shifts.length;
  const averageShiftsPerStaff = staff.length > 0 ? Math.round((totalShifts / staff.length) * 10) / 10 : 0;

  // Calculate coverage for each day
  const allDates: Date[] = [];
  for (let week = 0; week < weeksToShow; week++) {
    const weekStartDate = addWeeks(weekStart, week);
    for (let day = 0; day < 7; day++) {
      allDates.push(addDays(weekStartDate, day));
    }
  }

  const dailyCoverage = allDates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr);
    return {
      date,
      shiftCount: dayShifts.length,
    };
  });

  const daysWithLowCoverage = dailyCoverage.filter(d => d.shiftCount < 3).length;
  const coveragePercentage = staff.length > 0 ? Math.min(100, Math.round((totalShifts / (staff.length * weeksToShow * 7)) * 100)) : 0;

  return (
    <div className="space-y-4">
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
              {sortedStaff.slice(0, 10).map(({ member, shiftCount, totalHours }) => (
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
                      <div className="text-xs text-muted-foreground mt-1">{totalHours}h</div>
                    </div>
                  </div>
                  <Progress 
                    value={staff.length > 0 ? (shiftCount / (totalShifts / staff.length)) * 100 : 0} 
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
