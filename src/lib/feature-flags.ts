import type {
  FeatureModule,
  FeatureModuleKey,
  OrganisationFeatureFlags,
  WorkspaceFeatureFlagOverrides,
} from '@/lib/types';
import type { OrganisationTeamKey } from '@/lib/team-roles';
import { ORGANISATION_TEAM_KEYS, createDefaultTeamAccess } from '@/lib/team-roles';

const withTeamAccess = (module: FeatureModule): FeatureModule => ({
  ...module,
  teamAccess: module.teamAccess ?? createDefaultTeamAccess(),
});

// Default feature flag configuration shared between client and server contexts.
export const DEFAULT_FEATURE_FLAGS: OrganisationFeatureFlags = {
  modules: {
    dashboard: withTeamAccess({ enabled: true, name: 'Dashboard', description: 'Overview and daily check-ins', category: 'core', isCore: true }),
    dependencyCalculator: withTeamAccess({ enabled: true, name: 'Dependency Calculator', description: 'Staff dependency tracking', category: 'operations' }),
    audits: withTeamAccess({ enabled: true, name: 'Audits', description: 'Compliance auditing system', category: 'compliance' }),
    actionPlans: withTeamAccess({ enabled: true, name: 'Action Plans', description: 'Task tracking from audit findings', category: 'compliance' }),
    policies: withTeamAccess({ enabled: true, name: 'Policies', description: 'Policy document management', category: 'compliance' }),
    journal: withTeamAccess({ enabled: true, name: 'Journal', description: 'Care journal and handover notes', category: 'operations' }),
    managerJournal: withTeamAccess({ enabled: true, name: 'Manager Journal', description: 'Escalation channel from managers to head office', category: 'operations' }),
    appraisals: withTeamAccess({ enabled: true, name: 'Supervisions', description: 'Staff supervision tracking', category: 'operations' }),
    rotas: withTeamAccess({ enabled: true, name: 'Rotas', description: 'Staff scheduling and rota management', category: 'operations' }),
    files: withTeamAccess({ enabled: true, name: 'Files & Folders', description: 'Document browser and file management', category: 'core', isCore: true }),
    teams: withTeamAccess({ enabled: true, name: 'Teams', description: 'Team member management', category: 'operations' }),
    stats: withTeamAccess({ enabled: true, name: 'Statistics', description: 'Analytics and compliance statistics', category: 'analytics' }),
    chatPanel: withTeamAccess({ enabled: true, name: 'AI Chat Assistant', description: 'AI-powered compliance assistant', category: 'communication' }),
    notifications: withTeamAccess({ enabled: true, name: 'Notifications', description: 'Notification system', category: 'communication' }),
    tags: withTeamAccess({ enabled: true, name: 'Tags', description: 'Document tagging system', category: 'core' }),
    renewals: withTeamAccess({ enabled: true, name: 'Renewals', description: 'Document renewal tracking', category: 'compliance' }),
    dailyCheckins: withTeamAccess({ enabled: true, name: 'Daily Check-ins', description: 'Daily status reports', category: 'operations' }),
    accessibility: withTeamAccess({ enabled: true, name: 'Accessibility', description: 'Accessibility settings', category: 'core', isCore: true }),
    settings: withTeamAccess({ enabled: true, name: 'Settings', description: 'Workspace settings', category: 'core', isCore: true }),
    lessonsRcas: withTeamAccess({ enabled: true, name: 'Lessons Learnt & RCA', description: 'Learnings and Root Cause Analysis', category: 'compliance' }),
    riskAssessment: withTeamAccess({ enabled: true, name: 'Risk Assessments', description: 'Risk assessment tracking and management', category: 'compliance' }),
    complaintsCompliments: withTeamAccess({ enabled: true, name: 'Complaints & Compliments', description: 'Track complaints and compliments', category: 'compliance' }),
  },
};

