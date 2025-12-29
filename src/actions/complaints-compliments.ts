"use server";

import admin, { adminDb } from '@/lib/firebase-admin';
import { workspaceCollectionPath } from '@/lib/paths';

type Actor = {
    id: string;
    name?: string | null;
    email?: string | null;
};

export interface ComplaintPayload {
    form: Record<string, any>;
}

export interface ComplimentPayload {
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

function generateLogNumber(prefix: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}${month}${day}-${random}`;
}

export async function saveComplaintRecord({ workspaceId, organisationId, payload, actor }: SaveParams<ComplaintPayload>) {
    if (!workspaceId) {
        throw new Error('Workspace ID is required');
    }
    if (!actor?.id) {
        throw new Error('Authenticated user required');
    }

    const collectionPath = workspaceCollectionPath(workspaceId, 'complaints', organisationId ?? undefined);
    if (!collectionPath) {
        throw new Error('Invalid collection path for complaints');
    }

    const logNumber = generateLogNumber('CMP');

    const data = {
        recordType: 'complaint',
        logNumber,
        form: payload.form,
        ...buildMeta(actor, workspaceId, organisationId ?? null),
    };

    const docRef = await adminDb.collection(collectionPath).add(data);
    return { id: docRef.id, logNumber };
}

export async function saveComplimentRecord({ workspaceId, organisationId, payload, actor }: SaveParams<ComplimentPayload>) {
    if (!workspaceId) {
        throw new Error('Workspace ID is required');
    }
    if (!actor?.id) {
        throw new Error('Authenticated user required');
    }

    const collectionPath = workspaceCollectionPath(workspaceId, 'compliments', organisationId ?? undefined);
    if (!collectionPath) {
        throw new Error('Invalid collection path for compliments');
    }

    const logNumber = generateLogNumber('CPL');

    const data = {
        recordType: 'compliment',
        logNumber,
        form: payload.form,
        ...buildMeta(actor, workspaceId, organisationId ?? null),
    };

    const docRef = await adminDb.collection(collectionPath).add(data);
    return { id: docRef.id, logNumber };
}
