"use server";

import admin, { adminDb } from "@/lib/firebase-admin";
import { workspaceCollectionPath } from "@/lib/paths";
import type { Transaction, DocumentData, DocumentSnapshot } from "firebase-admin/firestore";

type Actor = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export interface AddCqcLogPayload {
  uniqueReferenceNumber: string;
  residentName: string;
  cqcNotificationDate?: string;
  cqcAcknowledgementReceived: boolean | null;
  incidentDate?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld: boolean | null;
  investigationComplete: boolean | null;
  lessonsLearntComplete: boolean | null;
  rootCauseAnalysisComplete: boolean | null;
  sovaCompleted: boolean | null;
  sovaComments?: string;
  outcome?: string;
  dateClosed?: string;
  lessonsLearntRecordId?: string | null;
  rootCauseAnalysisRecordId?: string | null;
  linkedSovaLogId?: string | null;
}

export interface AddSovaLogPayload {
  residentName: string;
  incidentDate?: string;
  dateSovaRaised?: string;
  incidentDetails?: string;
  dutyOfCandourUpheld: boolean | null;
  investigationComplete: boolean | null;
  cqcNotificationSubmitted: boolean | null;
  lessonsLearntComplete: boolean | null;
  rootCauseAnalysisComplete: boolean | null;
  outcome?: string;
  dateClosed?: string;
  lessonsLearntRecordId?: string | null;
  rootCauseAnalysisRecordId?: string | null;
  linkedCqcLogId?: string | null;
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

function buildUpdatedBy(actor: Actor) {
  return {
    id: actor.id,
    name: actor.name ?? null,
    email: actor.email ?? null,
  };
}

function sanitise(value?: string) {
  return value ? value.trim() : "";
}

function sanitiseOptional(value?: string | null) {
  const trimmed = value ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function normaliseTriState(value: boolean | null | undefined) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export async function addCqcLogEntry({ workspaceId, organisationId, payload, actor }: SaveParams<AddCqcLogPayload>) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }
  if (!actor?.id) {
    throw new Error("Authenticated user required");
  }

  const collectionPath = workspaceCollectionPath(workspaceId, "cqc-log", organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error("Invalid collection path for CQC log");
  }

  const collectionRef = adminDb.collection(collectionPath);
  // Use a transaction so running numbers remain sequential when multiple users add entries.
  const runningCounter = await adminDb.runTransaction(async (tx: Transaction) => {
    const latestSnapshot = await tx.get(collectionRef.orderBy("runningLogNumber", "desc").limit(1));
    const nextNumber = latestSnapshot.empty ? 1 : (Number(latestSnapshot.docs[0].get("runningLogNumber") || 0) + 1);
    const docRef = collectionRef.doc();
    const base = buildMeta(actor, workspaceId, organisationId ?? null);
    tx.set(docRef, {
      runningLogNumber: nextNumber,
      uniqueReferenceNumber: sanitise(payload.uniqueReferenceNumber),
      residentName: sanitise(payload.residentName),
      cqcNotificationDate: sanitise(payload.cqcNotificationDate),
      cqcAcknowledgementReceived: normaliseTriState(payload.cqcAcknowledgementReceived),
      incidentDate: sanitise(payload.incidentDate),
      incidentDetails: sanitise(payload.incidentDetails),
      dutyOfCandourUpheld: normaliseTriState(payload.dutyOfCandourUpheld),
      investigationComplete: normaliseTriState(payload.investigationComplete),
      lessonsLearntComplete: normaliseTriState(payload.lessonsLearntComplete),
      rootCauseAnalysisComplete: normaliseTriState(payload.rootCauseAnalysisComplete),
      sovaCompleted: normaliseTriState(payload.sovaCompleted),
      sovaComments: sanitise(payload.sovaComments),
      outcome: sanitise(payload.outcome),
      dateClosed: sanitise(payload.dateClosed),
      lessonsLearntRecordId: sanitiseOptional(payload.lessonsLearntRecordId),
      rootCauseAnalysisRecordId: sanitiseOptional(payload.rootCauseAnalysisRecordId),
      linkedSovaLogId: sanitiseOptional(payload.linkedSovaLogId),
      ...base,
    });
    return { id: docRef.id, runningLogNumber: nextNumber };
  });

  return runningCounter;
}

interface UpdateCqcLogParams extends SaveParams<AddCqcLogPayload> {
  entryId: string;
}

export async function updateCqcLogEntry({ workspaceId, organisationId, payload, actor, entryId }: UpdateCqcLogParams) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }
  if (!actor?.id) {
    throw new Error("Authenticated user required");
  }
  if (!entryId) {
    throw new Error("Entry ID is required");
  }

  const collectionPath = workspaceCollectionPath(workspaceId, "cqc-log", organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error("Invalid collection path for CQC log");
  }

  const docRef = adminDb.collection(collectionPath).doc(entryId);
  const timestamp = admin.firestore.Timestamp.now();
  const updateData = {
    uniqueReferenceNumber: sanitise(payload.uniqueReferenceNumber),
    residentName: sanitise(payload.residentName),
    cqcNotificationDate: sanitise(payload.cqcNotificationDate),
    cqcAcknowledgementReceived: normaliseTriState(payload.cqcAcknowledgementReceived),
    incidentDate: sanitise(payload.incidentDate),
    incidentDetails: sanitise(payload.incidentDetails),
    dutyOfCandourUpheld: normaliseTriState(payload.dutyOfCandourUpheld),
    investigationComplete: normaliseTriState(payload.investigationComplete),
    lessonsLearntComplete: normaliseTriState(payload.lessonsLearntComplete),
    rootCauseAnalysisComplete: normaliseTriState(payload.rootCauseAnalysisComplete),
    sovaCompleted: normaliseTriState(payload.sovaCompleted),
    sovaComments: sanitise(payload.sovaComments),
    outcome: sanitise(payload.outcome),
    dateClosed: sanitise(payload.dateClosed),
    lessonsLearntRecordId: sanitiseOptional(payload.lessonsLearntRecordId),
    rootCauseAnalysisRecordId: sanitiseOptional(payload.rootCauseAnalysisRecordId),
    linkedSovaLogId: sanitiseOptional(payload.linkedSovaLogId),
    updatedAt: timestamp,
    updatedBy: buildUpdatedBy(actor),
  };

  await adminDb.runTransaction(async (tx: Transaction) => {
    const snapshot = (await tx.get(docRef)) as unknown as DocumentSnapshot<DocumentData>;
    if (!snapshot.exists) {
      throw new Error("CQC log entry not found");
    }
    tx.update(docRef, updateData);
  });

  return { id: entryId };
}

