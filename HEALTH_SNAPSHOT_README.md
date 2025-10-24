# Health Snapshot Card - Compliance Readiness Scoring

## Overview

The Health Snapshot Card provides a comprehensive overall compliance readiness score for care home workspaces. This single metric combines multiple operational areas to give leadership a quick, meaningful view of their compliance health.

## Scoring System

The overall health score is calculated using a weighted average of five key components:

- **Audits (30%)**: Quality and completion of compliance audits
- **Action Plans (20%)**: Follow-up actions from audit findings
- **Supervisions (20%)**: Staff supervision and appraisal completion
- **Rotas (15%)**: Staffing adequacy and rota coverage
- **Dependency (15%)**: Resident care needs assessment

**Formula**: `Overall Score = (Audits × 0.30) + (Action Plans × 0.20) + (Supervisions × 0.20) + (Rotas × 0.15) + (Dependency × 0.15)`

## Component Calculations

### Audits (30% weight)
**Purpose**: Measures audit quality and completion rates.

**Calculation**:
- Takes the average score of all individual audits
- Uncompleted audits count as 0%
- Only completed audits with valid scores are included

**Data Source**: `workspace/{workspaceId}/settings/audit_latest_scores`

**Example**:
- Care Plan Audit: 85%
- Health & Safety Audit: 92%
- Maintenance Audit: 78%
- **Average**: 85% → **Weighted Score**: 85% × 0.30 = 25.5 points

### Action Plans (20% weight)
**Purpose**: Tracks follow-up actions from audit findings.

**Calculation**:
- Based on completion rate of action plans
- Currently uses a heuristic: if audits are completed, assumes action plans exist
- Future enhancement: track actual action plan completion

**Data Source**: Audit documents with `createActionPlan: true`

**Scoring Logic**:
- If audits completed: proportional to audit completion rate
- If no audits: 0%

### Supervisions (20% weight)
**Purpose**: Measures staff supervision and appraisal completion.

**Calculation**:
- Tracks completion of required supervisions across all staff roles
- Compares completed vs. expected supervisions

**Required Supervisions by Role**:
- Deputy/ies: Supervision, Clinical Lead Supervision
- Clinical Lead & Nurses: Carers, Clinical Lead, Nurses Supervisions
- Senior/Care Team Managers: Deputy, Senior Carer Supervisions
- Admin Staff: Reception, Admin Supervisions
- Maintenance Staff: Maintenance Person Supervision
- Activities Staff: Activities Supervision
- Kitchen Staff: Chef, Kitchen Assistant Supervisions
- Domestic Staff: Domestic, Housekeeping Supervisions

**Data Source**: `workspace/{workspaceId}/appraisal-tracker`

**Scoring**: `(Completed Supervisions ÷ Expected Supervisions) × 100%`

### Rotas (15% weight) - Advanced Multi-Factor Assessment
**Purpose**: Comprehensive evaluation of staffing adequacy across three dimensions.

**Three-Factor Assessment**:

#### 1. Dependency-Required Staff (40% of rotas score)
- Calculates staff needed based on resident care requirements
- Uses NDPS (National Dependency Scoring Project) ratios
- Same calculation as Resident Care Card

**NDPS Staffing Ratios**:
- **Band 1** (Independent): 1:8 day, 1:15 night
- **Band 2** (Low Dependency): 1:5 day, 1:10 night
- **Band 3** (Medium Dependency): 1:3 day, 1:6 night
- **Band 4** (High Dependency): 1:2 day, 1:4 night
- **Band 5** (Very High Dependency): 1:1.5 day, 1:2.5 night

#### 2. Rota-Required Staff (40% of rotas score)
- Evaluates if rota is adequately scheduled
- Compares scheduled shifts vs. minimum requirements
- Minimum: 40% of total staff per day (minimum 3 shifts)

#### 3. Staff Assignment (20% of rotas score)
- Checks if scheduled shifts are filled with assigned staff
- Currently assumes shifts are assigned if they exist
- Future: Check actual `staffId` assignments

