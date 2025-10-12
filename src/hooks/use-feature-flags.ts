"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrganisationFeatureFlags, FeatureModuleKey } from '@/lib/types';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags';

interface UseFeatureFlagsResult {
  featureFlags: OrganisationFeatureFlags;
  isEnabled: (feature: FeatureModuleKey) => boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and subscribe to feature flags for an organisation
 * @param organisationId - The organisation ID to fetch feature flags for
 * @returns Feature flags object, isEnabled helper, loading state, and error
 */
export function useFeatureFlags(organisationId?: string | null): UseFeatureFlagsResult {
  const [featureFlags, setFeatureFlags] = useState<OrganisationFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organisationId) {
      // No organisation ID - use defaults (all enabled)
      setFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Listen to feature flags document in real-time
      const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
      
      const unsubscribe = onSnapshot(
        featureFlagsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as OrganisationFeatureFlags;
            // Merge with defaults to ensure all features have a value
            const mergedFlags: OrganisationFeatureFlags = {
              ...DEFAULT_FEATURE_FLAGS,
              ...data,
              modules: {
                ...DEFAULT_FEATURE_FLAGS.modules,
                ...data.modules,
              }
            };
            setFeatureFlags(mergedFlags);
          } else {
            // Document doesn't exist yet - use defaults
            setFeatureFlags(DEFAULT_FEATURE_FLAGS);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Failed to fetch feature flags:', err);
          setError(err.message || 'Failed to load feature flags');
          // Fallback to defaults on error
          setFeatureFlags(DEFAULT_FEATURE_FLAGS);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up feature flags listener:', err);
      setError(err.message || 'Failed to initialize feature flags');
      setFeatureFlags(DEFAULT_FEATURE_FLAGS);
      setLoading(false);
    }
  }, [organisationId]);

  const isEnabled = (feature: FeatureModuleKey): boolean => {
    return featureFlags.modules[feature]?.enabled ?? true; // Default to enabled if not found
  };

  return {
    featureFlags,
    isEnabled,
    loading,
    error,
  };
}
