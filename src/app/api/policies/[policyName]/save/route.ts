import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
  const { content, meta, workspaceId } = await request.json();
    const resolvedParams = await params;
    const policyName = resolvedParams.policyName;
    
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

    // If a workspaceId was provided, also write into workspace-scoped collection
    if (workspaceId) {
      try {
        await adminDb.collection('workspaces').doc(workspaceId).collection('policies').doc(documentId).set(workspacePolicyDocument, { merge: true });
        console.log(`Saved policy to workspaces/${workspaceId}/policies/${documentId}`);
      } catch (e) {
        console.error('Failed to write workspace-scoped policy document:', e);
      }
    }

    return NextResponse.json({
      message: 'Policy saved successfully to Firebase',
      documentId: documentId,
      timestamp
    });

  } catch (error) {
    console.error('Error saving policy to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to save policy to Firebase' },
      { status: 500 }
    );
  }
}