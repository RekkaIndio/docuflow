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

    // Get published policies across organisations by using a collectionGroup query on `policies`.
    // Some Firestore setups may reject a collectionGroup query with an orderBy (index requirement),
    // so try the ordered query first and fall back to an unordered collectionGroup fetch and
    // perform sorting in JavaScript.
    let publishedSnapshot: any;
    try {
      publishedSnapshot = await adminDb.collectionGroup('policies').orderBy('updatedAt', 'desc').get();
    } catch (err) {
      console.warn('collectionGroup orderBy failed, falling back to unordered collectionGroup fetch:', err && (err as any).message ? (err as any).message : String(err));
      publishedSnapshot = await adminDb.collectionGroup('policies').get();
    }

    const drafts = draftsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as PolicyDocument[];

    let published = publishedSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      _refPath: doc.ref.path,
      ...doc.data()
    })) as PolicyDocument[];

    // If we fetched without server-side ordering, sort by updatedAt (desc) so UI shows newest first.
    try {
      published.sort((a: any, b: any) => {
        const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return tb - ta;
      });
    } catch (e) {
      // ignore sort errors
    }

    return NextResponse.json({
      drafts,
      published,
      total: drafts.length + published.length
    });

  } catch (error) {
    // Detailed logging to help debug admin listing failures
    try { console.error('Error fetching policies from Firebase (detailed):', error, (error as any)?.stack); } catch (e) {}
    const isDev = process.env.NODE_ENV !== 'production';
    const body: any = { error: 'Failed to fetch policies from Firebase' };
    if (isDev) {
      body.details = (error && (error as any).message) || String(error);
      body.stack = (error as any).stack || null;
    }
    return NextResponse.json(body, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('id');
    const collection = searchParams.get('collection') || 'completed_policies';
    const docPath = searchParams.get('path');

    if (!policyId) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    if (docPath) {
      // Delete by direct document path
      await adminDb.doc(docPath).delete();
    } else {
      await adminDb.collection(collection).doc(policyId).delete();
    }

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