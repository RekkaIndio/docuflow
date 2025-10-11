// staffing.ts - Northwick Park Dependency Score (NPDS) Implementation

// ---- NPDS Structure ----
// Based on authentic NPDS methodology for rehabilitation settings
export const NPDS_SECTIONS = {
  BCN: "Basic Care Needs",           // 12 items, max score 65
  SNN: "Special Needs",      // 5 items, max score 25
  THERAPY: "Therapy Needs"           // 3 items, max score 10
} as const;

export type NPDSSection = keyof typeof NPDS_SECTIONS;

// NPDS scoring bands for staffing calculations
export const NPDS_BANDS = {
  LOW: { min: 0, max: 24, level: "Low" },
  MODERATE: { min: 25, max: 49, level: "Moderate" },
  HIGH: { min: 50, max: 74, level: "High" },
  VERY_HIGH: { min: 75, max: 89, level: "Very High" },
  COMPLEX: { min: 90, max: 100, level: "Complex" }
} as const;

export type NPDSLevel = typeof NPDS_BANDS[keyof typeof NPDS_BANDS]["level"];

export type NPDSAssessment = {
  BCN: number;        // 0-65
  SNN: number;        // 0-25
  THERAPY: number;    // 0-10
};

export type Resident = {
  id: string;
  name: string;
  npdsScores: NPDSAssessment;
};

export type Level = NPDSLevel;

export type StaffingOptions = {
  daySplit?: number;              // e.g. 0.7
  nightSplit?: number;            // e.g. 0.3
  shiftLengthDay?: number;        // hours, e.g. 12
  shiftLengthNight?: number;      // hours, e.g. 12
  levelHours?: Record<Level, number>;      // hours per 24h
  levelNSPct?: Record<Level, number>;      // Nurses/Seniors share (0..1)
};

const DEFAULTS: Required<StaffingOptions> = {
  daySplit: 0.7,
  nightSplit: 0.3,
  shiftLengthDay: 12,
  shiftLengthNight: 12,
  levelHours: {
    Low: 2,
    Moderate: 4,
    High: 6,
    "Very High": 9,
    Complex: 11,
  },
  levelNSPct: {
    Low: 0.10,
    Moderate: 0.15,
    High: 0.25,
    "Very High": 0.35,
    Complex: 0.40,
  },
};

// ---- NPDS Helper Functions ----
export function calculateNPDSTotal(scores: NPDSAssessment): number {
  return scores.BCN + scores.SNN + scores.THERAPY;
}

export function getNPDSBand(totalScore: number): NPDSLevel {
  if (totalScore <= NPDS_BANDS.LOW.max) return NPDS_BANDS.LOW.level as NPDSLevel;
  if (totalScore <= NPDS_BANDS.MODERATE.max) return NPDS_BANDS.MODERATE.level as NPDSLevel;
  if (totalScore <= NPDS_BANDS.HIGH.max) return NPDS_BANDS.HIGH.level as NPDSLevel;
  if (totalScore <= NPDS_BANDS.VERY_HIGH.max) return NPDS_BANDS.VERY_HIGH.level as NPDSLevel;
  return NPDS_BANDS.COMPLEX.level as NPDSLevel;
}

// ---- Legacy compatibility (for migration) ----
export function averageScore(scores: Partial<Record<string, number>>): number | null {
  // This function is kept for backward compatibility during migration
  // It will be removed once all references are updated
  const vals = Object.values(scores).filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
  if (vals.length === 0) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 100) / 100;
}

export function levelFromAverage(avg: number | null): Level | null {
  if (avg === null) return null;
  if (avg < 2) return "Low";
  if (avg < 3) return "Moderate";
  if (avg < 4) return "High";
  if (avg <= 4.5) return "Very High";
  return "Complex";
}

// ---- Types for results ----
export type ResidentBreakdown = {
  id: string;
  name: string;
  npdsTotal: number;     // NPDS total score (0-100)
  level: Level | null;
  hours24: number;

  dayHours: number;
  nightHours: number;

  nsDayHours: number;     // Nurses/Seniors
  nsNightHours: number;
  carerDayHours: number;
  carerNightHours: number;
};

export type StaffingTotals = {
  hours: {
    day: { carers: number; ns: number; all: number };
    night: { carers: number; ns: number; all: number };
  };
  headcount: {
    day: { carers: number; ns: number; all: number };
    night: { carers: number; ns: number; all: number };
  };
  rounded: {
    day: { carers: number; ns: number; all: number };
    night: { carers: number; ns: number; all: number };
  };
};

export type StaffingOutput = {
  options: Required<StaffingOptions>;
  perResident: ResidentBreakdown[];
  totals: StaffingTotals;
};

// ---- Core calculation ----
export function computeStaffing(
  residents: Resident[],
  opts: StaffingOptions = {}
): StaffingOutput {
  const cfg = { ...DEFAULTS, ...opts };

  const perResident: ResidentBreakdown[] = residents.map((r) => {
    const totalScore = calculateNPDSTotal(r.npdsScores);
    const level = getNPDSBand(totalScore);
    const hours24 = level ? cfg.levelHours[level] : 0;
    const nsPct = level ? cfg.levelNSPct[level] : 0;

    const dayHours = hours24 * cfg.daySplit;
    const nightHours = hours24 * cfg.nightSplit;

    const nsDayHours = dayHours * nsPct;
    const nsNightHours = nightHours * nsPct;

    const carerDayHours = dayHours * (1 - nsPct);
    const carerNightHours = nightHours * (1 - nsPct);

    return {
      id: r.id,
      name: r.name,
      npdsTotal: totalScore,
      level,
      hours24,
      dayHours,
      nightHours,
      nsDayHours,
      nsNightHours,
      carerDayHours,
      carerNightHours,
    };
  });

  // Sum hours
  const sum = <T extends keyof ResidentBreakdown>(key: T) =>
    perResident.reduce((a, b) => a + (b[key] as unknown as number), 0);

  const hours = {
    day: {
      carers: sum("carerDayHours"),
      ns: sum("nsDayHours"),
      all: sum("carerDayHours") + sum("nsDayHours"),
    },
    night: {
      carers: sum("carerNightHours"),
      ns: sum("nsNightHours"),
      all: sum("carerNightHours") + sum("nsNightHours"),
    },
  };

  // Convert hours → staff per 12h shift
  const headcount = {
    day: {
      carers: hours.day.carers / cfg.shiftLengthDay,
      ns: hours.day.ns / cfg.shiftLengthDay,
      all: hours.day.all / cfg.shiftLengthDay,
    },
    night: {
      carers: hours.night.carers / cfg.shiftLengthNight,
      ns: hours.night.ns / cfg.shiftLengthNight,
      all: hours.night.all / cfg.shiftLengthNight,
    },
  };

  const rounded = {
    day: {
      carers: Math.ceil(headcount.day.carers || 0),
      ns: Math.ceil(headcount.day.ns || 0),
      all: Math.ceil(headcount.day.all || 0),
    },
    night: {
      carers: Math.ceil(headcount.night.carers || 0),
      ns: Math.ceil(headcount.night.ns || 0),
      all: Math.ceil(headcount.night.all || 0),
    },
  };

  return { options: cfg, perResident, totals: { hours, headcount, rounded } };
}
