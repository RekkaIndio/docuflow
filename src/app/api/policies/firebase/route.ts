import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface PolicyDocument {
  id: string;
  policyName: string;
  originalPolicyName: string;
  content: string;
  meta: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  version: string;
  pdfPath?: string;
}

export async function GET() {
  try {
    // Get all completed policies (drafts)
    const draftsSnapshot = await adminDb.collection('completed_policies')
      .orderBy('updatedAt', 'desc')
      .get();

    // Get all published policies
    const publishedSnapshot = await adminDb.collection('published_policies')
      .orderBy('updatedAt', 'desc')
      .get();

    const drafts = draftsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as PolicyDocument[];

    const published = publishedSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as PolicyDocument[];

    return NextResponse.json({
      drafts,
      published,
      total: drafts.length + published.length
    });

  } catch (error) {
    console.error('Error fetching policies from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies from Firebase' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('id');
    const collection = searchParams.get('collection') || 'completed_policies';

    if (!policyId) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    await adminDb.collection(collection).doc(policyId).delete();

    return NextResponse.json({
      message: 'Policy deleted successfully',
      policyId
    });

  } catch (error) {
    console.error('Error deleting policy from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to delete policy from Firebase' },
      { status: 500 }
    );
  }
}