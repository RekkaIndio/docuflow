"use server";

import admin, { adminDb } from '@/lib/firebase-admin';
import { workspaceCollectionPath } from '@/lib/paths';

type Actor = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export interface RiskAssessmentPayload {
  form: Record<string, any>;
}

interface SaveParams<TPayload> {
  workspaceId: string;
  organisationId?: string | null;
  payload: TPayload;
  actor: Actor;
}

function buildMeta(actor: Actor, workspaceId: string, organisationId?: string | null) {
  const timestamp = admin.firestore.Timestamp.now();
  return {
    workspaceId,
    organisationId: organisationId ?? null,
    createdBy: {
      id: actor.id,
      name: actor.name ?? null,
      email: actor.email ?? null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function saveRiskAssessmentRecord({ workspaceId, organisationId, payload, actor }: SaveParams<RiskAssessmentPayload>) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user required');
  }

  const collectionPath = workspaceCollectionPath(workspaceId, 'risk-assessments', organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error('Invalid collection path for risk assessments');
  }

  const data = {
    recordType: 'risk-assessment',
    form: payload.form,
    ...buildMeta(actor, workspaceId, organisationId ?? null),
  };

  const docRef = await adminDb.collection(collectionPath).add(data);
  return { id: docRef.id };
}