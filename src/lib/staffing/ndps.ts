export type DependencyLevel = "" | "0" | "1" | "2" | "3" | "4" | "5";
export type Shift = "Day" | "Night";

export const NPDS_FIELDS = [
	{ key: "bcn_mobility", label: "Mobility", section: "BCN", maxScore: 5, description: "General mobility and movement" },
	{ key: "bcn_transfers", label: "Transfers", section: "BCN", maxScore: 5, description: "Moving from bed to chair, etc." },
	{ key: "bcn_washing", label: "Washing/Bathing", section: "BCN", maxScore: 5, description: "Personal hygiene" },
	{ key: "bcn_dressing", label: "Dressing", section: "BCN", maxScore: 5, description: "Getting dressed/undressed" },
	{ key: "bcn_toileting", label: "Toileting", section: "BCN", maxScore: 5, description: "Using the toilet" },
	{ key: "bcn_continence", label: "Continence", section: "BCN", maxScore: 5, description: "Bladder and bowel control" },
	{ key: "bcn_feeding", label: "Feeding", section: "BCN", maxScore: 5, description: "Eating and drinking" },
	{ key: "bcn_turning", label: "Turning in Bed", section: "BCN", maxScore: 5, description: "Changing position in bed" },
	{ key: "bcn_getting_up", label: "Getting Up", section: "BCN", maxScore: 5, description: "Rising from bed" },
	{ key: "bcn_bed_mobility", label: "Bed Mobility", section: "BCN", maxScore: 5, description: "Moving around in bed" },
	{ key: "bcn_walking", label: "Walking", section: "BCN", maxScore: 5, description: "Walking ability" },
	{ key: "bcn_stairs", label: "Stairs", section: "BCN", maxScore: 5, description: "Using stairs" },
	{ key: "snn_breathing", label: "Breathing Support", section: "SNN", maxScore: 5, description: "Respiratory care and oxygen" },
	{ key: "snn_drugs", label: "Medication Management", section: "SNN", maxScore: 5, description: "Medication administration" },
	{ key: "snn_skin_care", label: "Skin Care", section: "SNN", maxScore: 5, description: "Pressure area care" },
	{ key: "snn_treatment", label: "Special Treatments", section: "SNN", maxScore: 5, description: "Wound care, catheter, etc." },
	{ key: "snn_observation", label: "Monitoring/Observation", section: "SNN", maxScore: 5, description: "Vital signs, behavior monitoring" },
	{ key: "therapy_communication", label: "Communication", section: "THERAPY", maxScore: 5, description: "Communication and cognitive support" },
	{ key: "therapy_cognitive", label: "Cognitive", section: "THERAPY", maxScore: 5, description: "Cognitive function and memory" },
	{ key: "therapy_behaviour", label: "Behaviour", section: "THERAPY", maxScore: 5, description: "Behavioral management needs" },
] as const;

type NPDSFieldKey = (typeof NPDS_FIELDS)[number]["key"];
type NPDSAssessmentFields = { [K in NPDSFieldKey]: DependencyLevel };

export interface Resident extends NPDSAssessmentFields {
	id?: string;
	name: string;
	room: string;
	createdAt?: number;
	updatedAt?: number;
	updatedBy?: string | null;
	communityId?: string | null;
}

export interface StaffBreakdown {
	Day: { nurses: number; ctms: number; carers: number; total: number };
	Night: { nurses: number; ctms: number; carers: number; total: number };
}

export interface StaffingSummary {
	schemaVersion: number;
	generatedAt: string;
	includeNurses: boolean;
	residentCount: number;
	bandCounts: Record<1 | 2 | 3 | 4 | 5, number>;
	totalCareMinutes: { Day: number; Night: number };
	ndpsStaffing: { Day: number; Night: number };
	breakdown: StaffBreakdown;
}

export const STAFFING_SUMMARY_VERSION = 1;


