import { NextResponse } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../_utils/admin-auth';
import { ensureProtectedFolders } from '../_utils/workspaces';
import { randomBytes } from 'crypto';
import type { UserRecord } from 'firebase-admin/auth';

function toIso(value: any): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return null;
  } catch (error) {
    console.warn('[admin organisations] failed to format timestamp', error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('organisations').orderBy('createdAt', 'desc').get();
    const organisations = await Promise.all(
  snapshot.docs.map(async (docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = docSnap.data() as Record<string, any>;
        const workspacesSnap = await adminDb.collection(`organisations/${docSnap.id}/workspaces`).get();
        const membersSnap = await adminDb.collection(`organisations/${docSnap.id}/users`).get().catch(() => ({ size: 0 }));
        return {
          id: docSnap.id,
          name: data?.name || 'Untitled organisation',
          ownerId: data?.ownerId ?? null,
          createdAt: toIso(data?.createdAt) || null,
          workspaceLimit: typeof data?.workspaceLimit === 'number' ? data.workspaceLimit : null,
          workspaceCount: workspacesSnap.size,
          memberCount: membersSnap.size || 0,
        };
      })
    );

    return NextResponse.json({ organisations });
  } catch (error) {
    console.error('[admin organisations] GET failed', error);
    return NextResponse.json({ error: 'Failed to load organisations' }, { status: 500 });
  }
}

type ProvisionPayload = {
  organisationName?: string;
  organisationSlug?: string | null;
  workspaceLimit?: number | null;
  ownerEmail?: string;
  ownerName?: string | null;
  workspaceName?: string | null;
  sendPasswordEmail?: boolean;
};

export async function POST(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as ProvisionPayload;
    const organisationName = (body.organisationName || '').trim();
    const ownerEmail = (body.ownerEmail || '').trim().toLowerCase();
    const ownerName = (body.ownerName || '').trim();
    const workspaceName = (body.workspaceName || '').trim();

    if (!organisationName) {
      return NextResponse.json({ error: 'organisationName is required' }, { status: 400 });
    }
    if (!ownerEmail) {
      return NextResponse.json({ error: 'ownerEmail is required' }, { status: 400 });
    }

  let ownerRecord: UserRecord | null = null;
    let userCreated = false;

    try {
      ownerRecord = await adminAuth.getUserByEmail(ownerEmail);
      if (ownerRecord && ownerName && ownerRecord.displayName !== ownerName) {
        await adminAuth.updateUser(ownerRecord.uid, { displayName: ownerName });
        ownerRecord = await adminAuth.getUser(ownerRecord.uid);
      }
    } catch (error) {
      if ((error as any)?.code === 'auth/user-not-found') {
        const fallbackName = ownerName || ownerEmail.split('@')[0];
        const tempSecret = randomBytes(12).toString('base64url');
        const createdRecord = await adminAuth.createUser({
          email: ownerEmail,
          password: `${tempSecret}Aa1!`,
          displayName: fallbackName,
          emailVerified: false,
        });
        ownerRecord = createdRecord;
        if (ownerName && ownerName !== fallbackName) {
          await adminAuth.updateUser(createdRecord.uid, { displayName: ownerName });
          ownerRecord = await adminAuth.getUser(createdRecord.uid);
        }
        userCreated = true;
      } else {
        throw error;
      }
    }

    if (!ownerRecord) {
      return NextResponse.json({ error: 'Failed to resolve owner user' }, { status: 500 });
    }

    const ownerId = ownerRecord.uid;
    const existingClaims = ownerRecord.customClaims || {};
    const updatedClaims = { ...existingClaims, owner: true };
    if (body.sendPasswordEmail) {
      // no-op — kept for future use so we can hook additional claims if needed
    }
    try {
      await adminAuth.setCustomUserClaims(ownerId, updatedClaims);
    } catch (claimsError) {
      console.warn('[admin organisations] failed to set owner custom claims', claimsError);
    }

    const orgRef = adminDb.collection('organisations').doc();
    const organisationPayload: Record<string, any> = {
      name: organisationName,
      ownerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (body.organisationSlug) organisationPayload.slug = body.organisationSlug;
    if (typeof body.workspaceLimit === 'number') organisationPayload.workspaceLimit = body.workspaceLimit;

    await orgRef.set(organisationPayload);

    const userDocRef = adminDb.collection('users').doc(ownerId);
    await userDocRef.set(
      {
        id: ownerId,
        name: ownerName || ownerRecord.displayName || null,
        email: ownerEmail,
        organisationId: orgRef.id,
        role: 'Owner',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const orgUserRef = adminDb.doc(`organisations/${orgRef.id}/users/${ownerId}`);
    await orgUserRef.set(
      {
        id: ownerId,
        name: ownerName || ownerRecord.displayName || null,
        email: ownerEmail,
        organisationId: orgRef.id,
        role: 'Owner',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const workspaceRef = adminDb.collection(`organisations/${orgRef.id}/workspaces`).doc();
    const effectiveWorkspaceName = workspaceName || `${organisationName} Workspace`;

    await workspaceRef.set({
      name: effectiveWorkspaceName,
      ownerId,
      members: [ownerId],
      organisationId: orgRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      provisionedBy: ctx.uid || 'admin-console',
    });

    try {
      await ensureProtectedFolders(workspaceRef.id, orgRef.id);
    } catch (foldersError) {
      console.warn('[admin organisations] failed to set protected folders', foldersError);
    }

    let passwordLink: string | null = null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.docuflow.ai';
    try {
      passwordLink = await adminAuth.generatePasswordResetLink(ownerEmail, {
        url: `${baseUrl.replace(/\/$/, '')}/set-password`,
      });
    } catch (linkError) {
      console.warn('[admin organisations] failed to generate password link', linkError);
    }

    return NextResponse.json({
      ok: true,
      organisation: {
        id: orgRef.id,
        name: organisationName,
        ownerId,
      },
      workspace: {
        id: workspaceRef.id,
        name: effectiveWorkspaceName,
      },
      owner: {
        id: ownerId,
        email: ownerEmail,
        name: ownerName || ownerRecord.displayName || null,
      },
      userCreated,
      passwordLink,
    });
  } catch (error) {
    console.error('[admin organisations] POST failed', error);
    const message = (error as any)?.message || 'Failed to provision organisation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
