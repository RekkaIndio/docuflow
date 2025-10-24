"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Zap, 
  Search, 
  Loader2, 
  Shield, 
  Info,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Calendar,
  Folder,
  BarChart3,
  MessageSquare,
  Bell,
  Tag,
  RefreshCw,
  Clock,
  Accessibility,
  Settings,
  NotebookPen,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { applyWorkspaceOverrides, hydrateFeatureFlags } from '@/lib/feature-flags';
import type {
  OrganisationFeatureFlags,
  FeatureModuleKey,
  FeatureModule,
  FeatureModuleOverride,
  WorkspaceFeatureFlagOverrides,
} from '@/lib/types';
import { ORGANISATION_TEAM_KEYS, ORGANISATION_TEAM_LABELS, type OrganisationTeamKey } from '@/lib/team-roles';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workspaceDocPath } from '@/lib/paths';

interface FeatureManagementProps {
  organisationId?: string | null;
  workspaces?: Array<{
    id: string;
    name?: string | null;
    organisationId?: string | null;
  }>;
}

// Icon mapping for each feature
const FEATURE_ICONS: Record<FeatureModuleKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  dependencyCalculator: Users,
  audits: ClipboardList,
  actionPlans: ClipboardList,
  policies: FileText,
  journal: NotebookPen,
  managerJournal: NotebookPen,
  appraisals: Users,
  rotas: Calendar,
  files: Folder,
  teams: Users,
  stats: BarChart3,
  chatPanel: MessageSquare,
  notifications: Bell,
  tags: Tag,
  renewals: RefreshCw,
  dailyCheckins: Clock,
  accessibility: Accessibility,
  settings: Settings,
  lessonsRcas: NotebookPen,
  riskAssessment: Shield,
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-blue-100 text-blue-700 border-blue-200',
  compliance: 'bg-green-100 text-green-700 border-green-200',
  operations: 'bg-purple-100 text-purple-700 border-purple-200',
  communication: 'bg-orange-100 text-orange-700 border-orange-200',
  analytics: 'bg-pink-100 text-pink-700 border-pink-200',
};

