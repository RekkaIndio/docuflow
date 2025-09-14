"use client";
import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
// We will compute staffing summaries directly here (no full table needed)
import { Tag } from 'lucide-react';
import type { Workspace } from '@/lib/types';

interface StaffingPoint {
  date: string;
  day: number;
  night: number;
  total: number;
}

interface StatsViewProps {
  workspace: Workspace;
  totalFolders: number;
  totalDocuments: number;
  occupancyPercent?: number | undefined;
  fileTypeCounts: Record<string, number>;
  recentUploads: Array<{ name: string; createdAt?: string; id?: string }>;
  staffingData?: { day: number; night: number; total: number; lastUpdated?: string } | null;
  staffingHistory?: StaffingPoint[];
  residents?: any[];
  communities?: any[];
  // Optional aggregated metrics (if parent can provide them)
  aggregateWoundsData?: {
    total?: number;
    pressure?: number;
    break?: number;
    fracture?: number;
    bruise?: number;
    workspacesWithData?: number;
  };
  aggregateFallsData?: { totalFalls?: number; workspacesWithData?: number };
  aggregateInfectionData?: { totalInfections?: number; uti?: number; chest?: number; wound?: number; workspacesWithData?: number };
  aggregateAuditData?: { totalYesCount?: number; totalQuestions?: number; overallPercentage?: number; auditsCompleted?: number; totalAudits?: number; workspacesWithData?: number };
}

