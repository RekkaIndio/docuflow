# Feature Management System

## Overview

The Feature Management system allows administrators to control which features are available to all users across all workspaces within their organisation. This provides fine-grained control over the product surface area and helps organizations customize the platform to their specific needs.

## Architecture

### Data Model

Feature flags are stored at the **organisation level** in Firestore:
```
organisations/{organisationId}/settings/feature-flags
```

Structure:
```typescript
{
  modules: {
    dashboard: { enabled: true, name: "Dashboard", category: "core", isCore: true },
    audits: { enabled: true, name: "Audits", category: "compliance" },
    // ... other features
  },
  updatedAt: Timestamp,
  updatedBy: "userId"
}
```

### Available Features

| Feature | Key | Category | Can Disable? | Description |
|---------|-----|----------|--------------|-------------|
| Dashboard | `dashboard` | core | No | Overview and daily check-ins |
| Files & Folders | `files` | core | No | Document browser and file management |
| Settings | `settings` | core | No | Workspace settings |
| Accessibility | `accessibility` | core | No | Accessibility settings |
| Dependency Calculator | `dependencyCalculator` | operations | Yes | Staff dependency tracking |
| Audits | `audits` | compliance | Yes | Compliance auditing system |
| Action Plans | `actionPlans` | compliance | Yes | Task tracking from audit findings |
| Policies | `policies` | compliance | Yes | Policy document management |
| Supervisions | `appraisals` | operations | Yes | Staff supervision tracking |
| Rotas | `rotas` | operations | Yes | Staff scheduling and rota management |
| Teams | `teams` | operations | Yes | Team member management |
| Statistics | `stats` | analytics | Yes | Analytics and compliance statistics |
| AI Chat | `chatPanel` | communication | Yes | AI-powered compliance assistant |
| Notifications | `notifications` | communication | Yes | Notification system |
| Tags | `tags` | core | Yes | Document tagging system |
| Renewals | `renewals` | compliance | Yes | Document renewal tracking |
| Daily Check-ins | `dailyCheckins` | operations | Yes | Daily status reports |

**Core Features** (marked with shield icon) cannot be disabled as they are essential for basic platform functionality.

## Usage

### For Administrators

#### Accessing Feature Management

1. Navigate to the Admin area
2. Click on **Settings** in the admin navigation
3. Select the **Feature Management** tab

#### Managing Features

1. **Search** for specific features using the search box
2. **Toggle** features on/off using the switches
   - Core features (with shield icon) cannot be toggled off
   - Disabled features will immediately hide from all workspace users
3. **Save Changes** to apply your configuration

#### Reset to Defaults

Click "Reset to Defaults" to enable all features.

### For Developers

#### Using the Hook

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

function MyComponent() {
  const organisationId = workspace?.organisationId;
  const { isEnabled, featureFlags, loading, error } = useFeatureFlags(organisationId);

  if (loading) return <div>Loading...</div>;
  
  if (isEnabled('audits')) {
    return <AuditsView />;
  }
  
  return <div>Audits feature is disabled</div>;
}
```

#### Using the FeatureGuard Component

```typescript
import { FeatureGuard } from '@/components/feature-guard';

function MyPage() {
  return (
    <FeatureGuard 
      feature="audits" 
      organisationId={orgId}
      onNavigateBack={() => router.push('/dashboard')}
    >
      <AuditsView />
    </FeatureGuard>
  );
}
```

#### Adding a New Feature

1. **Add to types** (`src/lib/types.ts`):
```typescript
export type FeatureModuleKey = 
  | 'dashboard'
  | 'myNewFeature' // Add here
  // ...
```

2. **Add to defaults** (`src/hooks/use-feature-flags.ts`):
```typescript
export const DEFAULT_FEATURE_FLAGS = {
  modules: {
    // ...
    myNewFeature: { 
      enabled: true, 
      name: 'My New Feature', 
      description: 'Description here',
      category: 'operations' 
    },
  }
}
```

3. **Add to icon mapping** (`src/components/admin/feature-management.tsx`):
```typescript
const FEATURE_ICONS: Record<FeatureModuleKey, React.ElementType> = {
  // ...
  myNewFeature: MyIcon,
}
```

4. **Protect the feature** in sidebar and views using `isEnabled()` or `<FeatureGuard>`

## Migration

### For Existing Organisations

Run the migration script to initialize feature flags for existing organisations:

```bash
node scripts/migrate-feature-flags.js
```

This will:
- Find all organisations without feature flags
- Initialize them with all features enabled (default state)
- Skip organisations that already have feature flags configured

## Implementation Details

### Enforcement Layers

1. **UI Layer (Sidebar)**
   - Menu items are conditionally rendered based on feature flags
   - Disabled features don't appear in navigation

2. **Route Protection (Dashboard)**
   - `FeatureGuard` component wraps protected views
   - Shows friendly "Feature Disabled" message when accessed directly

3. **Real-time Updates**
   - Feature flag changes are subscribed to via Firestore
   - Changes take effect immediately for all users
   - No page refresh required

### Firestore Security Rules

Add these rules to `firestore.rules`:

```
match /organisations/{orgId}/settings/feature-flags {
  // Admins can read and write
  allow read: if isOrgAdmin(orgId);
  allow write: if isOrgAdmin(orgId);
  
  // Regular users can only read
  allow read: if isOrgMember(orgId);
}
```

## Best Practices

1. **Test Before Deploying**: Test feature flag changes in a development environment first
2. **Communicate Changes**: Inform users before disabling features they may be actively using
3. **Monitor Usage**: Track which features are being used before considering disabling them
4. **Gradual Rollout**: For new features, start disabled and enable for select organizations first
5. **Document Decisions**: Keep track of why certain features are disabled for specific organizations

## Troubleshooting

### Feature still appears after disabling
- Check browser cache - try a hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Verify the organisationId is correctly set on the workspace
- Check browser console for errors

### Changes not saving
- Verify you have admin permissions
- Check Firestore security rules
- Review browser console for error messages

### Migration script fails
- Ensure Firebase admin credentials are properly configured
- Check that the service account JSON file exists
- Verify Firestore permissions for the service account

## Future Enhancements

Potential improvements to the feature flag system:

- **Workspace-level overrides**: Allow per-workspace feature control
- **Scheduled toggles**: Schedule features to enable/disable at specific times
- **A/B testing**: Randomly enable features for percentage of users
- **Usage analytics**: Track feature usage to inform decisions
- **Feature dependencies**: Automatically handle dependent features
- **Tiered access**: Tie features to pricing/subscription tiers
- **User role-based access**: Different features for different user roles

## Support

For questions or issues with the Feature Management system:
- Check the browser console for error messages
- Review Firestore security rules
- Contact the development team

---

**Last Updated**: October 2025  
**Version**: 1.0.0
