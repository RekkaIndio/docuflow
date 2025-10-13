'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { workspaceCollectionPath } from '@/lib/paths';
import type { MonthlyActionPlan } from '@/lib/action-plans';
import { generateAuditPDF } from '@/lib/pdf-generator';
import admin, { adminDb } from '@/lib/firebase-admin';
import { sendWithMailgun } from '@/lib/mailgun';
import renderActionPlanAssignmentEmail from '@/email-templates/action-plan-assignment';

interface AssignmentEmailProps {
  workspaceId: string;
  recipientEmails: string[];
  assignedBy: string;
  monthKey: string;
  itemsSummaryHtml: string;
  organisationId?: string | null;
}

export async function sendActionPlanAssignmentEmail({ workspaceId, recipientEmails, assignedBy, monthKey, itemsSummaryHtml, organisationId }: AssignmentEmailProps) {
  if (!recipientEmails || recipientEmails.length === 0) return;
  // Create a short-lived login token per recipient so the email button can open a filtered view
  const mailCollectionRef = collection(db, 'mail');

  // For simplicity create token documents in a top-level collection `loginTokens` with expiry
  const loginTokensColl = collection(db, 'loginTokens');

  // We'll render and send one email per recipient to include a per-recipient token (better deliverability / tracking)
  for (const email of recipientEmails) {
    let tokenId: string | null = null;
    try {
      const tokenDoc = await addDoc(loginTokensColl, {
        email,
        workspaceId,
        monthKey,
        organisationId: organisationId ?? null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour
      });
      tokenId = tokenDoc.id;
    } catch (e) {
      console.warn('Failed to create login token, continuing without token', e);
    }

  const { subject, html } = renderActionPlanAssignmentEmail({ monthKey, assignedBy, itemsSummaryHtml, loginToken: tokenId, recipientEmail: email, workspaceId });

    // Prefer sending via Mailgun when configured. Fall back to enqueuing to `mail` collection
    try {
      await sendWithMailgun({ to: [email], subject, html });
      continue;
    } catch (e) {
      // Mailgun not configured or failed, fall back
      console.warn('Mailgun send failed or not configured for', email, String(e));
    }

    try {
      await addDoc(mailCollectionRef, {
        to: [email],
        message: {
          subject,
          html
        }
      });
    } catch (err) {
      console.error('Failed to enqueue assignment email for', email, err);
      // don't throw; continue to next recipient
    }
  }
}

/**
 * Finalize an action plan: mark isComplete, generate a PDF snapshot and save as a document.
 * This will be called when all action plan items are completed.
 */
