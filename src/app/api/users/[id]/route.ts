import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try top-level users/{id} first
    const userDoc = await adminDb.collection('users').doc(id).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return NextResponse.json({ id: userDoc.id, ...userData });
    }

    // Fallback: some deployments store user records under organisations/{orgId}/users/{id}
    // Use a collectionGroup query to find any organisation-scoped user doc for this id.
    try {
      const snaps = await adminDb.collectionGroup('users').where('id', '==', id).limit(1).get();
      if (!snaps.empty) {
        const docSnap = snaps.docs[0];
        const data = docSnap.data() || {};
        // If the document lives under organisations/{orgId}/users/{id}, derive orgId from the ref path
        let orgId: string | undefined = undefined;
        try {
          const ref = docSnap.ref;
          // parent -> organisations/{orgId}
          if (ref && ref.parent && ref.parent.parent && ref.parent.parent.id) {
            orgId = ref.parent.parent.id;
          }
        } catch (e) {
          // ignore
        }

        const merged = { id: docSnap.id, ...data, organisationId: data.organisationId || orgId } as any;
        return NextResponse.json(merged);
      }
    } catch (e) {
      console.error('Failed collectionGroup fallback lookup for user:', e);
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}