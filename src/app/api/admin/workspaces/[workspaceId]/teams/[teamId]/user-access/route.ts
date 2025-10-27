import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Server-side admin route to set per-user access on a team in a workspace.
// This route must run in Node and may import firebase-admin.
// It accepts a POST with JSON body:
// { organisationId?: string, userKey: string, accessibleFolderIds?: string[], featureAccess?: Record<string, boolean>, expiresAt?: string|number }
// expiresAt may be an ISO string or epoch ms. If provided, it will be stored as a Firestore Timestamp.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.warn('Failed to initialize firebase-admin in user-access route:', e?.toString?.() ?? e);
  }
}

const adminDb = admin.firestore();

function isString(v: any): v is string { return typeof v === 'string'; }

export async function POST(req: NextRequest, { params }: { params: { workspaceId: string; teamId: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);

    // Simple admin/owner check reusing the same approach as /api/admin/verify
    let isOwner = decoded?.owner === true || (decoded?.role || '').toString().toLowerCase() === 'owner';
    if (!isOwner) {
      try {
        const emailKey = (decoded?.email || '').toLowerCase();
        if (emailKey) {
          const emailDoc = await adminDb.collection('owners').doc(emailKey).get();
          if (emailDoc.exists) isOwner = true;
        }
        if (!isOwner && decoded.uid) {
          const uidDoc = await adminDb.collection('owners').doc(decoded.uid).get();
          if (uidDoc.exists) isOwner = true;
        }
      } catch (ownerErr) {
        console.warn('[user-access] owner lookup failed', ownerErr);
      }
    }

    let isAdmin = isOwner || decoded?.admin === true || (decoded?.role || '').toString().toLowerCase() === 'admin';
    if (!isAdmin && decoded.uid) {
      try {
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as any;
          const role = (userData?.role || '').toString().toLowerCase();
          if (role === 'admin' || role === 'owner') isAdmin = true;
        } else {
          const snaps = await adminDb.collectionGroup('users').where('id', '==', decoded.uid).limit(1).get();
          if (!snaps.empty) {
            const docSnap = snaps.docs[0];
            const userData = docSnap.data() as any;
            const role = (userData?.role || '').toString().toLowerCase();
            if (role === 'admin' || role === 'owner') isAdmin = true;
          }
        }
      } catch (userErr) {
        console.warn('[user-access] admin role lookup failed', userErr);
      }
    }

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { workspaceId, teamId } = params;
    const body = await req.json();
    const { organisationId, userKey } = body as any;
    if (!workspaceId || !teamId || !userKey || !isString(userKey)) {
      return NextResponse.json({ error: 'workspaceId, teamId and userKey are required' }, { status: 400 });
    }

    // Build team doc path
    const teamDocPath = organisationId
      ? `organisations/${organisationId}/workspaces/${workspaceId}/teams/${teamId}`
      : `workspaces/${workspaceId}/teams/${teamId}`;

    const teamRef = adminDb.doc(teamDocPath);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const updateObj: Record<string, any> = {};

    if (Array.isArray(body.accessibleFolderIds)) {
      updateObj[`userAccess.${userKey}.accessibleFolderIds`] = body.accessibleFolderIds;
    }

    if (body.featureAccess && typeof body.featureAccess === 'object') {
      updateObj[`userAccess.${userKey}.featureAccess`] = body.featureAccess;
    }

    if (body.expiresAt) {
      let expiresDate: Date | null = null;
      if (typeof body.expiresAt === 'number') expiresDate = new Date(body.expiresAt);
      else if (typeof body.expiresAt === 'string') expiresDate = new Date(body.expiresAt);
      if (expiresDate && !Number.isNaN(expiresDate.getTime())) {
        updateObj[`userAccess.${userKey}.expiresAt`] = admin.firestore.Timestamp.fromDate(expiresDate);
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await teamRef.update(updateObj);

    return NextResponse.json({ success: true, updated: updateObj });
  } catch (e) {
    console.error('/api/admin/.../user-access error', e);
    return NextResponse.json({ error: (e?.toString?.() ?? e) }, { status: 500 });
  }
}
