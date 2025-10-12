import { NextResponse } from 'next/server';
import admin, { adminDb } from '@/lib/firebase-admin';
import { resolveAdminContext } from '../../../_utils/admin-auth';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/feature-flags';
import type { FeatureModuleKey, OrganisationFeatureFlags } from '@/lib/types';

type PatchPayload = {
  featureKey?: FeatureModuleKey | string;
  enabled?: boolean;
};

function mergeFeatureFlags(existing: OrganisationFeatureFlags | null | undefined): OrganisationFeatureFlags {
  if (!existing) return DEFAULT_FEATURE_FLAGS;
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...existing,
    modules: {
      ...DEFAULT_FEATURE_FLAGS.modules,
      ...existing.modules,
    },
  };
}

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

    const snapshot = await adminDb.doc(`organisations/${organisationId}/settings/feature-flags`).get();
    const featureFlags = mergeFeatureFlags(snapshot.exists ? (snapshot.data() as OrganisationFeatureFlags) : null);

    return NextResponse.json({ featureFlags });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation feature-flags] GET failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to load feature flags' }, { status });
  }
}

export async function PATCH(req: Request, context: { params: { organisationId: string } }) {
  try {
    const ctx = await resolveAdminContext(req);
    if (!ctx.isAuthorised) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organisationId = context.params.organisationId;
    if (!organisationId) {
      return NextResponse.json({ error: 'organisationId required' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as PatchPayload;
    const featureKey = typeof body.featureKey === 'string' ? (body.featureKey as FeatureModuleKey) : null;
    if (!featureKey) {
      return NextResponse.json({ error: 'featureKey required' }, { status: 400 });
    }

    const enabled = body.enabled !== undefined ? Boolean(body.enabled) : null;
    if (enabled === null) {
      return NextResponse.json({ error: 'enabled flag required' }, { status: 400 });
    }

    const flagsRef = adminDb.doc(`organisations/${organisationId}/settings/feature-flags`);
    const snapshot = await flagsRef.get();
    const existing = mergeFeatureFlags(snapshot.exists ? (snapshot.data() as OrganisationFeatureFlags) : null);

    const targetModule = existing.modules[featureKey];
    if (!targetModule) {
      return NextResponse.json({ error: 'Unknown feature key' }, { status: 400 });
    }

    if (targetModule.isCore && !enabled) {
      return NextResponse.json({ error: 'Core features cannot be disabled' }, { status: 400 });
    }

    const updatedModules = {
      ...existing.modules,
      [featureKey]: {
        ...targetModule,
        enabled,
      },
    };

    await flagsRef.set({
      modules: updatedModules,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: ctx.uid ?? 'owner-console',
    }, { merge: true });

    return NextResponse.json({ ok: true, featureFlags: { ...existing, modules: updatedModules } });
  } catch (error) {
    const status = (error as any)?.statusCode === 403 ? 403 : 500;
    if (status === 500) {
      console.error('[admin organisation feature-flags] PATCH failed', error);
    }
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update feature flag' }, { status });
  }
}
