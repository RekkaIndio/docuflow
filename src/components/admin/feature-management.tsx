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
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags';
import type { OrganisationFeatureFlags, FeatureModuleKey, FeatureModule } from '@/lib/types';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FeatureManagementProps {
  organisationId?: string | null;
}

// Icon mapping for each feature
const FEATURE_ICONS: Record<FeatureModuleKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  dependencyCalculator: Users,
  audits: ClipboardList,
  actionPlans: ClipboardList,
  policies: FileText,
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
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-blue-100 text-blue-700 border-blue-200',
  compliance: 'bg-green-100 text-green-700 border-green-200',
  operations: 'bg-purple-100 text-purple-700 border-purple-200',
  communication: 'bg-orange-100 text-orange-700 border-orange-200',
  analytics: 'bg-pink-100 text-pink-700 border-pink-200',
};

export default function FeatureManagement({ organisationId }: FeatureManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<OrganisationFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    featureKey: FeatureModuleKey | null;
    featureName: string;
    action: 'enable' | 'disable';
  }>({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });

  // Load feature flags on mount
  React.useEffect(() => {
    const loadFeatureFlags = async () => {
      if (!organisationId) {
        // No organisation id - cannot load feature flags
        return;
      }

      try {
        const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
        const snapshot = await import('firebase/firestore').then(m => m.getDoc(featureFlagsRef));
        
        if (snapshot.exists()) {
          const data = snapshot.data() as OrganisationFeatureFlags;
           setLocalFlags({
             ...DEFAULT_FEATURE_FLAGS,
             ...data,
             modules: {
               ...DEFAULT_FEATURE_FLAGS.modules,
               ...data.modules,
             }
           });
         } else {
          // Use defaults when document does not exist
         }
      } catch (error) {
        // Loading failed; show toast to alert admin
        toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' });
      }
    };

    loadFeatureFlags();
  }, [organisationId]);

  const toggleFeature = (featureKey: FeatureModuleKey) => {
    const feature = localFlags.modules[featureKey];
    
    // Prevent disabling core features
    if (feature.enabled && feature.isCore) {
      toast({
        title: 'Cannot Disable Core Feature',
        description: `"${feature.name}" is a core feature required for system operation and cannot be disabled.`,
        variant: 'destructive',
      });
      return;
    }

    // Show confirmation modal
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

    // toggling feature; UI will update optimistically
    setLocalFlags(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [featureKey]: {
          ...prev.modules[featureKey],
          enabled: newEnabledState
        }
      }
    }));

    // Close modal
    setConfirmModal({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });

    // Save immediately to Firestore
    await saveFeatureFlag(featureKey, newEnabledState);
  };

  const cancelToggle = () => {
    setConfirmModal({ isOpen: false, featureKey: null, featureName: '', action: 'disable' });
  };

  const saveFeatureFlag = async (featureKey: FeatureModuleKey, enabled: boolean) => {
    if (!organisationId || !user?.id) {
      const errorMsg = !organisationId ? 'No organisation ID' : 'No user ID';
      toast({
        title: 'Error',
        description: `Cannot save: ${errorMsg}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const featureFlagsRef = doc(db, 'organisations', organisationId, 'settings', 'feature-flags');
      
      // Get current document first
      const currentDoc = await getDoc(featureFlagsRef);
      
      if (!currentDoc.exists()) {
        // Document doesn't exist, create it with all defaults
        const newData = {
          ...DEFAULT_FEATURE_FLAGS,
          modules: {
            ...DEFAULT_FEATURE_FLAGS.modules,
            [featureKey]: {
              ...DEFAULT_FEATURE_FLAGS.modules[featureKey],
              enabled: enabled
            }
          },
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        };
        await setDoc(featureFlagsRef, newData);
      } else {
        // Document exists - prepare updated modules and write
        const currentData = currentDoc.data() as OrganisationFeatureFlags;
        const updatedModules = {
          ...currentData.modules,
          [featureKey]: {
            ...currentData.modules[featureKey],
            enabled: enabled
          }
        };
        await updateDoc(featureFlagsRef, {
          modules: updatedModules,
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        });
      }

      // Save succeeded
      
      const featureName = localFlags.modules[featureKey].name;
      toast({
        title: enabled ? 'Feature Enabled' : 'Feature Disabled',
        description: `"${featureName}" has been ${enabled ? 'enabled' : 'disabled'} for all workspaces.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save feature';
      
      // Revert local state on error
      setLocalFlags(prev => ({
        ...prev,
        modules: {
          ...prev.modules,
          [featureKey]: {
            ...prev.modules[featureKey],
            enabled: !enabled
          }
        }
      }));
      
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
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
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
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
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
                          disabled={feature.isCore}
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
