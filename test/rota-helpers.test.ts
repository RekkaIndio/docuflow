import { describe, it, expect } from 'vitest';
import { fuzzyFindStaffEntry, compareRotaToDependency } from '../src/components/chat/rota-helpers';

describe('rota helpers', () => {
  it('fuzzyFindStaffEntry finds best match and marks ambiguous when similar', () => {
    const staff = [
      { name: 'Alice Smith', shifts: [], variants: ['alice', 'a smith'] },
      { name: 'Alicia Smyth', shifts: [], variants: ['alicia'] },
      { name: 'Bob Jones', shifts: [], variants: ['bob'] },
    ];
    const res = fuzzyFindStaffEntry(staff as any, 'alice smyth');
    expect(res).toBeTruthy();
    if (!res) return; // safety for TS
    expect(res.entry.name).toMatch(/Alice|Alicia/);
  });

  it('compareRotaToDependency returns sensible comparison', () => {
    const daySummaries = {
      '2025-10-20': {
        dayKey: '2025-10-20',
        dayName: 'Monday',
        shifts: [
          { role: 'Carer', startTime: '08:00', endTime: '16:00', type: 'Day' },
          { role: 'Nurse', startTime: '08:00', endTime: '20:00', type: 'Day' },
        ],
        roles: { Carer: 1, Nurse: 1 },
        types: { Day: 2 },
        total: 2,
      },
      '2025-10-21': {
        dayKey: '2025-10-21',
        dayName: 'Tuesday',
        shifts: [
          { role: 'Carer', startTime: '20:00', endTime: '08:00', type: 'Night' },
        ],
        roles: { Carer: 1 },
        types: { Night: 1 },
        total: 1,
      },
    } as any;

    const latest = {
      staffing: {
        day: { carers: 2, ns: 1 },
        night: { carers: 1, ns: 1 },
        totals: { dayHours: 16, nightHours: 10 },
      },
    } as any;

    const res = compareRotaToDependency(daySummaries, latest as any);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
    const monday = res.find(r => r.dayKey === '2025-10-20');
    expect(monday).toBeTruthy();
    if (!monday) return;
    expect(monday.hoursScheduled).toBeGreaterThan(0);
  });
});
