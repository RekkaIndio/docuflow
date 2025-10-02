"use client";

import { useState } from "react";
import { addDays, format, addWeeks, isSameDay, isWeekend } from "date-fns";
import { Plus, X, Clock, User, Users, ChevronRight, Calendar } from "lucide-react";
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
import type { StaffMember, Shift } from "./rotas-view";
import { ShiftDialog } from "./shift-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RotaGridProps {
  weekStart: Date;
  weeksToShow: number;
  staff: StaffMember[];
  shifts: Shift[];
  onAddShift: (date: string, staffId: string, staffName: string, type: 'AM' | 'PM' | 'Night' | 'Full', startTime?: string, endTime?: string) => void;
  onDeleteShift: (shiftId: string, date: string) => void;
  calculateStaffHours?: (staffId: string) => number;
}

const shiftColors = {
  AM: 'bg-blue-100 text-blue-800 border-blue-300',
  PM: 'bg-amber-100 text-amber-800 border-amber-300',
  Night: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  Full: 'bg-green-100 text-green-800 border-green-300',
};

const shiftBadgeColors = {
  AM: 'bg-blue-500',
  PM: 'bg-amber-500',
  Night: 'bg-indigo-500',
  Full: 'bg-green-500',
};

// Safe formatting function to prevent NaN display
const formatHours = (hours: number): string => {
  if (isNaN(hours) || !isFinite(hours)) return '0.0';
  return hours.toFixed(1);
};

