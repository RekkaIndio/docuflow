import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
  const { content, meta, workspaceId, organisationId: bodyOrganisationId } = await request.json();
    const resolvedParams = await params;
    const policyName = resolvedParams.policyName;
    // Dev debug: log incoming request body to server terminal for diagnosis
    try {
      console.log('[SAVE] incoming request body', { policyName: policyName, workspaceId, bodyOrganisationId, contentLength: (content || '').length });
    } catch (e) {}
    
    // Sanitize the policy name to prevent issues
    const sanitizedName = policyName.replace(/[^a-zA-Z0-9-_]/g, '');
    
  // Use deterministic document id (sanitized policy name) so repeated saves don't create duplicates
  const timestamp = new Date().toISOString();
  const documentId = sanitizedName;

    // Prepare the policy document and a structured extractedJson for chatbot consumption
    const policyDocument = {
      id: documentId,
      policyName: sanitizedName,
      originalPolicyName: policyName,
      content: content,
      meta: meta || {},
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'completed', // legacy completed_policies collection expects completed entries
      isCompleted: true,
      version: (meta && meta.version) || '1.0',
      // For backwards compatibility, keep top-level fields
    };

    // Build a workspace-scoped document shape that includes extractedJson (used by chat)
    const workspacePolicyDocument = {
      id: documentId,
      policyName: sanitizedName,
      originalPolicyName: policyName,
      content: content,
      meta: meta || {},
      extractedJson: {
        content: content || '',
        title: meta?.title || policyName.replace(/[-_]/g, ' '),
        effectiveDate: meta?.effectiveDate || null,
        reviewDate: meta?.reviewDate || null,
        version: meta?.version || '1.0',
        appliesTo: meta?.appliesTo || null,
        type: 'policy'
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'completed',
      isCompleted: true,
      version: (meta && meta.version) || '1.0',
    };

    // Save to legacy collection for backward compatibility
    try {
      // Use set with merge to update existing document if present
      await adminDb.collection('completed_policies').doc(documentId).set(policyDocument, { merge: true });
    } catch (e) {
      console.error('Failed to write to completed_policies (legacy):', e);
    }

  // If a workspaceId was provided, try to derive organisationId and write into the organisation-scoped collection.
  // Do NOT create top-level workspace documents on the legacy path. Instead, return the workspacePublishedDocument
  // in the response body so the client can consume it without attempting to fetch protected legacy paths.
  let workspacePublishedDocument: any | null = null;
  // Track the org id we actually used (if any) so we can return it in response headers for debugging
  let usedOrgId: string | null = null;
  let candidateOrgFromBody: string | null = bodyOrganisationId || null;
  let candidateOrgFromWorkspaceDoc: string | null = null;
  let candidateOrgFromCollectionGroup: string | null = null;
  let writeErrorMessage: string | null = null;

  if (workspaceId) {
      try {
        // Prefer an explicit organisationId provided in the request body (admin UI may have it)
        let orgId: string | undefined = bodyOrganisationId;
        if (!orgId) {
          const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
          orgId = wsSnap.exists ? (wsSnap.data() as any)?.organisationId : undefined;
          if (orgId) candidateOrgFromWorkspaceDoc = orgId;
        }

        // If legacy workspace doc doesn't contain organisationId, try a collectionGroup lookup
        // to find an organisations/{orgId}/workspaces/{workspaceId} doc and derive orgId.
        if (!orgId) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const admin = require('@/lib/firebase-admin').default;
            const FieldPath = admin.firestore.FieldPath;
            const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
            if (!cgSnap.empty) {
              const foundRef = cgSnap.docs[0].ref; // e.g. organisations/{orgId}/workspaces/{workspaceId}
              const parts = foundRef.path.split('/');
              const orgIndex = parts.indexOf('organisations');
                if (orgIndex !== -1 && parts.length > orgIndex + 1) {
                orgId = parts[orgIndex + 1];
                candidateOrgFromCollectionGroup = orgId || null;
              }
            }
          } catch (e) {
            // ignore fallback errors and continue
          }
        }

        if (orgId) {
          usedOrgId = orgId;
          try {
            // Persist the policy at the organisation level so it's available to all workspaces in the org
            await adminDb
              .collection('organisations')
              .doc(orgId)
              .collection('policies')
              .doc(documentId)
              .set(workspacePolicyDocument, { merge: true });
            console.log(`Saved policy to organisations/${orgId}/policies/${documentId}`);
            workspacePublishedDocument = { ...workspacePolicyDocument, updatedAt: new Date().toISOString() };
            console.log(`org-level write succeeded for workspace ${workspaceId} under org ${orgId}`);
          } catch (e) {
            console.warn('Failed to write policy into organisation-scoped policies path:', e);
            writeErrorMessage = (e && (e as any).message) ? (e as any).message : String(e);
          }
        } else {
          console.warn(`No organisationId found for workspace ${workspaceId}; skipping workspace-scoped write to avoid auto-creating legacy workspace doc.`);
        }
      } catch (e) {
        console.warn('Failed to derive organisationId for workspace; skipping workspace-scoped write for workspace:', workspaceId, e);
      }
    }

  const resp: any = { message: 'Policy saved successfully to Firebase', documentId: documentId, timestamp };
    if (workspacePublishedDocument) resp.workspacePublishedDocument = workspacePublishedDocument;
    // Always include debug headers to make it easier to see which org (if any) was used
    const headers: Record<string, string> = {};
    headers['X-Org-Used'] = usedOrgId || 'none';
    // X-Workspace-Doc-Saved: 'true' = org-scoped write saved, 'false' = attempted but failed, 'null' = not attempted (no workspace/org)
    if (workspacePublishedDocument) headers['X-Workspace-Doc-Saved'] = 'true';
    else if (workspaceId && !usedOrgId) headers['X-Workspace-Doc-Saved'] = 'null';
    else headers['X-Workspace-Doc-Saved'] = 'false';

    // If we derived/used an orgId, include the exact organisation-level policies path so the client can locate it in Firestore
    if (usedOrgId) {
      try {
        const orgPath = `/organisations/${usedOrgId}/policies/${documentId}`;
        headers['X-Workspace-Policy-Path'] = orgPath;
      } catch (e) {
        // ignore
      }
    }

    // Dev debug: log derivation attempts and result to server terminal
    try {
      console.log('[SAVE] derivation', { candidateOrgFromBody, candidateOrgFromWorkspaceDoc, candidateOrgFromCollectionGroup, usedOrgId, writeErrorMessage });
    } catch (e) {}

    // Attach a small debug object (dev-only) explaining the attempts made to derive an org id
    resp.debug = {
      candidateOrgFromBody,
      candidateOrgFromWorkspaceDoc,
      candidateOrgFromCollectionGroup,
      usedOrgId,
      writeErrorMessage,
    };

    return NextResponse.json(resp, { headers });

  } catch (error) {
    console.error('Error saving policy to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to save policy to Firebase' },
      { status: 500 }
    );
  }
}