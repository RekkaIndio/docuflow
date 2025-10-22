import Fuse from 'fuse.js';

export type StaffEntry = { name: string; shifts: any[]; variants?: string[] };

export function fuzzyFindStaffEntry(staffEntries: StaffEntry[], query: string, threshold = 0.4) {
  if (!Array.isArray(staffEntries) || staffEntries.length === 0) return null;
  const list = staffEntries.map((s, idx) => ({ ...s, __idx: idx }));
  const fuse = new Fuse(list, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'variants', weight: 0.3 },
    ],
    threshold,
    includeScore: true,
  });
  const res = fuse.search(query);
  if (!res || res.length === 0) return null;
  // Return top match and also indicate if ambiguous
  const best = res[0];
  const ambiguous = res.length > 1 && res[0].score && res[1].score && Math.abs((res[0].score as number) - (res[1].score as number)) < 0.12;
  return {
    entry: list[best.item.__idx],
    score: best.score,
    ambiguous: Boolean(ambiguous),
  };
}

function parseHHMM(time?: string | null) {
  if (!time || typeof time !== 'string') return null;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h + mm / 60;
}

export type DaySummary = {
  dayKey: string;
  dayName: string;
  shifts: any[]; // NormalizedShift-like
  roles: Record<string, number>;
  types: Record<string, number>;
  total: number;
};

export type DependencyLatest = {
  staffing?: any;
};

export function compareRotaToDependency(daySummaries: Record<string, DaySummary>, latest: DependencyLatest) {
  const results: Array<{ dayKey: string; dayName: string; carersScheduled: number; nursesScheduled: number; carersRec: number; nursesRec: number; hoursScheduled: number; hoursRec: number; }> = [];
  if (!latest || !latest.staffing) return results;

  const recDayCarers = Number(latest.staffing?.day?.carers ?? 0);
  const recDayNurses = Number(latest.staffing?.day?.ns ?? 0);
  const recNightCarers = Number(latest.staffing?.night?.carers ?? 0);
  const recNightNurses = Number(latest.staffing?.night?.ns ?? 0);
  const recDayHours = Number(latest.staffing?.totals?.dayHours ?? 0) || 0;
  const recNightHours = Number(latest.staffing?.totals?.nightHours ?? 0) || 0;

  for (const [dayKey, ds] of Object.entries(daySummaries || {})) {
    let carers = 0;
    let nurses = 0;
    let hours = 0;
    for (const shift of ds.shifts || []) {
      const role = (shift.role || '').toString();
      const isCarer = /carer|care|support/i.test(role);
      const isNurse = /nurse|rgn|registered/i.test(role);
      if (isCarer) carers += 1;
      if (isNurse) nurses += 1;

      // determine if night or day
      let isNight = false;
      if (shift.type && typeof shift.type === 'string' && /night/i.test(shift.type)) isNight = true;
      else {
        const startH = parseHHMM(shift.startTime);
        if (startH !== null) {
          if (startH >= 20 || startH < 6) isNight = true;
        }
      }

      // compute duration
      let dur = 0;
      const sH = parseHHMM(shift.startTime);
      const eH = parseHHMM(shift.endTime);
      if (sH !== null && eH !== null) {
        // account for midnight wrap
        dur = eH >= sH ? eH - sH : (24 - sH) + eH;
      } else {
        // fallback defaults
        dur = isNight ? 10 : 8;
      }
      hours += dur;
    }

    // Compare to recommended: we compare carers+nurses to day recs (coarse)
    // For per-day recommended hours, distribute totals evenly across days if totals are weekly—best-effort
    const daysCount = Object.keys(daySummaries || {}).length || 1;
    const recDayHoursPerDay = recDayHours ? recDayHours / daysCount : recDayCarers * 8; // fallback
    const recNightHoursPerDay = recNightHours ? recNightHours / daysCount : recNightCarers * 10;
    const recHoursPerDay = recDayHoursPerDay + recNightHoursPerDay;

    results.push({
      dayKey,
      dayName: ds.dayName,
      carersScheduled: carers,
      nursesScheduled: nurses,
      carersRec: recDayCarers + recNightCarers, // coarse
      nursesRec: recDayNurses + recNightNurses,
      hoursScheduled: Math.round(hours * 10) / 10,
      hoursRec: Math.round(recHoursPerDay * 10) / 10,
    });
  }

  return results;
}

export default { fuzzyFindStaffEntry, compareRotaToDependency };