export async function finalizeActionPlan(workspaceId: string, monthKey: string, organisationId?: string | null) {
  try {
    const scopedPath = workspaceCollectionPath(workspaceId, 'action-plans', organisationId);
    let planRef = adminDb.collection(scopedPath).doc(monthKey);
    let planSnap = await planRef.get();
    let plan: MonthlyActionPlan | null = planSnap.exists ? (planSnap.data() as MonthlyActionPlan) : null;

    if (!plan && organisationId) {
      const fallbackPath = workspaceCollectionPath(workspaceId, 'action-plans', null);
      const fallbackRef = adminDb.collection(fallbackPath).doc(monthKey);
      const fallbackSnap = await fallbackRef.get();
      if (fallbackSnap.exists) {
        plan = fallbackSnap.data() as MonthlyActionPlan;
        planRef = fallbackRef;
      }
    }

    if (!plan) {
      throw new Error('Action plan not found');
    }

    const resolvedOrganisationId = organisationId ?? (plan as any)?.organisationId ?? null;

    if (plan.isComplete) {
      await planRef.update({ isComplete: true, completedAt: new Date().toISOString() });
      return;
    }

    const pdfData = {
      auditType: 'action-plan',
      home: `Workspace ${workspaceId}`,
      auditDate: new Date().toISOString(),
      completedBy: 'CG360 System',
      data: {
        monthKey,
        totalItems: plan.totalItems,
        completedItems: plan.completedItems,
        items: plan.items
      },
      comments: `Action plan for ${monthKey}`
    };

    const pdfBuffer = generateAuditPDF(pdfData as any);
    void pdfBuffer;

    const timestamp = admin.firestore.Timestamp.now();
    const documentData = {
      name: `Action Plan - ${monthKey}`,
      type: 'document',
      fileType: 'pdf',
      createdAt: timestamp,
      owner: { id: 'system', name: 'Docuflow', email: null, avatarUrl: null },
      folderId: null,
      workspaceId,
      storagePath: null,
      downloadUrl: null,
      summary: `Action plan snapshot for ${monthKey}`,
      extractedJson: {
        isActionPlanSnapshot: true,
        monthKey,
        generatedAt: new Date().toISOString()
      },
      organisationId: resolvedOrganisationId
    } as Record<string, unknown>;

    const docsPath = workspaceCollectionPath(workspaceId, 'documents', resolvedOrganisationId);
    const docRef = await adminDb.collection(docsPath).add(documentData);

    try {
      const notificationsPath = workspaceCollectionPath(workspaceId, 'notifications', resolvedOrganisationId);
      await adminDb.collection(notificationsPath).add({
        title: `New document: ${documentData.name}`,
        body: (documentData.summary as string) ?? '',
        type: 'document',
        createdAt: timestamp,
        read: false,
        meta: {
          documentId: docRef.id,
          folderId: documentData.folderId ?? null
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create notification for finalized action plan document', notificationError);
    }

    const planUpdate: Record<string, unknown> = {
      isComplete: true,
      completedAt: new Date().toISOString(),
      finalizedDocumentId: docRef.id
    };

    if (resolvedOrganisationId && !(plan as any)?.organisationId) {
      planUpdate.organisationId = resolvedOrganisationId;
    }

    await planRef.update(planUpdate);

    return { docId: docRef.id };
  } catch (err) {
    console.error('Failed to finalize action plan', err);
    throw err;
  }
}

/**
 * Send assignment emails for an action plan: groups items by assignedTo/assignedTeam and sends email to each recipient
 */
export async function sendAssignmentsForPlan(workspaceId: string, monthKey: string, assignedBy: string, organisationId?: string | null) {
  try {
    const { getMonthlyActionPlan } = await import('@/lib/action-plans');
  const planCol = collection(db, workspaceCollectionPath(workspaceId, 'action-plans', organisationId));
  const planRef = doc(planCol, monthKey);
  const planSnap = await getDoc(planRef);
    if (!planSnap.exists()) return;

    const plan = planSnap.data() as any;

    // Server-side idempotency: if assignments were already sent, skip
    if (plan.assignmentsSentAt) {
      console.info('Assignments already sent for', workspaceId, monthKey);
      return;
    }

    // Mark assignmentsSentAt to avoid duplicate sends from concurrent callers
    try {
      await updateDoc(planRef, { assignmentsSentAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Failed to set assignmentsSentAt flag, continuing to send emails', e);
    }

    // Build map recipient -> items
    const recipientMap: Record<string, any[]> = {};
    (plan.items || []).forEach((item: any) => {
      const key = item.assignedTo || item.assignedTeam || 'unassigned';
      if (!key) return;
      if (!recipientMap[key]) recipientMap[key] = [];
      recipientMap[key].push(item);
    });

    // Resolve emails for recipients: assume assignedTo values may be of form 'managers-<id>' or user ids
    // For simplicity: if assignedTo contains '@', treat as email; otherwise try to lookup user in users collection
    const mailCollectionRef = collection(db, 'mail');

  for (const [recipientKey, items] of Object.entries(recipientMap)) {
      if (recipientKey === 'unassigned') continue; // skip unassigned

      let emails: string[] = [];

      if (recipientKey.includes('@')) {
        emails = [recipientKey];
      } else {
        // Try to read user doc
        try {
          const userRef = doc(db, 'users', recipientKey);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const u = userSnap.data() as any;
            if (u.email) emails.push(u.email);
          }
        } catch (e) {
          console.warn('Failed to resolve user email for', recipientKey, e);
        }
      }

      if (emails.length === 0) continue;

      // Send individually so each recipient receives a tokenized link specific to them
      for (const toEmail of emails) {
        let tokenId: string | null = null;
        try {
            const t = await addDoc(collection(db, 'loginTokens'), {
            email: toEmail,
            workspaceId,
            monthKey,
              organisationId: organisationId ?? null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString()
          });
          tokenId = t.id;
        } catch (e) {
          console.warn('Failed to create login token for', toEmail, e);
        }

        const itemsHtml = items.map((it: any) => `<li><b>${it.auditType}</b>: ${it.issue} (${(it.priority || '')?.toString?.().toUpperCase?.() ?? ''})</li>`).join('');
  const { subject, html } = renderActionPlanAssignmentEmail({ monthKey, assignedBy, itemsSummaryHtml: `<ul>${itemsHtml}</ul>`, loginToken: tokenId, recipientEmail: toEmail, workspaceId });

        try {
          await sendWithMailgun({ to: [toEmail], subject, html });
          continue;
        } catch (e) {
          console.warn('Mailgun send failed for', toEmail, String(e));
        }

        try {
          await addDoc(mailCollectionRef, {
            to: [toEmail],
            message: { subject, html }
          });
        } catch (e) {
          console.error('Failed to enqueue assignment email for', toEmail, e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to send assignments for plan', err);
    throw err;
  }
}