export function RotaGrid({ weekStart, weeksToShow, staff, shifts, onAddShift, onDeleteShift, calculateStaffHours }: RotaGridProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

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

  const handleShiftAdded = (staffId: string, staffName: string, type: 'AM' | 'PM' | 'Night' | 'Full', startTime?: string, endTime?: string) => {
    if (selectedDate) {
      onAddShift(selectedDate, staffId, staffName, type, startTime, endTime);
    }
    setAddDialogOpen(false);
    setSelectedDate(null);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Group shifts by date and type
  const getShiftsForDate = (dateStr: string) => {
    return shifts.filter(s => s.date === dateStr);
  };

  const groupShiftsByType = (dayShifts: Shift[]) => {
    return {
      AM: dayShifts.filter(s => s.type === 'AM'),
      PM: dayShifts.filter(s => s.type === 'PM'),
      Night: dayShifts.filter(s => s.type === 'Night'),
      Full: dayShifts.filter(s => s.type === 'Full'),
    };
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
            const totalStaff = dayShifts.length;

            return (
              <Card
                key={date.toISOString()}
                className={cn(
                  "overflow-hidden transition-all hover:shadow-lg cursor-pointer",
                  todayCard && "ring-2 ring-primary shadow-md",
                  weekend && "bg-muted/30"
                )}
                onClick={() => totalStaff > 0 && handleViewDetails(date, dateStr)}
              >
                <CardHeader className={cn(
                  "pb-3",
                  todayCard && "bg-primary/5",
                  weekend && !todayCard && "bg-muted/50"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "text-4xl font-bold leading-none",
                          todayCard ? "text-primary" : "text-foreground"
                        )}>
                          {format(date, 'd')}
                        </div>
                        <div className="flex-1">
                          <CardTitle className={cn(
                            "text-lg font-bold leading-tight",
                            todayCard && "text-primary"
                          )}>
                            {format(date, 'EEEE')}
                          </CardTitle>
                          <div className={cn(
                            "text-sm mt-0.5",
                            todayCard ? "text-primary/80" : "text-muted-foreground"
                          )}>
                            {format(date, 'MMMM yyyy')}
                          </div>
                        </div>
                        {todayCard && (
                          <Badge className="bg-primary text-primary-foreground text-xs shrink-0">Today</Badge>
                        )}
                      </div>
                    </div>
                    {totalStaff > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        <Users className="w-3 h-3 mr-1" />
                        {totalStaff}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Summary View */}
                  <div className="space-y-3">
                    {/* Shift type counts */}
                    <div className="grid grid-cols-2 gap-2">
                      {groupedShifts.AM.length > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", shiftBadgeColors.AM)} />
                            <span className="text-xs font-medium">AM</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {groupedShifts.AM.length}
                          </Badge>
                        </div>
                      )}
                      {groupedShifts.PM.length > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", shiftBadgeColors.PM)} />
                            <span className="text-xs font-medium">PM</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {groupedShifts.PM.length}
                          </Badge>
                        </div>
                      )}
                      {groupedShifts.Night.length > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-indigo-50 border border-indigo-200">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", shiftBadgeColors.Night)} />
                            <span className="text-xs font-medium">Night</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {groupedShifts.Night.length}
                          </Badge>
                        </div>
                      )}
                      {groupedShifts.Full.length > 0 && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", shiftBadgeColors.Full)} />
                            <span className="text-xs font-medium">Full</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {groupedShifts.Full.length}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Empty state */}
                    {totalStaff === 0 && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        No staff assigned yet
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant={totalStaff === 0 ? "default" : "outline"}
                        size="sm"
                        className={cn("w-full", totalStaff === 0 && "border-dashed")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddClick(dateStr);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Staff
                      </Button>
                    </div>
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
        onOpenChange={setAddDialogOpen}
        staff={staff}
        onAddShift={handleShiftAdded}
        date={selectedDate || ''}
        calculateStaffHours={calculateStaffHours}
      />

      {/* Day Details Modal */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDateObj && format(selectedDateObj, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Full staff schedule for this day
            </DialogDescription>
          </DialogHeader>

          {selectedDate && (() => {
            const dayShifts = getShiftsForDate(selectedDate);
            const grouped = groupShiftsByType(dayShifts);

            return (
              <div className="space-y-4 py-4">
                {/* AM Shifts */}
                {grouped.AM.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge className="bg-blue-500 text-white">AM</Badge>
                      <span className="text-sm text-muted-foreground">Morning (07:00-15:00)</span>
                      <Badge variant="secondary" className="ml-auto">{grouped.AM.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {grouped.AM.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);
                        const staffHours = calculateStaffHours ? calculateStaffHours(shift.staffId) : 0;
                        const contractedHours = staffMember?.contractedHours || 40;
                        const percentageUsed = (staffHours / contractedHours) * 100;
                        const isAtLimit = staffHours >= contractedHours;
                        const isNear = percentageUsed >= 90 && !isAtLimit;
                        
                        return (
                        <div
                          key={shift.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border",
                            shiftColors.AM
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
                                      isAtLimit ? "border-destructive text-destructive" : isNear ? "border-amber-500 text-amber-700" : "border-green-500 text-green-700"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/20"
                            onClick={() => onDeleteShift(shift.id, shift.date)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* PM Shifts */}
                {grouped.PM.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge className="bg-amber-500 text-white">PM</Badge>
                      <span className="text-sm text-muted-foreground">Afternoon (15:00-23:00)</span>
                      <Badge variant="secondary" className="ml-auto">{grouped.PM.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {grouped.PM.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);
                        const staffHours = calculateStaffHours ? calculateStaffHours(shift.staffId) : 0;
                        const contractedHours = staffMember?.contractedHours || 40;
                        const percentageUsed = (staffHours / contractedHours) * 100;
                        const isAtLimit = staffHours >= contractedHours;
                        const isNear = percentageUsed >= 90 && !isAtLimit;
                        
                        return (
                        <div
                          key={shift.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border",
                            shiftColors.PM
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
                                      isAtLimit ? "border-destructive text-destructive" : isNear ? "border-amber-500 text-amber-700" : "border-green-500 text-green-700"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/20"
                            onClick={() => onDeleteShift(shift.id, shift.date)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Night Shifts */}
                {grouped.Night.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge className="bg-indigo-500 text-white">Night</Badge>
                      <span className="text-sm text-muted-foreground">Night (23:00-07:00)</span>
                      <Badge variant="secondary" className="ml-auto">{grouped.Night.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {grouped.Night.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);
                        const staffHours = calculateStaffHours ? calculateStaffHours(shift.staffId) : 0;
                        const contractedHours = staffMember?.contractedHours || 40;
                        const percentageUsed = (staffHours / contractedHours) * 100;
                        const isAtLimit = staffHours >= contractedHours;
                        const isNear = percentageUsed >= 90 && !isAtLimit;
                        
                        return (
                        <div
                          key={shift.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border",
                            shiftColors.Night
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
                                      isAtLimit ? "border-destructive text-destructive" : isNear ? "border-amber-500 text-amber-700" : "border-green-500 text-green-700"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/20"
                            onClick={() => onDeleteShift(shift.id, shift.date)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Full Day Shifts */}
                {grouped.Full.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Badge className="bg-green-500 text-white">Full</Badge>
                      <span className="text-sm text-muted-foreground">Full Day (07:00-23:00)</span>
                      <Badge variant="secondary" className="ml-auto">{grouped.Full.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {grouped.Full.map((shift) => {
                        const staffMember = staff.find(s => s.id === shift.staffId);
                        const staffHours = calculateStaffHours ? calculateStaffHours(shift.staffId) : 0;
                        const contractedHours = staffMember?.contractedHours || 40;
                        const percentageUsed = (staffHours / contractedHours) * 100;
                        const isAtLimit = staffHours >= contractedHours;
                        const isNear = percentageUsed >= 90 && !isAtLimit;
                        
                        return (
                        <div
                          key={shift.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-md border",
                            shiftColors.Full
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
                                      isAtLimit ? "border-destructive text-destructive" : isNear ? "border-amber-500 text-amber-700" : "border-green-500 text-green-700"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/20"
                            onClick={() => onDeleteShift(shift.id, shift.date)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );})}
                    </div>
                  </div>
                )}

                {/* Add more staff button in modal */}
                <Button
                  variant="outline"
                  className="w-full mt-4 border-dashed"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleAddClick(selectedDate);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More Staff
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
