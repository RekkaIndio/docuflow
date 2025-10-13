"use client";

import { useMemo } from "react";
import { format, addDays } from "date-fns";
import type { StaffMember, Shift, ShiftPattern } from "./rotas-view";
import { getShiftColorTheme, DEFAULT_SHIFT_COLOR } from "./shift-colors";

interface PrintRotaProps {
  weekStart: Date;
  weeksToShow: number;
  staff: StaffMember[];
  shifts: Shift[];
  workspaceName: string;
  patterns: ShiftPattern[];
}

const LEAVE_PRINT_STYLE = {
  background: "#fed7aa",
  text: "#9a3412",
};

export function PrintRota({ weekStart, weeksToShow, staff, shifts, workspaceName, patterns }: PrintRotaProps) {
  const patternMap = useMemo(() => {
    const entries = new Map<string, { pattern: ShiftPattern; theme: ReturnType<typeof getShiftColorTheme> }>();
    patterns.forEach((pattern) => {
      entries.set(pattern.id, {
        pattern,
        theme: getShiftColorTheme(pattern.color ?? DEFAULT_SHIFT_COLOR),
      });
    });
    return entries;
  }, [patterns]);

  const defaultPrintTheme = useMemo(() => getShiftColorTheme(DEFAULT_SHIFT_COLOR), []);

  // Calculate hours for a shift
  const calculateShiftHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
      return 0;
    }
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (hours < 0) hours += 24;
    
    const totalHours = hours + (minutes / 60);
    return isNaN(totalHours) ? 0 : totalHours;
  };

  // Generate all days for the period
  const allDays: Date[] = [];
  for (let week = 0; week < weeksToShow; week++) {
    const currentWeekStart = addDays(weekStart, week * 7);
    for (let day = 0; day < 7; day++) {
      allDays.push(addDays(currentWeekStart, day));
    }
  }

  // Get shifts for a specific staff member on a specific day
  const getStaffShiftsForDay = (staffId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.staffId === staffId && s.date === dateStr);
  };

  // Calculate total hours for a staff member
  const getTotalHours = (staffId: string) => {
    const staffShifts = shifts.filter(s => s.staffId === staffId);
    return staffShifts.reduce((total, shift) => {
      if (shift.startTime && shift.endTime) {
        return total + calculateShiftHours(shift.startTime, shift.endTime);
      }
      return total;
    }, 0);
  };

  const periodStart = format(weekStart, 'MMM d, yyyy');
  const periodEnd = format(addDays(weekStart, (weeksToShow * 7) - 1), 'MMM d, yyyy');

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          .print-rota-container,
          .print-rota-container * {
            visibility: visible !important;
          }

          /* Force header text to white in print */
          .print-rota-container table thead th,
          .print-rota-container table thead th * {
            color: #ffffff !important;
          }
          
          .print-rota-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        @media screen {
          .print-rota-container {
            position: absolute;
            left: -9999px;
            top: 0;
          }

          /* Also ensure header looks correct on-screen if needed */
          .print-rota-container table thead th,
          .print-rota-container table thead th * {
            color: #ffffff !important;
          }
        }
      `}} />

      {/* Print Content */}
      <div className="print-rota-container" style={{ fontSize: '10pt', lineHeight: '1.2' }}>
        <div className="p-6 bg-white text-black"
             style={{ background: 'white', color: 'black' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #1f2937', marginBottom: '1rem', paddingBottom: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.25rem' }}>{workspaceName}</h1>
            <p style={{ fontSize: '18px', color: '#4b5563' }}>Staff Rota Schedule</p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>{periodStart} - {periodEnd}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>CG360</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>cg360.co.uk</div>
          </div>
        </div>

        {/* Rota Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>
              <th style={{ border: '1px solid #4b5563', padding: '8px', textAlign: 'left', fontWeight: '700', width: '150px', color: '#ffffff' }}>
                Staff Name
              </th>
              <th style={{ border: '1px solid #4b5563', padding: '8px', textAlign: 'left', fontWeight: '700', width: '100px', color: '#ffffff' }}>
                Role
              </th>
              {allDays.map((day, idx) => (
                <th key={idx} style={{ border: '1px solid #4b5563', padding: '4px', textAlign: 'center', fontWeight: '700', width: '80px', color: '#ffffff' }}>
                  <div style={{ color: '#ffffff' }}>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#ffffff' }}>{format(day, 'MMM d')}</div>
                </th>
              ))}
              <th style={{ border: '1px solid #4b5563', padding: '8px', textAlign: 'center', fontWeight: '700', width: '60px', color: '#ffffff' }}>
                Total Hours
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((staffMember, staffIdx) => {
              const totalHours = getTotalHours(staffMember.id);
              
              return (
                <tr key={staffMember.id} style={{ backgroundColor: staffIdx % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '500' }}>
                    {staffMember.name}
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', color: '#4b5563' }}>
                    {staffMember.roles}
                  </td>
                  {allDays.map((day, dayIdx) => {
                    const dayShifts = getStaffShiftsForDay(staffMember.id, day);
                    
                    return (
                      <td key={dayIdx} style={{ border: '1px solid #d1d5db', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>
                        {dayShifts.length > 0 ? (
                          <div>
                            {dayShifts.map((shift, shiftIdx) => {
                              const isLeave = shift.type === 'AnnualLeave';
                              const shiftHours = !isLeave && shift.startTime && shift.endTime 
                                ? calculateShiftHours(shift.startTime, shift.endTime) 
                                : 0;

                              const patternEntry = patternMap.get(shift.type);
                              const theme = patternEntry?.theme;
                              const label = isLeave
                                ? 'Annual Leave'
                                : patternEntry?.pattern.label ?? shift.type;
                              const backgroundColor = isLeave
                                ? LEAVE_PRINT_STYLE.background
                                : theme?.printBackground ?? defaultPrintTheme.printBackground;
                              const textColor = isLeave
                                ? LEAVE_PRINT_STYLE.text
                                : theme?.printText ?? defaultPrintTheme.printText;

                              return (
                                <div
                                  key={shiftIdx}
                                  style={{
                                    backgroundColor,
                                    borderRadius: '4px',
                                    padding: '2px 4px',
                                    marginBottom: '2px',
                                    color: textColor,
                                  }}
                                >
                                  <div style={{ fontWeight: 600, fontSize: '11px' }}>
                                    {label}
                                  </div>
                                  {isLeave ? (
                                    <div style={{ fontSize: '9px', color: LEAVE_PRINT_STYLE.text, fontWeight: 500 }}>
                                      {(shift.leave?.totalHours ?? 0).toFixed(1)}h booked
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '9px', color: '#4b5563' }}>
                                        {shift.startTime}-{shift.endTime}
                                      </div>
                                      <div style={{ fontSize: '9px', fontWeight: '500' }}>
                                        {shiftHours.toFixed(1)}h
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                    {totalHours.toFixed(1)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #d1d5db', display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#6b7280' }}>
          <div>
            Printed: {format(new Date(), 'PPP p')}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
