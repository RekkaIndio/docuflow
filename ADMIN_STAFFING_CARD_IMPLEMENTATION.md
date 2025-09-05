# Admin Dashboard Staffing Card Implementation

## Overview
Added a staffing card to the admin workspace view that displays current staffing levels from daily check-ins for the specific workspace being viewed.

## Changes Made

### 1. Updated Imports in `src/components/admin/admin-workspace-view.tsx`
- Added React hooks: `useEffect`, `useState`
- Added Firestore imports: `collection`, `query as fsQuery`, `orderBy`, `limit`, `onSnapshot`
- Added Firebase database import: `db`

### 2. Added Staffing Data State Management
- **State variables**:
  - `staffingData`: Stores day shift, night shift, total staff, and last updated date
  - `staffingLoading`: Loading state indicator

### 3. Implemented Real-time Staffing Data Fetching
- **useEffect hook**: Listens to daily check-ins collection for the current workspace
- **Query logic**: Gets the latest daily check-in using `orderBy('createdAt', 'desc')` and `limit(1)`
- **Data extraction**: Pulls staffing from both `staffingDay`/`staffingNight` fields and nested `staffing.day`/`staffing.night`
- **Calculations**: Automatically calculates total staff (day + night)
- **Real-time updates**: Uses Firestore `onSnapshot` for live updates

### 4. Updated Admin Dashboard Layout
- **Grid system**: Changed from 4-column to responsive 5-column grid (`lg:grid-cols-3 xl:grid-cols-5`)
- **Card placement**: Added staffing card as the 4th card (between File Types and Occupancy)
- **Responsive design**: Maintains existing styling patterns with proper breakpoints

### 5. Staffing Card Features
- **Header**: "Current Staffing" with Users icon
- **Main display**: Shows total staff count prominently
- **Details**: Breakdown of day shift and night shift numbers
- **Last updated**: Shows when data was last recorded
- **Loading state**: Displays "Loading..." while fetching data
- **Empty state**: Shows "N/A" when no staffing data is available

## Card Display Logic
```
Total Staff: [day + night]
Subtitle: "[day] day, [night] night"
Footer: "Updated: [date]"
```

## Data Source
- Fetches from `workspaces/{workspaceId}/daily-checkins` collection
- Uses the most recent entry based on `createdAt` timestamp
- Compatible with existing daily check-in system from the Daily page
- Real-time updates when new check-ins are saved

## Usage
The staffing card automatically appears in the admin workspace view's stats tab and will show:
1. **Current staffing levels** if daily check-ins have been recorded for this workspace
2. **Loading state** while fetching data
3. **Empty state** if no check-ins exist yet
4. **Real-time updates** when new staffing data is recorded

## Benefits for Admins
- **Instant visibility**: See current staffing at a glance for any workspace
- **Detailed breakdown**: Understand day vs night shift distribution  
- **Real-time monitoring**: Get live updates as staff levels change
- **Historical tracking**: See when staffing data was last updated
- **Integrated view**: Part of comprehensive workspace overview alongside occupancy, documents, etc.

This implementation allows administrators to quickly assess staffing levels across different workspaces while maintaining consistency with the existing daily check-in workflow.