export default function FeatureManagement({ organisationId, workspaces = [] }: FeatureManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<OrganisationFeatureFlags>(() => hydrateFeatureFlags());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    featureKey: FeatureModuleKey | null;
    featureName: string;
    action: 'enable' | 'disable';
  }>({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });

  const workspaceOptions = React.useMemo(() => {
    if (!Array.isArray(workspaces) || workspaces.length === 0) return [];
    if (!organisationId) return workspaces;
    return workspaces.filter((workspace) => (workspace.organisationId ?? organisationId) === organisationId);
  }, [workspaces, organisationId]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    workspaceOptions.length > 0 ? workspaceOptions[0].id : null,
  );
  const [workspaceOverrides, setWorkspaceOverrides] = useState<WorkspaceFeatureFlagOverrides | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);

  React.useEffect(() => {
    if (workspaceOptions.length === 0) {
      setSelectedWorkspaceId(null);
      setWorkspaceOverrides(null);
      return;
    }

    setSelectedWorkspaceId((previous) => {
      if (previous && workspaceOptions.some((ws) => ws.id === previous)) {
        return previous;
      }
      return workspaceOptions[0].id;
    });
  }, [workspaceOptions]);

  // Load feature flags on mount
  React.useEffect(() => {
    const loadFeatureFlags = async () => {
      if (!organisationId) {
        setLocalFlags(hydrateFeatureFlags());
        setError(null);
        return;
      }

      try {
        const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
        const snapshot = await getDoc(featureFlagsRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as OrganisationFeatureFlags;
          setLocalFlags(hydrateFeatureFlags(data));
          setError(null);
        } else {
          setLocalFlags(hydrateFeatureFlags());
          setError(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load feature flags';
        setLocalFlags(hydrateFeatureFlags());
        setError(message);
        toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' });
      }
    };

    loadFeatureFlags();
  }, [organisationId, toast]);

  React.useEffect(() => {
    if (!organisationId || !selectedWorkspaceId) {
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }

    const basePath = workspaceDocPath(selectedWorkspaceId, undefined, organisationId);
    if (!basePath) {
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(null);
      return;
    }

    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const workspaceRef = doc(db, basePath, 'settings', 'feature-flags');
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
          console.error('Failed to fetch workspace feature overrides:', err);
          setWorkspaceOverrides(null);
          setWorkspaceLoading(false);
          setWorkspaceError(err.message || 'Failed to load workspace feature overrides');
        },
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up workspace feature overrides listener:', err);
      setWorkspaceOverrides(null);
      setWorkspaceLoading(false);
      setWorkspaceError(err.message || 'Failed to initialize workspace feature overrides');
    }
  }, [organisationId, selectedWorkspaceId]);

  const selectedWorkspace = React.useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return workspaceOptions.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  }, [workspaceOptions, selectedWorkspaceId]);

  const workspaceEffectiveFlags = React.useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return applyWorkspaceOverrides(localFlags, workspaceOverrides);
  }, [localFlags, workspaceOverrides, selectedWorkspaceId]);

  const sanitiseModuleOverride = (override?: FeatureModuleOverride): FeatureModuleOverride | undefined => {
    if (!override) return undefined;
    const next: FeatureModuleOverride = {};
    if (override.enabled === false) {
      next.enabled = false;
    }
    if (override.teamAccess) {
      const restrictedEntries = Object.entries(override.teamAccess).filter(([, value]) => value === false);
      if (restrictedEntries.length > 0) {
        next.teamAccess = Object.fromEntries(restrictedEntries) as Partial<Record<OrganisationTeamKey, boolean>>;
      }
    }
    return Object.keys(next).length === 0 ? undefined : next;
  };

  const persistWorkspaceModules = async (
    workspaceId: string,
    modules: Partial<Record<FeatureModuleKey, FeatureModuleOverride>>,
  ) => {
    if (!organisationId || !user?.id) {
      throw new Error(!organisationId ? 'No organisation ID' : 'No user ID');
    }

    const basePath = workspaceDocPath(workspaceId, undefined, organisationId);
    if (!basePath) {
      throw new Error('Invalid workspace path');
    }

    const workspaceRef = doc(db, basePath, 'settings', 'feature-flags');

    const sanitisedModules = Object.entries(modules).reduce<Partial<Record<FeatureModuleKey, FeatureModuleOverride>>>((acc, [key, value]) => {
      const clean = sanitiseModuleOverride(value);
      if (clean) {
        acc[key as FeatureModuleKey] = clean;
      }
      return acc;
    }, {});

    await setDoc(workspaceRef, {
      modules: sanitisedModules,
      updatedAt: serverTimestamp(),
      updatedBy: user.id,
    });
  };

  const handleWorkspaceFeatureToggle = async (featureKey: FeatureModuleKey, enabled: boolean) => {
    if (!organisationId || !selectedWorkspaceId) {
      toast({
        title: 'Select a workspace',
        description: 'Choose a workspace before updating feature access.',
        variant: 'destructive',
      });
      return;
    }

    const baseModule = localFlags.modules[featureKey];
    if (!baseModule) {
      return;
    }

    if (enabled && !baseModule.enabled) {
      toast({
        title: 'Disabled organisation-wide',
        description: `"${baseModule.name}" is disabled for the entire organisation. Enable it organisation-wide first.`,
        variant: 'destructive',
      });
      return;
    }

    const currentModules = workspaceOverrides?.modules ?? {};
    const existingOverride = currentModules[featureKey];

    const nextModules: Partial<Record<FeatureModuleKey, FeatureModuleOverride>> = {
      ...currentModules,
    };

    if (!enabled) {
      nextModules[featureKey] = {
        ...(existingOverride ?? {}),
        enabled: false,
      };
    } else {
      const cleaned = sanitiseModuleOverride({
        ...(existingOverride ?? {}),
        enabled: undefined,
      });
      if (cleaned) {
        nextModules[featureKey] = cleaned;
      } else {
        delete nextModules[featureKey];
      }
    }

    const previousOverrides = workspaceOverrides
      ? {
          ...workspaceOverrides,
          modules: {
            ...(workspaceOverrides.modules ?? {}),
          },
        }
      : null;

    setWorkspaceOverrides((prev) => ({
      modules: nextModules,
      updatedAt: prev?.updatedAt,
      updatedBy: prev?.updatedBy ?? user?.id ?? null,
    }));

    setWorkspaceSaving(true);
    try {
      await persistWorkspaceModules(selectedWorkspaceId, nextModules);
      toast({
        title: enabled ? 'Workspace feature enabled' : 'Workspace feature disabled',
        description: enabled
          ? `"${baseModule.name}" follows the organisation default for ${selectedWorkspace?.name ?? 'workspace'}.`
          : `"${baseModule.name}" is now disabled for ${selectedWorkspace?.name ?? 'this workspace'}.`,
      });
    } catch (error) {
      setWorkspaceOverrides(previousOverrides ?? null);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update workspace feature';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const toggleFeature = (featureKey: FeatureModuleKey) => {
    const feature = localFlags.modules[featureKey];
    if (!feature) {
      return;
    }

    if (feature.enabled && feature.isCore) {
      toast({
        title: 'Cannot Disable Core Feature',
        description: `"${feature.name}" is a core feature required for system operation and cannot be disabled.`,
        variant: 'destructive',
      });
      return;
    }

    const action = feature.enabled ? 'disable' : 'enable';
    setConfirmModal({
      isOpen: true,
      featureKey,
      featureName: feature.name,
      action,
    });
  };

  const confirmToggle = async () => {
    if (!confirmModal.featureKey) return;

    const featureKey = confirmModal.featureKey;
    const newEnabledState = confirmModal.action === 'enable';
    const featureName = confirmModal.featureName;
    setConfirmModal({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });

    // Save immediately to Firestore
    await saveFeatureFlag(featureKey, newEnabledState, featureName);
  };

  const cancelToggle = () => {
    setConfirmModal({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });
  };

  const persistFeatureModules = async (modules: Record<FeatureModuleKey, FeatureModule>) => {
    if (!organisationId || !user?.id) {
      throw new Error(!organisationId ? 'No organisation ID' : 'No user ID');
    }

    const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
    await setDoc(
      featureFlagsRef,
      {
        modules,
        updatedAt: serverTimestamp(),
        updatedBy: user.id,
      },
      { merge: true },
    );
  };

  const saveFeatureFlag = async (featureKey: FeatureModuleKey, enabled: boolean, featureNameOverride?: string) => {
    if (!organisationId || !user?.id) {
      const errorMsg = !organisationId ? 'No organisation ID' : 'No user ID';
      toast({
        title: 'Error',
        description: `Cannot save: ${errorMsg}`,
        variant: 'destructive',
      });
      return;
    }

    const resolvedFeatureName = featureNameOverride || localFlags.modules[featureKey]?.name || 'Feature';
    const currentEnabled = localFlags.modules[featureKey]?.enabled;
    if (currentEnabled === enabled) {
      return;
    }

    let previousModulesSnapshot: Record<FeatureModuleKey, FeatureModule> = localFlags.modules;
    let nextModulesSnapshot: Record<FeatureModuleKey, FeatureModule> = localFlags.modules;

    setLocalFlags((prev) => {
      previousModulesSnapshot = prev.modules;
      const nextFeature = {
        ...prev.modules[featureKey],
        enabled,
      };
      nextModulesSnapshot = {
        ...prev.modules,
        [featureKey]: nextFeature,
      };
      return {
        ...prev,
        modules: nextModulesSnapshot,
      };
    });

    setIsSaving(true);
    try {
      await persistFeatureModules(nextModulesSnapshot);
      setError(null);
      toast({
        title: enabled ? 'Feature Enabled' : 'Feature Disabled',
        description: `"${resolvedFeatureName}" has been ${enabled ? 'enabled' : 'disabled'} for all workspaces.`,
      });
    } catch (error) {
      setLocalFlags((prev) => ({
        ...prev,
        modules: {
          ...previousModulesSnapshot,
        },
      }));

      const errorMessage = error instanceof Error ? error.message : 'Failed to save feature';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTeamAccessChange = async (
    featureKey: FeatureModuleKey,
    teamKey: OrganisationTeamKey,
    isAllowed: boolean,
  ) => {
    if (!organisationId || !user?.id) {
      const errorMsg = !organisationId ? 'No organisation ID' : 'No user ID';
      toast({
        title: 'Error',
        description: `Cannot update team access: ${errorMsg}`,
        variant: 'destructive',
      });
      return;
    }

    const feature = localFlags.modules[featureKey];
    const currentAllowed = feature?.teamAccess?.[teamKey] !== false;
    if (currentAllowed === isAllowed) {
      return;
    }

    const featureName = feature?.name || 'Feature';

    let previousModulesSnapshot: Record<FeatureModuleKey, FeatureModule> = localFlags.modules;
    let nextModulesSnapshot: Record<FeatureModuleKey, FeatureModule> = localFlags.modules;

    setLocalFlags((prev) => {
      previousModulesSnapshot = prev.modules;
      const targetFeature = prev.modules[featureKey];
      const nextAccess: Partial<Record<OrganisationTeamKey, boolean>> = {
        ...(targetFeature.teamAccess ?? {}),
      };

      if (isAllowed) {
        delete nextAccess[teamKey];
      } else {
        nextAccess[teamKey] = false;
      }

      const updatedFeature: FeatureModule = {
        ...targetFeature,
        teamAccess: nextAccess,
      };

      nextModulesSnapshot = {
        ...prev.modules,
        [featureKey]: updatedFeature,
      };

      return {
        ...prev,
        modules: nextModulesSnapshot,
      };
    });

    setIsSaving(true);
    try {
      await persistFeatureModules(nextModulesSnapshot);
      setError(null);
      toast({
        title: 'Team access updated',
        description: isAllowed
          ? `"${featureName}" is now visible to ${ORGANISATION_TEAM_LABELS[teamKey]}`
          : `${ORGANISATION_TEAM_LABELS[teamKey]} can no longer access "${featureName}"`,
      });
    } catch (error) {
      setLocalFlags((prev) => ({
        ...prev,
        modules: {
          ...previousModulesSnapshot,
        },
      }));

      const errorMessage = error instanceof Error ? error.message : 'Failed to update team access';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter features based on search
  const filteredFeatures = Object.entries(localFlags.modules).filter(([key, feature]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      feature.name.toLowerCase().includes(searchLower) ||
      feature.description?.toLowerCase().includes(searchLower) ||
      feature.category?.toLowerCase().includes(searchLower)
    );
  });

  // Group by category
  const groupedFeatures = filteredFeatures.reduce((acc, [key, feature]) => {
    const category = feature.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push([key, feature] as [FeatureModuleKey, FeatureModule]);
    return acc;
  }, {} as Record<string, [FeatureModuleKey, FeatureModule][]>);

  const enabledCount = Object.values(localFlags.modules).filter(f => f.enabled).length;
  const totalCount = Object.keys(localFlags.modules).length;

  if (!organisationId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>No Organisation ID Available</strong>
            <br />
            Cannot manage feature flags without an organisation ID. Please ensure:
            <ul className="list-disc ml-4 mt-2">
              <li>You have at least one workspace created</li>
              <li>Your workspaces have an organisationId field</li>
              <li>You are logged in as an admin user</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info - Shows current organisation ID */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Managing features for Organisation:</strong> <code className="ml-2 px-2 py-1 bg-muted rounded">{organisationId}</code>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Feature Management</h3>
            <p className="text-sm text-muted-foreground">
              Control which features are available across all workspaces
            </p>
          </div>
        </div>
        {/* Organisation info */}
        <div />
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Enabled Features</div>
              <div className="text-2xl font-bold">
                {enabledCount}/{totalCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {workspaceOptions.length > 0 && selectedWorkspaceId && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold">Workspace overrides</h4>
                <CardDescription>
                  Disable features for an individual workspace without affecting the organisation default.
                </CardDescription>
              </div>
              {(workspaceSaving || workspaceLoading) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Workspace</p>
                <Select value={selectedWorkspaceId ?? undefined} onValueChange={(value) => setSelectedWorkspaceId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceOptions.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name || 'Untitled workspace'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border p-3 text-sm text-muted-foreground bg-muted/50">
                <p>
                  Overrides apply only to <strong>{selectedWorkspace?.name || 'this workspace'}</strong>. Core
                  features must remain enabled organisation-wide.
                </p>
                {workspaceOverrides?.modules && Object.keys(workspaceOverrides.modules).length > 0 ? (
                  <p className="mt-2">
                    {Object.values(workspaceOverrides.modules).filter((module) => module?.enabled === false).length} feature
                    {Object.values(workspaceOverrides.modules).filter((module) => module?.enabled === false).length === 1 ? '' : 's'} disabled via override.
                  </p>
                ) : (
                  <p className="mt-2">No overrides applied. Workspace follows organisation defaults.</p>
                )}
              </div>
            </div>

            {workspaceError && (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>{workspaceError}</AlertDescription>
              </Alert>
            )}

            {workspaceEffectiveFlags ? (
              <div className="space-y-3">
                {Object.entries(workspaceEffectiveFlags.modules).map(([key, feature]) => {
                  const typedKey = key as FeatureModuleKey;
                  const organisationFeature = localFlags.modules[typedKey];
                  const override = workspaceOverrides?.modules?.[typedKey];
                  const isOrgDisabled = organisationFeature?.enabled === false;
                  const isWorkspaceDisabled = override?.enabled === false;

                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-3 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{feature.name}</p>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          {isOrgDisabled
                            ? 'Disabled for the entire organisation.'
                            : isWorkspaceDisabled
                              ? 'Disabled for this workspace via override.'
                              : 'Workspace inherits organisation defaults.'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {isWorkspaceDisabled && <Badge variant="secondary">Workspace override</Badge>}
                          {isOrgDisabled && <Badge variant="outline" className="border-destructive text-destructive">Disabled org-wide</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={(checked) => handleWorkspaceFeatureToggle(typedKey, checked)}
                          disabled={workspaceSaving || workspaceLoading || isOrgDisabled}
                        />
                        <span className="text-sm font-medium">{feature.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace features...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          Disabled features will be hidden from the sidebar and inaccessible to all users in all workspaces. 
          Core features (marked with a shield) cannot be disabled.
        </AlertDescription>
      </Alert>

      {/* Feature List by Category */}
      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold capitalize">{category} Features</h4>
                  <CardDescription>
                    {features.length} feature{features.length !== 1 ? 's' : ''} in this category
                  </CardDescription>
                </div>
                <Badge className={CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700'}>
                  {category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {features.map(([key, feature]) => {
                  const Icon = FEATURE_ICONS[key];
                  const restrictedTeams = ORGANISATION_TEAM_KEYS.filter(
                    (teamKey) => (feature.teamAccess?.[teamKey] ?? true) === false,
                  );
                  const summaryBadgeClass = restrictedTeams.length === 0
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : restrictedTeams.length === ORGANISATION_TEAM_KEYS.length
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200';
                  const summaryText = restrictedTeams.length === 0
                    ? 'Visible to all teams'
                    : restrictedTeams.length === ORGANISATION_TEAM_KEYS.length
                      ? 'Hidden from all teams'
                      : `Restricted: ${restrictedTeams.map((teamKey) => ORGANISATION_TEAM_LABELS[teamKey]).join(', ')}`;

                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-4 md:flex-1">
                        <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-medium">{feature.name}</h5>
                            {feature.isCore && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Core
                              </Badge>
                            )}
                          </div>
                          {feature.description && (
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          )}
                          <Badge variant="outline" className={`text-xs font-normal ${summaryBadgeClass}`}>
                            {summaryText}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              className="whitespace-nowrap"
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                              Team access
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72">
                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium">Choose which teams can access</div>
                              <div className="space-y-2">
                                {ORGANISATION_TEAM_KEYS.map((teamKey) => {
                                  const allowed = feature.teamAccess?.[teamKey] !== false;
                                  return (
                                    <label
                                      key={teamKey}
                                      className="flex items-center gap-3 text-sm text-foreground"
                                      htmlFor={`${key}-${teamKey}`}
                                    >
                                      <Checkbox
                                        id={`${key}-${teamKey}`}
                                        checked={allowed}
                                        onCheckedChange={(checked) => handleTeamAccessChange(key, teamKey, checked === true)}
                                        disabled={isSaving}
                                      />
                                      <span>{ORGANISATION_TEAM_LABELS[teamKey]}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Unchecked teams lose access immediately. Leave a team checked to keep their current access.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-center gap-2">
                          {feature.enabled ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {feature.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={() => toggleFeature(key)}
                          disabled={feature.isCore || isSaving}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmModal.isOpen} onOpenChange={(open) => !open && cancelToggle()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmModal.action === 'disable' ? 'Disable' : 'Enable'} Feature?
            </DialogTitle>
            <DialogDescription>
              {confirmModal.action === 'disable' ? (
                <>
                  Are you sure you want to disable <strong>{confirmModal.featureName}</strong>?
                  <br /><br />
                  This will immediately hide this feature from the sidebar and make it inaccessible 
                  to all users across all workspaces in your organisation.
                </>
              ) : (
                <>
                  Are you sure you want to enable <strong>{confirmModal.featureName}</strong>?
                  <br /><br />
                  This will immediately make this feature available to all users across 
                  all workspaces in your organisation.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelToggle} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              onClick={confirmToggle} 
              disabled={isSaving}
              variant={confirmModal.action === 'disable' ? 'destructive' : 'default'}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                confirmModal.action === 'disable' ? 'Disable Feature' : 'Enable Feature'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
