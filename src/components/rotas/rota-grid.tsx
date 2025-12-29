"use client";

import { useMemo, useState } from "react";
import { addDays, format, addWeeks, isSameDay, isWeekend } from "date-fns";
import { Plus, X, Clock, User, Users, Calendar, LayoutList, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { StaffMember, Shift, ShiftPattern } from "./rotas-view";
import { ShiftDialog } from "./shift-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getShiftColorTheme, DEFAULT_SHIFT_COLOR } from "./shift-colors";

interface RotaGridProps {
  weekStart: Date;
  weeksToShow: number;
  staff: StaffMember[];
  shifts: Shift[];
  onAddShift: (
    date: string,
    staffId: string,
    staffName: string,
    type: Shift['type'],
    startTime?: string,
    endTime?: string,
    leaveMeta?: Shift['leave'],
  ) => Promise<void> | void;
  onDeleteShift: (shiftId: string, date: string) => void;
  calculateStaffHours?: (staffId: string) => number;
  patterns: ShiftPattern[];
  readOnly?: boolean;
}

const ANNUAL_LEAVE_THEME = {
  summaryContainer: "border bg-orange-50 border-orange-200 dark:bg-slate-800 dark:border-orange-700",
  summaryDot: "bg-orange-500",
  detailContainer: "border border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-slate-800 dark:text-orange-200",
  detailBadge: "border-orange-500 text-orange-700 dark:border-orange-600 dark:text-orange-200",
};

interface ShiftGroup {
  type: string;
  label: string;
  shifts: Shift[];
  theme: {
    summaryContainer: string;
    summaryDot: string;
    detailContainer: string;
    detailBadge: string;
  };
  pattern?: ShiftPattern;
  order: number;
  isAnnualLeave?: boolean;
}

// Safe formatting function to prevent NaN display
const formatHours = (hours: number): string => {
  if (isNaN(hours) || !isFinite(hours)) return '0.0';
  return hours.toFixed(1);
};

export function RotaGrid({ weekStart, weeksToShow, staff, shifts, onAddShift, onDeleteShift, calculateStaffHours, patterns, readOnly = false }: RotaGridProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsViewMode, setDetailsViewMode] = useState<'list' | 'timeline'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

  const patternMeta = useMemo(() => {
    return patterns.reduce<Map<string, { pattern: ShiftPattern; order: number; theme: ReturnType<typeof getShiftColorTheme> }>>(
      (map, pattern, index) => {
        map.set(pattern.id, {
          pattern,
          order: index,
          theme: getShiftColorTheme(pattern.color ?? DEFAULT_SHIFT_COLOR),
        });
        return map;
      },
      new Map()
    );
  }, [patterns]);

  const defaultTheme = useMemo(() => getShiftColorTheme(DEFAULT_SHIFT_COLOR), []);

  // Generate all dates for the period
  const allDates: Date[] = [];
  for (let week = 0; week < weeksToShow; week++) {
    const weekStartDate = addWeeks(weekStart, week);
    for (let day = 0; day < 7; day++) {
      allDates.push(addDays(weekStartDate, day));
    }
  }

  const handleAddClick = (date: string) => {
    setSelectedDate(date);
    setAddDialogOpen(true);
  };

  const handleViewDetails = (date: Date, dateStr: string) => {
    setSelectedDateObj(date);
    setSelectedDate(dateStr);
    setDetailsDialogOpen(true);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Group shifts by date and type
  const getShiftsForDate = (dateStr: string) => {
    return shifts.filter(s => s.date === dateStr);
  };

  const groupShiftsByType = (dayShifts: Shift[]): ShiftGroup[] => {
    const bucket = new Map<string, Shift[]>();

    dayShifts.forEach((shift) => {
      const key = shift.type || 'Unknown';
      if (!bucket.has(key)) {
        bucket.set(key, []);
      }
      bucket.get(key)!.push(shift);
    });

    const groups: ShiftGroup[] = Array.from(bucket.entries()).map(([type, items]) => {
      if (type === 'AnnualLeave') {
        return {
          type,
          label: 'Annual Leave',
          shifts: items,
          pattern: undefined,
          order: Number.MAX_SAFE_INTEGER,
          isAnnualLeave: true,
          theme: ANNUAL_LEAVE_THEME,
        };
      }

      const meta = patternMeta.get(type);
      const theme = meta?.theme ?? defaultTheme;

      return {
        type,
        label: meta?.pattern.label ?? type,
        shifts: items,
        pattern: meta?.pattern,
        order: meta?.order ?? Number.MAX_SAFE_INTEGER - 1,
        theme: {
          summaryContainer: `border ${theme.summaryContainer}`,
          summaryDot: theme.summaryDot,
          detailContainer: `border ${theme.detailContainer}`,
          detailBadge: theme.detailBadge,
        },
      };
    });

    return groups.sort((a, b) => {
      if (a.order === b.order) {
        return a.label.localeCompare(b.label);
      }
      return a.order - b.order;
    });
  };

  return (
    <div className="w-full">
      <TooltipProvider>
        {/* Grid of day cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allDates.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const todayCard = isToday(date);
            const weekend = isWeekend(date);
            const dayShifts = getShiftsForDate(dateStr);
            const groupedShifts = groupShiftsByType(dayShifts);
            const leaveGroup = groupedShifts.find(group => group.isAnnualLeave);
            const workingGroups = groupedShifts.filter(group => !group.isAnnualLeave);
            const leaveCount = leaveGroup?.shifts.length ?? 0;
            const totalEntries = dayShifts.length;
            const workingCount = totalEntries - leaveCount;
            const hasEntries = totalEntries > 0;
            const totalLeaveHours = leaveGroup
              ? leaveGroup.shifts.reduce((sum, shift) => sum + (shift.leave?.totalHours ?? 0), 0)
              : 0;

            return (
              <Card
                key={date.toISOString()}
                className={cn(
                  "overflow-hidden transition-all hover:shadow-lg",
                  (readOnly ? hasEntries : true) && "cursor-pointer",
                  todayCard && "ring-2 ring-primary shadow-md",
                  // ensure weekend and today header/bg have dark variants
                  weekend && "bg-muted/30 dark:bg-slate-800",
                )}
                onClick={() => (readOnly ? hasEntries : true) && handleViewDetails(date, dateStr)}
              >
                <CardHeader className={cn(
                  "pb-3",
                  todayCard && "bg-primary/5 dark:bg-slate-900",
                  weekend && !todayCard && "bg-muted/50 dark:bg-slate-800"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "text-4xl font-bold leading-none",
                          todayCard ? "text-primary" : "text-foreground dark:text-slate-100"
                        )}>
                          {format(date, 'd')}
                        </div>
                        <div className="flex-1">
                          <CardTitle className={cn(
                            "text-lg font-bold leading-tight",
                            todayCard && "text-primary dark:text-slate-100"
                          )}>
                            {format(date, 'EEEE')}
                          </CardTitle>
                          <div className={cn(
                            "text-sm mt-0.5",
                            todayCard ? "text-primary/80" : "text-muted-foreground dark:text-slate-300"
                          )}>
                            {format(date, 'MMMM yyyy')}
                          </div>
                        </div>
                        {todayCard && (
                          <Badge className="bg-primary text-primary-foreground text-xs shrink-0 dark:bg-primary/10 dark:text-slate-100">Today</Badge>
                        )}
                      </div>
                    </div>
                    {hasEntries && (
                      <Badge variant="secondary" className="ml-2 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                        <Users className="w-3 h-3 mr-1" />
                        {workingCount}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Summary View */}
                  <div className="space-y-3">
                    {/* Shift type counts */}
                    <div className="grid grid-cols-2 gap-2">
                      {workingGroups.map((group) => (
                        <div
                          key={group.type}
                          className={cn("flex items-center justify-between p-2 rounded-md", group.theme.summaryContainer)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", group.theme.summaryDot)} />
                            <span className="text-xs font-medium">{group.pattern?.id ?? group.type}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                            {group.shifts.length}
                          </Badge>
                        </div>
                      ))}
                      {leaveGroup && (
                        <div
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md col-span-2",
                            leaveGroup.theme.summaryContainer
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", leaveGroup.theme.summaryDot)} />
                            <span className="text-xs font-medium">{leaveGroup.label}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                            {totalLeaveHours.toFixed(1)}h
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Empty state */}
                    {!hasEntries && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No staff assigned yet
                      </div>
                    )}

                    {/* Action buttons */}
                    {!readOnly && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant={!hasEntries ? "default" : "outline"}
                          size="sm"
                          className={cn("w-full", !hasEntries && "border-dashed")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddClick(dateStr);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Entry
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Add Staff Dialog */}
      <ShiftDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setSelectedDate(null);
          }
        }}
        staff={staff}
        onAddShift={onAddShift}
        date={selectedDate || ''}
        calculateStaffHours={calculateStaffHours}
        patterns={patterns}
      />

      {/* Day Details Modal */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {selectedDateObj && format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={detailsViewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setDetailsViewMode('list')}
                >
                  <LayoutList className="w-4 h-4 mr-1.5" />
                  List
                </Button>
                <Button
                  variant={detailsViewMode === 'timeline' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setDetailsViewMode('timeline')}
                >
                  <Timer className="w-4 h-4 mr-1.5" />
                  Timeline
                </Button>
              </div>
            </div>
            <DialogDescription>
              {detailsViewMode === 'list'
                ? 'Staff schedule grouped by shift type'
                : 'Visual timeline showing shift coverage throughout the day'}
            </DialogDescription>
          </DialogHeader>

          {selectedDate && (() => {
            const dayShifts = getShiftsForDate(selectedDate);

            // Shared calculations
            const grouped = groupShiftsByType(dayShifts);
            const leaveGroup = grouped.find(group => group.isAnnualLeave);
            const workingGroups = grouped.filter(group => !group.isAnnualLeave);
            const totalLeaveHoursForDay = leaveGroup
              ? leaveGroup.shifts.reduce((sum, shift) => sum + (shift.leave?.totalHours ?? 0), 0)
              : 0;

            if (detailsViewMode === 'timeline') {
              const shiftsByStaff = new Map<string, Shift[]>();
              dayShifts.forEach(shift => {
                if (!shiftsByStaff.has(shift.staffId)) shiftsByStaff.set(shift.staffId, []);
                shiftsByStaff.get(shift.staffId)!.push(shift);
              });

              // Sort staff: those with shifts first, then alphabetical? 
              // Or just show active staff for this day to keep it clean.
              const activeStaff = staff.filter(s => shiftsByStaff.has(s.id))
                .sort((a, b) => a.name.localeCompare(b.name));

              const getPosition = (start: string = '00:00', end: string = '24:00') => {
                const [sh, sm] = start.split(':').map(Number);
                const [eh, em] = end.split(':').map(Number);
                const startVal = sh + sm / 60;
                let endVal = eh + em / 60;
                if (endVal < startVal) endVal += 24;

                const startPercent = (startVal / 24) * 100;
                const widthPercent = Math.max(((endVal - startVal) / 24) * 100, 2); // Min width 2%
                return { left: `${startPercent}%`, width: `${widthPercent}%` };
              };

              // Time markers for 00, 04, 08, 12, 16, 20
              const hours = [0, 4, 8, 12, 16, 20];

              return (
                <div className="space-y-6 py-4">
                  {/* Timeline Header */}
                  <div className="flex">
                    <div className="w-[120px] shrink-0 font-medium text-xs text-muted-foreground pt-4">Staff Member</div>
                    <div className="flex-1 relative h-6">
                      {hours.map(h => (
                        <div
                          key={h}
                          className="absolute bottom-0 text-[10px] text-muted-foreground transform -translate-x-1/2"
                          style={{ left: `${(h / 24) * 100}%` }}
                        >
                          {h.toString().padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {activeStaff.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed">
                        No staff assigned for this day
                      </div>
                    )}

                    {activeStaff.map(member => {
                      const memberShifts = shiftsByStaff.get(member.id) || [];
                      return (
                        <div key={member.id} className="flex items-center group/row hover:bg-muted/30 rounded-md -mx-2 px-2 py-1 transition-colors">
                          <div className="w-[120px] shrink-0 pr-3">
                            <div className="font-medium text-sm truncate">{member.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate opacity-70">{member.roles}</div>
                          </div>

                          <div className="flex-1 relative h-8 bg-muted/20 rounded-md ring-1 ring-inset ring-black/5 dark:ring-white/5">
                            {/* Vertical Grid Lines */}
                            {hours.map(h => (
                              <div key={h} className="absolute top-0 bottom-0 border-l border-muted/50 w-px" style={{ left: `${(h / 24) * 100}%` }} />
                            ))}

                            {/* Shift Bars */}
                            {memberShifts.map(shift => {
                              const isLeave = shift.type === 'AnnualLeave';
                              const meta = patternMeta.get(shift.type);

                              // Get color class
                              const colorClass = isLeave
                                ? "bg-orange-500"
                                : meta?.theme.summaryDot || "bg-slate-500 shadow-sm";

                              if (isLeave && !shift.startTime) {
                                // Full day leave logic
                                return (
                                  <div
                                    key={shift.id}
                                    className={cn("absolute top-1.5 bottom-1.5 rounded-sm flex items-center justify-center text-[10px] text-white shadow-sm font-medium", colorClass)}
                                    style={{ left: '0%', width: '100%' }}
                                  >
                                    Full Day Leave
                                  </div>
                                );
                              }

                              const pos = getPosition(shift.startTime, shift.endTime);

                              return (
                                <div
                                  key={shift.id}
                                  className={cn("absolute top-1.5 bottom-1.5 rounded-sm z-10 hover:brightness-110 transition-all cursor-help", colorClass)}
                                  style={{ ...pos }}
                                  title={`${shift.startTime} - ${shift.endTime} (${isLeave ? 'Annual Leave' : meta?.pattern.label})`}
                                >
                                  {/* Simple label if wide enough */}
                                  {parseFloat(pos.width) > 15 && (
                                    <span className="text-[10px] text-white/90 font-medium px-1.5 truncate block w-full leading-5">
                                      {shift.startTime} - {shift.endTime}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!readOnly && (
                    <Button
                      variant="outline"
                      className="w-full mt-6 border-dashed"
                      onClick={() => {
                        setDetailsDialogOpen(false);
                        handleAddClick(selectedDate);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Entry
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4 py-4">
                {workingGroups.map((group) => (
                  <div key={group.type}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-semibold", group.theme.detailBadge)}
                      >
                        {group.pattern?.id ?? group.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {group.pattern?.label ?? group.label}
                        {group.pattern ? ` (${group.pattern.startTime} - ${group.pattern.endTime})` : ''}
                      </span>
                      <Badge variant="secondary" className="ml-auto dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                        {group.shifts.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {group.shifts.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);
                        const staffHours = calculateStaffHours ? calculateStaffHours(shift.staffId) : 0;
                        const contractedHours = staffMember?.contractedHours || 40;
                        const percentageUsed = contractedHours ? (staffHours / contractedHours) * 100 : 0;
                        const isAtLimit = contractedHours ? staffHours >= contractedHours : false;
                        const isNear = contractedHours ? percentageUsed >= 90 && !isAtLimit : false;

                        return (
                          <div
                            key={shift.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-md border",
                              group.theme.detailContainer
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <User className="w-4 h-4 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{shift.staffName}</span>
                                  {staffMember?.contractedHours && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        isAtLimit
                                          ? "border-destructive text-destructive"
                                          : isNear
                                            ? "border-amber-500 text-amber-700"
                                            : "border-green-500 text-green-700"
                                      )}
                                    >
                                      {formatHours(staffHours)}/{contractedHours}h
                                    </Badge>
                                  )}
                                </div>
                                {staffMember && (
                                  <div className="text-xs text-muted-foreground">{staffMember.roles}</div>
                                )}
                                <div className="text-sm opacity-70 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {shift.startTime} - {shift.endTime}
                                </div>
                              </div>
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-red-500/20"
                                onClick={() => onDeleteShift(shift.id, shift.date)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {leaveGroup && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-semibold", leaveGroup.theme.detailBadge)}
                      >
                        Leave
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Annual leave entries ({leaveGroup.shifts.length})
                      </span>
                      <Badge variant="secondary" className="ml-auto dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                        {formatHours(totalLeaveHoursForDay)}h
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {leaveGroup.shifts.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);

                        return (
                          <div
                            key={shift.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-md border",
                              leaveGroup.theme.detailContainer
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <User className="w-4 h-4 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{shift.staffName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {formatHours(shift.leave?.totalHours ?? 0)}h
                                  </Badge>
                                </div>
                                {staffMember && (
                                  <div className="text-xs text-muted-foreground">{staffMember.roles}</div>
                                )}
                                <div className="text-sm opacity-70 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  Recorded {formatHours(shift.leave?.totalHours ?? 0)} hours
                                </div>
                              </div>
                            </div>
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-red-500/20"
                                onClick={() => onDeleteShift(shift.id, shift.date)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!readOnly && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-dashed"
                    onClick={() => {
                      setDetailsDialogOpen(false);
                      handleAddClick(selectedDate);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Entry
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
