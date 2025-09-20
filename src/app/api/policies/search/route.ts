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
  storagePath?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, workspaceId } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Search in completed_policies collection
    const draftsQuery = adminDb.collection('completed_policies')
      .where('status', '==', 'draft');

    // Search in organisation-scoped policies collection via collectionGroup('policies')
    const publishedQuery = adminDb.collectionGroup('policies')
      .where('status', '==', 'published');

    const [draftsSnapshot, publishedSnapshot] = await Promise.all([
      draftsQuery.get(),
      publishedQuery.get()
    ]);

    const allPolicies: PolicyDocument[] = [];

    // Process drafts
    draftsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data() as PolicyDocument;
      allPolicies.push({
        ...data,
        id: doc.id
      });
    });

    // Process published policies
    publishedSnapshot.docs.forEach((doc: any) => {
      const data = doc.data() as PolicyDocument;
      allPolicies.push({
        ...data,
        id: doc.id
      });
    });

    // Filter policies based on the search query
    const queryLower = query.toLowerCase();
    const matchingPolicies = allPolicies.filter(policy => {
      const title = policy.meta?.title || policy.policyName || '';
      const content = policy.content || '';
      const appliesTo = policy.meta?.appliesTo || '';

      return title.toLowerCase().includes(queryLower) ||
             content.toLowerCase().includes(queryLower) ||
             appliesTo.toLowerCase().includes(queryLower) ||
             policy.policyName.toLowerCase().includes(queryLower);
    });

    if (matchingPolicies.length === 0) {
      return NextResponse.json({
        results: [],
        bestMatch: null,
        message: 'No matching policies found'
      });
    }

    // Find the best match (most relevant)
    const bestMatch = matchingPolicies[0];

    // Convert to the format expected by the chat system
    const results = matchingPolicies.slice(0, 5).map(policy => ({
      id: policy.id,
      name: policy.meta?.title || policy.policyName || 'Untitled Policy',
      extractedJson: {
        content: policy.content,
        title: policy.meta?.title || policy.policyName,
        effectiveDate: policy.meta?.effectiveDate,
        reviewDate: policy.meta?.reviewDate,
        version: policy.meta?.version || policy.version,
        appliesTo: policy.meta?.appliesTo,
        type: 'policy',
        status: policy.status
      },
      pdfPath: policy.pdfPath || null,
      storagePath: policy.storagePath || null,
      createdAt: policy.createdAt,
      folderId: 'policies',
      status: policy.status === 'published' ? 'current' : 'draft',
      tags: ['policy'],
      summary: `Policy document: ${policy.meta?.title || policy.policyName}`
    }));

    const bestMatchResult = {
      id: bestMatch.id,
      name: bestMatch.meta?.title || bestMatch.policyName || 'Untitled Policy',
      extractedJson: {
        content: bestMatch.content,
        title: bestMatch.meta?.title || bestMatch.policyName,
        effectiveDate: bestMatch.meta?.effectiveDate,
        reviewDate: bestMatch.meta?.reviewDate,
        version: bestMatch.meta?.version || bestMatch.version,
        appliesTo: bestMatch.meta?.appliesTo,
        type: 'policy',
        status: bestMatch.status
      },
      pdfPath: bestMatch.pdfPath || null,
      storagePath: bestMatch.storagePath || null,
      createdAt: bestMatch.createdAt,
      folderId: 'policies',
      status: bestMatch.status === 'published' ? 'current' : 'draft',
      tags: ['policy'],
      summary: `Policy document: ${bestMatch.meta?.title || bestMatch.policyName}`
    };

    return NextResponse.json({
      results,
      bestMatch: bestMatchResult,
      total: matchingPolicies.length
    });

  } catch (error) {
    console.error('Error searching policies in Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to search policies in Firebase' },
      { status: 500 }
    );
  }
}