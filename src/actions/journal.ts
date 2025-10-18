'use server';

import admin, { adminDb } from '@/lib/firebase-admin';
import { sendWithMailgun } from '@/lib/mailgun';
import { workspaceCollectionPath } from '@/lib/paths';
import type { JournalEntry, JournalEntryAnswer, JournalMood } from '@/lib/types';
import type { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

export type JournalEntryKind = 'staff' | 'manager';

type Actor = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

interface SubmitJournalEntryParams {
  workspaceId: string;
  organisationId?: string | null;
  content?: string;
  isAnonymous?: boolean;
  actor: Actor;
  entryType: JournalEntryKind;
  mood?: JournalMood | null;
  answers?: JournalEntryAnswer[];
}

interface RespondToJournalEntryParams {
  workspaceId: string;
  organisationId?: string | null;
  entryId: string;
  response: string;
  actor: Actor;
  entryType: JournalEntryKind;
}

interface CloseJournalEntryParams {
  workspaceId: string;
  organisationId?: string | null;
  entryId: string;
  actor: Actor;
  entryType: JournalEntryKind;
}

const MANAGER_ROLE_KEYS = ['manager', 'clinical lead', 'deputy', 'operations manager', 'admin', 'owner', 'head office', 'head-office'];
const HEAD_OFFICE_ROLE_KEYS = ['admin', 'owner', 'head office', 'head-office'];

const collectionNameForKind = (kind: JournalEntryKind) =>
  kind === 'manager' ? 'manager-journal-entries' : 'journal-entries';

const normaliseRole = (role?: string | null) => (role ?? '').toString().trim().toLowerCase();

const formatMonthKey = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

async function queueEmail(to: string[], subject: string, html: string) {
  if (!Array.isArray(to) || to.length === 0) return;
  const uniqueRecipients = Array.from(new Set(to.map((email) => email?.trim()).filter((email): email is string => Boolean(email))));
  if (uniqueRecipients.length === 0) return;
  try {
    await sendWithMailgun({ to: uniqueRecipients, subject, html });
    return;
  } catch (mailgunError) {
    console.warn('[journal] Mailgun send failed, falling back to Firestore mail queue', mailgunError);
  }

  try {
    await adminDb.collection('mail').add({
      to: uniqueRecipients,
      message: { subject, html },
    });
  } catch (error) {
    console.warn('[journal] failed to queue email', error);
  }
}

async function resolveUserEmail(userId: string | null | undefined, organisationId?: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (userSnap.exists) {
      const data = userSnap.data() as Record<string, unknown>;
      const raw = data?.email;
      if (typeof raw === 'string' && raw.includes('@')) {
        return raw;
      }
    }
  } catch (error) {
    console.warn('[journal] resolveUserEmail top-level lookup failed', error);
  }

  if (organisationId) {
    try {
      const orgUserSnap = await adminDb
        .collection('organisations')
        .doc(organisationId)
        .collection('users')
        .doc(userId)
        .get();
      if (orgUserSnap.exists) {
        const data = orgUserSnap.data() as Record<string, unknown>;
        const raw = data?.email;
        if (typeof raw === 'string' && raw.includes('@')) {
          return raw;
        }
      }
    } catch (error) {
      console.warn('[journal] resolveUserEmail org lookup failed', error);
    }
  }

  try {
    const authRecord = await admin.auth().getUser(userId);
    const raw = authRecord?.email;
    if (typeof raw === 'string' && raw.includes('@')) {
      return raw;
    }
  } catch (error) {
    console.warn('[journal] resolveUserEmail auth lookup failed', error);
  }

  return null;
}

async function resolveOrganisationEmailsByRole(organisationId: string | null | undefined, roles: string[]): Promise<string[]> {
  if (!organisationId) return [];
  try {
    const targetRoles = roles.map((role) => normaliseRole(role));
    const snapshot = await adminDb
      .collection('organisations')
      .doc(organisationId)
      .collection('users')
      .get();

    const recipients: string[] = [];
    snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnap.data() as Record<string, unknown>;
      const email = typeof data?.email === 'string' ? data.email : null;
      const role = normaliseRole((data?.role as string | null | undefined) ?? undefined);
      if (email && email.includes('@') && targetRoles.includes(role)) {
        recipients.push(email);
      }
    });

    return recipients;
  } catch (error) {
    console.warn('[journal] resolveOrganisationEmailsByRole failed', error);
    return [];
  }
}

