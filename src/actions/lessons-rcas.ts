"use server";

import admin, { adminDb } from '@/lib/firebase-admin';
import { workspaceCollectionPath } from '@/lib/paths';

type Actor = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export interface LessonsLearnedPayload {
  form: Record<string, any>;
  actions: Array<{ action: string; owner: string; timescale: string; status: string }>;
}

export interface RcaPayload {
  form: Record<string, any>;
  actions: Array<{ action: string; owner: string; timescale: string; status: string }>;
  timeline: string[];
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

export async function saveLessonsLearnedRecord({ workspaceId, organisationId, payload, actor }: SaveParams<LessonsLearnedPayload>) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user required');
  }

  const collectionPath = workspaceCollectionPath(workspaceId, 'lessons-learned', organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error('Invalid collection path for lessons learned');
  }

  const data = {
    recordType: 'lessons-learned',
    form: payload.form,
    actions: payload.actions,
    ...buildMeta(actor, workspaceId, organisationId ?? null),
  };

  const docRef = await adminDb.collection(collectionPath).add(data);
  return { id: docRef.id };
}

export async function saveRcaRecord({ workspaceId, organisationId, payload, actor }: SaveParams<RcaPayload>) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user required');
  }

  const collectionPath = workspaceCollectionPath(workspaceId, 'rca-records', organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error('Invalid collection path for RCA records');
  }

  const data = {
    recordType: 'root-cause-analysis',
    form: payload.form,
    actions: payload.actions,
    timeline: payload.timeline,
    ...buildMeta(actor, workspaceId, organisationId ?? null),
  };

  const docRef = await adminDb.collection(collectionPath).add(data);
  return { id: docRef.id };
}