const MINUTES_BY_FIELD_DAY: Record<string, Record<DependencyLevel, number>> = {
	personalCare: { "": 0, "0": 0, "1": 8, "2": 15, "3": 22, "4": 28, "5": 35 },
	eatingDrinking: { "": 0, "0": 0, "1": 5, "2": 10, "3": 18, "4": 25, "5": 30 },
	medical: { "": 0, "0": 0, "1": 3, "2": 8, "3": 12, "4": 18, "5": 25 },
	mobility: { "": 0, "0": 0, "1": 5, "2": 12, "3": 20, "4": 28, "5": 35 },
	continence: { "": 0, "0": 0, "1": 5, "2": 10, "3": 15, "4": 22, "5": 28 },
	skinIntegrity: { "": 0, "0": 0, "1": 3, "2": 8, "3": 12, "4": 18, "5": 25 },
	medication: { "": 0, "0": 0, "1": 3, "2": 7, "3": 12, "4": 16, "5": 20 },
	emotionalSupport: { "": 0, "0": 0, "1": 5, "2": 10, "3": 15, "4": 20, "5": 25 },
	cognition: { "": 0, "0": 0, "1": 5, "2": 10, "3": 15, "4": 22, "5": 28 },
	nightNeeds: { "": 0, "0": 0, "1": 3, "2": 8, "3": 12, "4": 18, "5": 25 },
	additionalNeeds: { "": 0, "0": 0, "1": 0, "2": 5, "3": 12, "4": 18, "5": 25 },
	behaviours: { "": 0, "0": 0, "1": 0, "2": 8, "3": 15, "4": 22, "5": 30 },
	breathing: { "": 0, "0": 0, "1": 0, "2": 8, "3": 15, "4": 22, "5": 30 },
};

const MINUTES_BY_FIELD_NIGHT: Record<string, Record<DependencyLevel, number>> = {
	personalCare: { "": 0, "0": 0, "1": 4, "2": 8, "3": 12, "4": 15, "5": 18 },
	eatingDrinking: { "": 0, "0": 0, "1": 2, "2": 5, "3": 8, "4": 12, "5": 15 },
	medical: { "": 0, "0": 0, "1": 2, "2": 4, "3": 6, "4": 9, "5": 12 },
	mobility: { "": 0, "0": 0, "1": 3, "2": 6, "3": 10, "4": 14, "5": 18 },
	continence: { "": 0, "0": 0, "1": 3, "2": 5, "3": 8, "4": 12, "5": 15 },
	skinIntegrity: { "": 0, "0": 0, "1": 2, "2": 4, "3": 6, "4": 9, "5": 12 },
	medication: { "": 0, "0": 0, "1": 2, "2": 4, "3": 6, "4": 8, "5": 10 },
	emotionalSupport: { "": 0, "0": 0, "1": 2, "2": 5, "3": 8, "4": 10, "5": 12 },
	cognition: { "": 0, "0": 0, "1": 2, "2": 5, "3": 8, "4": 12, "5": 15 },
	nightNeeds: { "": 0, "0": 0, "1": 3, "2": 6, "3": 10, "4": 14, "5": 18 },
	additionalNeeds: { "": 0, "0": 0, "1": 0, "2": 3, "3": 6, "4": 9, "5": 12 },
	behaviours: { "": 0, "0": 0, "1": 0, "2": 4, "3": 8, "4": 12, "5": 15 },
	breathing: { "": 0, "0": 0, "1": 0, "2": 4, "3": 8, "4": 12, "5": 15 },
};

const FIELD_MAPPING: Record<NPDSFieldKey, string> = {
	bcn_mobility: "mobility",
	bcn_transfers: "mobility",
	bcn_bed_mobility: "mobility",
	bcn_walking: "mobility",
	bcn_stairs: "mobility",
	bcn_washing: "personalCare",
	bcn_dressing: "personalCare",
	bcn_toileting: "personalCare",
	bcn_continence: "continence",
	bcn_feeding: "eatingDrinking",
	bcn_turning: "mobility",
	bcn_getting_up: "mobility",
	snn_breathing: "breathing",
	snn_drugs: "medication",
	snn_skin_care: "skinIntegrity",
	snn_treatment: "medical",
	snn_observation: "medical",
	therapy_communication: "emotionalSupport",
	therapy_cognitive: "cognition",
	therapy_behaviour: "behaviours",
};