export const mergeTeamAccess = (
  base?: Partial<Record<OrganisationTeamKey, boolean>>,
  override?: Partial<Record<OrganisationTeamKey, boolean>>,
) => {
  const result: Record<OrganisationTeamKey, boolean> = createDefaultTeamAccess();
  if (base) {
    for (const key of Object.keys(base) as OrganisationTeamKey[]) {
      result[key] = base[key] ?? true;
    }
  }
  if (override) {
    for (const key of Object.keys(override) as OrganisationTeamKey[]) {
      result[key] = override[key] ?? true;
    }
  }
  return result;
};

export const hydrateFeatureFlags = (flags?: OrganisationFeatureFlags | null): OrganisationFeatureFlags => {
  if (!flags) {
    return {
      modules: Object.fromEntries(
        Object.entries(DEFAULT_FEATURE_FLAGS.modules).map(([key, module]) => [key, withTeamAccess({ ...module })]),
      ) as OrganisationFeatureFlags['modules'],
      updatedAt: DEFAULT_FEATURE_FLAGS.updatedAt,
      updatedBy: DEFAULT_FEATURE_FLAGS.updatedBy,
    };
  }

  const mergedModules: Record<string, FeatureModule> = {};
  const defaultModules = DEFAULT_FEATURE_FLAGS.modules;
  const inputModules = flags.modules ?? {};
  const keys = new Set<string>([...Object.keys(defaultModules), ...Object.keys(inputModules)]);

  keys.forEach((key) => {
    const defaultModule = defaultModules[key as FeatureModuleKey];
    const incomingModule = inputModules[key as FeatureModuleKey];
    if (!defaultModule && !incomingModule) {
      return;
    }
    const baseModule = defaultModule ? { ...defaultModule } : ({ ...incomingModule } as FeatureModule);
    const mergedModule: FeatureModule = {
      ...baseModule,
      ...(incomingModule ?? {}),
      teamAccess: mergeTeamAccess(defaultModule?.teamAccess, incomingModule?.teamAccess),
    };
    mergedModules[key] = mergedModule;
  });

  return {
    modules: mergedModules as Record<FeatureModuleKey, FeatureModule>,
    updatedAt: flags.updatedAt ?? DEFAULT_FEATURE_FLAGS.updatedAt,
    updatedBy: flags.updatedBy ?? DEFAULT_FEATURE_FLAGS.updatedBy,
  };
};

const intersectTeamAccess = (
  base: Record<OrganisationTeamKey, boolean>,
  override?: Partial<Record<OrganisationTeamKey, boolean>>,
): Record<OrganisationTeamKey, boolean> => {
  if (!override) {
    return { ...base };
  }

  const next: Record<OrganisationTeamKey, boolean> = { ...base };
  for (const teamKey of ORGANISATION_TEAM_KEYS) {
    if (override[teamKey] === false) {
      next[teamKey] = false;
    }
  }
  return next;
};

export const applyWorkspaceOverrides = (
  baseFlags: OrganisationFeatureFlags,
  overrides?: WorkspaceFeatureFlagOverrides | null,
): OrganisationFeatureFlags => {
  if (!overrides || !overrides.modules) {
    return baseFlags;
  }

  const mergedModules: Record<string, FeatureModule> = {};
  const baseModules = baseFlags.modules;
  const overrideModules = overrides.modules ?? {};
  const keys = new Set<string>([...Object.keys(baseModules), ...Object.keys(overrideModules)]);

  keys.forEach((key) => {
    const typedKey = key as FeatureModuleKey;
    const baseModule = baseModules[typedKey];
    if (!baseModule) {
      return;
    }

    const overrideModule = overrideModules[typedKey];

    let enabled = baseModule.enabled;
    if (overrideModule?.enabled !== undefined) {
      enabled = enabled && overrideModule.enabled;
    }

    const baseTeamAccess = mergeTeamAccess(createDefaultTeamAccess(), baseModule.teamAccess);
    const teamAccess = intersectTeamAccess(baseTeamAccess, overrideModule?.teamAccess);

    mergedModules[typedKey] = {
      ...baseModule,
      enabled,
      teamAccess,
    };
  });

  return {
    ...baseFlags,
    modules: mergedModules as Record<FeatureModuleKey, FeatureModule>,
  };
};
