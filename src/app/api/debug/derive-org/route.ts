import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, organisationId: bodyOrg } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

    let resolved: any = { workspaceId, bodyOrg: bodyOrg || null, foundOrg: null, method: null };

    if (bodyOrg) {
      resolved.foundOrg = bodyOrg;
      resolved.method = 'body';
      return NextResponse.json(resolved);
    }

    // Try legacy workspaces doc
    try {
      const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
      if (wsSnap.exists) {
        const data = wsSnap.data() as any;
        if (data?.organisationId) {
          resolved.foundOrg = data.organisationId;
          resolved.method = 'legacy-workspaces-doc';
          return NextResponse.json(resolved);
        }
      }
    } catch (e) {
      resolved.legacyError = String(e);
    }

    // Try collectionGroup lookup
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('@/lib/firebase-admin').default;
      const FieldPath = admin.firestore.FieldPath;
      const cgSnap = await adminDb.collectionGroup('workspaces').where(FieldPath.documentId(), '==', workspaceId).limit(1).get();
      if (!cgSnap.empty) {
        const foundRef = cgSnap.docs[0].ref;
        const parts = foundRef.path.split('/');
        const orgIndex = parts.indexOf('organisations');
        if (orgIndex !== -1 && parts.length > orgIndex + 1) {
          resolved.foundOrg = parts[orgIndex + 1];
          resolved.method = 'collectionGroup';
          return NextResponse.json(resolved);
        }
      }
    } catch (e) {
      resolved.cgError = String(e);
    }

    resolved.method = 'not-found';
    return NextResponse.json(resolved);
  } catch (err) {
    return NextResponse.json({ error: 'internal error', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}
