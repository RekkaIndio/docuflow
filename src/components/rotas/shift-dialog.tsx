"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StaffMember, Shift, ShiftPattern } from "./rotas-view";
import { format, parseISO } from "date-fns";
import { Clock, User, AlertTriangle, CheckCircle, Plane, Sparkles } from "lucide-react";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  onAddShift: (
    date: string,
    staffId: string,
    staffName: string,
    type: Shift['type'],
    startTime?: string,
    endTime?: string,
    leaveMeta?: Shift['leave'],
  ) => Promise<void> | void;
  date: string;
  calculateStaffHours?: (staffId: string) => number;
  patterns: ShiftPattern[];
}

const defaultShiftTimes = {
  AM: { start: '07:00', end: '15:00' },
  PM: { start: '15:00', end: '23:00' },
  Night: { start: '23:00', end: '07:00' },
  Full: { start: '07:00', end: '23:00' },
};

export function ShiftDialog({ open, onOpenChange, staff, onAddShift, date, calculateStaffHours, patterns }: ShiftDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [shiftType, setShiftType] = useState<string>('');
  const [customTimes, setCustomTimes] = useState(false);
  const [startTime, setStartTime] = useState(defaultShiftTimes.AM.start);
  const [endTime, setEndTime] = useState(defaultShiftTimes.AM.end);
  const [mode, setMode] = useState<'shift' | 'annualLeave'>('shift');
  const [leaveDate, setLeaveDate] = useState(() => date || format(new Date(), 'yyyy-MM-dd'));
  const [leaveHours, setLeaveHours] = useState('7.5');

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const patternOptions = useMemo(() => {
    if (patterns.length > 0) {
      return patterns;
    }
    return [
      { id: 'AM', label: 'Morning', startTime: defaultShiftTimes.AM.start, endTime: defaultShiftTimes.AM.end, color: 'blue' as const },
      { id: 'PM', label: 'Afternoon', startTime: defaultShiftTimes.PM.start, endTime: defaultShiftTimes.PM.end, color: 'amber' as const },
      { id: 'Night', label: 'Night', startTime: defaultShiftTimes.Night.start, endTime: defaultShiftTimes.Night.end, color: 'indigo' as const },
      { id: 'Full', label: 'Full Day', startTime: defaultShiftTimes.Full.start, endTime: defaultShiftTimes.Full.end, color: 'green' as const },
    ];
  }, [patterns]);
  const selectedPattern = useMemo(() => patternOptions.find((pattern) => pattern.id === shiftType), [patternOptions, shiftType]);

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

  const handleShiftTypeChange = (type: string) => {
    setShiftType(type);
    const pattern = patternOptions.find((option) => option.id === type);
    if (!customTimes) {
      const fallback = defaultShiftTimes[type as keyof typeof defaultShiftTimes];
      setStartTime(pattern?.startTime ?? fallback?.start ?? startTime);
      setEndTime(pattern?.endTime ?? fallback?.end ?? endTime);
    } else if (!pattern) {
      const fallback = defaultShiftTimes[type as keyof typeof defaultShiftTimes];
      setStartTime(fallback?.start ?? startTime);
      setEndTime(fallback?.end ?? endTime);
    }
  };

  const parsedLeaveDate = leaveDate ? parseISO(leaveDate) : null;
  const leaveDateValid = parsedLeaveDate ? !Number.isNaN(parsedLeaveDate.getTime()) : false;
  const leaveHoursValue = (() => {
    const numeric = Number.parseFloat(leaveHours);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return NaN;
    }
    return Math.min(numeric, 24);
  })();

  useEffect(() => {
    if (open) {
      setMode('shift');
      setCustomTimes(false);
      const initialPattern = patternOptions[0];
      setShiftType(initialPattern?.id ?? '');
      setStartTime(initialPattern?.startTime ?? defaultShiftTimes.AM.start);
      setEndTime(initialPattern?.endTime ?? defaultShiftTimes.AM.end);
      setLeaveDate(date || format(new Date(), 'yyyy-MM-dd'));
      setLeaveHours('7.5');
    }
  }, [open, date, patternOptions]);

  useEffect(() => {
    if (mode === 'shift' && patternOptions.length > 0) {
      if (!patternOptions.some((pattern) => pattern.id === shiftType)) {
        const fallback = patternOptions[0];
        setShiftType(fallback.id);
        setStartTime(fallback.startTime);
        setEndTime(fallback.endTime);
        setCustomTimes(false);
      }
    }
  }, [patternOptions, shiftType, mode]);

  const handleSubmit = async () => {
    if (!selectedStaffId || !selectedStaff) return;

    if (mode === 'annualLeave') {
      if (!leaveDateValid || !Number.isFinite(leaveHoursValue)) return;

      await onAddShift(
        leaveDate,
        selectedStaffId,
        selectedStaff.name,
        'AnnualLeave',
        undefined,
        undefined,
        {
          groupId: `${selectedStaffId}-${leaveDate}-${Date.now()}`,
          totalHours: leaveHoursValue,
        }
      );
    } else {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd');
      await onAddShift(
        targetDate,
        selectedStaffId,
        selectedStaff.name,
        shiftType,
        startTime,
        endTime
      );
    }

    setSelectedStaffId('');
    const fallbackPattern = patternOptions[0];
    setShiftType(fallbackPattern?.id ?? '');
    setCustomTimes(false);
    setStartTime(fallbackPattern?.startTime ?? defaultShiftTimes.AM.start);
    setEndTime(fallbackPattern?.endTime ?? defaultShiftTimes.AM.end);
    setMode('shift');
    setLeaveDate(date || format(new Date(), 'yyyy-MM-dd'));
    setLeaveHours('7.5');
    onOpenChange(false);
  };

  const formattedDate = date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';
  const leaveDateLabel = leaveDateValid ? format(parsedLeaveDate!, 'EEEE, MMMM d, yyyy') : 'Select a date';
  const canSubmit = Boolean(selectedStaffId && (mode === 'shift' ? canAddShift : (leaveDateValid && Number.isFinite(leaveHoursValue))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'annualLeave' ? <Plane className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            {mode === 'annualLeave' ? 'Record Annual Leave' : 'Add Shift'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            {mode === 'shift' ? formattedDate : leaveDateLabel}
            {mode === 'shift' && selectedPattern?.description && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {selectedPattern.description}
              </span>
            )}
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

          {/* Entry type */}
          <div className="space-y-2">
            <Label>Entry Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'shift' ? 'default' : 'outline'}
                onClick={() => setMode('shift')}
                className="h-auto py-3 flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Shift
              </Button>
              <Button
                type="button"
                variant={mode === 'annualLeave' ? 'default' : 'outline'}
                onClick={() => setMode('annualLeave')}
                className="h-auto py-3 flex items-center justify-center gap-2"
              >
                <Plane className="w-4 h-4" />
                Annual Leave
              </Button>
            </div>
          </div>

          {/* Hours Warning/Info */}
          {mode === 'shift' && selectedStaff && selectedStaff.contractedHours && (
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

          {mode === 'shift' ? (
            <>
              {/* Shift Type Selection */}
              <div className="space-y-2">
                <Label>Shift Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {patternOptions.map((pattern) => (
                    <Button
                      key={pattern.id}
                      type="button"
                      variant={shiftType === pattern.id ? 'default' : 'outline'}
                      onClick={() => handleShiftTypeChange(pattern.id)}
                      className="h-auto py-3 flex flex-col items-center"
                    >
                      <span className="font-semibold">{pattern.id}</span>
                      <span className="text-xs mt-1">{pattern.label}</span>
                    </Button>
                  ))}
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
                      const nextState = !customTimes;
                      setCustomTimes(nextState);
                      if (!nextState) {
                        if (selectedPattern) {
                          setStartTime(selectedPattern.startTime);
                          setEndTime(selectedPattern.endTime);
                        } else {
                          const fallback = defaultShiftTimes[shiftType as keyof typeof defaultShiftTimes] ?? defaultShiftTimes.AM;
                          setStartTime(fallback.start);
                          setEndTime(fallback.end);
                        }
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
                {!customTimes && selectedPattern && (
                  <p className="text-xs text-muted-foreground">
                    Using default times for the {selectedPattern.label} shift
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveDate" className="text-xs text-muted-foreground">
                  Leave date
                </Label>
                <Input
                  id="leaveDate"
                  type="date"
                  value={leaveDate}
                  onChange={(event) => setLeaveDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaveHours" className="text-xs text-muted-foreground">
                  Hours away (max 24)
                </Label>
                <Input
                  id="leaveHours"
                  type="number"
                  min={0.5}
                  step={0.5}
                  max={24}
                  value={leaveHours}
                  onChange={(event) => setLeaveHours(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  These hours will be recorded as annual leave on the selected day.
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedStaff && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">{mode === 'annualLeave' ? 'Annual Leave Summary' : 'Shift Summary'}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="font-medium">{selectedStaff.name}</span>
                </div>
                {mode === 'annualLeave' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">Annual Leave</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{leaveDateLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours away:</span>
                      <span className="font-medium">{Number.isFinite(leaveHoursValue) ? formatHours(leaveHoursValue) : '0.0'}h</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shift:</span>
                      <span className="font-medium">{selectedPattern?.label ?? shiftType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours:</span>
                      <span className="font-medium">{startTime} - {endTime}</span>
                    </div>
                  </>
                )}
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
            disabled={!canSubmit}
          >
            {mode === 'annualLeave' ? 'Save Leave' : 'Add Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
