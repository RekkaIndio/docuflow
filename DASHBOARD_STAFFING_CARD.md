# Dashboard Staffing Overview Card Implementation

## Overview
Replaced the duplicate "Audits" card in the Executive Summary section with a new "Staffing Overview" card that displays useful rota/staffing metrics.

## Problem
The dashboard had redundant information:
- **Health Snapshot** (top right) showed overall compliance (1/20 audits)
- **Executive Summary > Audits** (lower section) showed the same audit information

This was not providing diverse, actionable information to users.

## Solution
Created a new **Staffing Overview Card** that displays:
- Total staff count
- Shifts scheduled this week
- Total hours scheduled
- Coverage percentage
- Alerts for understaffed days

## Changes Made

### 1. New Component: `staffing-overview-card.tsx`
**Location:** `/src/components/dashboard/staffing-overview-card.tsx`

**Features:**
- Fetches staff data from workspace (all departments: managers, nurses, CTMs, domestics, maintenance, kitchens, activities)
- Loads current week's rota data
- Calculates key metrics:
  - Total staff members
  - Shifts scheduled this week
  - Total hours scheduled
  - Coverage percentage (based on expected staffing levels)
  - Number of understaffed days
- Beautiful gradient card styling matching the existing design system
- Click-to-navigate to rotas page
- "View rotas" button for quick access
- Alert indicators for understaffed days
- Success message when fully staffed

### 2. Updated: `dashboard-home.tsx`
**Changes:**
- Added import for `StaffingOverviewCard`
- Replaced the duplicate Audits card in the Executive Summary section
- Added `onNavigateToRotas` handler to trigger navigation

### 3. Updated: `dashboard.tsx`
**Changes:**
- Added event listener for `navigate-to-rotas` custom event
- Routes to the rotas view when triggered
- Added cleanup in useEffect return

## User Benefits

1. **No More Duplication**: Audit information is shown once in the Health Snapshot
2. **Actionable Staffing Data**: Users can see at a glance:
   - If they have enough staff scheduled
   - Which days need attention
   - Overall staffing utilization
3. **Quick Navigation**: One click to view full rotas
4. **Visual Alerts**: Color-coded indicators for staffing issues
5. **Comprehensive Metrics**: 4 key stats in an easy-to-scan grid layout

## Design Consistency
- Uses the same card styling as other Executive Summary cards
- Gradient colors (blue → cyan → teal) for visual distinction
- Follows existing design patterns (rounded corners, shadows, hover effects)
- Responsive grid layout
- Icon-based quick stats

## Data Sources
- **Staff Data**: Pulled from workspace document (all department arrays)
- **Rota Data**: Fetched from `rotas/{weekKey}` collection under workspace
- **Calculations**: Uses the same shift hour calculation logic as the rotas view

## Future Enhancements
- Could add trend indicators (compared to last week)
- Could show department-specific breakdown
- Could integrate with daily check-in staffing data
- Could show upcoming staffing gaps (next week preview)

## Testing Recommendations
1. Test with workspace that has no staff (should show empty state)
2. Test with workspace that has staff but no rotas (should show 0 shifts)
3. Test with active rotas (should show metrics)
4. Test navigation to rotas page via card click and button
5. Test responsive layout on mobile/tablet/desktop

---

**Implementation Date:** 3 October 2025
**Status:** ✅ Complete