const NDPS_STAFFING_RATIOS_DAY = {
	1: 1 / 10,
	2: 1 / 6,
	3: 1 / 3,
	4: 1 / 1.5,
	5: 1.5,
} as const;

const NDPS_STAFFING_RATIOS_NIGHT = {
	1: 1 / 20,
	2: 1 / 12,
	3: 1 / 6,
	4: 1 / 3,
	5: 1,
} as const;

export function getDefaultAssessment(): Omit<Resident, "name" | "room"> {
	const npdsDefaults = {} as NPDSAssessmentFields;
	for (const field of NPDS_FIELDS) {
		npdsDefaults[field.key] = "";
	}

	return {
		...npdsDefaults,
		id: undefined,
		createdAt: undefined,
		updatedAt: undefined,
		updatedBy: null,
		communityId: null,
	};
}

export function ceilToQuarter(value: number): number {
	return Math.ceil(value * 4) / 4;
}

export function ceilToHalf(value: number): number {
	return Math.ceil(value * 2) / 2;
}

export function calculateResidentCareMinutes(resident: Resident): { Day: number; Night: number } {
	let dayMinutes = 0;
	let nightMinutes = 0;

	for (const field of NPDS_FIELDS) {
		const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
		const mappingKey = FIELD_MAPPING[field.key];
		if (!mappingKey) continue;

		const dayMap = MINUTES_BY_FIELD_DAY[mappingKey];
		const nightMap = MINUTES_BY_FIELD_NIGHT[mappingKey];
		dayMinutes += dayMap?.[level] ?? 0;
		nightMinutes += nightMap?.[level] ?? 0;
	}

	return { Day: Math.round(dayMinutes), Night: Math.round(nightMinutes) };
}

export function calculateNDPSScore(resident: Resident): number {
	let bcnScore = 0;
	let snnScore = 0;
	let therapyScore = 0;

	for (const field of NPDS_FIELDS) {
		const level = (resident[field.key as keyof Resident] as DependencyLevel) || "";
		const score = level === "" ? 0 : Number(level);

		if (field.section === "BCN") bcnScore += score;
		else if (field.section === "SNN") snnScore += score;
		else therapyScore += score;
	}

	bcnScore = Math.min(bcnScore, 60);
	snnScore = Math.min(snnScore, 25);
	therapyScore = Math.min(therapyScore, 15);

	return bcnScore + snnScore + therapyScore;
}

export function getNDPSBand(score: number): { band: 1 | 2 | 3 | 4 | 5; name: string } {
	if (score <= 20) return { band: 1, name: "Low Dependency" };
	if (score <= 40) return { band: 2, name: "Moderate Dependency" };
	if (score <= 60) return { band: 3, name: "High Dependency" };
	if (score <= 80) return { band: 4, name: "Very High Dependency" };
	return { band: 5, name: "Maximum Dependency" };
}

export function calculateNDPSStaffing(residents: Resident[]): { Day: number; Night: number } {
	if (residents.length === 0) {
		return { Day: 0, Night: 0 };
	}

	const bandCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

	for (const resident of residents) {
		const score = calculateNDPSScore(resident);
		const band = getNDPSBand(score).band;
		bandCounts[band] += 1;
	}

	let dayStaff = 0;
	let nightStaff = 0;

	for (const band of [1, 2, 3, 4, 5] as const) {
		dayStaff += bandCounts[band] * NDPS_STAFFING_RATIOS_DAY[band];
		nightStaff += bandCounts[band] * NDPS_STAFFING_RATIOS_NIGHT[band];
	}

	const minDayStaff = residents.length > 0 ? 2 : 0;
	const minNightStaff = residents.length > 0 ? 2 : 0;

	return {
		Day: Math.max(minDayStaff, Math.ceil(dayStaff)),
		Night: Math.max(minNightStaff, Math.ceil(nightStaff)),
	};
}

