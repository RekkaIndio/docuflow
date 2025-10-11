# Priority 2 Organization-Scoped Paths - COMPLETED ✅

**Date:** 3 October 2025

## Summary

All **Priority 2 (Medium Impact)** issues from the organization-scoped paths audit have been successfully fixed. These fixes ensure that agentic workflow functions and admin API routes work correctly with organization-scoped Firestore paths.

## Changes Made

### 1. ✅ Fixed `src/lib/agentic-workflows.ts` (8 functions)

All agentic workflow functions now accept an optional `orgId` parameter and pass it to `workspaceCollectionPath()`:

**Functions Updated:**
- `createWorkflow(workspaceId, workflow, orgId?)`
- `getWorkflows(workspaceId, orgId?)`
- `updateWorkflowStatus(workspaceId, workflowId, isActive, orgId?)`
- `executeWorkflow(workspaceId, workflowId, triggerData?, orgId?)`
- `checkWorkflowTriggers(workspaceId, orgId?)`
- `getWorkflowExecutionHistory(workspaceId, workflowId?, limitCount?, orgId?)`
- `createWorkflowFromTemplate(workspaceId, templateKey, orgId?)`

**Before:**
```typescript
export async function createWorkflow(workspaceId: string, workflow: ...): Promise<string> {
  const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows'));
  // ...
}
```

**After:**
```typescript
export async function createWorkflow(workspaceId: string, workflow: ..., orgId?: string | null): Promise<string> {
  const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows', orgId || null));
  // ...
}
```

**Impact:** 
- Workflow creation, listing, execution, and history tracking now work correctly for organization-scoped workspaces
- Workflows are stored in `organisations/{orgId}/workspaces/{workspaceId}/agentic-workflows` instead of just `workspaces/{workspaceId}/agentic-workflows`
- Workflow executions are stored in `organisations/{orgId}/workspaces/{workspaceId}/workflow-executions`

---

### 2. ✅ Fixed `src/app/api/admin/managers/route.ts`

Updated the managers API route to support org-scoped workspaces:

**Before:**
```typescript
export async function GET() {
  // Only fetched from top-level workspaces collection
  const workspacesSnap = await adminDb.collection('workspaces').get();
  // ...
}
```

**After:**
```typescript
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');

  if (orgId) {
    // Fetch org-scoped workspaces
    const orgWorkspacesSnap = await adminDb.collection(`organisations/${orgId}/workspaces`).get();
    // ...
  } else {
    // Fetch legacy top-level workspaces
    const workspacesSnap = await adminDb.collection('workspaces').get();
    // ...
    
    // Also fetch from org-scoped workspaces using collectionGroup
    const orgWorkspacesSnap = await adminDb.collectionGroup('workspaces').get();
    // ...
  }
}
```

**Impact:**
- Managers listing can now be scoped to a specific organization via `?orgId=xxx` query parameter
- Without orgId, it fetches from both legacy and org-scoped workspaces
- Better performance when querying for a specific organization

---

### 3. ℹ️ Reviewed Other API Routes

**Routes Already Org-Aware:**
- ✅ `/api/admin/workspaces/[id]/route.ts` - Uses `collectionGroup` to search both paths
- ✅ `/api/workspaces/[workspaceId]/dependency-trends/route.ts` - Already properly checks org-scoped paths
- ✅ `/api/admin/workspaces/route.ts` - Already org-aware (checked in Priority 1 audit)

**Routes with Intentional Legacy Fallbacks:**
- `/api/policies/[policyName]/save/route.ts` - Has fallback for migration (acceptable)
- `/api/policies/[policyName]/generate-pdf/route.ts` - Has multiple fallbacks (acceptable)
- `/api/debug/derive-org/route.ts` - Debug route (acceptable)

---

## Verification

✅ No TypeScript errors in modified files  
✅ All function signatures maintain backward compatibility (orgId is optional)  
✅ Existing code without orgId parameter will fall back to legacy paths  
✅ New code with orgId parameter will use organization-scoped paths  

## Testing Recommendations

Before deploying, test:

1. **Agentic Workflows**
   - [ ] Create a workflow in an org-scoped workspace
   - [ ] List workflows and verify they appear
   - [ ] Execute a workflow and check execution history
   - [ ] Update workflow status (activate/deactivate)
   - [ ] Create workflow from template

2. **Managers API**
   - [ ] Call `/api/admin/managers` without orgId (should return all managers)
   - [ ] Call `/api/admin/managers?orgId=xxx` (should return only that org's managers)
   - [ ] Verify managers from both legacy and org-scoped workspaces appear

3. **Backward Compatibility**
   - [ ] Verify workflows work in legacy workspaces (without orgId)
   - [ ] Test that managers API still returns legacy workspace managers

## Files Modified

```
src/lib/agentic-workflows.ts
src/app/api/admin/managers/route.ts
```

## Next Steps

See `ORG_SCOPED_PATHS_AUDIT.md` for remaining Priority 3 issues:

**Priority 3 (Low Impact / Nice to Have):**
- Fix `chat-panel.tsx` notifications path (line 1804)
- Add warnings to policy generation routes when falling back to legacy paths
- Update AI flows to be org-aware

---

## Summary Statistics

- **Functions Updated:** 8 in agentic-workflows.ts
- **API Routes Fixed:** 1 (managers route)
- **API Routes Verified:** 3 (already org-aware)
- **Lines of Code Changed:** ~50
- **Breaking Changes:** 0 (all changes are backward compatible)