async function createNotification(
  workspaceId: string,
  organisationId: string | null | undefined,
  data: { title: string; body?: string; meta?: Record<string, unknown> }
) {
  const path = workspaceCollectionPath(workspaceId, 'notifications', organisationId ?? null);
  if (!path) return;
  try {
    await adminDb.collection(path).add({
      ...data,
      type: 'journal',
      createdAt: admin.firestore.Timestamp.now(),
      read: false,
    });
  } catch (error) {
    console.warn('[journal] failed to create notification', error);
  }
}

export async function submitJournalEntry({
  workspaceId,
  organisationId = null,
  content,
  isAnonymous = false,
  actor,
  entryType,
  mood = null,
  answers,
}: SubmitJournalEntryParams) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user is required');
  }
  const trimmedContent = typeof content === 'string' ? content.trim() : '';
  const normalisedAnswers = Array.isArray(answers)
    ? answers
        .map((item) => ({
          question: typeof item?.question === 'string' ? item.question.trim() : '',
          answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
        }))
        .filter((item) => item.question)
    : [];
  const hasAnswerText = normalisedAnswers.some((item) => item.answer);

  if (!trimmedContent && !hasAnswerText) {
    throw new Error('Journal entry cannot be empty');
  }

  const compiledContent = trimmedContent
    ? trimmedContent
    : normalisedAnswers
        .map((item) => `${item.question}\n${item.answer}`.trim())
        .join('\n\n')
        .trim();
  const timestamp = admin.firestore.Timestamp.now();
  const monthKey = formatMonthKey(new Date());
  const collectionName = collectionNameForKind(entryType);
  const collectionPath = workspaceCollectionPath(workspaceId, collectionName, organisationId ?? null);

  if (!collectionPath) {
    throw new Error('Invalid workspace path for journal entries');
  }

  const payload: Partial<JournalEntry> & {
    createdAt: Timestamp;
    organisationId: string | null;
  } = {
    workspaceId,
    organisationId,
    entryType,
    status: 'open',
    content: compiledContent,
    isAnonymous: Boolean(isAnonymous),
    author: {
      id: isAnonymous ? null : actor.id,
      name: isAnonymous ? 'Anonymous' : actor.name ?? null,
      role: actor.role ?? null,
    },
    createdAt: timestamp,
    monthKey,
  };

  if (mood) {
    (payload as any).mood = mood;
  }

  if (normalisedAnswers.length > 0) {
    (payload as any).answers = normalisedAnswers.map((item) => ({
      question: item.question,
      answer: item.answer,
    })) as JournalEntryAnswer[];
  }

  const emailHtmlBody = compiledContent.replace(/\n/g, '<br/>' );

  const docRef = await adminDb.collection(collectionPath).add(payload);

  const subjectPrefix = entryType === 'manager' ? 'Manager journal submission' : 'Reflective journal submission';

  const primaryEmail = typeof actor.email === 'string' ? actor.email.trim() : '';
  const recipientEmail = primaryEmail || (await resolveUserEmail(actor.id, organisationId));

  if (recipientEmail) {
    await queueEmail(
      [recipientEmail],
      `${subjectPrefix} receipt`,
      `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Hi ${actor.name || 'there'},</p>
          <p>We've recorded your ${entryType === 'manager' ? 'manager journal concern' : 'reflective journal entry'}.</p>
          <blockquote style="border-left: 4px solid #4f46e5; margin: 16px 0; padding-left: 12px; color: #374151;">
            ${emailHtmlBody}
          </blockquote>
          <p>You will be notified once a response has been added.</p>
          <p style="margin-top: 24px;">Thanks,<br/>The CG360 Team</p>
        </div>
      `,
    );
  }

  const notificationTitle = entryType === 'manager'
    ? 'New manager journal entry'
    : 'New reflective journal entry';

  const notificationBody = entryType === 'manager'
    ? `${actor.name || 'A manager'} has raised a concern for head office review.`
    : `${isAnonymous ? 'An anonymous team member' : actor.name || 'A team member'} has shared a reflective journal entry.`;

  await createNotification(workspaceId, organisationId, {
    title: notificationTitle,
    body: notificationBody,
    meta: {
      entryId: docRef.id,
      entryType,
    },
  });

  if (entryType === 'manager') {
    const headOfficeRecipients = await resolveOrganisationEmailsByRole(organisationId, HEAD_OFFICE_ROLE_KEYS);
    if (headOfficeRecipients.length > 0) {
      await queueEmail(
        headOfficeRecipients,
        'New manager journal concern submitted',
        `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hello,</p>
            <p>${actor.name || 'A manager'} has submitted a new concern that requires head office review.</p>
            <blockquote style="border-left: 4px solid #f59e0b; margin: 16px 0; padding-left: 12px; color: #374151;">
              ${emailHtmlBody}
            </blockquote>
            <p>Please sign in to CG360 to review and respond.</p>
            <p style="margin-top: 24px;">Thanks,<br/>The CG360 Team</p>
          </div>
        `,
      );
    }
  }

  return { id: docRef.id };
}