**Comprehensive Scoring**:
```
Coverage Ratio = (Dependency Coverage × 0.4) + (Rota Scheduling × 0.4) + (Staff Assignment × 0.2)

Final Score:
100% = Excellent coverage
90-99% = Very good coverage
80-89% = Good coverage
70-79% = Adequate coverage
60-69% = Moderate coverage
50-59% = Poor coverage
40-49% = Very poor coverage
30-39% = Critical shortage
20-29% = Severe shortage
10-19% = Minimal coverage
```

### Dependency (15% weight)
**Purpose**: Assesses resident care complexity and staffing implications.

**Calculation**:
- Based on distribution of resident dependency levels
- Higher dependency bands indicate more complex care needs
- Score reflects ability to manage dependency levels

**Dependency Bands**:
- **Band 1**: Independent (Score: 90%)
- **Band 2**: Low Dependency (Score: 75%)
- **Band 3**: Medium Dependency (Score: 60%)
- **Band 4**: High Dependency (Score: 45%)
- **Band 5**: Very High Dependency (Score: 45%)

**Scoring Logic**:
- Higher proportion of high-dependency residents = Lower score
- Lower proportion of high-dependency residents = Higher score

**Data Source**: `workspace/{workspaceId}/dependency_calculator`

## Data Sources

### Primary Collections
- **Audit Scores**: `organisations/{orgId}/workspaces/{workspaceId}/settings/audit_latest_scores`
- **Supervisions**: `organisations/{orgId}/workspaces/{workspaceId}/appraisal-tracker`
- **Dependency**: `organisations/{orgId}/workspaces/{workspaceId}/dependency_calculator`
- **Rotas**: `organisations/{orgId}/workspaces/{workspaceId}/rotas/{weekKey}`
- **Staff Data**: `organisations/{orgId}/workspaces/{workspaceId}` (departments array)
- **Daily Check-ins**: `organisations/{orgId}/workspaces/{workspaceId}/daily-checkins`

### Real-time Updates
All components use Firestore real-time listeners for live updates when data changes.

## Fallback Logic

If primary data sources are unavailable, the system falls back to:

1. **Daily Check-in Data**: For basic staffing information
2. **Historical Audit Data**: For audit completion status
3. **Default Values**: For missing components (typically 0%)

## Implementation Details

### Files
- **Main Component**: `src/components/dashboard/dashboard-home.tsx`
- **Calculation Logic**: `calculateComponentScores()` function
- **Health Score**: `useMemo` hook combining all components
- **UI Display**: `AuditDonut` component with overall score

### Key Functions
- `calculateNDPSScore()`: Calculates resident dependency scores
- `getNDPSBand()`: Maps scores to dependency bands
- `calculateShiftHours()`: Calculates shift duration
- `calculateComponentScores()`: Main scoring logic
- `calculateOverallHealthScore()`: Applies weights and returns final score

### Dependencies
- **Firebase Firestore**: Real-time data access
- **date-fns**: Date calculations for rota weeks
- **React**: State management and real-time updates

## Future Enhancements

1. **Action Plan Tracking**: Implement actual action plan completion tracking
2. **Staff Assignment Verification**: Check actual `staffId` assignments in rota shifts
3. **Dynamic Weighting**: Allow customization of component weights per workspace
4. **Historical Trending**: Track health score changes over time
5. **Alert Thresholds**: Configurable thresholds for health score alerts

## Scoring Interpretation

- **90-100%**: Excellent compliance readiness
- **80-89%**: Good compliance health
- **70-79%**: Adequate compliance
- **60-69%**: Needs attention
- **50-59%**: Requires improvement
- **Below 50%**: Critical compliance issues

The health snapshot provides leadership with actionable insights into operational compliance across all key areas, enabling proactive management of care quality and regulatory readiness.</content>
<parameter name="filePath">/Users/jay/Downloads/docuflow-master/HEALTH_SNAPSHOT_README.md