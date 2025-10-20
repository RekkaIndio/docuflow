import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import admin, { adminAuth, adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../_utils/admin-auth';
import { sendOnboardingInviteEmail } from '@/actions/email';

const TOKEN_BYTE_LENGTH = 24;
const DEFAULT_EXPIRY_HOURS = 7 * 24; // 7 days

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed && /@/.test(trimmed) ? trimmed : null;
}

function normaliseString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const recipientEmail = normaliseEmail(body?.recipientEmail);
    const organisationName = normaliseString(body?.organisationName);
    const contactName = normaliseString(body?.contactName);
    const expiresInHours = typeof body?.expiresInHours === 'number' && body.expiresInHours > 0
      ? Math.min(Math.floor(body.expiresInHours), 30 * 24)
      : DEFAULT_EXPIRY_HOURS;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }

    const token = randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
    const now = new Date();
    const expiresAtDate = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    const inviteRef = adminDb.collection('onboardingInvites').doc(token);
    const draftRef = adminDb.collection('onboardingDrafts').doc(token);

    await inviteRef.set({
      token,
      recipientEmail,
      organisationName: organisationName ?? null,
      contactName: contactName ?? null,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: ctx.uid ?? null,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
    });

    await draftRef.set({
      token,
      organisationName: organisationName ?? null,
      ownerContact: {
        email: recipientEmail,
        name: contactName ?? null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
    }, { merge: true });

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.docuflow.ai').replace(/\/$/, '');
    const onboardingLink = `${appBaseUrl}/onboarding/${token}`;

    let senderName: string | null = null;
    if (ctx.uid) {
      try {
        const userRecord = await adminAuth.getUser(ctx.uid);
        senderName = userRecord.displayName || userRecord.email || null;
      } catch (senderErr) {
        console.warn('[admin onboarding invite] failed to resolve sender name', senderErr);
      }
    }

    try {
      await sendOnboardingInviteEmail({
        recipientEmail,
        organisationName,
        onboardingLink,
        expiresInHours,
        senderName,
      });
    } catch (emailError) {
      console.warn('[admin onboarding invite] failed to send email', emailError);
    }

    return NextResponse.json({
      ok: true,
      invite: {
        token,
        recipientEmail,
        organisationName,
        contactName: contactName ?? null,
        status: 'pending',
        expiresAt: expiresAtDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('[admin onboarding invite] POST failed', error);
    return NextResponse.json({ error: 'Failed to create onboarding invite' }, { status: 500 });
  }
}