export async function respondToJournalEntry({
  workspaceId,
  organisationId = null,
  entryId,
  response,
  actor,
  entryType,
}: RespondToJournalEntryParams) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!entryId) {
    throw new Error('Entry ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user is required');
  }
  if (!response || !response.trim()) {
    throw new Error('Response cannot be empty');
  }

  const actorRole = normaliseRole(actor.role);
  if (entryType === 'staff' && !MANAGER_ROLE_KEYS.includes(actorRole)) {
    throw new Error('Only managers or head office can respond to staff journal entries');
  }
  if (entryType === 'manager' && !HEAD_OFFICE_ROLE_KEYS.includes(actorRole)) {
    throw new Error('Only head office can respond to manager journal entries');
  }

  const collectionPath = workspaceCollectionPath(workspaceId, collectionNameForKind(entryType), organisationId ?? null);
  if (!collectionPath) {
    throw new Error('Invalid workspace path for journal entries');
  }

  const docRef = adminDb.collection(collectionPath).doc(entryId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error('Journal entry not found');
  }

  const existing = snapshot.data() as Record<string, unknown>;
  const now = admin.firestore.Timestamp.now();

  const responsePayload = {
    text: response.trim(),
    responderId: actor.id,
    responderName: actor.name ?? null,
    responderRole: actor.role ?? null,
    respondedAt: now,
  } as JournalEntry['response'];

  await docRef.set(
    {
      response: responsePayload,
      updatedAt: now,
    },
    { merge: true },
  );

  const authorId = (existing?.author as Record<string, unknown> | undefined)?.id as string | undefined;
  if (authorId) {
    const recipient = await resolveUserEmail(authorId, organisationId);
    if (recipient) {
      const subject = entryType === 'manager'
        ? 'Head office responded to your manager journal entry'
        : 'A response has been added to your reflective journal entry';
      await queueEmail(
        [recipient],
        subject,
        `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hello,</p>
            <p>${actor.name || 'A colleague'} has responded to your ${entryType === 'manager' ? 'manager journal submission' : 'reflective journal entry'}.</p>
            <blockquote style="border-left: 4px solid #10b981; margin: 16px 0; padding-left: 12px; color: #374151;">
              ${response.trim().replace(/\n/g, '<br/>')}
            </blockquote>
            <p>Sign in to CG360 to review the conversation and follow up if needed.</p>
            <p style="margin-top: 24px;">Thanks,<br/>The CG360 Team</p>
          </div>
        `,
      );
    }
  }

  return { id: entryId };
}

export async function closeJournalEntry({
  workspaceId,
  organisationId = null,
  entryId,
  actor,
  entryType,
}: CloseJournalEntryParams) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required');
  }
  if (!entryId) {
    throw new Error('Entry ID is required');
  }
  if (!actor?.id) {
    throw new Error('Authenticated user is required');
  }

  const actorRole = normaliseRole(actor.role);
  if (entryType === 'staff' && !MANAGER_ROLE_KEYS.includes(actorRole)) {
    throw new Error('Only managers or head office can close staff journal entries');
  }
  if (entryType === 'manager' && !HEAD_OFFICE_ROLE_KEYS.includes(actorRole)) {
    throw new Error('Only head office can close manager journal entries');
  }

  const collectionPath = workspaceCollectionPath(workspaceId, collectionNameForKind(entryType), organisationId ?? null);
  if (!collectionPath) {
    throw new Error('Invalid workspace path for journal entries');
  }

  const docRef = adminDb.collection(collectionPath).doc(entryId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error('Journal entry not found');
  }

  const now = admin.firestore.Timestamp.now();
  const resolvedMonthKey = formatMonthKey(new Date());

  await docRef.set(
    {
      status: 'closed',
      closedAt: now,
      resolvedMonthKey,
      closedBy: {
        id: actor.id,
        name: actor.name ?? null,
        role: actor.role ?? null,
      },
    },
    { merge: true },
  );

  return { id: entryId };
}
