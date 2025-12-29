"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import { workspaceDocPath, workspaceCollectionPath } from "@/lib/paths";
import { format, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface StaffingOverviewCardProps {
  workspaceId?: string;
  orgId?: string | null;
  onNavigateToRotas?: () => void;
  className?: string;
  dailyEntry?: any;
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

type DepartmentMixEntry = {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
};

const DEPARTMENT_CONFIG: Record<string, { label: string; color: string }> = {
  managers: { label: "Management", color: "#3b82f6" },
  nurses: { label: "Nursing", color: "#0ea5e9" },
  ctms: { label: "Clinical Team", color: "#10b981" },
  domestics: { label: "Domestic", color: "#f97316" },
  maintenances: { label: "Maintenance", color: "#6366f1" },
  kitchens: { label: "Kitchen", color: "#f59e0b" },
  activities: { label: "Activities", color: "#a855f7" },
};

const FALLBACK_COLORS = ["#3b82f6", "#0ea5e9", "#10b981", "#22d3ee", "#f97316", "#f59e0b", "#a855f7", "#6366f1"];

const formatDepartmentLabel = (key: string) =>
  key
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function StaffingOverviewCard({ workspaceId, orgId, onNavigateToRotas, className, dailyEntry }: StaffingOverviewCardProps) {
  const [loading, setLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);
  const [understaffedDays, setUnderstaffedDays] = useState(0);
  const [shiftsPerDayState, setShiftsPerDayState] = useState<number[] | null>(null);
  const [avgShiftsPerDay, setAvgShiftsPerDay] = useState<number | null>(null);
  const [departmentMix, setDepartmentMix] = useState<DepartmentMixEntry[]>([]);

  const understaffedPill = understaffedDays > 0
    ? {
        text: `${understaffedDays} day${understaffedDays === 1 ? "" : "s"} understaffed`,
        className: "border-amber-300 bg-amber-100/90 text-amber-700",
      }
    : {
        text: "Coverage on track",
        className: "border-emerald-300 bg-emerald-100/80 text-emerald-700",
      };

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      setDepartmentMix([]);
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

        if (allStaff.length === 0) {
          setDepartmentMix([]);
        }

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

        // Calculate coverage percentage (shifts per day vs expected minimum)
        const expectedShiftsPerDay = Math.max(3, Math.floor(allStaff.length * 0.4)); // At least 40% of staff per day
        const daysInWeek = 7;
        const weekDates = Array.from({ length: daysInWeek }, (_, i) => 
          format(addDays(weekStart, i), 'yyyy-MM-dd')
        );

        const shiftsPerDay = weekDates.map(date => 
          shifts.filter(s => s.date === date).length
        );

        // store per-day counts for summary metrics
        setShiftsPerDayState(shiftsPerDay);
        const avg = shiftsPerDay.length > 0 ? Math.round(shiftsPerDay.reduce((a,b) => a+b, 0) / shiftsPerDay.length) : 0;
        setAvgShiftsPerDay(avg);

        // Count understaffed days (less than expected minimum)
        const understaffed = shiftsPerDay.filter(count => count < expectedShiftsPerDay).length;
        setUnderstaffedDays(understaffed);

        const departments = allStaff.reduce<Record<string, number>>((acc, staff) => {
          const key = staff.department || "other";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const sortedEntries = Object.entries(departments)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1]);

        let displayEntries = sortedEntries;
        if (sortedEntries.length > 5) {
          const primary = sortedEntries.slice(0, 5);
          const remainderValue = sortedEntries.slice(5).reduce((sum, [, value]) => sum + value, 0);
          displayEntries = remainderValue > 0 ? [...primary, ["other", remainderValue]] : primary;
        }

        const mix: DepartmentMixEntry[] = displayEntries.map(([key, value], index) => {
          const config = key === "other"
            ? { label: "Other roles", color: "#cbd5f5" }
            : DEPARTMENT_CONFIG[key] ?? {
                label: formatDepartmentLabel(key),
                color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
              };
          const percent = allStaff.length > 0 ? Math.round((value / allStaff.length) * 100) : 0;
          return {
            key,
            label: config.label,
            value,
            percent,
            color: config.color,
          };
        });

        setDepartmentMix(mix);

      } catch (error) {
        console.error('Failed to load staffing data:', error);
        setDepartmentMix([]);
      } finally {
        setLoading(false);
      }
    };

    loadStaffingData();
  }, [workspaceId, orgId]);

  // Parse counts from dailyEntry prop, mirroring the logic used in MiniStaffingCard
  const parseFromDailyEntry = (key: 'staffingDay' | 'staffingNight', fallback?: number | null) => {
    if (!dailyEntry) return fallback ?? null;
    const direct = dailyEntry[key];
    if (direct !== undefined && direct !== null) {
      const n = Number(direct);
      return Number.isFinite(n) && n >= 0 ? n : fallback ?? null;
    }
    const nested = dailyEntry.staffing?.[key === 'staffingDay' ? 'day' : 'night'];
    if (nested !== undefined && nested !== null) {
      const n = Number(nested);
      return Number.isFinite(n) && n >= 0 ? n : fallback ?? null;
    }
    return fallback ?? null;
  };

  const dayCountFromDaily = parseFromDailyEntry('staffingDay', null);
  const nightCountFromDaily = parseFromDailyEntry('staffingNight', null);
  const totalFromDaily = (dayCountFromDaily ?? 0) + (nightCountFromDaily ?? 0);
  const STAFF_TARGET = totalStaff > 0 ? Math.max(3, Math.floor(totalStaff * 0.4)) : 20;
  const coveragePercent = STAFF_TARGET > 0 ? Math.min(100, Math.round((totalFromDaily / STAFF_TARGET) * 100)) : 0;
  const staffingPillClass = (dayCountFromDaily === null && nightCountFromDaily === null)
    ? 'border-slate-200 bg-white/80 text-slate-700'
    : totalFromDaily === 0
      ? 'border-red-300 bg-red-100/90 text-red-700'
      : (coveragePercent >= 80 ? 'border-emerald-300 bg-emerald-100/80 text-emerald-700' : 'border-amber-300 bg-amber-100/90 text-amber-700');
  const staffingPillText = (dayCountFromDaily === null && nightCountFromDaily === null)
    ? 'Not logged'
    : `Day ${dayCountFromDaily ?? '—'} · Night ${nightCountFromDaily ?? '—'} · ${totalFromDaily}`;

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
          <div className="flex items-center gap-2">
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
        </div>
        <CardDescription className="text-sm text-slate-500">
          This week's rota summary and staffing levels at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading staffing data...</div>
        ) : totalStaff === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="mb-4 text-sm text-slate-600">No staff members found.</p>
            <p className="text-xs text-slate-500">Add staff in the Teams section to start scheduling rotas.</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 overflow-hidden">
            {departmentMix.length > 0 ? (
              <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/60 p-6 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Team mix</p>
                    <p className="text-xs text-slate-500">Current staffing distribution</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
                        understaffedPill.className,
                      )}
                    >
                      {understaffedPill.text}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide", staffingPillClass)}
                    >
                      {staffingPillText}
                    </Badge>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-stretch">
                  <div className="relative mx-auto h-48 w-48 sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={departmentMix}
                          innerRadius="58%"
                          outerRadius="100%"
                          paddingAngle={departmentMix.length > 1 ? 4 : 0}
                          cornerRadius={departmentMix.length > 1 ? 6 : 0}
                          dataKey="value"
                          stroke="transparent"
                        >
                          {departmentMix.map((segment) => (
                            <Cell key={segment.key} fill={segment.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Team</span>
                      <span className="text-2xl font-semibold text-slate-900">{totalStaff}</span>
                      <span className="text-xs text-slate-500">people logged</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {departmentMix.map((segment) => (
                      <div
                        key={segment.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: segment.color }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-slate-700">{segment.label}</span>
                        </div>
                        <span className="text-slate-500">
                          {segment.value} staff · {segment.percent}%
                        </span>
                      </div>
                    ))}
                    {/* Compact weekly summary metrics to use whitespace */}
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm text-center">
                        <div className="text-xs text-slate-500">Avg shifts / day</div>
                        <div className="text-lg font-semibold text-slate-800">{avgShiftsPerDay !== null ? avgShiftsPerDay : '—'}</div>
                      </div>
                      <div className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm text-center">
                        <div className="text-xs text-slate-500">Understaffed days</div>
                        <div className="text-lg font-semibold text-slate-800">{understaffedDays}</div>
                      </div>
                      <div className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm shadow-sm text-center">
                        <div className="text-xs text-slate-500">Coverage</div>
                        <div className="text-lg font-semibold text-slate-800">{coveragePercent}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-500">
                Add team members in the Teams area to see a staffing breakdown chart.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
