"use client";

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  OrganisationFeatureFlags,
  FeatureModuleKey,
  WorkspaceFeatureFlagOverrides,
} from '@/lib/types';
import { applyWorkspaceOverrides, hydrateFeatureFlags } from '@/lib/feature-flags';
import { dedupeTeamKeys, defaultTeamsForRole, normaliseTeamKey } from '@/lib/team-roles';
import type { OrganisationTeamKey } from '@/lib/team-roles';
import { workspaceDocPath } from '@/lib/paths';

type FeatureAccessContext = {
  teams?: Array<OrganisationTeamKey | string | null | undefined> | null;
  role?: string | null;
};

interface UseFeatureFlagsResult {
  featureFlags: OrganisationFeatureFlags;
  organisationFlags: OrganisationFeatureFlags;
  workspaceOverrides: WorkspaceFeatureFlagOverrides | null;
  isEnabled: (feature: FeatureModuleKey, context?: FeatureAccessContext) => boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and subscribe to feature flags for an organisation
 * @param organisationId - The organisation ID to fetch feature flags for
 * @param workspaceId - Optional workspace ID for workspace-level overrides
 * @returns Feature flags object, isEnabled helper, loading state, and error
 */
export function useFeatureFlags(
  organisationId?: string | null,
  workspaceId?: string | null,
): UseFeatureFlagsResult {
  const [organisationFlags, setOrganisationFlags] = useState<OrganisationFeatureFlags>(() => hydrateFeatureFlags());
  const [organisationLoading, setOrganisationLoading] = useState(true);
  const [organisationError, setOrganisationError] = useState<string | null>(null);

  const [workspaceOverrides, setWorkspaceOverrides] = useState<WorkspaceFeatureFlagOverrides | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!organisationId) {
      // No organisation ID - use defaults (all enabled)
      setOrganisationFlags(hydrateFeatureFlags());
      setOrganisationLoading(false);
      setOrganisationError(null);
      return;
    }

    setOrganisationLoading(true);
    setOrganisationError(null);

    try {
      // Listen to feature flags document in real-time
      const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
      
      const unsubscribe = onSnapshot(
        featureFlagsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as OrganisationFeatureFlags;
            setOrganisationFlags(hydrateFeatureFlags(data));
          } else {
            // Document doesn't exist yet - use defaults
            setOrganisationFlags(hydrateFeatureFlags());
          }
          setOrganisationLoading(false);
          setOrganisationError(null);
        },
        (err) => {
          console.error('Failed to fetch feature flags:', err);
          setOrganisationError(err.message || 'Failed to load feature flags');
          // Fallback to defaults on error
          setOrganisationFlags(hydrateFeatureFlags());
          setOrganisationLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up feature flags listener:', err);
      setOrganisationError(err.message || 'Failed to initialize feature flags');
      setOrganisationFlags(hydrateFeatureFlags());
      setOrganisationLoading(false);
    }
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || !workspaceId) {
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }

    const workspacePath = workspaceDocPath(workspaceId, 'settings/feature-flags', organisationId);
    if (!workspacePath) {
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }

    const segments = workspacePath.split('/');
    if (segments.length === 0) {
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const [firstSegment, ...restSegments] = segments;
      const workspaceRef = doc(db, firstSegment, ...restSegments);
      const unsubscribe = onSnapshot(
        workspaceRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setWorkspaceOverrides(snapshot.data() as WorkspaceFeatureFlagOverrides);
          } else {
            setWorkspaceOverrides(null);
          }
          setWorkspaceLoading(false);
          setWorkspaceError(null);
        },
        (err) => {
          console.error('Failed to fetch workspace feature flags:', err);
          setWorkspaceOverrides(null);
          setWorkspaceLoading(false);
          setWorkspaceError(err.message || 'Failed to load workspace feature flags');
        },
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up workspace feature flags listener:', err);
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(err.message || 'Failed to initialize workspace feature flags');
    }
  }, [organisationId, workspaceId]);

  const resolveTeams = (context?: FeatureAccessContext): OrganisationTeamKey[] => {
    if (!context) return [];
    const explicitTeams = dedupeTeamKeys(context.teams ?? []);
    if (explicitTeams.length > 0) {
      return explicitTeams;
    }
    return defaultTeamsForRole(context.role);
  };

  const effectiveFeatureFlags = useMemo(
    () => applyWorkspaceOverrides(organisationFlags, workspaceOverrides),
    [organisationFlags, workspaceOverrides],
  );

  const isEnabled = (feature: FeatureModuleKey, context?: FeatureAccessContext): boolean => {
    const module = effectiveFeatureFlags.modules[feature];
    if (!module) return true;
    if (!module.enabled) return false;

    const teamAccess = module.teamAccess;
    if (!teamAccess) return true;

    const teams = resolveTeams(context);
    if (teams.length === 0) {
      // If the user has no team context, fall back to checking if any team retains access
      return Object.values(teamAccess).some((allowed) => allowed !== false);
    }

    return teams.some((team) => {
      const normalisedTeam = normaliseTeamKey(team);
      if (!normalisedTeam) return true;
      const value = teamAccess[normalisedTeam];
      return value !== false;
    });
  };

  return {
    featureFlags: effectiveFeatureFlags,
    organisationFlags,
    workspaceOverrides,
    isEnabled,
    loading: organisationLoading || workspaceLoading,
    error: organisationError ?? workspaceError,
  };
}