function FileTypeBars({ fileTypeCounts }: { fileTypeCounts: Record<string, number> }) {
  const entries = useMemo(() => Object.entries(fileTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 6), [fileTypeCounts]);
  const max = entries.length ? Math.max(...entries.map(e => e[1])) : 1;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="text-sm">
          <div className="flex items-center justify-between mb-1"><span className="capitalize">{k}</span><span className="font-medium">{v}</span></div>
          <div className="w-full bg-slate-100 rounded h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded" style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffingSparkline({ history }: { history?: StaffingPoint[] }) {
  // Minimal inline sparkline using SVG. If no history, show placeholder.
  if (!history || history.length === 0) return <div className="text-sm text-muted-foreground">No staffing history</div>;
  const values = history.map(h => h.total);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const width = 200;
  const height = 48;
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / Math.max(1, max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={points} />
    </svg>
  );
}

// --- Dependency / NDPS helpers (copied/adapted) ---
type AnyResident = Record<string, any>;

// Minimal NPDS_FIELDS mapping used by NDPS score calculation in dependency page
const NPDS_FIELDS = [
  { key: 'bcn_mobility' }, { key: 'bcn_transfers' }, { key: 'bcn_washing' }, { key: 'bcn_dressing' }, { key: 'bcn_toileting' }, { key: 'bcn_continence' }, { key: 'bcn_feeding' }, { key: 'bcn_turning' }, { key: 'bcn_getting_up' }, { key: 'bcn_bed_mobility' }, { key: 'bcn_walking' }, { key: 'bcn_stairs' },
  { key: 'snn_breathing' }, { key: 'snn_drugs' }, { key: 'snn_skin_care' }, { key: 'snn_treatment' }, { key: 'snn_observation' },
  { key: 'therapy_communication' }, { key: 'therapy_cognitive' }, { key: 'therapy_behaviour' }
];

const FIELD_MAPPING: Record<string, string> = {
  bcn_mobility: 'mobility', bcn_transfers: 'mobility', bcn_bed_mobility: 'mobility', bcn_walking: 'mobility', bcn_stairs: 'mobility',
  bcn_washing: 'personalCare', bcn_dressing: 'personalCare', bcn_toileting: 'personalCare',
  bcn_continence: 'continence', bcn_feeding: 'eatingDrinking', bcn_turning: 'mobility', bcn_getting_up: 'mobility',
  snn_breathing: 'breathing', snn_drugs: 'medication', snn_skin_care: 'skinIntegrity', snn_treatment: 'medical', snn_observation: 'medical',
  therapy_communication: 'emotionalSupport', therapy_cognitive: 'cognition', therapy_behaviour: 'behaviours'
};

// Minutes maps (day/night) — simplified values matching other code
const MINUTES_BY_FIELD_DAY: Record<string, Record<string, number>> = {
  personalCare: { '': 0, None: 0, Low: 10, Medium: 20, High: 30 },
  eatingDrinking: { '': 0, None: 0, Low: 5, Medium: 15, High: 25 },
  medical: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  mobility: { '': 0, None: 0, Low: 5, Medium: 15, High: 25 },
  continence: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  skinIntegrity: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  medication: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  emotionalSupport: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  cognition: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  nightNeeds: { '': 0, None: 0, Low: 5, Medium: 10, High: 20 },
  additionalNeeds: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
  behaviours: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
  breathing: { '': 0, None: 0, Low: 0, Medium: 10, High: 20 },
};

const MINUTES_BY_FIELD_NIGHT: Record<string, Record<string, number>> = {
  personalCare: { '': 0, None: 0, Low: 5, Medium: 10, High: 15 },
  eatingDrinking: { '': 0, None: 0, Low: 3, Medium: 8, High: 13 },
  medical: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  mobility: { '': 0, None: 0, Low: 3, Medium: 8, High: 13 },
  continence: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  skinIntegrity: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  medication: { '': 0, None: 0, Low: 3, Medium: 5, High: 8 },
  emotionalSupport: { '': 0, None: 0, Low: 3, Medium: 5, High: 8 },
  cognition: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  nightNeeds: { '': 0, None: 0, Low: 3, Medium: 5, High: 10 },
  additionalNeeds: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
  behaviours: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
  breathing: { '': 0, None: 0, Low: 0, Medium: 5, High: 10 },
};

function calculateResidentCareMinutesNPDS(resident: AnyResident) {
  let day = 0;
  let night = 0;
  for (const field of NPDS_FIELDS) {
    const level = resident[field.key] || '';
    const careKey = FIELD_MAPPING[field.key];
    if (!careKey) continue;
    day += MINUTES_BY_FIELD_DAY[careKey]?.[level] ?? 0;
    night += MINUTES_BY_FIELD_NIGHT[careKey]?.[level] ?? 0;
  }
  return { Day: Math.round(day), Night: Math.round(night) };
}

function ceilToQuarter(x: number) { return Math.ceil(x * 4) / 4; }

function calculateNDPSScore(resident: AnyResident): number {
  // Reuse a simple scoring: map None/Low/Medium/High -> 0/1/2/3 across NPDS_FIELDS sections
  let bcn = 0, snn = 0, therapy = 0;
  const sectionMap: Record<string, string> = {};
  // build simple mapping of fields to section by key (approx)
  const bcnKeys = ['bcn_mobility','bcn_transfers','bcn_washing','bcn_dressing','bcn_toileting','bcn_continence','bcn_feeding','bcn_turning','bcn_getting_up','bcn_bed_mobility','bcn_walking','bcn_stairs'];
  const snnKeys = ['snn_breathing','snn_drugs','snn_skin_care','snn_treatment','snn_observation'];
  const therapyKeys = ['therapy_communication','therapy_cognitive','therapy_behaviour'];
  for (const k of bcnKeys) sectionMap[k] = 'BCN';
  for (const k of snnKeys) sectionMap[k] = 'SNN';
  for (const k of therapyKeys) sectionMap[k] = 'THERAPY';

  for (const field of NPDS_FIELDS) {
    const level = resident[field.key] || '';
    let score = 0;
    switch (level) {
      case 'Low': score = 1; break;
      case 'Medium': score = 2; break;
      case 'High': score = 3; break;
      default: score = 0;
    }
    const sec = sectionMap[field.key] || 'BCN';
    if (sec === 'BCN') bcn += score;
    else if (sec === 'SNN') snn += score;
    else therapy += score;
  }
  bcn = Math.min(bcn, 65); snn = Math.min(snn, 25); therapy = Math.min(therapy, 10);
  return bcn + snn + therapy;
}

function getNDPSBand(score: number) {
  if (score <= 5) return { band: 1, name: 'Independent' };
  if (score <= 10) return { band: 2, name: 'Low Dependency' };
  if (score <= 15) return { band: 3, name: 'Medium Dependency' };
  if (score <= 20) return { band: 4, name: 'High Dependency' };
  return { band: 5, name: 'Very High Dependency' };
}

const NDPS_STAFFING_RATIOS_DAY: Record<number, number> = { 1: 1/8, 2: 1/5, 3: 1/3, 4: 1/2, 5: 1/1.5 };
const NDPS_STAFFING_RATIOS_NIGHT: Record<number, number> = { 1: 1/15, 2: 1/10, 3: 1/6, 4: 1/4, 5: 1/2.5 };

function calculateNDPSStaffing(residents: AnyResident[]) {
  const bandCounts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
  residents.forEach(r => { const band = getNDPSBand(calculateNDPSScore(r)).band; bandCounts[band] = (bandCounts[band] || 0) + 1; });
  let day = 0, night = 0;
  for (const b of [1,2,3,4,5]) {
    const cnt = bandCounts[b] || 0;
    const dayRatio = NDPS_STAFFING_RATIOS_DAY[b] || 0;
    const nightRatio = NDPS_STAFFING_RATIOS_NIGHT[b] || 0;
    day += cnt * dayRatio;
    night += cnt * nightRatio;
  }
  return { Day: Math.ceil(day), Night: Math.ceil(night) };
}

function calculateStaffBreakdown(residents: AnyResident[]) {
  const totalStaffing = calculateNDPSStaffing(residents);
  const dayCTMs = 1, nightCTMs = 1;
  const dayRemaining = Math.max(0, totalStaffing.Day - dayCTMs);
  const nightRemaining = Math.max(0, totalStaffing.Night - nightCTMs);

  let high = 0, medium = 0, low = 0;
  residents.forEach(r => { const band = getNDPSBand(calculateNDPSScore(r)).band; if (band>=4) high++; else if (band===3) medium++; else low++; });

  let dayNurses = 0, nightNurses = 0;
  if (residents.length > 0) {
    if (high > 0) { dayNurses = Math.max(1, Math.ceil(high * 0.5)); nightNurses = Math.max(1, Math.ceil(high * 0.3)); }
    else if (medium >= 3) { dayNurses = 1; nightNurses = 0; }
    dayNurses = Math.min(dayNurses, dayRemaining);
    nightNurses = Math.min(nightNurses, nightRemaining);
  }
  const dayCarers = Math.max(0, dayRemaining - dayNurses);
  const nightCarers = Math.max(0, nightRemaining - nightNurses);

  return {
    Day: { nurses: dayNurses, ctms: dayCTMs, carers: dayCarers, total: dayNurses + dayCTMs + dayCarers },
    Night: { nurses: nightNurses, ctms: nightCTMs, carers: nightCarers, total: nightNurses + nightCTMs + nightCarers }
  };
}


export default function StatsView({ workspace, totalFolders, totalDocuments, occupancyPercent, fileTypeCounts, recentUploads, staffingData, staffingHistory, residents, communities }: StatsViewProps) {
  // accept aggregates via props if provided (fallbacks used below)
  const {
    aggregateWoundsData,
    aggregateFallsData,
    aggregateInfectionData,
    aggregateAuditData
  } = (arguments[0] || {}) as StatsViewProps;

  // compact helpers for score coloring
  const getScoreColor = (score?: number | null) => {
    if (score == null) return '#cbd5e1';
    if (score >= 80) return '#10b981';
    if (score >= 20) return '#f59e0b';
    return '#ef4444';
  };

  const getGradientColors = (score?: number | null) => {
    if (score == null) return { start: '#e5e7eb', end: '#cbd5e1' };
    if (score >= 80) return { start: '#34d399', end: '#059669' };
    if (score >= 20) return { start: '#fbbf24', end: '#d97706' };
    return { start: '#f87171', end: '#dc2626' };
  };
  return (
    <div className="space-y-6">
      {/* Compact dashboard top-4 cards (compact versions of overview cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Incident Reports / Wounds (solid orange with glass panel) */}
        <Card className="p-0 rounded-xl overflow-hidden shadow-md bg-orange-500">
          <div className="p-3">
            <div className="bg-white/10 backdrop-blur-sm bg-clip-padding rounded-lg border border-white/10 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/60 backdrop-blur-sm" aria-hidden>
                    <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Incidents</div>
                    <div className="text-lg font-bold text-white">{aggregateWoundsData?.total ?? '—'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/80">Last 30d</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/90 flex items-center justify-between">
                <div>Pressure: {aggregateWoundsData?.pressure ?? 0} · Breaks: {aggregateWoundsData?.break ?? 0}</div>
                <div className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full">+{aggregateWoundsData?.workspacesWithData ?? 0} sites</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Falls Prevention (solid blue with glass panel) */}
        <Card className="p-0 rounded-xl overflow-hidden shadow-md bg-blue-600">
          <div className="p-3">
            <div className="bg-white/10 backdrop-blur-sm bg-clip-padding rounded-lg border border-white/10 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/60 backdrop-blur-sm" aria-hidden>
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6" /><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15 7h4v10a2 2 0 01-2 2h-2" /></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Falls</div>
                    <div className="text-lg font-bold text-white">{aggregateFallsData?.totalFalls ?? '—'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/80">Workspaces: {aggregateFallsData?.workspacesWithData ?? '—'}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/90 flex items-center justify-between">
                <div>Trend: N/A</div>
                <div className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full">Last 30d</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Infection Control (solid teal with glass panel) */}
        <Card className="p-0 rounded-xl overflow-hidden shadow-md bg-teal-500">
          <div className="p-3">
            <div className="bg-white/10 backdrop-blur-sm bg-clip-padding rounded-lg border border-white/10 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/60 backdrop-blur-sm" aria-hidden>
                    <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V7" /><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 22s-8-4-8-10V7" /></svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Infections</div>
                    <div className="text-lg font-bold text-white">{aggregateInfectionData?.totalInfections ?? '—'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/80">UTI: {aggregateInfectionData?.uti ?? 0}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-white/90 flex items-center justify-between">
                <div>Chest: {aggregateInfectionData?.chest ?? 0} · Wound: {aggregateInfectionData?.wound ?? 0}</div>
                <div className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full">{aggregateInfectionData?.workspacesWithData ?? 0} sites</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Compliance Score (solid green with glass panel & mini donut) */}
        <Card className="p-0 rounded-xl overflow-hidden shadow-md bg-green-500">
          <div className="p-3">
            <div className="bg-white/10 backdrop-blur-sm bg-clip-padding rounded-lg border border-white/10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/60 backdrop-blur-sm" aria-hidden>
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Compliance</div>
                  <div className="text-lg font-bold text-white">{aggregateAuditData?.overallPercentage != null ? `${aggregateAuditData.overallPercentage}%` : '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/80">Audits: {aggregateAuditData?.auditsCompleted ?? 0}/{aggregateAuditData?.totalAudits ?? 0}</div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-6 h-6">
                    <path className="text-white/20" d="M18 2.0845a15.9155 15.9155 0 1 0 0 31.831 15.9155 15.9155 0 1 0 0-31.831" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5"></path>
                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831" stroke="#fff" strokeWidth="3.5" strokeDasharray={`${aggregateAuditData?.overallPercentage ?? 0},100`} fill="none" strokeLinecap="round"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/90">Yes: {aggregateAuditData?.totalYesCount ?? 0} · Qs: {aggregateAuditData?.totalQuestions ?? 0}</div>
          </div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff Ratios Card (purple) */}
            <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div className="text-lg font-bold">Staff Ratios</div>
                  </div>
                 
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-4 text-center mb-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-white mb-1">
                        {(() => {
                          const dayStaff = calculateNDPSStaffing(residents || []).Day;
                          const ratio = (residents && residents.length > 0 && dayStaff > 0) ? (Math.round((residents.length / dayStaff) * 100) / 100) : 0;
                          return `${ratio}:1`;
                        })()}
                      </div>
                      <div className="text-xs text-purple-200 font-medium">Day Ratio</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-white mb-1">
                        {(() => {
                          const nightStaff = calculateNDPSStaffing(residents || []).Night;
                          const ratio = (residents && residents.length > 0 && nightStaff > 0) ? (Math.round((residents.length / nightStaff) * 100) / 100) : 0;
                          return `${ratio}:1`;
                        })()}
                      </div>
                      <div className="text-xs text-purple-200 font-medium">Night Ratio</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-200">Total Care Hours:</span>
                      <span className="text-sm font-semibold text-white">
                        {Math.round(((residents || []).reduce((total, r) => {
                          const c = calculateResidentCareMinutesNPDS(r);
                          return total + (c.Day + c.Night) / 60;
                        }, 0)))}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-200">Avg. Care/Resident:</span>
                      <span className="text-sm font-semibold text-white">
                        {(residents && residents.length > 0) ? (Math.round(((residents.reduce((total, r) => {
                          const c = calculateResidentCareMinutesNPDS(r);
                          return total + (c.Day + c.Night) / 60;
                        }, 0) / residents.length) * 10)) / 10) : 0}h
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/20 mt-4">
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Required Card (orange) */}
            <div className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-xl text-white transition-all duration-300 rounded-2xl">
              <div className="p-4">
                <div className="flex items-center gap-2 p-2">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  </div>
                  <div className="text-lg font-bold">Staff Required</div>
                </div>

                {(() => {
                  const breakdown = calculateStaffBreakdown(residents || []);
                  return (
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-amber-200 mb-2">Day Shift</div>
                      <div className="grid grid-cols-4 gap-1 text-center mb-3">
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Day.nurses}</div><div className="text-xs text-amber-200">Nurses</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Day.ctms}</div><div className="text-xs text-amber-200">CTMs</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Day.carers}</div><div className="text-xs text-amber-200">Carers</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Day.total}</div><div className="text-xs text-amber-200">Total</div></div>
                      </div>

                      <div className="text-sm font-semibold text-amber-200 mb-2">Night Shift</div>
                      <div className="grid grid-cols-4 gap-1 text-center mb-3">
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Night.nurses}</div><div className="text-xs text-amber-200">Nurses</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Night.ctms}</div><div className="text-xs text-amber-200">CTMs</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Night.carers}</div><div className="text-xs text-amber-200">Carers</div></div>
                        <div className="bg-white/10 rounded-lg p-2"><div className="text-sm font-bold">{breakdown.Night.total}</div><div className="text-xs text-amber-200">Total</div></div>
                      </div>

                      <div className="pt-2 border-t border-white/20">
                        <div className="text-center">
                          <div className="text-sm font-bold">{breakdown.Day.total + breakdown.Night.total}</div>
                          <div className="text-xs text-amber-200 font-medium">Total Staff (24h)</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <Card className="p-4 rounded-2xl shadow-md border border-transparent bg-white">
            <div className="text-sm font-semibold text-slate-800 mb-2">Top folders</div>
            <div className="text-sm text-slate-500">Top folders by document count are not yet computed here.</div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4 rounded-2xl shadow-md border border-transparent bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-800">Recent uploads</div>
              <div className="text-xs text-slate-500">Latest</div>
            </div>
            <div>
              {recentUploads.length === 0 ? (
                <div className="text-sm text-slate-500">No recent uploads</div>
              ) : (
                <ul className="space-y-3">
                  {recentUploads.slice(0, 8).map((r, idx) => (
                    <li key={r.name + String(r.createdAt) + idx} className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 rounded shadow-sm"><Tag className="w-4 h-4 text-slate-600" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium truncate text-slate-800">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl shadow-md border border-transparent bg-white">
            <div className="text-sm font-semibold text-slate-800 mb-2">Quick actions</div>
            <div className="text-sm text-slate-500">Use the main admin UI to add managers, nurses, or folders. This panel is read-only summary data.</div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
