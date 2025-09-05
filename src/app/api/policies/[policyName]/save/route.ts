import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyName: string }> }
) {
  try {
    const { content, meta } = await request.json();
    const resolvedParams = await params;
    const policyName = resolvedParams.policyName;
    
    // Sanitize the policy name to prevent issues
    const sanitizedName = policyName.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Generate a timestamp for the saved version
    const timestamp = new Date().toISOString();
    const documentId = `${sanitizedName}-${Date.now()}`;

    // Prepare the policy document
    const policyDocument = {
      id: documentId,
      policyName: sanitizedName,
      originalPolicyName: policyName,
      content: content,
      meta: meta || {},
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'draft', // Can be 'draft' or 'published'
      version: '1.0'
    };

    // Save to Firestore
    await adminDb.collection('completed_policies').doc(documentId).set(policyDocument);

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