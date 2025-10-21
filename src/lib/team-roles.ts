export const ORGANISATION_TEAM_KEYS = [
	'admin',
	'staff',
	'inspection',
	'management',
	'nurses',
	'carers',
	'ctm',
	'domestic',
	'maintenance',
	'kitchen',
	'activities',
] as const;

export type OrganisationTeamKey = typeof ORGANISATION_TEAM_KEYS[number];

export const ORGANISATION_TEAM_LABELS: Record<OrganisationTeamKey, string> = {
	admin: 'Admin',
	staff: 'Staff',
	inspection: 'Inspection',
	management: 'Management',
	nurses: 'Nurses',
	carers: 'Carers',
	ctm: 'CTM',
	domestic: 'Domestic',
	maintenance: 'Maintenance',
	kitchen: 'Kitchen',
	activities: 'Activities',
};

export function normaliseTeamKey(value: unknown): OrganisationTeamKey | null {
	if (value === undefined || value === null) return null;
	const key = String(value).toLowerCase() as OrganisationTeamKey;
	return (ORGANISATION_TEAM_KEYS as readonly string[]).includes(key) ? key : null;
}

export function dedupeTeamKeys(values: Array<unknown> | null | undefined): OrganisationTeamKey[] {
	if (!Array.isArray(values)) return [];
	const unique = new Set<OrganisationTeamKey>();
	for (const value of values) {
		const key = normaliseTeamKey(value);
		if (key) {
			unique.add(key);
		}
	}
	return Array.from(unique);
}

export function defaultTeamsForRole(role?: string | null): OrganisationTeamKey[] {
	const normalised = role ? role.toString().toLowerCase() : '';
	if (normalised === 'owner' || normalised === 'admin' || normalised === 'manager' || normalised === 'management') {
		return ['management'];
	}
	if (normalised === 'inspection' || normalised === 'inspector') {
		return ['inspection'];
	}
	if (normalised === 'nurse' || normalised === 'nurses') {
		return ['nurses'];
	}
	return ['staff'];
}

export function createDefaultTeamAccess(): Record<OrganisationTeamKey, boolean> {
	return ORGANISATION_TEAM_KEYS.reduce<Record<OrganisationTeamKey, boolean>>((acc, key) => {
		acc[key] = true;
		return acc;
	}, {} as Record<OrganisationTeamKey, boolean>);
}

