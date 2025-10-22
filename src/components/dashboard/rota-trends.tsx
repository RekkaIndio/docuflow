"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Bed, Users, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { collection, doc, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { workspaceDocPath } from '@/lib/paths';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

interface TrendPoint {
  weekKey: string;
  label: string;
  totalShifts: number;
  staffCount: number;
  totalHours: number;
}

const calculateShiftHours = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  if ([startHour, startMin, endHour, endMin].some((n) => Number.isNaN(n))) return 0;
  let hours = endHour - startHour;
  let minutes = endMin - startMin;
  if (hours < 0 || (hours === 0 && minutes < 0)) hours += 24;
  const total = hours + minutes / 60;
  return Number.isFinite(total) ? Math.max(total, 0) : 0;
};

export default function RotaTrends({ workspaceId, organisationId }: { workspaceId?: string; organisationId?: string }) {
  const [staffing, setStaffing] = useState<{ recommendedDay?: number; recommendedNight?: number; residentCount?: number } | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    const summaryRef = doc(db, workspaceDocPath(workspaceId, undefined, organisationId), 'rotas', 'staffing-summary');
    const unsubSummary = onSnapshot(summaryRef, (snap) => {
      if (!snap.exists()) {
        setStaffing(null);
        return;
      }
      const data = snap.data() as any;
      setStaffing({
        recommendedDay: data?.ndpsStaffing?.Day ?? data?.recommendedDay ?? undefined,
        recommendedNight: data?.ndpsStaffing?.Night ?? data?.recommendedNight ?? undefined,
        residentCount: data?.residentCount ?? undefined,
      });
    }, (err) => {
      console.error('Failed to subscribe to staffing-summary', err);
      setStaffing(null);
    });

    return () => unsubSummary();
  }, [workspaceId, organisationId]);

  useEffect(() => {
    if (!workspaceId) {
      setTrendPoints([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const basePath = workspaceDocPath(workspaceId, undefined, organisationId);
    const rotasRef = collection(db, basePath, 'rotas');
    const rotasQuery = query(rotasRef, orderBy('weekStartDate', 'desc'), limit(8));

    const unsubRotas = onSnapshot(rotasQuery, (snapshot) => {
      const points = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const weekKey: string = data?.weekStartDate ?? docSnap.id;
        const shifts = Array.isArray(data?.shifts) ? data.shifts : [];
        const staffIds = new Set<string>();
        let totalHours = 0;
        shifts.forEach((shift: any) => {
          if (shift?.staffId) staffIds.add(shift.staffId);
          totalHours += calculateShiftHours(shift?.startTime, shift?.endTime);
        });
        let label = docSnap.id;
        if (weekKey) {
          const parsed = new Date(weekKey);
          if (!Number.isNaN(parsed.getTime())) {
            label = format(parsed, 'd MMM');
          }
        }
        return {
          weekKey,
          label,
          totalShifts: shifts.length,
          staffCount: staffIds.size,
          totalHours: Math.round(totalHours),
        } as TrendPoint;
      }).reverse();
      setTrendPoints(points);
      setLoading(false);
    }, (err) => {
      console.error('Failed to subscribe to rota trends', err);
      setTrendPoints([]);
      setLoading(false);
    });

    return () => unsubRotas();
  }, [workspaceId, organisationId]);

  const latest = trendPoints.at(-1);
  const previous = trendPoints.at(-2);
  const shiftDelta = latest && previous ? latest.totalShifts - previous.totalShifts : null;

  const directionIcon = useMemo(() => {
    if (shiftDelta == null) return { icon: <Minus className="w-4 h-4" />, className: 'text-gray-500', label: 'No change' };
    if (shiftDelta > 0) return { icon: <TrendingUp className="w-4 h-4" />, className: 'text-green-600', label: `+${shiftDelta} shifts vs last week` };
    if (shiftDelta < 0) return { icon: <TrendingDown className="w-4 h-4" />, className: 'text-red-600', label: `${shiftDelta} shifts vs last week` };
    return { icon: <Minus className="w-4 h-4" />, className: 'text-gray-500', label: 'No change week on week' };
  }, [shiftDelta]);

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="h-5 w-5 text-pink-600" />
          Rota Trends
        </CardTitle>
        <CardDescription>Staffing recommendations and weekly rota activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-pink-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Recommended Day</div>
            <div className="text-2xl font-bold text-pink-600 mt-1">{staffing?.recommendedDay ?? '—'}</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Recommended Night</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{staffing?.recommendedNight ?? '—'}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Residents</div>
            <div className="text-2xl font-bold text-gray-700 mt-1">{staffing?.residentCount ?? '—'}</div>
          </div>
        </div>

        <div className="mt-6">
          {trendPoints.length > 0 ? (
            <ChartContainer config={{ shifts: { label: 'Total Shifts', color: '#ec4899' } }} className="h-52">
              <AreaChart data={trendPoints}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="totalShifts" stroke="var(--color-shifts)" fill="var(--color-shifts)" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              {loading ? 'Loading rota activity...' : 'No rota activity recorded yet. Create shifts to see trends here.'}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5" />
              This Week
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-gray-900">{latest?.totalShifts ?? '—'}</span>
              <span className={`flex items-center gap-1 text-xs font-medium ${directionIcon.className}`}>
                {directionIcon.icon}
                {directionIcon.label}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              Unique Staff Scheduled
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {latest?.staffCount ?? '—'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Hours</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {latest?.totalHours != null ? `${latest.totalHours} h` : '—'}
            </div>
            {latest?.totalShifts ? (
              <div className="text-xs text-gray-500 mt-1">Avg {Math.round((latest.totalHours / latest.totalShifts) * 10) / 10} h per shift</div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
