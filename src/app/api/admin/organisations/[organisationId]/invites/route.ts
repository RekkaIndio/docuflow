import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveAdminContext } from '../../../_utils/admin-auth';
import { adminDb } from '@/lib/firebase-admin';

function toIso(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

type InviteSummary = {
  id: string;
  email: string | null;
  role: string | null;
  workspaceId: string | null;
  organisationId: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
};

export async function GET(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('loginTokens').where('type', '==', 'invite').get();
    const invites: InviteSummary[] = snapshot.docs
      .map((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = docSnap.data() as Record<string, any>;
        const inviteOrgId = data?.organisationId ?? data?.workspaceOrgId ?? null;
        return {
          id: docSnap.id,
          email: typeof data?.email === 'string' ? data.email : null,
          role: typeof data?.role === 'string' ? data.role : null,
          workspaceId: typeof data?.workspaceId === 'string' ? data.workspaceId : null,
          organisationId: inviteOrgId,
          createdAt: toIso(data?.createdAt) ?? null,
          expiresAt: toIso(data?.expiresAt) ?? null,
          consumedAt: toIso(data?.consumedAt) ?? null,
        };
      })
  .filter((invite: InviteSummary) => invite.organisationId === organisationId && !invite.consumedAt);

    return NextResponse.json({ invites });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation invites] GET failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to load invites' }, { status });
  }
}

type CreateInvitePayload = {
  email?: string;
  role?: string;
  workspaceId?: string | null;
  expiresInHours?: number;
};

type DeleteInvitePayload = {
  token?: string;
};

export async function POST(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as CreateInvitePayload;
    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const hours = typeof body.expiresInHours === 'number' && body.expiresInHours > 0 ? body.expiresInHours : 168; // default 7 days
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const token = crypto.randomBytes(16).toString('hex');

    const payload = {
      email,
      type: 'invite',
      organisationId,
      workspaceOrgId: organisationId,
      workspaceId: body.workspaceId || null,
      role: body.role || 'Member',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      createdBy: ctx.uid ?? 'owner-console',
    };

    await adminDb.collection('loginTokens').doc(token).set(payload);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.docuflow.ai';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/accept-invite?token=${token}`;

    return NextResponse.json({ ok: true, token, inviteUrl, expiresAt: payload.expiresAt });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation invites] POST failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create invite' }, { status });
  }
}

export async function DELETE(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as DeleteInvitePayload;
    const token = typeof body?.token === 'string' ? body.token : null;
    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    const docRef = adminDb.collection('loginTokens').doc(token);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const data = snapshot.data() as Record<string, any>;
    const inviteOrgId = data?.organisationId ?? data?.workspaceOrgId ?? null;
    if (inviteOrgId !== organisationId) {
      return NextResponse.json({ error: 'Invite does not belong to organisation' }, { status: 403 });
    }

    await docRef.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation invites] DELETE failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to revoke invite' }, { status });
  }
}