export async function addSovaLogEntry({ workspaceId, organisationId, payload, actor }: SaveParams<AddSovaLogPayload>) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }
  if (!actor?.id) {
    throw new Error("Authenticated user required");
  }

  const collectionPath = workspaceCollectionPath(workspaceId, "sova-log", organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error("Invalid collection path for SOVA log");
  }

  const collectionRef = adminDb.collection(collectionPath);
  // Same transactional pattern ensures the running number for SOVA logs does not skip.
  const result = await adminDb.runTransaction(async (tx: Transaction) => {
    const latestSnapshot = await tx.get(collectionRef.orderBy("runningLogNumber", "desc").limit(1));
    const nextNumber = latestSnapshot.empty ? 1 : (Number(latestSnapshot.docs[0].get("runningLogNumber") || 0) + 1);
    const docRef = collectionRef.doc();
    const base = buildMeta(actor, workspaceId, organisationId ?? null);
    tx.set(docRef, {
      runningLogNumber: nextNumber,
      residentName: sanitise(payload.residentName),
      incidentDate: sanitise(payload.incidentDate),
      dateSovaRaised: sanitise(payload.dateSovaRaised),
      incidentDetails: sanitise(payload.incidentDetails),
      dutyOfCandourUpheld: normaliseTriState(payload.dutyOfCandourUpheld),
      investigationComplete: normaliseTriState(payload.investigationComplete),
      cqcNotificationSubmitted: normaliseTriState(payload.cqcNotificationSubmitted),
      lessonsLearntComplete: normaliseTriState(payload.lessonsLearntComplete),
      rootCauseAnalysisComplete: normaliseTriState(payload.rootCauseAnalysisComplete),
      outcome: sanitise(payload.outcome),
      dateClosed: sanitise(payload.dateClosed),
      lessonsLearntRecordId: sanitiseOptional(payload.lessonsLearntRecordId),
      rootCauseAnalysisRecordId: sanitiseOptional(payload.rootCauseAnalysisRecordId),
      linkedCqcLogId: sanitiseOptional(payload.linkedCqcLogId),
      ...base,
    });
    return { id: docRef.id, runningLogNumber: nextNumber };
  });

  return result;
}

interface UpdateSovaLogParams extends SaveParams<AddSovaLogPayload> {
  entryId: string;
}

export async function updateSovaLogEntry({ workspaceId, organisationId, payload, actor, entryId }: UpdateSovaLogParams) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }
  if (!actor?.id) {
    throw new Error("Authenticated user required");
  }
  if (!entryId) {
    throw new Error("Entry ID is required");
  }

  const collectionPath = workspaceCollectionPath(workspaceId, "sova-log", organisationId ?? undefined);
  if (!collectionPath) {
    throw new Error("Invalid collection path for SOVA log");
  }

  const docRef = adminDb.collection(collectionPath).doc(entryId);
  const timestamp = admin.firestore.Timestamp.now();
  const updateData = {
    residentName: sanitise(payload.residentName),
    incidentDate: sanitise(payload.incidentDate),
    dateSovaRaised: sanitise(payload.dateSovaRaised),
    incidentDetails: sanitise(payload.incidentDetails),
    dutyOfCandourUpheld: normaliseTriState(payload.dutyOfCandourUpheld),
    investigationComplete: normaliseTriState(payload.investigationComplete),
    cqcNotificationSubmitted: normaliseTriState(payload.cqcNotificationSubmitted),
    lessonsLearntComplete: normaliseTriState(payload.lessonsLearntComplete),
    rootCauseAnalysisComplete: normaliseTriState(payload.rootCauseAnalysisComplete),
    outcome: sanitise(payload.outcome),
    dateClosed: sanitise(payload.dateClosed),
    lessonsLearntRecordId: sanitiseOptional(payload.lessonsLearntRecordId),
    rootCauseAnalysisRecordId: sanitiseOptional(payload.rootCauseAnalysisRecordId),
    linkedCqcLogId: sanitiseOptional(payload.linkedCqcLogId),
    updatedAt: timestamp,
    updatedBy: buildUpdatedBy(actor),
  };

  await adminDb.runTransaction(async (tx: Transaction) => {
    const snapshot = (await tx.get(docRef)) as unknown as DocumentSnapshot<DocumentData>;
    if (!snapshot.exists) {
      throw new Error("Safeguarding log entry not found");
    }
    tx.update(docRef, updateData);
  });

  return { id: entryId };
}
