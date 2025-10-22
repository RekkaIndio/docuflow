import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { extractCqcRegulationsFromText } from '@/lib/cqc-regulations';

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

    // Search in completed_policies collection. Prefer an `in` query so we include
    // entries saved with legacy `completed` status as well as current drafts.
    let draftsSnapshot;
    try {
      draftsSnapshot = await adminDb
        .collection('completed_policies')
        .where('status', 'in', ['draft', 'completed'])
        .get();
    } catch (statusInErr) {
      console.warn('Falling back to full completed_policies fetch:', statusInErr);
      draftsSnapshot = await adminDb.collection('completed_policies').get();
    }

    // Search in organisation-scoped policies collection via collectionGroup('policies')
    // Include both published and legacy completed entries so the chatbot can access
    // policies that have been saved but not re-published yet.
    let publishedSnapshot;
    try {
      publishedSnapshot = await adminDb
        .collectionGroup('policies')
        .where('status', 'in', ['published', 'completed'])
        .get();
    } catch (statusInErr) {
      console.warn('Falling back to unrestricted policies collectionGroup fetch:', statusInErr);
      publishedSnapshot = await adminDb.collectionGroup('policies').get();
    }

    const allPolicies: PolicyDocument[] = [];

    // Process drafts
    draftsSnapshot.docs.forEach((doc: any) => {
      const data = doc.data() as PolicyDocument;
      // Backwards compatibility: treat missing status as completed
      const status = data.status || 'completed';
      allPolicies.push({
        ...data,
        status,
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

    const toResult = (policy: PolicyDocument) => {
      const regulations = extractCqcRegulationsFromText(policy.content);

      return {
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
          status: policy.status,
          regulations: regulations.map(({ code, label, title, summary, url }) => ({
            code,
            label,
            title,
            summary,
            url,
          })),
        },
        pdfPath: policy.pdfPath || null,
        storagePath: policy.storagePath || null,
        createdAt: policy.createdAt,
        folderId: 'policies',
        status: policy.status === 'published' ? 'current' : 'completed',
        tags: ['policy'],
        summary: `Policy document: ${policy.meta?.title || policy.policyName}`,
        regulations,
      };
    };

    const results = matchingPolicies.slice(0, 5).map(toResult);
    const bestMatchResult = toResult(bestMatch);

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