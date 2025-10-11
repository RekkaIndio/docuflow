# Feature Flags Debugging Guide

## Quick Test Checklist

### Step 1: Verify Organisation ID
1. Open Admin → Settings → Feature Management
2. Look for the blue alert box at the top showing: "Managing features for Organisation: org_xxx"
3. **If you don't see this** → Problem: No organisation ID found

### Step 2: Open Browser Console
Press F12 or Cmd+Option+I and go to the Console tab

### Step 3: Check Console Logs on Page Load
You should see:
```
AdminSettings organisationId: org_12345 from workspace
Loading feature flags for organisation: org_12345
Loaded feature flags: {...}
```

**If you see different logs:**
- `"No organisationId provided to FeatureManagement"` → No workspaces or they lack organisationId
- `"AdminSettings organisationId: undefined"` → User and workspaces both lack organisationId

### Step 4: Toggle a Feature OFF
1. Toggle "AI Chat Assistant" to OFF
2. The "Save Changes" button should become enabled
3. Nothing saves yet - changes are only local

### Step 5: Click "Save Changes"
Look for these console logs:
```
Saving feature flags to: organisations/org_12345/settings/feature-flags
Feature flags data: { modules: {...}, updatedAt: null, updatedBy: "user_123" }
Feature flags saved successfully!
```

**Common errors:**
- `"Missing organisation ID or user information"` → organisationId or user.id is undefined
- `"Permission denied"` → Firestore security rules blocking write access
- `"Failed to save"` → Network or Firestore error

### Step 6: Use Debug Button
1. Click the "🔍 Debug Firestore" button
2. Check the toast message - it should show the saved data
3. Console should show:
```
📖 Reading from Firestore: organisations/org_12345/settings/feature-flags
✅ Document exists: true
📄 Data: { modules: { chatPanel: { enabled: false, ... } } }
```

### Step 7: Refresh or Navigate Away and Back
1. Click "Owner Profile" tab
2. Click "Feature Management" tab again
3. **The toggle should STILL be OFF**

If it's back to ON → The save didn't work, check Step 5 errors

---

## Common Problems & Solutions

### Problem 1: "No organisationId provided"
**Cause:** Workspaces don't have organisationId field

**Solution:**
```bash
# Run migration to add organisationId to workspaces
node scripts/migrate-feature-flags.js
```

### Problem 2: Permission Denied Errors
**Cause:** Firestore security rules blocking write

**Check:** `/firestore.rules`
```
match /organisations/{orgId}/settings/{docId} {
  allow read, write: if isOrgMember(orgId) || isAdmin();
}
```

**Solution:** Make sure your user has admin role or is an org member

### Problem 3: Data Saves but Doesn't Persist
**Cause:** Another process is overwriting the data

**Debug:**
1. Click "🔍 Debug Firestore" before toggling
2. Note what it says
3. Toggle OFF and save
4. Click "🔍 Debug Firestore" again
5. Compare - if it's the same, the save didn't work
6. Check console for save errors

### Problem 4: Console Shows Save Success but Toggle Reverts
**Cause:** Component is re-loading from cache or stale data

**Solution:** Check the `useEffect` dependency array in feature-management.tsx
- It should reload when organisationId changes
- Make sure organisationId isn't changing between renders

---

## Manual Firestore Check

### Via Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Navigate to: `organisations → {your-org-id} → settings → feature-flags`
5. Check the `modules` object
6. Look for `chatPanel.enabled` - should be `false` if you toggled it off

### Via Browser DevTools
1. Open Application tab (in DevTools)
2. Look at IndexedDB → firebaseLocalStorageDb
3. Check if there's cached data interfering

---

## Testing Checklist

- [ ] Console shows correct organisationId on load
- [ ] Toggle changes locally (button becomes enabled)
- [ ] Save shows success toast
- [ ] Console shows "Feature flags saved successfully!"
- [ ] Debug button shows saved data matches toggle state
- [ ] After refresh/navigate, toggle stays in saved state
- [ ] Feature actually disappears from user workspace

---

## Quick Fixes to Try

### Fix 1: Clear Browser Cache
```
Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
Clear cached images and files
```

### Fix 2: Hard Refresh
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Fix 3: Check Network Tab
1. Open DevTools → Network tab
2. Click "Save Changes"
3. Look for a request to Firestore
4. Check if it's 200 OK or an error
5. Check the request payload - should have enabled: false

### Fix 4: Enable Verbose Logging
In `src/components/admin/feature-management.tsx`, all console.logs are already added.
Check your browser console filter - make sure you're not filtering out info logs.

---

## What to Report if Still Broken

If it's still not working after these steps, please provide:

1. **Screenshot of browser console** showing all logs from page load to save
2. **Screenshot of the Feature Management page** showing the organisation ID alert
3. **Screenshot of Network tab** showing the Firestore request
4. **What the "🔍 Debug Firestore" button shows** before and after save
5. **Your Firebase project ID** and whether you're using emulators

---

## Expected Console Output (Working State)

When everything works correctly, you should see this sequence:

```javascript
// On Page Load
AdminSettings organisationId: org_abc123 from workspace
Loading feature flags for organisation: org_abc123
Loaded feature flags: {modules: {…}, updatedAt: Timestamp, updatedBy: "user_xyz"}

// After Toggle OFF
[No console log - local state change only]

// After Click Save
Saving feature flags to: organisations/org_abc123/settings/feature-flags
Feature flags data: {modules: {chatPanel: {enabled: false, ...}, ...}}
Feature flags saved successfully!

// After Click Debug Button
📖 Reading from Firestore: organisations/org_abc123/settings/feature-flags
✅ Document exists: true
📄 Data: {modules: {chatPanel: {enabled: false, ...}, ...}}

// After Navigate Away and Back
AdminSettings organisationId: org_abc123 from workspace
Loading feature flags for organisation: org_abc123
Loaded feature flags: {modules: {chatPanel: {enabled: false, ...}, ...}}
```

Notice that `chatPanel.enabled: false` persists through the reload!