export function calculateStaffBreakdown(
	residents: Resident[],
	options?: { includeNurses?: boolean }
): StaffBreakdown {
	const includeNurses = options?.includeNurses ?? true;

	if (residents.length === 0) {
		return {
			Day: { nurses: 0, ctms: 0, carers: 0, total: 0 },
			Night: { nurses: 0, ctms: 0, carers: 0, total: 0 },
		};
	}

	const totalStaffing = calculateNDPSStaffing(residents);
	const dayCTMs = 1;
	const nightCTMs = 1;
	const dayRemainingStaff = Math.max(0, totalStaffing.Day - dayCTMs);
	const nightRemainingStaff = Math.max(0, totalStaffing.Night - nightCTMs);

	let highDependencyCount = 0;
	let mediumDependencyCount = 0;

	for (const resident of residents) {
		const band = getNDPSBand(calculateNDPSScore(resident)).band;
		if (band >= 4) highDependencyCount += 1;
		else if (band === 3) mediumDependencyCount += 1;
	}

	let dayNurses = 0;
	let nightNurses = 0;

	if (highDependencyCount > 0) {
		dayNurses = Math.max(1, Math.ceil(highDependencyCount * 0.5));
		nightNurses = Math.max(1, Math.ceil(highDependencyCount * 0.3));
	} else if (mediumDependencyCount >= 3) {
		dayNurses = 1;
		nightNurses = 0;
	}

	dayNurses = Math.min(dayNurses, dayRemainingStaff);
	nightNurses = Math.min(nightNurses, nightRemainingStaff);

	const dayCarers = dayRemainingStaff - dayNurses;
	const nightCarers = nightRemainingStaff - nightNurses;

	const breakdown: StaffBreakdown = {
		Day: {
			nurses: includeNurses ? dayNurses : 0,
			ctms: dayCTMs,
			carers: includeNurses ? dayCarers : dayCarers + dayNurses,
			total: includeNurses ? dayNurses + dayCTMs + dayCarers : dayCTMs + dayCarers + dayNurses,
		},
		Night: {
			nurses: includeNurses ? nightNurses : 0,
			ctms: nightCTMs,
			carers: includeNurses ? nightCarers : nightCarers + nightNurses,
			total: includeNurses ? nightNurses + nightCTMs + nightCarers : nightCTMs + nightCarers + nightNurses,
		},
	};

	return breakdown;
}

export function calculateResidentStaffing(resident: Resident): { Day: number; Night: number } {
	const band = getNDPSBand(calculateNDPSScore(resident)).band;
	return {
		Day: NDPS_STAFFING_RATIOS_DAY[band],
		Night: NDPS_STAFFING_RATIOS_NIGHT[band],
	};
}

export function buildStaffingSummary(
	residents: Resident[],
	options?: { includeNurses?: boolean }
): StaffingSummary {
	const includeNurses = options?.includeNurses ?? true;
	const bandCounts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	let totalDayMinutes = 0;
	let totalNightMinutes = 0;

	for (const resident of residents) {
		const { band } = getNDPSBand(calculateNDPSScore(resident));
		bandCounts[band] += 1;
		const careMinutes = calculateResidentCareMinutes(resident);
		totalDayMinutes += careMinutes.Day;
		totalNightMinutes += careMinutes.Night;
	}

	const ndpsStaffing = calculateNDPSStaffing(residents);
	const breakdown = calculateStaffBreakdown(residents, { includeNurses });

	return {
		schemaVersion: STAFFING_SUMMARY_VERSION,
		generatedAt: new Date().toISOString(),
		includeNurses,
		residentCount: residents.length,
		bandCounts,
		totalCareMinutes: { Day: totalDayMinutes, Night: totalNightMinutes },
		ndpsStaffing,
		breakdown,
	};
}

export type { Resident as NDPSResident };
