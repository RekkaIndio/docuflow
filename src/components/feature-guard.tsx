"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import type { FeatureModuleKey } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface FeatureGuardProps {
  feature: FeatureModuleKey;
  organisationId?: string | null;
  workspaceId?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onNavigateBack?: () => void;
}

/**
 * Component that protects content behind a feature flag
 * If the feature is disabled, shows a "Feature Disabled" message
 */
export function FeatureGuard({
  feature,
  organisationId,
  workspaceId,
  children,
  fallback,
  onNavigateBack,
}: FeatureGuardProps) {
  const { user } = useAuth();
  const { isEnabled, featureFlags, loading } = useFeatureFlags(organisationId, workspaceId);

  const featureContext = React.useMemo(
    () => ({
      teams: (user as any)?.teamKeys ?? [],
      role: (user as any)?.role ?? null,
    }),
    [user],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isEnabled(feature, featureContext)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const featureName = featureFlags.modules[feature]?.name || 'This feature';

    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <ShieldOff className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center">Feature Not Available</h2>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {featureName} has been disabled by your administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact your organisation administrator
              to enable this feature.
            </p>
            {onNavigateBack && (
              <Button onClick={onNavigateBack} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
