import { NextResponse } from 'next/server';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import admin, { adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../_utils/admin-auth';

function toIso(value: any): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    return null;
  } catch (error) {
    console.warn('[admin onboarding] failed to normalise timestamp', error);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb
      .collection('onboardingInvites')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const invites = await Promise.all(
      snapshot.docs.map(async (doc: QueryDocumentSnapshot<DocumentData>) => {
        const inviteData = doc.data() as Record<string, any>;
        const draftSnap = await adminDb.collection('onboardingDrafts').doc(doc.id).get();
        const draftData = draftSnap.exists ? (draftSnap.data() as Record<string, any>) : null;
        return {
          token: doc.id,
          recipientEmail: inviteData.recipientEmail ?? null,
          organisationName: inviteData.organisationName ?? draftData?.organisationName ?? null,
          contactName: inviteData.contactName ?? draftData?.ownerContact?.name ?? null,
          status: inviteData.status ?? 'pending',
          createdAt: toIso(inviteData.createdAt),
          expiresAt: toIso(inviteData.expiresAt),
          submittedAt: toIso(inviteData.submittedAt),
          createdBy: inviteData.createdBy ?? null,
          draft: draftData
            ? {
                organisation: {
                  name: draftData.organisationName ?? null,
                  serviceType: draftData.serviceType ?? null,
                  locationCount: draftData.locationCount ?? null,
                  notes: draftData.notes ?? null,
                },
                ownerContact: draftData.ownerContact ?? null,
                managementContacts: Array.isArray(draftData.managementContacts) ? draftData.managementContacts : [],
                updatedAt: toIso(draftData.updatedAt),
                status: draftData.status ?? inviteData.status ?? 'pending',
              }
            : null,
        };
      })
    );

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('[admin onboarding] GET failed', error);
    return NextResponse.json({ error: 'Failed to load onboarding invites' }, { status: 500 });
  }
}
