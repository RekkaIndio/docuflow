import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';

function toIso(value: any): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    return null;
  } catch (error) {
    console.warn('[public onboarding] failed to normalise timestamp', error);
    return null;
  }
}

function normaliseString(value: unknown, opts: { allowEmpty?: boolean } = {}): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed && !opts.allowEmpty) return null;
  return trimmed;
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !/@/.test(trimmed)) return null;
  return trimmed;
}

type SanitisedManagementContact = {
  name?: string | null;
  email?: string | null;
  notKnown?: boolean;
};

type DraftPayload = {
  organisationName?: string | null;
  serviceType?: string | null;
  locationCount?: number | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  goLiveNotes?: string | null;
  ownerContact?: {
    name?: string | null;
    email?: string | null;
    notKnown?: boolean;
  } | null;
  managementContacts?: SanitisedManagementContact[];
  notes?: string | null;
};

function sanitiseDraftPayload(payload: any): DraftPayload {
  const result: DraftPayload = {};
  if (payload == null || typeof payload !== 'object') return result;

  const organisationName = normaliseString(payload.organisationName);
  if (organisationName) result.organisationName = organisationName;

  const serviceType = normaliseString(payload.serviceType, { allowEmpty: true });
  if (serviceType !== null) result.serviceType = serviceType;

  if (typeof payload.locationCount === 'number' && Number.isFinite(payload.locationCount)) {
    const value = Math.max(0, Math.floor(payload.locationCount));
    result.locationCount = value;
  }

  const addressLine1 = normaliseString(payload.addressLine1, { allowEmpty: true });
  if (addressLine1 !== null) result.addressLine1 = addressLine1;
  const addressLine2 = normaliseString(payload.addressLine2, { allowEmpty: true });
  if (addressLine2 !== null) result.addressLine2 = addressLine2;
  const city = normaliseString(payload.city, { allowEmpty: true });
  if (city !== null) result.city = city;
  const postcode = normaliseString(payload.postcode, { allowEmpty: true });
  if (postcode !== null) result.postcode = postcode;
  const country = normaliseString(payload.country, { allowEmpty: true });
  if (country !== null) result.country = country;
  const goLiveNotes = normaliseString(payload.goLiveNotes, { allowEmpty: true });
  if (goLiveNotes !== null) result.goLiveNotes = goLiveNotes;

  if (payload.ownerContact && typeof payload.ownerContact === 'object') {
    const ownerEmail = normaliseEmail(payload.ownerContact.email) ?? null;
    const ownerName = normaliseString(payload.ownerContact.name, { allowEmpty: true });
    const notKnown = payload.ownerContact.notKnown === true;
    result.ownerContact = {
      name: ownerName,
      email: ownerEmail,
      notKnown,
    };
  }

  if (Array.isArray(payload.managementContacts)) {
    const sanitisedContacts = payload.managementContacts
      .slice(0, 6)
      .map((contact: unknown): SanitisedManagementContact | null => {
        if (!contact || typeof contact !== 'object') return null;
        const record = contact as Record<string, unknown>;
        const email = normaliseEmail(record.email) ?? null;
        const name = normaliseString(record.name, { allowEmpty: true });
        const notKnown = record.notKnown === true;
        if (!email && !name && !notKnown) return null;
        return { name, email, notKnown };
      })
      .filter((contact: SanitisedManagementContact | null): contact is SanitisedManagementContact => contact !== null);

    if (sanitisedContacts.length > 0) {
      result.managementContacts = sanitisedContacts;
    }
  }

  const notes = normaliseString(payload.notes, { allowEmpty: true });
  if (notes !== null) result.notes = notes;

  return result;
}

async function resolveInvite(token: string) {
  const inviteRef = adminDb.collection('onboardingInvites').doc(token);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    return { inviteRef, inviteSnap: null, inviteData: null } as const;
  }
  const inviteData = inviteSnap.data() as Record<string, any>;
  return { inviteRef, inviteSnap, inviteData } as const;
}

async function resolveDraft(token: string) {
  const draftRef = adminDb.collection('onboardingDrafts').doc(token);
  const draftSnap = await draftRef.get();
  const draftData = draftSnap.exists ? (draftSnap.data() as Record<string, any>) : null;
  return { draftRef, draftSnap, draftData } as const;
}

