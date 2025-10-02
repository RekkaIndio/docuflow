"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StaffMember } from "./rotas-view";
import { format } from "date-fns";
import { Clock, User, AlertTriangle, CheckCircle } from "lucide-react";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  onAddShift: (staffId: string, staffName: string, type: 'AM' | 'PM' | 'Night' | 'Full', startTime?: string, endTime?: string) => void;
  date: string;
  calculateStaffHours?: (staffId: string) => number;
}

const defaultShiftTimes = {
  AM: { start: '07:00', end: '15:00' },
  PM: { start: '15:00', end: '23:00' },
  Night: { start: '23:00', end: '07:00' },
  Full: { start: '07:00', end: '23:00' },
};

export function ShiftDialog({ open, onOpenChange, staff, onAddShift, date, calculateStaffHours }: ShiftDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [shiftType, setShiftType] = useState<'AM' | 'PM' | 'Night' | 'Full'>('AM');
  const [customTimes, setCustomTimes] = useState(false);
  const [startTime, setStartTime] = useState(defaultShiftTimes.AM.start);
  const [endTime, setEndTime] = useState(defaultShiftTimes.AM.end);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  // Calculate hours for this shift
  const calculateShiftHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    // Check for invalid numbers
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return 0;
    }
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (hours < 0) hours += 24;
    
    const totalHours = hours + (minutes / 60);
    return isNaN(totalHours) ? 0 : totalHours;
  };

  const currentShiftHours = calculateShiftHours(startTime, endTime);
  const currentScheduledHours = calculateStaffHours && selectedStaffId ? calculateStaffHours(selectedStaffId) : 0;
  const totalHoursAfterShift = currentScheduledHours + currentShiftHours;
  const contractedHours = selectedStaff?.contractedHours || 40; // default 40 hours
  const percentageUsed = isNaN(totalHoursAfterShift) || isNaN(contractedHours) ? 0 : (totalHoursAfterShift / contractedHours) * 100;
  
  const isOverLimit = totalHoursAfterShift > contractedHours;
  const isAtLimit = totalHoursAfterShift >= contractedHours;
  const isNearLimit = percentageUsed >= 90 && !isOverLimit;
  const canAddShift = !isAtLimit; // Cannot add shift if at or over limit

  // Safe formatting function to prevent NaN display
  const formatHours = (hours: number): string => {
    if (isNaN(hours) || !isFinite(hours)) return '0.0';
    return hours.toFixed(1);
  };

  const handleShiftTypeChange = (type: 'AM' | 'PM' | 'Night' | 'Full') => {
    setShiftType(type);
    if (!customTimes) {
      setStartTime(defaultShiftTimes[type].start);
      setEndTime(defaultShiftTimes[type].end);
    }
  };

  const handleSubmit = () => {
    if (!selectedStaffId || !selectedStaff) return;
    
    onAddShift(
      selectedStaffId,
      selectedStaff.name,
      shiftType,
      startTime,
      endTime
    );

    // Reset form
    setSelectedStaffId('');
    setShiftType('AM');
    setCustomTimes(false);
    setStartTime(defaultShiftTimes.AM.start);
    setEndTime(defaultShiftTimes.AM.end);
  };

  const formattedDate = date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Add Shift
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {formattedDate}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Staff Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Select Staff Member
            </Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a staff member" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {staff.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No staff members available
                  </div>
                ) : (
                  staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.roles}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.department}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Hours Warning/Info */}
          {selectedStaff && selectedStaff.contractedHours && (
            <Alert className={isAtLimit ? "border-destructive bg-destructive/10" : isNearLimit ? "border-amber-500 bg-amber-50" : "border-green-500 bg-green-50"}>
              <div className="flex items-start gap-3">
                {isAtLimit ? (
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                ) : isNearLimit ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                )}
                <div className="flex-1 space-y-1">
                  <AlertDescription className="font-medium text-sm">
                    {isAtLimit ? (
                      <span className="text-destructive">🚫 Cannot Add - Would Meet/Exceed Hours</span>
                    ) : isNearLimit ? (
                      <span className="text-amber-700">⚡ Approaching Hour Limit</span>
                    ) : (
                      <span className="text-green-700">✓ Within Contracted Hours</span>
                    )}
                  </AlertDescription>
                  <AlertDescription className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span>Currently scheduled:</span>
                      <span className="font-medium">{formatHours(currentScheduledHours)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This shift adds:</span>
                      <span className="font-medium">+{formatHours(currentShiftHours)} hrs</span>
                    </div>
                    <div className="flex justify-between border-t pt-0.5 mt-1">
                      <span>Total after shift:</span>
                      <span className={`font-bold ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-700' : 'text-green-700'}`}>
                        {formatHours(totalHoursAfterShift)} / {contractedHours} hrs
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(isNaN(percentageUsed) ? 0 : percentageUsed, 100)}%` }}
                        />
                      </div>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Shift Type Selection */}
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant={shiftType === 'AM' ? 'default' : 'outline'}
                onClick={() => handleShiftTypeChange('AM')}
                className="h-auto py-3 flex flex-col items-center"
              >
                <span className="font-semibold">AM</span>
                <span className="text-xs mt-1">Morning</span>
              </Button>
              <Button
                type="button"
                variant={shiftType === 'PM' ? 'default' : 'outline'}
                onClick={() => handleShiftTypeChange('PM')}
                className="h-auto py-3 flex flex-col items-center"
              >
                <span className="font-semibold">PM</span>
                <span className="text-xs mt-1">Afternoon</span>
              </Button>
              <Button
                type="button"
                variant={shiftType === 'Night' ? 'default' : 'outline'}
                onClick={() => handleShiftTypeChange('Night')}
                className="h-auto py-3 flex flex-col items-center"
              >
                <span className="font-semibold">Night</span>
                <span className="text-xs mt-1">Overnight</span>
              </Button>
              <Button
                type="button"
                variant={shiftType === 'Full' ? 'default' : 'outline'}
                onClick={() => handleShiftTypeChange('Full')}
                className="h-auto py-3 flex flex-col items-center"
              >
                <span className="font-semibold">Full</span>
                <span className="text-xs mt-1">All Day</span>
              </Button>
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Shift Times</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomTimes(!customTimes);
                  if (customTimes) {
                    setStartTime(defaultShiftTimes[shiftType].start);
                    setEndTime(defaultShiftTimes[shiftType].end);
                  }
                }}
              >
                {customTimes ? 'Use Default' : 'Custom Times'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-xs text-muted-foreground">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setCustomTimes(true);
                  }}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-xs text-muted-foreground">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setCustomTimes(true);
                  }}
                  className="font-mono"
                />
              </div>
            </div>
            {!customTimes && (
              <p className="text-xs text-muted-foreground">
                Using default times for {shiftType} shift
              </p>
            )}
          </div>

          {/* Summary */}
          {selectedStaff && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Shift Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-medium">{selectedStaff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift:</span>
                  <span className="font-medium">{shiftType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours:</span>
                  <span className="font-medium">{startTime} - {endTime}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedStaffId || !canAddShift}
          >
            Add Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
