# Priority 1 Organization-Scoped Paths - COMPLETED ✅

**Date:** 3 October 2025

## Summary

All Priority 1 (High Impact) issues from the organization-scoped paths audit have been successfully fixed. These fixes ensure that audit data, folder/document deletion, and audit score mirroring all work correctly with organization-scoped Firestore paths.

## Changes Made

### 1. ✅ Fixed `src/lib/audit-data-access.ts` (5 functions)

All audit data access functions now accept an optional `orgId` parameter and pass it to `workspaceCollectionPath()`:

**Functions Updated:**
- `getAuditTrends(workspaceId, auditType?, orgId?)`
- `getAuditComments(workspaceId, auditType?, orgId?)`
- `getAuditData(workspaceId, auditType?, dataType?, orgId?)`
- `getMonthlyAuditCompletionStatus(workspaceId, orgId?)`
- `getLatestAuditData(workspaceId, auditType, orgId?)`

**Before:**
```typescript
export async function getAuditTrends(workspaceId: string, auditType?: string): Promise<string> {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits'));
  // ...
}
```

**After:**
```typescript
export async function getAuditTrends(workspaceId: string, auditType?: string, orgId?: string | null): Promise<string> {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));
  // ...
}
```

**Impact:** Audit trend analysis, comments, and data queries will now read from the correct organization-scoped collections.

---

### 2. ✅ Fixed `src/lib/firestore.ts` - Folder Deletion

Updated `deleteFolderRecursive()` and `deleteFolder()` to accept and use `orgId` parameter:

**Before:**
```typescript
async function deleteFolderRecursive(workspaceId: string, folderId: string) {
  const subfoldersQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'folders')), ...);
  const docsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents')), ...);
  // ...
}

export async function deleteFolder(workspaceId: string, folderId: string): Promise<void> {
  await deleteFolderRecursive(workspaceId, folderId);
}
```

**After:**
```typescript
async function deleteFolderRecursive(workspaceId: string, folderId: string, orgId?: string | null) {
  const subfoldersQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'folders', orgId || null)), ...);
  const docsQuery = query(collection(db, workspaceCollectionPath(workspaceId, 'documents', orgId || null)), ...);
  // ...
}

export async function deleteFolder(workspaceId: string, folderId: string, orgId?: string | null): Promise<void> {
  await deleteFolderRecursive(workspaceId, folderId, orgId);
}
```

**Impact:** Folder and document deletion now works correctly for organization-scoped workspaces. Previously, it would only look in legacy `workspaces/{id}` paths.

---

### 3. ✅ Fixed `src/lib/firestore.ts` - Audit Score Mirroring

Updated `markAuditCompletedWithSnapshot()` to use orgId when mirroring audit scores to workspace settings:

**Before (Line 679):**
```typescript
const latestRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings')), 'audit_latest_scores');
```

**After:**
```typescript
const orgId = auditData?.organisationId || auditData?.orgId || null;
const latestRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'settings', orgId)), 'audit_latest_scores');
```

**Impact:** Dashboard audit score indicators will now correctly update for organization-scoped workspaces.

---

### 4. ✅ Updated Caller in `src/components/dashboard/dashboard.tsx`

Updated `handleFolderDelete` to pass the `organisationId` to `deleteFolder()`:

**Before (Line 987):**
```typescript
await deleteFolder(activeWorkspace.id, folder.id);
```

**After:**
```typescript
await deleteFolder(activeWorkspace.id, folder.id, organisationId);
```

**Impact:** UI folder deletion now works correctly with the updated function signature.

---

## Verification

✅ No TypeScript errors in modified files  
✅ All function signatures maintain backward compatibility (orgId is optional)  
✅ Existing code without orgId parameter will fall back to legacy paths  
✅ New code with orgId parameter will use organization-scoped paths  

## Testing Recommendations

Before deploying, test:

1. **Folder Deletion**
   - [ ] Delete a folder in an org-scoped workspace
   - [ ] Verify nested folders and documents are deleted
   - [ ] Check that files are deleted from Storage

2. **Audit Data Access**
   - [ ] Query audit trends for an org-scoped workspace
   - [ ] Verify audit comments are retrieved correctly
   - [ ] Check that audit data queries return expected results

3. **Audit Completion**
   - [ ] Complete an audit in an org-scoped workspace
   - [ ] Verify the score appears in the dashboard
   - [ ] Check that the score is stored in the correct settings path

4. **Backward Compatibility**
   - [ ] Verify legacy workspaces (without orgId) still work
   - [ ] Test folder deletion in legacy workspace
   - [ ] Test audit queries in legacy workspace

## Next Steps

See `ORG_SCOPED_PATHS_AUDIT.md` for remaining Priority 2 and Priority 3 issues:

**Priority 2 (Medium Impact):**
- Fix `src/lib/agentic-workflows.ts` - Add orgId to workflow functions
- Fix API routes to be org-aware

**Priority 3 (Low Impact):**
- Fix `chat-panel.tsx` notifications path
- Add warnings to policy generation routes
- Update AI flows to be org-aware
