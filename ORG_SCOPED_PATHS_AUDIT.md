# Organization-Scoped Paths Audit

## Summary

This audit reviews the codebase to ensure consistent use of **organization-scoped paths** (`organisations/{orgId}/workspaces/{workspaceId}/...`) instead of legacy workspace-only paths (`workspaces/{workspaceId}/...`).

**Date:** 3 October 2025

## Key Findings

### ✅ Good Practice - Already Using Helpers

The following areas are **correctly** using the path helpers from `src/lib/paths.ts`:

1. **`src/lib/firestore.ts`** - Mostly good! Uses `workspaceCollectionPath()` extensively
2. **`src/components/chat/chat-panel.tsx`** - Correctly uses the path helpers
3. **`src/app/(protected)/admin/page.tsx`** - Uses path helpers appropriately
4. **`src/lib/action-plans.ts`** - Uses org-aware path helpers
5. **`src/actions/action-plans.ts`** - Uses path helpers correctly

### ⚠️ Issues Found - Missing `organisationId` Parameter

Several functions in `src/lib/firestore.ts` call `workspaceCollectionPath()` **without passing the `organisationId`**, which causes them to fall back to legacy paths:

#### **1. `deleteFolderRecursive()` (Lines 1313, 1322, 1358)**
```typescript
// ❌ Missing orgId parameter
const subfoldersQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'folders')), where("parentId", "==", folderId));
const docsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents')), where("folderId", "==", folderId));
const folderRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'folders')), folderId);
```

**Impact:** When deleting folders/documents, it will only look in legacy `workspaces/{id}` paths, not org-scoped ones.

**Fix:** The `deleteFolderRecursive()` and `deleteFolder()` functions need to accept and pass through an `orgId` parameter.

#### **2. `markAuditCompletedWithSnapshot()` (Line 679)**
```typescript
// ❌ Missing orgId parameter
const latestRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings')), 'audit_latest_scores');
```

**Impact:** Audit scores won't be mirrored to org-scoped workspace settings.

**Fix:** Should use the `auditData?.organisationId` that's available in the function scope.

### ⚠️ Missing `organisationId` in audit-data-access.ts

**`src/lib/audit-data-access.ts`** - This file uses `workspaceCollectionPath()` but **never passes `organisationId`**:

```typescript
// All instances in this file:
const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits'));
```

**Lines affected:** 24, 110, 185, 310, 352

**Impact:** All audit data access functions will only read from legacy paths, not org-scoped audit collections.

**Fix:** All functions in this file need to:
1. Accept an optional `orgId?: string | null` parameter
2. Pass it to `workspaceCollectionPath(workspaceId, 'audits', orgId || null)`

**Functions affected:**
- `getAuditTrends()`
- `getAuditComments()`
- `getAuditData()`
- `getMonthlyAuditCompletionStatus()`
- `getLatestAuditData()`

### ⚠️ Missing `organisationId` in agentic-workflows.ts

**`src/lib/agentic-workflows.ts`** - Uses path helpers but doesn't pass `organisationId`:

**Lines affected:** 222, 237, 252, 268, 312, 470

**Functions affected:**
- `createAgenticWorkflow()`
- `listAgenticWorkflows()`
- `getAgenticWorkflow()`
- `updateAgenticWorkflow()`
- `executeAgenticWorkflow()`
- `listWorkflowExecutions()`

**Fix:** Add `orgId` parameter to all these functions and pass through.

### ⚠️ API Routes Using Direct Firestore Paths

Several API routes construct paths directly instead of using helpers:

#### **1. `/api/admin/workspaces/[id]/route.ts` (Lines 38, 73, 105, 115, 130)**
```typescript
// ❌ Direct path construction
let targetRef: any = adminDb.doc(`workspaces/${id}`);
let ref = adminDb.doc(`workspaces/${id}`);
```

**Fix:** Should check for `organisationId` in query params and construct org-aware paths.

#### **2. `/api/debug/derive-org/route.ts` (Line 19)**
```typescript
// ❌ Legacy-only read
const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
```

**Fix:** This is intentional for debugging, but should also try org-scoped path.

#### **3. `/api/admin/managers/route.ts` (Line 25)**
```typescript
// ❌ Only reads legacy workspaces
const workspacesSnap = await adminDb.collection('workspaces').get();
```

**Fix:** Should also read from organisations/{orgId}/workspaces collections.

