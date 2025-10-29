import { DEPENDENCY_LEVEL_SYNONYMS, SHIFT_TYPE_SYNONYMS, type DependencyLatest, type RotaQuickAnswerContext, type NormalizedShift, type RotaDaySummary } from './types';
import { formatDateSafe, resolveAuditTypeFromName, buildDependencyQuickAnswer } from './utils';

const buildRotaQuickAnswer = (context: RotaQuickAnswerContext): string | null => {
  const {
    question,
    normalizedShifts,
    normalizedUserShifts,
    roleCounts,
    typeCounts,
    daySummaries,
    staffMap,
    weekRangeLabel,
  } = context;

  if (!question || !normalizedShifts || normalizedShifts.length === 0) return null;

  const asciiQuestion = question.replace(/[’‘`]/g, "'");

  const cleaned = asciiQuestion
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  const totalShifts = normalizedShifts.length;
  const uniqueStaffNames = new Set<string>();
  normalizedShifts.forEach((shift) => {
    if (shift.staffName && shift.staffName.toLowerCase() !== 'unassigned') {
      uniqueStaffNames.add(shift.staffName);
    }
  });
  const uniqueStaffCount = uniqueStaffNames.size;

  let weekendShifts = 0;
  let weekdayShifts = 0;
  normalizedShifts.forEach((shift) => {
    if (shift.dayNumber === 0 || shift.dayNumber === 6) weekendShifts += 1;
    else if (shift.dayNumber >= 1 && shift.dayNumber <= 5) weekdayShifts += 1;
  });

  const formatCounts = (counts: Record<string, number>, limit = 5) => {
    const entries = Object.entries(counts || {})
      .filter(([, value]) => Number.isFinite(value) && value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, value]) => `${label} (${value})`);
    return entries.length ? entries.join(', ') : 'Not recorded';
  };

  const describeShiftLine = (shift: NormalizedShift) => {
    const staff = shift.staffName || 'Unassigned';
    const role = shift.role ? ` – ${shift.role}` : '';
    let time = 'Time TBC';
    if (shift.startTime && shift.endTime) time = `${shift.startTime}–${shift.endTime}`;
    else if (shift.startTime) time = `Start ${shift.startTime}`;
    else if (shift.endTime) time = `Ends ${shift.endTime}`;
    const location = shift.location ? ` @ ${shift.location}` : '';
    return `• ${staff}${role} • ${time}${location}`;
  };

  const daySummariesList = Object.values(daySummaries || {});

  const dayAliasList = [
    { name: 'Sunday', patterns: ['sunday', 'sun'] },
    { name: 'Monday', patterns: ['monday', 'mon'] },
    { name: 'Tuesday', patterns: ['tuesday', 'tue', 'tues'] },
    { name: 'Wednesday', patterns: ['wednesday', 'wed'] },
    { name: 'Thursday', patterns: ['thursday', 'thu', 'thur', 'thurs'] },
    { name: 'Friday', patterns: ['friday', 'fri'] },
    { name: 'Saturday', patterns: ['saturday', 'sat'] },
  ];

  const requestedDays: string[] = [];
  let tomorrowRequested = false;
  for (const alias of dayAliasList) {
    if (alias.patterns.some((pattern) => cleaned.includes(pattern))) {
      requestedDays.push(alias.name);
    }
  }

  const todayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowName = tomorrowDate.toLocaleDateString('en-GB', { weekday: 'long' });

  if (cleaned.includes('today')) requestedDays.push(todayName);
  if (cleaned.includes('tomorrow')) {
    requestedDays.push(tomorrowName);
    tomorrowRequested = true;
  }
  if (cleaned.includes('tonight')) requestedDays.push(todayName);

  const requestedDaySet = Array.from(new Set(requestedDays));
  const weekendRequested = /weekend/.test(cleaned);
  const weekdaysRequested = /weekdays?/.test(cleaned);

  const wantsWho = /\bwho\b/.test(cleaned) || cleaned.includes("who's") || cleaned.includes('whos');
  const wantsCount = /(how many|number|count|total)/.test(cleaned);
  const mentionsShiftWord = /(shift|rota|roster|schedule)/.test(cleaned);
  const wantsNext = /\bnext\b/.test(cleaned) || cleaned.includes('upcoming') || cleaned.includes('soon');
  const referencesSelf = /(\bmy\b|\bi\b|\bme\b|i\sam|am\si)/.test(cleaned) && mentionsShiftWord;
  const mentionsCover = /(cover|coverage|on duty|on-duty|duty|staffing)/.test(cleaned);
  const mentionsStaffWord = /(staff|team|people|personnel|workers|employees)/.test(cleaned);
  const mentionsTypeWord = /(night|overnight|day shift|daytime|morning|evening|late|early|pm|am|tonight)/.test(cleaned);

  const staffEntries = Object.values(staffMap || {});
  let matchedStaffEntry: { name: string; shifts: NormalizedShift[]; variants: string[] } | null = null;
  outerStaff: for (const entry of staffEntries) {
    if (!entry || !entry.name || entry.name.toLowerCase() === 'unassigned') continue;
    for (const variant of entry.variants) {
      if (!variant || variant.length < 3) continue;
      if (cleaned.includes(variant)) {
        matchedStaffEntry = entry;
        break outerStaff;
      }
    }
  }

  let matchedRoleLabel: string | null = null;
  const roleEntries = Object.entries(roleCounts || {});
  const ROLE_SYNONYM_HINTS: Record<string, string[]> = {
    nurse: ['nurse', 'nurses', 'registered nurse', 'rgn', 'rgns'],
    carer: ['carer', 'carers', 'care assistant', 'support worker', 'care staff'],
    senior: ['senior', 'senior carer', 'senior staff'],
    manager: ['manager', 'managers', 'home manager'],
    therapy: ['therapy', 'therapist', 'physio', 'physiotherapist'],
    doctor: ['doctor', 'doctors', 'gp', 'physician'],
    chef: ['chef', 'chefs', 'cook', 'kitchen'],
    domestic: ['domestic', 'housekeeper', 'cleaner', 'cleaning'],
    admin: ['admin', 'administrator', 'administration'],
    maintenance: ['maintenance', 'handyman', 'estates'],
  };

  for (const [roleLabel] of roleEntries) {
    const roleLower = roleLabel.toLowerCase();
    const candidateSet = new Set<string>([roleLower]);
    const tokens = roleLower.split(/[^a-z0-9]+/).filter(Boolean);
    tokens.forEach((token) => candidateSet.add(token));
    if (roleLower.endsWith('s')) candidateSet.add(roleLower.slice(0, -1));
    for (const [hintKey, hintVariants] of Object.entries(ROLE_SYNONYM_HINTS)) {
      if (roleLower.includes(hintKey)) {
        hintVariants.forEach((variant) => candidateSet.add(variant));
      }
    }
    for (const candidate of candidateSet) {
      if (candidate.length < 3) continue;
      if (cleaned.includes(candidate)) {
        matchedRoleLabel = roleLabel;
        break;
      }
    }
    if (matchedRoleLabel) break;
  }

  let matchedTypeLabel: string | null = null;
  const typeEntries = Object.entries(typeCounts || {});
  for (const [typeLabel] of typeEntries) {
    const typeLower = typeLabel.toLowerCase();
    const candidateSet = new Set<string>([typeLower, typeLower.replace(/\s+/g, '')]);
    const synonyms = SHIFT_TYPE_SYNONYMS[typeLower];
    if (synonyms) synonyms.forEach((variant) => candidateSet.add(variant));
    if (typeLower.endsWith('s')) candidateSet.add(typeLower.slice(0, -1));
    for (const candidate of candidateSet) {
      if (candidate.length < 3) continue;
      if (cleaned.includes(candidate)) {
        matchedTypeLabel = typeLabel;
        break;
      }
    }
    if (matchedTypeLabel) break;
  }

  if (!matchedTypeLabel && mentionsTypeWord) {
    if (typeCounts['Night'] && (cleaned.includes('night') || cleaned.includes('overnight'))) {
      matchedTypeLabel = 'Night';
    } else if (typeCounts['Day'] && (cleaned.includes('day shift') || cleaned.includes('day'))) {
      matchedTypeLabel = 'Day';
    }
  }

  const formatShiftTime = (shift: NormalizedShift) => {
    if (shift.startTime && shift.endTime) return `${shift.startTime}–${shift.endTime}`;
    if (shift.startTime) return `Start ${shift.startTime}`;
    if (shift.endTime) return `Ends ${shift.endTime}`;
    return 'Time TBC';
  };

  const describeUserShift = (shift: NormalizedShift) => {
    const dateLabel = shift.displayDate || shift.dayName || shift.dayKey || 'Date not set';
    const timeLabel = formatShiftTime(shift);
    const roleLabel = shift.role ? ` (${shift.role})` : '';
    const locationLabel = shift.location ? ` @ ${shift.location}` : '';
    return `- ${dateLabel}: ${timeLabel}${roleLabel}${locationLabel}`;
  };

  // ========== New quick answers: per-person shifts, next shift, unassigned shifts, tonight counts, dependency-gap ===========

  // Helper: get shifts for a staff name (case-insensitive match against variants and names)
  const findStaffEntryByName = (name: string) => {
    if (!name) return null;
    const low = name.toLowerCase();
    for (const entry of staffEntries) {
      if (!entry || !entry.name) continue;
      if (entry.name.toLowerCase() === low) return entry;
      for (const v of entry.variants || []) {
        if (v && low.includes(v.toLowerCase())) return entry;
      }
    }
    return null;
  };

  // Next shift for the current user (references normalizedUserShifts)
  if (referencesSelf) {
    const now = new Date();
    const upcoming = [...normalizedUserShifts]
      .map(s => ({ s, dt: convertToDateTime(s) }))
      .filter(o => o.dt && o.dt.getTime() >= now.getTime())
      .sort((a, b) => (a.dt as Date).getTime() - (b.dt as Date).getTime());
    if (upcoming.length === 0) {
      // still handle generic 'my shifts' requests above; fall through
    } else if (cleaned.includes('next') || cleaned.includes('upcoming') || cleaned.includes('when is my next') || cleaned.includes("what's my next")) {
      const next = upcoming[0].s;
      return `Your next shift: ${next.displayDate || next.dayName || next.dayKey} • ${formatShiftTime(next)}${next.role ? ` (${next.role})` : ''}${next.location ? ` @ ${next.location}` : ''}`;
    }
  }

  // Specific person shifts: "what shifts does Alice have this week"
  const personMatch = cleaned.match(/what\s+shifts\s+does\s+([a-z ]{2,50})\s+have|when\s+is\s+([a-z ]{2,50})\s+working|what\s+shifts\s+does\s+([a-z ]{2,50})/i);
  if (personMatch) {
    const name = (personMatch[1] || personMatch[2] || personMatch[3] || '').trim();
    const entry = findStaffEntryByName(name);
    if (!entry) return `I couldn't find a staff member matching "${name}" in this rota.`;
    if (!entry.shifts || entry.shifts.length === 0) return `${entry.name} has no shifts scheduled for ${weekRangeLabel}.`;
    const lines = entry.shifts
      .map((s) => `${s.displayDate || s.dayName || s.dayKey}: ${formatShiftTime(s)}${s.role ? ` (${s.role})` : ''}${s.location ? ` @ ${s.location}` : ''}`);
    return `${entry.name}'s shifts for ${weekRangeLabel}:
${lines.map(l => `- ${l}`).join('\n')}`;
  }

  // Unassigned shifts this week / unassigned night shifts
  if (cleaned.includes('unassigned') || cleaned.includes('no one assigned') || cleaned.includes('not assigned')) {
    const unassigned = normalizedShifts.filter(s => !s.staffName || s.staffName.toLowerCase() === 'unassigned');
    const nightOnly = cleaned.includes('night') || cleaned.includes('overnight');
    const filtered = nightOnly ? unassigned.filter(s => (s.type || '').toLowerCase().includes('night')) : unassigned;
    if (!filtered.length) return `No unassigned ${nightOnly ? 'night ' : ''}shifts found for ${weekRangeLabel}.`;
    const list = filtered.slice(0, 20).map(s => `- ${s.dayName} ${s.displayDate || s.dayKey || ''} • ${s.role || 'Role not set'} • ${formatShiftTime(s)}${s.location ? ` @ ${s.location}` : ''}`);
    return [`Unassigned ${nightOnly ? 'night ' : ''}shifts for ${weekRangeLabel}:`, ...list].join('\n');
  }

  // How many carers/nurses tonight
  if (cleaned.includes('tonight') || cleaned.includes('today') || cleaned.includes('this evening')) {
    const tonightName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
    const tonightKey = new Date().toISOString().slice(0,10);
    const tonightShifts = normalizedShifts.filter(s => s.dayKey === tonightKey || s.dayName === tonightName);
    if (cleaned.includes('how many') || cleaned.includes('how many carers') || cleaned.includes('carers') || cleaned.includes('nurses')) {
      const carers = tonightShifts.filter(s => (s.role || '').toLowerCase().includes('carer') || (s.role || '').toLowerCase().includes('support')).length;
      const nurses = tonightShifts.filter(s => (s.role || '').toLowerCase().includes('nurse') || (s.role || '').toLowerCase().includes('rgn')).length;
      return `Tonight (${weekRangeLabel}): Carers ${carers}, Nurses ${nurses}, Total shifts: ${tonightShifts.length}`;
    }
  }

  // Dependency-gap check (requires dependency snapshot) — if user mentions 'shortage' or 'understaff' or 'requirement'
  if (/(shortage|understaff|short-staff|under-staffed|requirement|recommended|need|should)/i.test(cleaned) && (cleaned.includes('staff') || cleaned.includes('carer') || cleaned.includes('nurse'))) {
    // We cannot call server endpoints here directly in the quick-answer; instruct caller to use AI fallback if not available.
    // But we have workspace extras in scope in the caller; the caller passes dependency snapshot into workspaceExtras for AI. For quickanswer we'll attempt a minimal check using roleCounts vs staffing if available in daySummaries.
    try {
      // Compare total scheduled carers and nurses vs roleCounts recommendation if present in daySummaries metadata (not always available)
      const aggregated = Object.values(daySummaries).reduce((acc: any, ds: any) => {
        acc.carers = (acc.carers || 0) + (ds.roles?.Carer || ds.roles?.carer || 0);
        acc.nurses = (acc.nurses || 0) + (ds.roles?.Nurse || ds.roles?.nurse || 0);
        acc.days = (acc.days || 0) + 1;
        return acc;
      }, {} as any);
      if (!aggregated.days) return null;
      return `Scheduled this week: ~${aggregated.carers} carers and ~${aggregated.nurses} nurses across ${aggregated.days} day(s). For a detailed gap analysis I can compare the rota to the latest dependency snapshot — would you like that?`;
    } catch (e) {
      // noop - fallthrough to other answers or AI
    }
  }


  const convertToDateTime = (shift: NormalizedShift) => {
    if (!shift.dayKey) return null;
    const time = shift.startTime && /^\d{2}:\d{2}$/.test(shift.startTime) ? `${shift.startTime}:00` : '00:00:00';
    const isoString = `${shift.dayKey}T${time}`;
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const describeDaySummary = (summary: RotaDaySummary) => {
    const header = `**${summary.dayName}${summary.displayDate ? ` (${summary.displayDate})` : ''}**`;
    const staffList = summary.staff.length
      ? summary.staff.slice(0, wantsWho ? 12 : 8).join(', ')
      : 'No named staff recorded';
    const roleBreakdown = formatCounts(summary.roles);
    const typeBreakdown = Object.keys(summary.types || {}).length ? formatCounts(summary.types) : null;
    const highlightLines: string[] = [];
    if (matchedRoleLabel) {
      const roleCount = summary.roles?.[matchedRoleLabel] || 0;
      highlightLines.push(`${matchedRoleLabel}: ${roleCount} shift(s)`);
    }
    if (matchedTypeLabel) {
      const typeCount = summary.types?.[matchedTypeLabel] || 0;
      highlightLines.push(`${matchedTypeLabel} shifts: ${typeCount}`);
    }
    const detailLines = summary.shifts
      .slice(0, wantsWho ? 12 : 8)
      .map((shift) => describeShiftLine(shift))
      .join('\n');

    return [
      header,
      `- Total shifts: ${summary.total}`,
      `- Staff: ${staffList}`,
      `- Roles: ${roleBreakdown}`,
      typeBreakdown ? `- Shift types: ${typeBreakdown}` : null,
      highlightLines.length ? `- Highlights: ${highlightLines.join(' • ')}` : null,
      detailLines ? `\n${detailLines}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  };

  if (referencesSelf) {
    if (!normalizedUserShifts.length) {
      return `I couldn’t find any shifts assigned to you for ${weekRangeLabel}.`;
    }

    const sortedUserShifts = [...normalizedUserShifts].sort((a, b) => {
      const aDt = convertToDateTime(a);
      const bDt = convertToDateTime(b);
      if (aDt && bDt) return aDt.getTime() - bDt.getTime();
      if (aDt) return -1;
      if (bDt) return 1;
      return (a.dayKey || '').localeCompare(b.dayKey || '');
    });

    const userLines = sortedUserShifts.map((shift) => describeUserShift(shift)).join('\n');
    let response = `Here are your shifts for ${weekRangeLabel}:
${userLines}`;

    if (wantsNext) {
      const now = new Date();
      const nextShift = sortedUserShifts.find((shift) => {
        const dt = convertToDateTime(shift);
        return dt && dt.getTime() >= now.getTime();
      });
      if (nextShift) {
        response += `
Next shift: ${nextShift.displayDate || nextShift.dayName || nextShift.dayKey} • ${formatShiftTime(nextShift)}${
          nextShift.location ? ` @ ${nextShift.location}` : ''
        }`;
      }
    }

    return response;
  }

  if (matchedStaffEntry) {
    const filteredShifts = requestedDaySet.length
      ? matchedStaffEntry.shifts.filter((shift) => requestedDaySet.includes(shift.dayName))
      : matchedStaffEntry.shifts;

    if (!filteredShifts.length) {
      const dayLabel = requestedDaySet.length ? requestedDaySet.join(' & ') : 'this rota';
      return `${matchedStaffEntry.name} is not scheduled ${requestedDaySet.length ? `on ${dayLabel}` : `for ${weekRangeLabel}`} in the current rota.`;
    }

    const sortedShifts = [...filteredShifts].sort((a, b) => {
      const aDt = convertToDateTime(a);
      const bDt = convertToDateTime(b);
      if (aDt && bDt) return aDt.getTime() - bDt.getTime();
      if (aDt) return -1;
      if (bDt) return 1;
      return (a.dayKey || '').localeCompare(b.dayKey || '');
    });

    const staffLines = sortedShifts.map((shift) => describeUserShift(shift)).join('\n');
    const dayLabel = requestedDaySet.length ? requestedDaySet.join(' & ') : 'this week';
    return `${matchedStaffEntry.name} has ${sortedShifts.length} shift${sortedShifts.length === 1 ? '' : 's'} scheduled for ${dayLabel}.
${staffLines}`;
  }

  if (requestedDaySet.length > 0) {
    const sections: string[] = [];
    for (const dayName of requestedDaySet) {
      const matches = daySummariesList.filter((summary) => summary.dayName.toLowerCase() === dayName.toLowerCase());
      if (!matches.length) {
        sections.push(`**${dayName}**
- No shifts recorded in this rota.`);
        continue;
      }
      const summary = matches.sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))[0];
      sections.push(describeDaySummary(summary));
    }
    const dayLabel = requestedDaySet.join(' & ');
    const baseResponse = `Coverage for ${dayLabel} (${weekRangeLabel}):

    ${sections.join('\n\n')}`;
    if (tomorrowRequested && !sections.some((section) => !section.includes('No shifts'))) {
      return `${baseResponse}

    If you were expecting named staff for tomorrow, please ensure tomorrow's rota has been published.`;
    }
    return baseResponse;
  }

  if (weekendRequested) {
    const weekendSummaries = daySummariesList.filter((summary) => summary.dayNumber === 0 || summary.dayNumber === 6);
    if (!weekendSummaries.length) {
      return `No weekend shifts recorded for ${weekRangeLabel}.`;
    }

    const weekendTotal = weekendSummaries.reduce((sum, summary) => sum + summary.total, 0);
    const weekendStaff = new Set<string>();
    const weekendRoles: Record<string, number> = {};
    const weekendTypes: Record<string, number> = {};

    weekendSummaries.forEach((summary) => {
      summary.staff.forEach((staff) => {
        if (staff && staff.toLowerCase() !== 'unassigned') weekendStaff.add(staff);
      });
      Object.entries(summary.roles || {}).forEach(([role, count]) => {
        weekendRoles[role] = (weekendRoles[role] || 0) + count;
      });
      Object.entries(summary.types || {}).forEach(([type, count]) => {
        weekendTypes[type] = (weekendTypes[type] || 0) + count;
      });
    });

    const highlightLines: string[] = [];
    if (matchedRoleLabel) highlightLines.push(`${matchedRoleLabel}: ${weekendRoles[matchedRoleLabel] || 0}`);
    if (matchedTypeLabel) highlightLines.push(`${matchedTypeLabel}: ${weekendTypes[matchedTypeLabel] || 0}`);

    const weekendSample = weekendSummaries
      .flatMap((summary) => summary.shifts)
      .slice(0, wantsWho ? 12 : 8)
      .map((shift) => describeShiftLine(shift))
      .join('\n');

    return [
      `Weekend coverage (${weekRangeLabel}):`,
      `- Total shifts: ${weekendTotal}`,
      `- Staff: ${weekendStaff.size ? Array.from(weekendStaff).join(', ') : 'No named staff recorded'}`,
      `- Roles: ${formatCounts(weekendRoles)}`,
      Object.keys(weekendTypes).length ? `- Shift types: ${formatCounts(weekendTypes)}` : null,
      highlightLines.length ? `- Highlights: ${highlightLines.join(' • ')}` : null,
      weekendSample ? `\n${weekendSample}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (weekdaysRequested) {
    const weekdaySummaries = daySummariesList.filter((summary) => summary.dayNumber >= 1 && summary.dayNumber <= 5);
    if (!weekdaySummaries.length) {
      return `No weekday shifts recorded for ${weekRangeLabel}.`;
    }

    const weekdayTotal = weekdaySummaries.reduce((sum, summary) => sum + summary.total, 0);
    const weekdayStaff = new Set<string>();
    const weekdayRoles: Record<string, number> = {};
    const weekdayTypes: Record<string, number> = {};

    weekdaySummaries.forEach((summary) => {
      summary.staff.forEach((staff) => {
        if (staff && staff.toLowerCase() !== 'unassigned') weekdayStaff.add(staff);
      });
      Object.entries(summary.roles || {}).forEach(([role, count]) => {
        weekdayRoles[role] = (weekdayRoles[role] || 0) + count;
      });
      Object.entries(summary.types || {}).forEach(([type, count]) => {
        weekdayTypes[type] = (weekdayTypes[type] || 0) + count;
      });
    });

    const weekdaySample = weekdaySummaries
      .flatMap((summary) => summary.shifts)
      .slice(0, wantsWho ? 12 : 8)
      .map((shift) => describeShiftLine(shift))
      .join('\n');

    return [
      `Weekday coverage (${weekRangeLabel}):`,
      `- Total shifts: ${weekdayTotal}`,
      `- Staff: ${weekdayStaff.size ? Array.from(weekdayStaff).join(', ') : 'No named staff recorded'}`,
      `- Roles: ${formatCounts(weekdayRoles)}`,
      Object.keys(weekdayTypes).length ? `- Shift types: ${formatCounts(weekdayTypes)}` : null,
      weekdaySample ? `\n${weekdaySample}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (matchedTypeLabel) {
    const totalTypeCount = typeCounts[matchedTypeLabel] || 0;
    const perDayLines = daySummariesList
      .filter((summary) => (summary.types?.[matchedTypeLabel] || 0) > 0)
      .sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))
      .map((summary) => `${summary.dayName}: ${summary.types?.[matchedTypeLabel] || 0}`)
      .join(', ');

    return [
      `${matchedTypeLabel} shifts for ${weekRangeLabel}:`,
      `- Total: ${totalTypeCount}`,
      perDayLines ? `- By day: ${perDayLines}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (matchedRoleLabel) {
    const totalRoleCount = roleCounts[matchedRoleLabel] || 0;
    const perDayLines = daySummariesList
      .filter((summary) => (summary.roles?.[matchedRoleLabel] || 0) > 0)
      .sort((a, b) => (a.dayKey || '').localeCompare(b.dayKey || ''))
      .map((summary) => `${summary.dayName}: ${summary.roles?.[matchedRoleLabel] || 0}`)
      .join(', ');

    return [
      `${matchedRoleLabel} shifts for ${weekRangeLabel}:`,
      `- Total: ${totalRoleCount}`,
      perDayLines ? `- By day: ${perDayLines}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (wantsCount || mentionsCover || mentionsStaffWord || cleaned.includes('overview') || cleaned.includes('summary')) {
    // Direct weekly 'who' query: prefer explicit 'this week' phrasing but allow generic 'week' when no specific day was requested
    const weekRequested = cleaned.includes('this week') || cleaned.includes('this-week') || (cleaned.includes('week') && requestedDaySet.length === 0);
    if (wantsWho && weekRequested) {
      const staffSummary = staffEntries
        .filter((entry) => entry && entry.name && entry.name.toLowerCase() !== 'unassigned')
        .map((entry) => ({ name: entry.name, count: entry.shifts.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map((s) => `${s.name}: ${s.count} shift${s.count === 1 ? '' : 's'}`);

      if (!staffSummary.length) {
        return `No named staff scheduled for ${weekRangeLabel}.`;
      }

      return [
        `Staff scheduled for ${weekRangeLabel}:`,
        ...staffSummary.map((line) => `- ${line}`),
      ].join('\n');
    }

    const topStaff = staffEntries
      .filter((entry) => entry.name && entry.name.toLowerCase() !== 'unassigned')
      .sort((a, b) => b.shifts.length - a.shifts.length)
      .slice(0, 3)
      .map((entry) => `${entry.name} (${entry.shifts.length})`)
      .join(', ');

    const busiestDay = daySummariesList
      .filter((summary) => summary.dayNumber >= 0)
      .sort((a, b) => b.total - a.total)[0];

    return [
      `Rota summary for ${weekRangeLabel}:`,
      `- Total shifts: ${totalShifts}`,
      `- Unique staff scheduled: ${uniqueStaffCount}`,
      `- Weekday shifts: ${weekdayShifts}; Weekend shifts: ${weekendShifts}`,
      busiestDay ? `- Busiest day: ${busiestDay.dayName} (${busiestDay.displayDate}) with ${busiestDay.total} shift(s)` : null,
      Object.keys(roleCounts || {}).length ? `- Top roles: ${formatCounts(roleCounts)}` : null,
      Object.keys(typeCounts || {}).length ? `- Shift types: ${formatCounts(typeCounts)}` : null,
      topStaff ? `- Busiest team members: ${topStaff}` : null,
      normalizedUserShifts.length ? `- Your scheduled shifts: ${normalizedUserShifts.length}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // If we reached here, fall back to AI
  return null;
};

const detectIntent = (userInput: string): any => {
  const raw = userInput || '';
  const normalized = raw.replace(/[’‘`]/g, "'");
  const input = normalized.toLowerCase().trim();
  
  // Audit query patterns - check these FIRST before document search
  const auditPatterns = [
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?audit\s+(results?|scores?|status|completion)/i,
    /(audit|audits)\s+(results?|scores?|status|completion)/i,
    /(what\s+is\s+the\s+status\s+of|check)\s+(the\s+)?audit/i,
    /(are\s+there\s+any|list)\s+(overdue|pending|completed)\s+audits/i
  ];

  for (const pattern of auditPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'audit_query',
        originalInput: userInput
      };
    }
  }

  // Dependency/staffing query patterns - check before document search
  const dependencyPatterns = [
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
    /(dependency|dependencies|staffing|staff)\s+(data|levels?|calculations?|requirements?|breakdown|analysis)/i,
    /(what\s+is\s+the|check|calculate)\s+(dependency|staffing)\s+(level|requirement|data)/i,
    /(how\s+many|what)\s+(staff|carers?|nurses?)\s+(do\s+we\s+need|are\s+required)/i,
    /(staffing\s+calculator|dependency\s+calculator|staffing\s+breakdown)/i,
    /(show\s+me|get)\s+(staffing|dependency)\s+(for|at)\s+(.+)/i,
    // Explicitly match 'staffing trends' and similar phrasing so it does not fall through to document search
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?(staffing|staff)\s+(trends|trend|history|changes|overview|summary)/i,
    /(staffing|staff)\s+(trends|trend|history|changes|overview|summary)/i,
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(staffing|staff)\s+(trend|history|overview|summary)/i
  ];

  for (const pattern of dependencyPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'dependency_query',
        originalInput: userInput
      };
    }
  }

  if (/(how\s+many|number|count|total)\s+(of\s+)?(residents?|people|individuals?)/i.test(input)) {
    return {
      type: 'dependency_query',
      originalInput: userInput
    };
  }

  if (/(low|moderate|high|very\s+high|complex)\s+depend(?:e|a)nc(?:y|ies)?\s+residents?/i.test(input)) {
    return {
      type: 'dependency_query',
      originalInput: userInput
    };
  }

  if (/depend(?:e|a)nc(?:y|ies)?\s+(levels?|bands?).*(residents?|people)/i.test(input)) {
    return {
      type: 'dependency_query',
      originalInput: userInput
    };
  }

  if (/(residents?|people).*(depend(?:e|a)nc(?:y|ies)?)/i.test(input)) {
    return {
      type: 'dependency_query',
      originalInput: userInput
    };
  }

  const regulationMatch = raw.match(/(?:cqc\s+)?regulation\s+(\d{1,2}[A-Za-z]?)(?:\s+(.*))?/i);
  if (regulationMatch) {
    const regulationCode = regulationMatch[1]?.trim();
    const regulationFocus = regulationMatch[2]?.trim();
    if (regulationCode) {
      return {
        type: 'cqc_regulation_query',
        regulationCode,
        regulationFocus: regulationFocus || undefined,
        regulationQuestion: userInput,
        originalInput: userInput,
      };
    }
  }

  const mentionsCqc = /\bcqc\b/i.test(input) || /care\s+quality\s+commission/i.test(normalized);
  const cqcQueryHint = /(say|guidance|guidelines|standard|standards|require|requirements?|expect|expects|expectation|expectations|regulation|regulations|rules?|overview|stance|policy|policies|duty|duties|obligations?)/i;
  if (mentionsCqc && cqcQueryHint.test(input)) {
    const focusMatch = raw.match(/\b(?:about|regarding|on|for)\s+([^?!.]+)/i);
    const regulationFocus = focusMatch ? focusMatch[1].trim() : undefined;
    return {
      type: 'cqc_regulation_query',
      regulationFocus,
      regulationQuestion: userInput,
      originalInput: userInput,
    };
  }

  // Multi-document query patterns
  const multiDocPatterns = [
    /(compare|difference|differences|similarities|all|list|summarize all|summarise all|overview of|across|between|versus|vs\.?|compare .* and .*)/i
  ];
  for (const pattern of multiDocPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'multi_document_query',
        originalInput: userInput
      };
    }
  }

  // Policy opening patterns - check these before open modal patterns
  const policyOpeningPatterns = [
    /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
    /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?policy\s+(?:for|about|on)\s+(.+)/i,
    /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+policy/i,
    /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+policy/i,
    /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+policy/i,
    /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+policy/i
  ];

  for (const pattern of policyOpeningPatterns) {
    const match = input.match(pattern);
    if (match) {
      let policyName = (match[1] || match[2] || '').trim();

      // Remove common words that aren't part of the policy name
      policyName = policyName.replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open|policy)\b/g, '').trim();

      return {
        type: 'open_policy',
        specificPolicy: policyName,
        originalInput: userInput
      };
    }
  }

  // Open modal patterns - check these AFTER policy patterns
  const openModalPatterns = [
    // Specific appraisal patterns - must contain appraisal-related keywords
    /(open|show|launch|start|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
    /(go\s+to|navigate\s+to)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
    /(open|show|how)\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)\s+(page|form)/i,
    // Handle "show me" and "how me" patterns with appraisal keywords
    /(show|how)\s+me\s+(.+?)\s+(appraisal|evaluation|assessment)/i,
    /(show|how)\s+me\s+(the\s+)?(.+?)\s+(appraisal|evaluation|assessment)/i,
    // Existing patterns for backward compatibility - specific modal types
    /(open|start|launch|show|how)\s+(the\s+)?(tracker|appraisal|audit)\s+(modal|window|form)/i,
    /(open|start|launch|show|how)\s+(tracker|appraisal|audit)/i,
    /(i\s+want\s+to|let's)\s+(track|appraise|audit)/i,
    // Direct appraisal name patterns - must have appraisal context
    /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+?)\s+(appraisal|evaluation|assessment)/i
  ];

  for (const pattern of openModalPatterns) {
    const match = input.match(pattern);
    if (match) {
      // Extract modal type from different capture group positions
      let modalType = '';
      let specificAppraisal = '';

      // Handle new direct appraisal patterns (patterns 1-4)
      if (pattern.source.includes('me\\s+(.+)') && match[2]) {
        // Pattern 1: /(show|open|launch|start|how)\s+me\s+(.+)/i
        specificAppraisal = match[2].trim().toLowerCase();
        specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
        modalType = 'specific-appraisal';
      } else if (pattern.source.includes('the\\s+)?(.+)') && !pattern.source.includes('appraisal|evaluation|assessment') && match[3]) {
        // Pattern 2: /(show|open|launch|start|how)\s+(the\s+)?(.+)/i
        specificAppraisal = match[3].trim().toLowerCase();
        specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
        modalType = 'specific-appraisal';
      } else if (pattern.source.includes('go\\s+to|navigate\\s+to') && match[2]) {
        // Pattern 3: /(go\s+to|navigate\s+to)\s+(.+)/i
        specificAppraisal = match[2].trim().toLowerCase();
        specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
        modalType = 'specific-appraisal';
      } else if (pattern.source.includes('want\\s+to|let\'s') && match[3]) {
        // Pattern 4: /(i\s+want\s+to|let's)\s+(see|open|do)\s+(.+)/i
        specificAppraisal = match[3].trim().toLowerCase();
        specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
        modalType = 'specific-appraisal';
      }
      // Handle existing patterns
      else if (match[3] && ['tracker', 'appraisal', 'audit'].includes(match[3].toLowerCase())) {
        modalType = match[3].toLowerCase(); // For pattern 5: tracker/appraisal/audit
      } else if (match[2] && ['tracker', 'appraisal', 'audit'].includes(match[2].toLowerCase())) {
        modalType = match[2].toLowerCase(); // For pattern 6: tracker/appraisal/audit
      } else if (match[3] && ['track', 'appraise', 'audit'].includes(match[3].toLowerCase())) {
        // Convert verb forms to modal types
        const verbToModal = { 'track': 'tracker', 'appraise': 'appraisal', 'audit': 'audit' };
        modalType = verbToModal[match[3].toLowerCase() as keyof typeof verbToModal] || '';
      } else if (match[3] || match[4] || match[5] || match[6]) {
        // Specific appraisal name detected - check multiple capture groups (patterns 7-11)
        specificAppraisal = (match[3] || match[4] || match[5] || match[6] || '').trim().toLowerCase();
        // Remove common words that aren't part of the appraisal name
        specificAppraisal = specificAppraisal.replace(/\b(the|me|my|an|a)\b/g, '').trim();
        modalType = 'specific-appraisal';
      }

      if (modalType) {
        return {
          type: 'open_modal',
          modalType: modalType,
          specificAppraisal: specificAppraisal,
          originalInput: userInput
        };
      }
    }
  }

  // Navigate page patterns - check these before document search
  const navigatePagePatterns = [
    /(go\s+to|navigate\s+to|open|show)\s+(the\s+)?(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)\s+(page|section)/i,
    /(go\s+to|navigate\s+to|open)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i,
    /(take\s+me\s+to|bring\s+me\s+to)\s+(action\s+plans?|admin|dashboard|audits?|appraisals?|policies?)/i
  ];

  for (const pattern of navigatePagePatterns) {
    const match = input.match(pattern);
    if (match) {
      const pagePath = (match[2] || match[3] || '').toLowerCase().replace(/\s+/g, '-');
      return {
        type: 'navigate_page',
        pagePath: pagePath,
        originalInput: userInput
      };
    }
  }

  // Special case: Handle "summarise this" and similar phrases that should use active document
  const summariseThisPatterns = [
    /\b(summaris|summarize|summarise)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
    /\b(tell\s+me\s+about|what\s+is|explain)\s+(this|it|the\s+document|the\s+policy|the\s+file)\b/i,
    /\b(give\s+me\s+a\s+summary|provide\s+a\s+summary)\s+(of\s+)?(?:this|it|the\s+document|the\s+policy|the\s+file)\b/i
  ];

  for (const pattern of summariseThisPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'general_query',
        originalInput: userInput
      };
    }
  }

  // Document search patterns - much more flexible
  const searchPatterns = [
    // Direct requests
    /^(please\s+)?(find|show|get|give|display|locate|open|view|search|look\s+for|bring\s+up|pull\s+up|summarize|summarise|summarise\s+for\s+me|summarize\s+for\s+me)\s+(me\s+)?(the\s+)?(.+)/i,
    // Question formats
    /^(can\s+you\s+|could\s+you\s+|would\s+you\s+)?(please\s+)?(find|show|get|give|display|locate|search|look\s+for|bring\s+up|pull\s+up)\s+(me\s+)?(the\s+)?(.+)/i,
    // "I need" formats
    /^(i\s+need|i\s+want|i\s+require|i\s+am\s+looking\s+for|i\s+would\s+like)\s+(to\s+see\s+|to\s+find\s+|to\s+access\s+|the\s+)?(.+)/i,
    // "Where is" formats
    /^(where\s+is|where\s+can\s+i\s+find|where\s+are|do\s+you\s+have)\s+(the\s+)?(.+)/i,
    // "Help me" formats
    /^(help\s+me\s+|assist\s+me\s+with\s+|guide\s+me\s+to\s+)?(find|locate|access|get|summarize|summarise|summarize\s+the|summarise\s+the)\s+(the\s+)?(.+)/i,
    // Document type requests
    /^(what|which)\s+(documents?|policies|files?|papers?)\s+(do\s+we\s+have\s+|are\s+there\s+|exist\s+)?(about|for|regarding|on|related\s+to)\s+(.+)/i,
    // Status/info requests
    /^(what\s+is\s+the\s+status\s+of|when\s+is|tell\s+me\s+about|information\s+about|details\s+about|summarize|summarise)\s+(the\s+)?(.+)/i,
    // Folder-specific requests
    /^(look\s+in\s+the\s+(.+?)\s+folder\s+and\s+find\s+me\s+the\s+(.+))$/i,
    /^(in\s+the\s+(.+?)\s+folder\s+find\s+me\s+the\s+(.+))$/i,
    /^(find\s+me\s+the\s+(.+?)\s+folder)$/i
  ];

  // Check for document search intent
  for (const pattern of searchPatterns) {
    const match = input.match(pattern);
    if (match) {
      // Extract the search term from various capture groups (use raw for preserving case in locations)
      let searchTerm = (match[match.length - 1] || match[match.length - 2] || match[4] || match[5] || match[6] || '') as string;
      searchTerm = searchTerm.trim();
      if (searchTerm) {
        // Also detect verbs that imply the user wants to open/view the document rather than just get info
        const openVerbs = /\b(open|view|expand|show\s+me\s+the|open\s+the)\b/i;
        const wantsOpen = openVerbs.test(input);

        // try to extract a location/workspace phrase like 'in Wilton Manor' or 'for Wilton Manor'
        // prefer matching at end but also support inline
        const locationRegexEnd = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})\.?$/i;
        const locationRegex = /(?:in|at|for|from)\s+([A-Z0-9][\w\-\s&']{1,60})/i;
        let folderName: string | undefined = undefined;
        const rawMatchEnd = raw.match(locationRegexEnd);
        const rawMatch = raw.match(locationRegex);
        if (rawMatchEnd && rawMatchEnd[1]) folderName = rawMatchEnd[1].trim();
        else if (rawMatch && rawMatch[1]) folderName = rawMatch[1].trim();

        // Remove trailing 'in <place>' from the searchTerm if present
        if (folderName) {
          const trailingPattern = new RegExp("\\b(?:in|at|for|from)\\s+" + folderName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "\\b\\.?$", 'i');
          searchTerm = searchTerm.replace(trailingPattern, '').trim();
        }

        return {
          type: 'document_search',
          openDocument: wantsOpen,
          searchTerm: searchTerm || undefined,
          folderName: folderName || undefined,
          originalInput: userInput
        };
      }
    }
  }

  // Folder creation patterns
  const folderPatterns = [
    /(create|add|make|new)\s+(a\s+|the\s+|another\s+)?folder(\s+called|\s+named|\s+titled|\s+with\s+name)?\s*(.+)?/i,
    /^(can\s+you\s+|could\s+you\s+|please\s+)?(create|add|make)\s+(a\s+|the\s+)?folder(\s+called|\s+named|\s+titled)?\s*(.+)?/i,
    /^(i\s+need|i\s+want)\s+(a\s+|to\s+create\s+a\s+)?new\s+folder(\s+called|\s+named)?\s*(.+)?/i
  ];
  
  for (const pattern of folderPatterns) {
    const match = input.match(pattern);
    if (match) {
      const folderName = (match[4] || match[5] || '').trim() || 'Untitled Folder';
      return {
        type: 'folder_creation',
        folderName,
        originalInput: userInput
      };
    }
  }
  
  // File name patterns (existing logic)
  const filePattern = /([\w\-. ]+\.(pdf|docx?|txt|csv|xlsx))/i;
  const fileMatch = userInput.match(filePattern);
  if (fileMatch) {
    return {
      type: 'file_search',
      fileName: fileMatch[1],
      originalInput: userInput
    };
  }

  // Send email patterns
  const emailPatterns = [
    /(send|email|mail)\s+(an?\s+)?email\s+(to\s+)?(the\s+)?(.+)/i,
    /(notify|alert)\s+(the\s+)?team\s+(about|regarding)\s+(.+)/i,
    /(message|contact)\s+(the\s+)?(.+)\s+(about|regarding)\s+(.+)/i
  ];

  for (const pattern of emailPatterns) {
    const match = input.match(pattern);
    if (match) {
      const content = (match[5] || match[4] || match[3] || '').trim();
      return {
        type: 'send_email',
        emailSubject: `Message from CG360 Chat`,
        emailBody: content || 'Please check your CG360 workspace for updates.',
        originalInput: userInput
      };
    }
  }

  // User search patterns
  const userPatterns = [
    /(find|search|look\s+for|who\s+is|get)\s+(me\s+)?(information\s+about|details\s+on|the\s+)?user\s+(.+)/i,
    /(who\s+is|tell\s+me\s+about)\s+(.+)/i,
    /(search\s+for|find)\s+(user|person)\s+(.+)/i
  ];

  // If the captured phrase looks like a rota/shift/query (e.g. "who is on rota this week"), skip user search
  const ROTA_HINTS = /(rota|shift|roster|schedule|on duty|on-duty|working|cover|covering)/i;
  for (const pattern of userPatterns) {
    const match = input.match(pattern);
    if (match) {
      const captured = (match[4] || match[2] || match[3] || '').trim();
      if (captured && ROTA_HINTS.test(captured)) {
        // skip - let rota detection handle this input
        continue;
      }
      const userName = captured;
      return {
        type: 'user_search',
        userName: userName,
        originalInput: userInput
      };
    }
  }

  // Audit opening patterns - handle various ways users ask to open audits
  const auditOpeningPatterns = [
    /(?:show|open|view|display|get|find|bring\s+up|pull\s+up)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
    /(?:show|open|view|display|get|find)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:for|about|on)\s+(.+)/i,
    /(?:let's|let\s+us)\s+(?:look\s+at|check\s+out|see)\s+(?:the\s+)?(.+?)\s+audit/i,
    /(?:i\s+want\s+to|i\s+need\s+to)\s+(?:see|view|open)\s+(?:the\s+)?(.+?)\s+audit/i,
    /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:show|open|display)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit/i,
    /(?:take\s+me\s+to|go\s+to|navigate\s+to)\s+(?:the\s+)?(.+?)\s+audit/i
  ];

  for (const pattern of auditOpeningPatterns) {
    const match = input.match(pattern);
    if (match) {
      const auditName = (match[1] || match[2] || '').trim()
        .replace(/\b(the|me|my|an|a|for|about|on|let's|let\s+us|can\s+you|could\s+you|please|take\s+me|go\s+to|navigate\s+to|i\s+want|i\s+need|to\s+see|to\s+view|to\s+open)\b/g, '')
        .trim();

      const resolved = resolveAuditTypeFromName(auditName);
      const fallback = auditName
        ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : '';
      const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : null);
      if (!auditType) continue;

      return {
        type: 'open_audit',
        specificAudit: auditType,
        originalInput: userInput
      };
    }
  }

  // Audit data querying patterns
  const auditDataPatterns = [
    /(?:show|tell|get|give)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:data|results|information|details|trends|comments|scores|overview|summary|status|report|insights?)/i,
    /(?:what\s+(?:are|is)\s+)?(?:the\s+)?(.+?)\s+audit\s+(?:results|data|comments|scores|trends|overview|summary|status|report|insights?)/i,
    /(?:show|tell|get)\s+(?:me\s+)?(?:the\s+)?audit\s+(?:data|results|information|overview|summary|status|report)\s+(?:for|about|on)\s+(.+)/i,
    /(?:what\s+(?:are|is)\s+)?(?:the\s+)?comments?\s+(?:in|for|from)\s+(?:the\s+)?(.+?)\s+audit/i,
    /(?:how\s+did|what\s+were)\s+(?:the\s+)?(.+?)\s+audit\s+(?:results|scores|perform)/i,
    /(?:audit\s+)?(?:data|results|information|trends|overview|summary|status|report|insights?)\s+(?:for|about|on)\s+(.+?)\s+audit/i
  ];

  for (const pattern of auditDataPatterns) {
    const match = input.match(pattern);
    if (match) {
      let auditName = (match[1] || match[2] || '').trim();

      // Remove common words that aren't part of the audit name
      auditName = auditName.replace(/\b(the|me|my|an|a|for|about|on|in|from|are|is|what|show|tell|get|give|how|did|were|audit|data|results|information|details|trends|comments|scores|perform|latest|all|recent)\b/g, '').trim();

      let auditType: string | null = null;

      // Handle special cases for "latest" or "all" queries
      if (input.toLowerCase().includes('latest') || input.toLowerCase().includes('all')) {
        auditType = 'all';
      } else {
        auditType = resolveAuditTypeFromName(auditName);
      }

      if (!auditType) {
        const fallback = auditName
          ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : '';
        auditType = fallback && fallback !== 'audit' ? fallback : 'all';
      }

      return {
        type: 'audit_query',
        auditType,
        originalInput: userInput
      };
    }
  }

  const simpleAuditStatusMatch = input.match(/^(?:show|give|provide|get|tell|share)?\s*(?:me\s+)?(?:the\s+)?(.+?)\s+audit(?:\s+(?:overview|summary|status|information|info|details|report|insights?))?$/i);
  if (simpleAuditStatusMatch) {
    const auditName = simpleAuditStatusMatch[1]?.trim() || '';
    const resolved = resolveAuditTypeFromName(auditName);
    const fallback = auditName
      ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '';
    const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : 'all');
    return {
      type: 'audit_query',
      auditType,
      originalInput: userInput,
    };
  }

  // Create audit patterns
  const createAuditPatterns = [
    /(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+|new\s+)?(.+?)\s+audit/i,
    /(?:i\s+want\s+to|i\s+need\s+to|i\s+would\s+like\s+to)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
    /(?:let's|let\s+us)\s+(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
    /(?:can\s+you\s+|could\s+you\s+|please\s+)?(?:create|start|begin|make|do|perform|conduct)\s+(?:a\s+|an\s+)?(.+?)\s+audit/i,
    /(?:new|create)\s+audit\s+(?:for|about|on)\s+(.+)/i
  ];

  for (const pattern of createAuditPatterns) {
    const match = input.match(pattern);
    if (match) {
      const auditName = (match[1] || match[2] || '').trim()
        .replace(/\b(a|an|new|the|let's|let\s+us|can\s+you|could\s+you|please|i\s+want|i\s+need|i\s+would\s+like|to\s+create|to\s+start|to\s+begin|to\s+make|to\s+do|to\s+perform|to\s+conduct|for|about|on)\b/g, '')
        .trim();

      const resolved = resolveAuditTypeFromName(auditName);
      const fallback = auditName
        ? auditName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : '';
      const auditType = resolved || (fallback && fallback !== 'audit' ? fallback : null);
      if (!auditType) continue;

      return {
        type: 'create_audit',
        auditType,
        createAudit: true,
        originalInput: userInput
      };
    }
  }

  // Document connection patterns
  const connectionPatterns = [
    /(link|connect|relate|associate)\s+(this|these|the)\s+(document|documents|file|files)\s+(to|with)\s+(.+)/i,
    /(find|show|get)\s+(related|connected|linked|associated)\s+(documents?|files?)\s+(to|for|about)\s+(.+)/i,
    /(what\s+(documents?|files?)\s+are\s+(related|connected|linked)\s+to)\s+(.+)/i
  ];

  for (const pattern of connectionPatterns) {
    const match = input.match(pattern);
    if (match) {
      const searchTerm = (match[5] || match[4] || '').trim();
      return {
        type: 'document_connection',
        searchTerm: searchTerm,
        originalInput: userInput
      };
    }
  }

  // User profile patterns
  const userProfilePatterns = [
    /(show|display|get|tell)\s+(me\s+)?(my\s+)?(user\s+)?profile/i,
    /(what\s+is\s+my|what's\s+my)\s+(user\s+)?info(rmation)?/i,
    /(user\s+)?details\s+(for\s+me|about\s+me)/i,
    /(my\s+)?account\s+(info|details)/i
  ];

  for (const pattern of userProfilePatterns) {
    if (pattern.test(input)) {
      return {
        type: 'user_profile',
        originalInput: userInput
      };
    }
  }

  // Team info patterns
  const teamInfoPatterns = [
    /(show|list|display|get)\s+(me\s+)?(the\s+)?teams?/i,
    /(what\s+)?team(s?)\s+(do\s+we\s+have|are\s+there|exist)/i,
    /(team|teams)\s+(information|details|members)/i,
    /(who\s+is\s+in|members\s+of)\s+(the\s+)?team/i
  ];

  for (const pattern of teamInfoPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'team_info',
        originalInput: userInput
      };
    }
  }

  // Workspace info patterns
  const workspaceInfoPatterns = [
    /(show|display|get|tell)\s+(me\s+)?(the\s+)?workspace\s+(info|details|stats|information)/i,
    /(workspace|care\s+home)\s+(details|information|stats)/i,
    /(what\s+is\s+the|tell\s+me\s+about)\s+(workspace|care\s+home)/i
  ];

  for (const pattern of workspaceInfoPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'workspace_info',
        originalInput: userInput
      };
    }
  }



  // Fetch notifications patterns
  const fetchNotificationsPatterns = [
    /(show|display|get|tell)\s+(me\s+)?(the\s+)?notifications?/i,
    /(what\s+)?recent\s+(activity|notifications?|updates?)/i,
    /(notifications?|activity|updates?)\s+(feed|list)/i,
    /(what's\s+)?new/i
  ];

  for (const pattern of fetchNotificationsPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'fetch_notifications',
        originalInput: userInput
      };
    }
  }

  // Create document patterns
  const createDocumentPatterns = [
    /(create|make|add|new)\s+(a\s+|an\s+|the\s+)?(document|policy|file)/i,
    /(i\s+want\s+to|i\s+need\s+to)\s+(create|make|add)\s+(a\s+|an\s+)?(document|policy|file)/i,
    /(new|create)\s+(document|policy|file)\s+(called|named|titled)?\s*(.+)?/i
  ];

  for (const pattern of createDocumentPatterns) {
    const match = input.match(pattern);
    if (match) {
      const documentType = (match[2] || match[4] || '').trim();
      return {
        type: 'create_document',
        documentType: documentType,
        originalInput: userInput
      };
    }
  }

  // Edit document patterns
  const editDocumentPatterns = [
    /(edit|modify|update|change)\s+(the\s+)?(.+)/i,
    /(i\s+want\s+to|i\s+need\s+to)\s+(edit|modify|update)\s+(the\s+)?(.+)/i
  ];

  for (const pattern of editDocumentPatterns) {
    const match = input.match(pattern);
    if (match) {
      const searchTerm = (match[3] || match[4] || '').trim();
      return {
        type: 'edit_document',
        searchTerm: searchTerm,
        originalInput: userInput
      };
    }
  }

  // Occupancy data patterns
  const occupancyPatterns = [
    /(show|display|get|tell)\s+(me\s+)?(the\s+)?occupancy\s+(data|rates?|stats?|information)/i,
    /(bed|occupancy)\s+(occupancy|rates?|stats?|data)/i,
    /(how\s+many|what\s+is\s+the)\s+(beds?|occupancy)\s+(rate|level)/i,
    /(occupancy|bed)\s+(information|details)/i
  ];

  for (const pattern of occupancyPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'occupancy_data',
        originalInput: userInput
      };
    }
  }

  // Agentic workflow patterns
  const workflowPatterns = [
    /(create|setup|set\s+up|configure)\s+(a\s+|an\s+|new\s+)?workflow/i,
    /(show|list|display|get)\s+(me\s+)?(the\s+)?workflows?/i,
    /(enable|disable|activate|deactivate)\s+(workflow|automation)/i,
    /(run|execute|trigger)\s+(workflow|automation)/i,
    /(workflow|automation)\s+(status|history|executions?)/i,
    /(schedule|automate)\s+(reminder|report|audit|task)/i
  ];

  for (const pattern of workflowPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'agentic_workflow',
        originalInput: userInput
      };
    }
  }

  // Action Plans query patterns
  const actionPlansPatterns = [
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?action\s+plans?/i,
    /(action\s+plans?|plans?)\s+(status|summary|overview|list)/i,
    /(what\s+is\s+the\s+status\s+of|check)\s+(the\s+)?action\s+plans?/i,
    /(are\s+there\s+any|list)\s+(overdue|pending|completed)\s+action\s+plans?/i,
    /(show|display|get)\s+(me\s+)?action\s+plans?\s+(for|in)\s+(.+)/i,
    /(action\s+plans?|plans?)\s+(assignments?|assigned\s+to\s+me)/i
  ];

  for (const pattern of actionPlansPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'action_plans_query',
        originalInput: userInput
      };
    }
  }

  // Holiday / annual leave patterns - handle before rotas or user search
  const holidayPatterns = [
    /(who|which|anyone)\s+(is|are)\s+(on\s+)?(holiday|annual\s+leave|leave)\s+(this|next|last)\s+week/i,
    /(show|list|display|get|give|tell)\s+(me\s+)?(who\s+is\s+)?(on\s+)?(holiday|annual\s+leave|leave)/i,
    /(who|which\s+staff)\s+(is|are)\s+(away|off)\s+(today|tomorrow|this\s+week|next\s+week)/i,
    /(annual\s+leave|holiday)\s+schedule/i
  ];

  for (const pattern of holidayPatterns) {
    if (pattern.test(input)) {
      const timeframe = input.includes('next week')
        ? 'next-week'
        : input.includes('last week')
          ? 'last-week'
          : input.includes('tomorrow')
            ? 'tomorrow'
            : input.includes('today')
              ? 'today'
              : input.includes('next month')
                ? 'next-month'
                : input.includes('this month')
                  ? 'this-month'
                  : 'this-week';

      return {
        type: 'holiday_query',
        timeframe,
        originalInput: userInput
      };
    }
  }

  // Rotas query patterns
  const rotasPatterns = [
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?rotas?/i,
    /(rotas?|schedules?|shifts?)\s+(status|summary|overview|list)/i,
    /(what\s+is\s+my|check\s+my)\s+(rota|schedule|shifts?)/i,
    /(show|display|get)\s+(me\s+)?rota\s+(for|in)\s+(.+)/i,
    /(rota|schedule)\s+(this\s+week|next\s+week|upcoming)/i,
    /(my\s+)?shifts?\s+(this\s+week|next\s+week|for\s+the\s+week)/i
  ];

  for (const pattern of rotasPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'rotas_query',
        originalInput: userInput
      };
    }
  }

  if (/(shift|rota|roster|schedule)/i.test(input) && /(who|when|how many|coverage|cover|working|on duty|today|tonight|tomorrow|week|next|this|staff|team)/i.test(input)) {
    return {
      type: 'rotas_query',
      originalInput: userInput
    };
  }

  if (/(when\s+am\s+i\s+working|what\s+are\s+my\s+shifts|do\s+i\s+work\s+(today|tomorrow)|is\s+my\s+shift)/i.test(input)) {
    return {
      type: 'rotas_query',
      originalInput: userInput
    };
  }

  if (/(who(?:'s|’s)?\s+on|who\s+is\s+on|who(?:'s|’s)?\s+working|who\s+is\s+working|who(?:'s|’s)?\s+in|who\s+is\s+in|who(?:'s|’s)?\s+on\s+duty|who\s+is\s+on\s+duty)/i.test(input)
    && /(today|tonight|tomorrow|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|weekend|weekday|shift|floor|cover|duty)/i.test(input)) {
    return {
      type: 'rotas_query',
      originalInput: userInput
    };
  }

  // Lessons Learned and RCA query patterns
  const lessonsRcaPatterns = [
    /(show|display|get|give|tell|what|how)\s+(me\s+)?(the\s+)?(latest\s+)?lessons?\s+learned/i,
    /(lessons?\s+learned|rca|root\s+cause\s+analysis)\s+(records?|summary|overview|list)/i,
    /(what\s+are\s+the|check)\s+(lessons?\s+learned|rca\s+records?)/i,
    /(show|display|get)\s+(me\s+)?lessons?\s+learned\s+(for|about|regarding)\s+(.+)/i,
    /(rca|root\s+cause)\s+(analysis|records?)\s+(for|about)\s+(.+)/i
  ];

  for (const pattern of lessonsRcaPatterns) {
    if (pattern.test(input)) {
      return {
        type: 'lessons_rca_query',
        originalInput: userInput
      };
    }
  }


  // default fallback - treat as a general query when nothing else matches
  return {
    type: 'general_query',
    originalInput: userInput
  };
};

export { detectIntent, buildDependencyQuickAnswer, buildRotaQuickAnswer };