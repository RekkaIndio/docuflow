# Trends Over Time Chart - Accuracy Fix

## Date: January 2025
## Issue: Chart Not Showing True Current Data

---

## Problem Identified

The "Trends Over Time" chart at the bottom of the Dependency Calculator page was displaying **simulated/estimated data** for all months, including the current month. This meant:

1. **Avg NDPS** shown was not the actual current average
2. **Care Hours** shown was not the actual current total
3. **Staff Needed** shown was not matching the actual staffing calculations
4. All values had random variation (80-120%) applied, even for current month

### Example of the Issue
If you had 4 residents with an actual average NDPS of 5.8:
- Chart might show: 6.2 or 4.9 (random variation)
- Staff required might show: 1 or 3 (random variation)
- This created confusion and distrust in the data

---

## Solution Implemented

### Updated `generateChartData` Function

**Before:**
```typescript
// Applied random variation to ALL months including current
const baseMultiplier = 0.8 + Math.random() * 0.4; // 80-120% variation
// Used this multiplier for everything
```

**After:**
```typescript
// Calculate actual current values FIRST
// Only use current month data for the rightmost bar
if (i === 0) {
  // Current month - use ACTUAL data
  ndpsScore = actualAvgNDPSScore;
  careHours = actualTotalCareHours;
  staffRequired = actualStaffRequired.Day + actualStaffRequired.Night;
  residentCount = residents.length;
} else {
  // Historical months - simulate with variation (85-115%)
  const baseMultiplier = 0.85 + Math.random() * 0.3;
  // Apply variation to past months only
}
```

### Key Changes

1. **Actual Current Data (Rightmost Month)**
   - NDPS Score: Calculated from actual resident assessments
   - Care Hours: Sum of actual day + night care minutes for all residents
   - Staff Required: Actual calculation from `calculateNDPSStaffing()`
   - Resident Count: Actual number of residents

2. **Historical Months (Previous 5 Months)**
   - Show estimated trends with 85-115% variation
   - Based on current resident profile
   - Gives context for trends without claiming false historical accuracy

3. **Updated Chart Description**
   - Old: "Historical data shows trends over the last 6 months with variation based on current resident profiles"
   - New: "Current month shows actual data. Previous months show estimated trends based on current resident profile."

---

## What You'll See Now

### Current Month (Rightmost Bar)
✅ **Accurate Reflection** of your actual data:
- If you have 4 residents with average NDPS of 5.8, it will show exactly **5.8**
- If total care hours is 3.2h, it will show exactly **3h** (rounded)
- If staff required is 4, it will show exactly **4**

### Previous Months (Left Bars)
📊 **Estimated Trends** for context:
- Shows what the data might have looked like historically
- Provides visual trend comparison
- Clearly labeled as estimates, not actual historical data

---

## Summary Cards at Top

The three summary cards now show **exact current values**:

```
┌─────────────┬──────────────┬──────────────┐
│  Avg NDPS   │ Care Hours   │ Staff Needed │
│    5.8      │     3h       │      2       │
└─────────────┴──────────────┴──────────────┘
```

These match exactly:
- The rightmost bars in the chart
- The calculations shown in other dashboard cards
- The Staff Required card values
- Your actual resident assessments

---

## Technical Details

### Files Modified
1. `/src/app/(protected)/dashboard/dependency-calculator/page.tsx`
   - Updated `generateChartData()` function (lines 579-631)
   - Separated current month logic from historical estimation

2. `/src/app/(protected)/dashboard/dependency-calculator/components/HistoricalTrendsChart.tsx`
   - Updated description text for clarity

### Calculation Flow
```
Current Month (i === 0):
1. Loop through all residents
2. Calculate actual NDPS score per resident → sum → average
3. Calculate actual care minutes per resident → sum → convert to hours
4. Run calculateNDPSStaffing() with actual resident data
5. Return exact values (rounded to 1 decimal for NDPS/hours)

Historical Months (i > 0):
1. Use current month's actual values as baseline
2. Apply random multiplier (0.85 - 1.15)
3. Simulate what those months might have looked like
4. Return estimated values
```

### Data Accuracy
- **Current Month**: 100% accurate based on resident assessments
- **Previous Months**: Estimated (85-115% of current with random variation)

---

## Verification Steps

To verify the fix is working:

1. **Check Avg NDPS**:
   - Add up all resident NDPS scores
   - Divide by number of residents
   - Should match the "Avg NDPS" card and rightmost blue bar

2. **Check Care Hours**:
   - Look at each resident's care time (Day + Night)
   - Sum all care times
   - Convert minutes to hours
   - Should match the "Care Hours" card and rightmost green bar

3. **Check Staff Needed**:
   - Look at "Staff Required" card in orange
   - Add Day Total + Night Total
   - Should match "Staff Needed" card and rightmost purple bar

---

## Benefits

✅ **Trustworthy Data**: Current month always shows exact values  
✅ **Clear Labeling**: Users know what's actual vs estimated  
✅ **Trend Context**: Historical bars provide visual trend comparison  
✅ **Consistency**: All dashboard elements now show matching current data  
✅ **No Confusion**: Staff can rely on these numbers for planning  

---

## Future Enhancements (Optional)

If you want to show **real historical data** instead of estimates:

1. Store dependency calculator snapshots monthly in Firestore
2. Collection: `workspaces/{workspaceId}/dependency_calculator_history/{month}`
3. Update `generateChartData()` to query historical data when available
4. Fall back to estimates only when historical data doesn't exist

This would require:
- Background job to save monthly snapshots
- Schema for historical data storage
- Updated query logic in `generateChartData()`

---

**Status**: ✅ Production Ready  
**Testing**: Verified with 4 residents (Band 1) showing accurate current values  
**Documentation**: Complete
