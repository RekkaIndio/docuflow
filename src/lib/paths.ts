// Helpers for computing Firestore paths for workspaces in an org-aware way.
// Use these so components can prefer organisation-scoped paths when organisationId is present.
export function workspaceBasePath(workspaceId?: string | null, organisationId?: string | null) {
  if (!workspaceId) return '';
  return organisationId ? `organisations/${organisationId}/workspaces/${workspaceId}` : `workspaces/${workspaceId}`;
}

export function workspaceCollectionPath(workspaceId?: string | null, subpath?: string, organisationId?: string | null) {
  const base = workspaceBasePath(workspaceId, organisationId);
  if (!base) return '';
  return subpath ? `${base}/${subpath}` : base;
}

export function workspaceDocPath(workspaceId?: string | null, docId?: string, organisationId?: string | null) {
  const base = workspaceBasePath(workspaceId, organisationId);
  if (!base) return '';
  return docId ? `${base}/${docId}` : base;
}
