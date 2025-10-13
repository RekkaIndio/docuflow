import type { OrganisationFeatureFlags } from '@/lib/types';

// Default feature flag configuration shared between client and server contexts.
export const DEFAULT_FEATURE_FLAGS: OrganisationFeatureFlags = {
  modules: {
    dashboard: { enabled: true, name: 'Dashboard', description: 'Overview and daily check-ins', category: 'core', isCore: true },
    dependencyCalculator: { enabled: true, name: 'Dependency Calculator', description: 'Staff dependency tracking', category: 'operations' },
    audits: { enabled: true, name: 'Audits', description: 'Compliance auditing system', category: 'compliance' },
    actionPlans: { enabled: true, name: 'Action Plans', description: 'Task tracking from audit findings', category: 'compliance' },
    policies: { enabled: true, name: 'Policies', description: 'Policy document management', category: 'compliance' },
    appraisals: { enabled: true, name: 'Supervisions', description: 'Staff supervision tracking', category: 'operations' },
    rotas: { enabled: true, name: 'Rotas', description: 'Staff scheduling and rota management', category: 'operations' },
    files: { enabled: true, name: 'Files & Folders', description: 'Document browser and file management', category: 'core', isCore: true },
    teams: { enabled: true, name: 'Teams', description: 'Team member management', category: 'operations' },
    stats: { enabled: true, name: 'Statistics', description: 'Analytics and compliance statistics', category: 'analytics' },
    chatPanel: { enabled: true, name: 'AI Chat Assistant', description: 'AI-powered compliance assistant', category: 'communication' },
    notifications: { enabled: true, name: 'Notifications', description: 'Notification system', category: 'communication' },
    tags: { enabled: true, name: 'Tags', description: 'Document tagging system', category: 'core' },
    renewals: { enabled: true, name: 'Renewals', description: 'Document renewal tracking', category: 'compliance' },
    dailyCheckins: { enabled: true, name: 'Daily Check-ins', description: 'Daily status reports', category: 'operations' },
    accessibility: { enabled: true, name: 'Accessibility', description: 'Accessibility settings', category: 'core', isCore: true },
    settings: { enabled: true, name: 'Settings', description: 'Workspace settings', category: 'core', isCore: true },
    lessonsRcas: { enabled: true, name: 'Lessons Learnt & RCA', description: 'Learnings and Root Cause Analysis', category: 'compliance' },
  },
};