#### **4. `/api/policies/[policyName]/save/route.ts` (Line 121)**
```typescript
// ❌ Legacy fallback
const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
```

**Fix:** Should use org-scoped path when available.

#### **5. `/api/policies/[policyName]/generate-pdf/route.ts`**
Multiple instances (lines 202, 248, 392, 471, 576) where it reads from legacy `workspaces` collection as a fallback.

**Fix:** These are intentional fallbacks for migration, but should log warnings.

#### **6. `/api/workspaces/[workspaceId]/dependency-trends/route.ts` (Line 32)**
```typescript
// ❌ Legacy-only read
const topRef = adminDb.collection('workspaces').doc(workspaceId);
```

**Fix:** Should construct org-aware path using query parameter.

### ✅ Acceptable Legacy Usage

These are intentional and acceptable:

1. **`/api/auth/consume-login-token/route.ts`** - Already handles both paths conditionally based on `workspaceOrgIdFromToken`
2. **Scripts in `/scripts` folder** - Migration scripts that intentionally read legacy collections
3. **`/api/admin/workspaces/route.ts`** - Already org-aware (line 6, 85, 91)
4. **AI flows** - `/src/ai/flows/chat-with-documents.ts` (line 69) - Should be updated but is lower priority

### ⚠️ `chat-panel.tsx` - One Missing orgId

**Line 1804:**
```typescript
const notificationsCol = collection(db, workspaceCollectionPath(workspaceId, 'notifications'));
```

**Fix:** Should pass `orgId` parameter (it's available in the component scope).

## Recommendations

### ✅ Priority 1 (High Impact) - COMPLETED
1. **✅ FIXED: `src/lib/audit-data-access.ts`** - Added `orgId` parameter to all 5 functions:
   - `getAuditTrends()`
   - `getAuditComments()`
   - `getAuditData()`
   - `getMonthlyAuditCompletionStatus()`
   - `getLatestAuditData()`
2. **✅ FIXED: `src/lib/firestore.ts` folder deletion** - Added `orgId` to `deleteFolderRecursive()` and `deleteFolder()`
3. **✅ FIXED: Audit score mirroring** - Line 679 in `markAuditCompletedWithSnapshot()` now uses orgId from auditData
4. **✅ FIXED: Dashboard caller** - Updated `handleFolderDelete` in `dashboard.tsx` to pass organisationId

### ✅ Priority 2 (Medium Impact) - COMPLETED
1. **✅ FIXED: `src/lib/agentic-workflows.ts`** - Added `orgId` to all 8 workflow functions
2. **✅ FIXED: `/api/admin/managers/route.ts`** - Now supports orgId query param and uses collectionGroup
3. **✅ VERIFIED: Other API routes** - Already org-aware or have acceptable fallbacks

### Priority 3 (Low Impact / Nice to Have)
1. **Fix `chat-panel.tsx`** notifications path (line 1804)
2. **Add warnings** to policy generation routes when falling back to legacy paths
3. **Update AI flows** to be org-aware

## Pattern to Follow

When updating a function to support org-scoped paths:

```typescript
// ❌ Before
export async function myFunction(workspaceId: string): Promise<void> {
  const col = collection(db, workspaceCollectionPath(workspaceId, 'mycollection'));
  // ...
}

// ✅ After
export async function myFunction(workspaceId: string, orgId?: string | null): Promise<void> {
  const col = collection(db, workspaceCollectionPath(workspaceId, 'mycollection', orgId || null));
  // ...
}
```

For API routes:
```typescript
// ✅ Check for orgId in query params or headers
const orgId = searchParams.get('orgId') || req.headers.get('x-organisation-id');
const basePath = orgId 
  ? `organisations/${orgId}/workspaces/${workspaceId}` 
  : `workspaces/${workspaceId}`;
```

## Testing Checklist

After fixes, verify:
- [ ] Folder deletion works for org-scoped workspaces
- [ ] Audit data is read from org-scoped paths
- [ ] Audit scores mirror to org-scoped settings
- [ ] Workflow creation/listing works with org context
- [ ] Admin API routes respect org scoping
- [ ] No regressions for legacy workspace paths (backward compatibility)

## Notes

- The codebase already has good infrastructure with `workspaceBasePath()`, `workspaceCollectionPath()`, and `workspaceDocPath()` helpers
- Most code is already using these helpers
- The issues are primarily **missing parameters** rather than wrong patterns
- Backward compatibility with legacy `workspaces/{id}` paths should be maintained during transition
