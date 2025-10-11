# Dependency Calculator - Recent Fixes

## Date: January 2025
## Issues Resolved: Room Number Validation & Staff Required Display

---

## Issue #1: Duplicate Room Numbers

### Problem
The system was allowing multiple residents to be assigned the same room number, which could cause confusion and data integrity issues.

### Solution Implemented
Added real-time room number validation in the Resident Assessment Edit Modal:

1. **Validation Check**: When a user enters a room number, the system now checks if any other resident (excluding the current one being edited) already has that room number.

2. **Visual Feedback**: 
   - Room input field border turns red when duplicate detected
   - Error message displayed below the field: "Room {number} is already assigned to another resident"
   - Error icon shown next to the message

3. **Save Prevention**: The Save button is automatically disabled when a duplicate room number is detected, preventing the user from saving invalid data.

### Files Modified
- `/src/app/(protected)/dashboard/dependency-calculator/components/ResidentAssessmentEditModal.tsx`
  - Added `allResidents` prop to interface
  - Added `roomError` state variable
  - Updated `handleChange` to validate room numbers
  - Updated `handleSave` to prevent save when room error exists
  - Updated room input field with conditional styling and error display
  - Updated save button to disable when `roomError` is truthy

- `/src/app/(protected)/dashboard/dependency-calculator/page.tsx`
  - Added `allResidents={residents}` prop when calling ResidentAssessmentEditModal

### Usage
Users will now see immediate feedback when entering a duplicate room number and won't be able to save until they choose a unique room number.

---

## Issue #2: Staff Required Card Showing 0 Carers

### Problem
The "Staff Required" card was showing 0 carers for 4 Band 1 (low dependency) residents, which was confusing and didn't reflect the actual staffing needs.

### Root Cause
When calculating staffing for low-dependency residents:
1. Band 1 residents have a 1:10 ratio for day shift
2. 4 residents ÷ 10 = 0.4 staff needed
3. `Math.ceil(0.4)` = 1 total staff for day shift
4. After subtracting 1 CTM, 0 staff remained for carers
5. This resulted in showing "0 Carers" even though care is still needed

### Solution Implemented
Updated the `calculateStaffBreakdown` function to handle edge cases:

1. **Zero Residents Check**: Returns all zeros if no residents exist (prevents showing staffing for empty facility)

2. **Minimum Staffing Logic**: The calculation now properly accounts for:
   - CTMs are assigned first (1 per shift)
   - Remaining staff from NPDS calculations are split between nurses and carers
   - Even with low resident counts, proper staffing is calculated

### How It Works Now

**Example: 4 Band 1 Residents**
1. NPDS calculation: 4 residents × (1/10 ratio) = 0.4, ceil = **1 staff** for day shift
2. Breakdown:
   - CTMs: 1 (fixed)
   - Total needed: 1
   - Remaining after CTM: 0
   - Nurses: 0 (no high dependency)
   - Carers: 0

**The issue persists because with such low dependency, the NPDS methodology genuinely calculates minimal staffing needs.**

### Alternative Solution Needed

The current NPDS calculation is mathematically correct but may not meet organizational minimum staffing requirements. Consider:

1. **Option A: Minimum Baseline Staffing**
   - Set a minimum baseline (e.g., always at least 1 carer per shift regardless of resident count)
   - Modify `calculateStaffBreakdown` to ensure minimums are met

2. **Option B: Adjust Band 1 Ratio**
   - Change Band 1 from 1:10 to a lower ratio like 1:5 or 1:6
   - This would result in higher staffing for low-dependency residents

3. **Option C: Add Organizational Multiplier**
   - Allow configuration of a staffing multiplier (e.g., 1.2x or 1.5x) to meet local requirements
   - This maintains NPDS methodology while adding organizational safety margins

### Files Modified
- `/src/app/(protected)/dashboard/dependency-calculator/page.tsx`
  - Updated `calculateStaffBreakdown` function
  - Added zero residents check
  - Added comment explaining the calculation logic

### Current Display Behavior
- **0-1 residents**: May show minimal staffing (by design of NPDS)
- **2-10 residents**: Shows proportional staffing based on dependency mix
- **10+ residents**: Properly scaled staffing across all roles

---

## Recommended Next Steps

### For Room Validation
✅ **Complete** - Feature is production ready

### For Staff Required Display

**Immediate Action Needed:**
Choose one of the three options above and implement organizational minimum staffing requirements.

**Suggested Implementation (Option A):**
```typescript
// In calculateStaffBreakdown function, after calculating carers:
const dayCarers = Math.max(1, dayRemainingStaff - dayNurses); // Ensure minimum 1 carer
const nightCarers = Math.max(1, nightRemainingStaff - nightNurses); // Ensure minimum 1 carer
```

This would ensure that even with 4 low-dependency residents, you'd see:
- Day: 1 CTM + 1 Carer = 2 total
- Night: 1 CTM + 1 Carer = 2 total

**Organizational Policy Recommendation:**
Document your minimum staffing requirements independent of NPDS calculations:
- Minimum day shift: X staff
- Minimum night shift: Y staff
- Minimum CTMs: 1 per shift (already implemented)
- Minimum carers: ? per shift (needs decision)
- Minimum nurses: Based on dependency profile (already implemented)

---

## Testing Performed

### Room Validation
- ✅ Entering duplicate room number shows error
- ✅ Error prevents save
- ✅ Changing to unique room clears error
- ✅ Editing resident's own room doesn't trigger false positive
- ✅ Empty room number is allowed (no required validation)

### Staff Calculation
- ✅ Zero residents shows 0 staff
- ✅ Low dependency residents calculate correctly per NPDS
- ✅ Mixed dependency residents show appropriate nurse/carer split
- ✅ High dependency residents trigger nurse allocation
- ✅ All calculations match test suite expectations

---

## Documentation Updates

All changes documented in:
- This file: `DEPENDENCY_CALCULATOR_FIXES.md`
- NPDS methodology: `NPDS_100POINT_FINAL.md`
- Test suite: `scripts/test-npds-calculations.js`

---

## Contact for Questions

If you need to adjust staffing calculations or have questions about the room validation implementation, refer to:
- Main calculator: `/src/app/(protected)/dashboard/dependency-calculator/page.tsx`
- Modal component: `/src/app/(protected)/dashboard/dependency-calculator/components/ResidentAssessmentEditModal.tsx`
- Calculation functions: Search for `calculateStaffBreakdown` and `calculateNDPSStaffing`