function isExpired(inviteData: Record<string, any>): boolean {
  if (!inviteData?.expiresAt) return false;
  try {
    const expiresAt = inviteData.expiresAt instanceof Date
      ? inviteData.expiresAt
      : typeof inviteData.expiresAt.toDate === 'function'
        ? inviteData.expiresAt.toDate()
        : new Date(inviteData.expiresAt);
    return Date.now() > expiresAt.getTime();
  } catch (error) {
    console.warn('[public onboarding] failed parsing expiry', error);
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const { inviteSnap, inviteData } = await resolveInvite(token);
    if (!inviteSnap || !inviteData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const expired = isExpired(inviteData);
    const { draftData } = await resolveDraft(token);

    return NextResponse.json({
      invite: {
        token,
        status: inviteData.status ?? 'pending',
        organisationName: inviteData.organisationName ?? draftData?.organisationName ?? null,
        recipientEmail: inviteData.recipientEmail ?? null,
        contactName: inviteData.contactName ?? null,
        expiresAt: toIso(inviteData.expiresAt),
        expired,
        submittedAt: toIso(inviteData.submittedAt),
      },
      draft: draftData ? {
        organisationName: draftData.organisationName ?? null,
        serviceType: draftData.serviceType ?? null,
        locationCount: draftData.locationCount ?? null,
        addressLine1: draftData.addressLine1 ?? null,
        addressLine2: draftData.addressLine2 ?? null,
        city: draftData.city ?? null,
        postcode: draftData.postcode ?? null,
        country: draftData.country ?? null,
        goLiveNotes: draftData.goLiveNotes ?? null,
        ownerContact: draftData.ownerContact ?? null,
        managementContacts: Array.isArray(draftData.managementContacts) ? draftData.managementContacts : [],
        notes: draftData.notes ?? null,
        status: draftData.status ?? inviteData.status ?? 'pending',
        updatedAt: toIso(draftData.updatedAt),
      } : null,
    });
  } catch (error) {
    console.error('[public onboarding] GET failed', error);
    return NextResponse.json({ error: 'Failed to load onboarding invite' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    const updates = sanitiseDraftPayload(payload);

    const { inviteRef, inviteSnap, inviteData } = await resolveInvite(token);
    if (!inviteSnap || !inviteData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (inviteData.status === 'submitted' || inviteData.status === 'completed') {
      return NextResponse.json({ error: 'This onboarding invite has already been submitted.' }, { status: 409 });
    }

    if (isExpired(inviteData)) {
      await inviteRef.update({ status: 'expired', expiredAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => undefined);
      return NextResponse.json({ error: 'This onboarding invite has expired.' }, { status: 410 });
    }

    const { draftRef } = await resolveDraft(token);

    await draftRef.set(
      {
        ...updates,
        token,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPatchedAt: admin.firestore.FieldValue.serverTimestamp(),
        organisationName: updates.organisationName ?? inviteData.organisationName ?? null,
      },
      { merge: true }
    );

    await inviteRef.set(
      {
        organisationName: updates.organisationName ?? inviteData.organisationName ?? null,
        lastTouchedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[public onboarding] PATCH failed', error);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    const action = typeof payload?.action === 'string' ? payload.action : 'submit';

    const { inviteRef, inviteSnap, inviteData } = await resolveInvite(token);
    if (!inviteSnap || !inviteData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (inviteData.status === 'submitted' && action === 'submit') {
      return NextResponse.json({ ok: true, status: 'submitted' });
    }

    if (isExpired(inviteData)) {
      await inviteRef.update({ status: 'expired', expiredAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => undefined);
      return NextResponse.json({ error: 'This onboarding invite has expired.' }, { status: 410 });
    }

    if (action === 'submit') {
      const submittedAt = admin.firestore.FieldValue.serverTimestamp();
      await inviteRef.set(
        {
          status: 'submitted',
          submittedAt,
        },
        { merge: true }
      );
      await adminDb.collection('onboardingDrafts').doc(token).set(
        {
          status: 'submitted',
          submittedAt,
          updatedAt: submittedAt,
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true, status: 'submitted' });
    }

    if (action === 'reopen') {
      await inviteRef.set(
        {
          status: 'pending',
          reopenedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await adminDb.collection('onboardingDrafts').doc(token).set(
        {
          status: 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({ ok: true, status: 'pending' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[public onboarding] POST failed', error);
    return NextResponse.json({ error: 'Failed to process onboarding request' }, { status: 500 });
  }
}
