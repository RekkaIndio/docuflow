import { askAIWithWorkspaceData, serializeForAI, formatAuditName } from './utils';
import { formatDateSafe, extractCompletedBy, extractAuditHighlightLines } from './utils';
import { resolveAuditDocumentInfo } from '@/lib/utils';
import type { ChatMessage } from './types';

export async function handleAuditQuery(
  inputVal: string,
  intent: any,
  selectedItem: any,
  organisationId: string | null,
  user: any,
  appendMessages: (messages: any) => void,
  setInput: (input: string) => void,
  setIsTyping: (isTyping: boolean) => void
) {
  appendMessages([{ sender: 'user', text: inputVal }, { sender: 'ai', text: 'Fetching audit information...' }]);
  setInput('');
  setIsTyping(true);
  try {
    const workspaceId = selectedItem.workspaceId;
    if (!workspaceId) {
      appendMessages({ sender: 'ai', text: 'No workspace selected for audit query.' });
      setIsTyping(false);
      return;
    }

    const originalInput = intent.originalInput?.toLowerCase() || '';
    const orgContext = organisationId || null;
    const auditPayload: Record<string, any> = {
      mode: 'audit_query',
      variant: 'status',
      originalInput: inputVal,
      requestedAudit: intent.auditType || 'all',
    };
    let variant: 'trend' | 'comments' | 'scores' | 'status' = 'status';
    let hasData = false;

    if (originalInput.includes('trend') || originalInput.includes('performance')) {
      variant = 'trend';
      auditPayload.variant = 'trend';
      const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
      const snapshots = await getMonthlyAuditSnapshots(workspaceId, undefined, orgContext);
      const trendData = Object.entries(snapshots || {})
        .map(([auditType, auditHistory]) => {
          const history = (auditHistory as any[]).slice(0, 6).map((entry) => ({
            snapshotCreatedAt: entry.snapshotCreatedAt,
            scorePercent: entry.scorePercent,
            comments: entry.comments,
            areasForImprovement: entry.areasForImprovement,
            goodPractice: entry.goodPractice,
            actionRequired: entry.actionRequired,
          }));
          return {
            auditType,
            latest: history[0] || null,
            historyLength: history.length,
            history,
          };
        })
        .filter((entry) => entry.historyLength > 0);
      if (trendData.length === 0) {
        appendMessages({ sender: 'ai', text: 'No audit data found for recent trends.' });
        setIsTyping(false);
        return;
      }
      hasData = true;
      auditPayload.trends = trendData;
    } else if (originalInput.includes('comment')) {
      variant = 'comments';
      auditPayload.variant = 'comments';
      const { getMonthlyAuditSnapshots } = await import('@/lib/firestore');
      const snapshots = await getMonthlyAuditSnapshots(workspaceId, undefined, orgContext);
      const commentData = Object.entries(snapshots || {})
        .map(([auditType, auditHistory]) => {
          const latestWithNotes = (auditHistory as any[]).find((entry) =>
            Boolean(entry.comments || entry.areasForImprovement || entry.goodPractice || entry.actionRequired)
          );
          if (!latestWithNotes) return null;
          return {
            auditType,
            comments: latestWithNotes.comments,
            areasForImprovement: latestWithNotes.areasForImprovement,
            goodPractice: latestWithNotes.goodPractice,
            actionRequired: latestWithNotes.actionRequired,
            snapshotCreatedAt: latestWithNotes.snapshotCreatedAt,
          };
        })
        .filter(Boolean);
      if (commentData.length === 0) {
        appendMessages({ sender: 'ai', text: 'No audit comments found for this month.' });
        setIsTyping(false);
        return;
      }
      hasData = true;
      auditPayload.comments = commentData;
    } else if (originalInput.includes('score') || originalInput.includes('result')) {
      variant = 'scores';
      auditPayload.variant = 'scores';
      const { getLatestAuditData, getMonthlyAuditCompletionStatus } = await import('@/lib/firestore');
      const requestedAudit = intent.auditType || 'all';
      if (requestedAudit === 'all') {
        const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
        const auditTypes = Object.keys(completionStatus || {});
        const scoreEntries: Array<{ auditType: string; scorePercent?: number | null; snapshotCreatedAt?: string | null }> = [];
        for (const type of auditTypes) {
          const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
          if (latest) {
            hasData = true;
            scoreEntries.push({
              auditType: type,
              scorePercent: latest.scorePercent ?? null,
              snapshotCreatedAt: latest.snapshotCreatedAt ?? null,
            });
          }
        }
        if (!hasData) {
          appendMessages({ sender: 'ai', text: 'No audit scores found for this month.' });
          setIsTyping(false);
          return;
        }
        auditPayload.latestScores = scoreEntries;
      } else {
        const latest = await getLatestAuditData(workspaceId, requestedAudit, undefined, orgContext);
        if (!latest) {
          appendMessages({ sender: 'ai', text: `No recent scores found for ${requestedAudit.replace(/-/g, ' ')} audit.` });
          setIsTyping(false);
          return;
        }
        hasData = true;
        auditPayload.latestScore = {
          auditType: requestedAudit,
          scorePercent: latest.scorePercent ?? null,
          snapshotCreatedAt: latest.snapshotCreatedAt ?? null,
          comments: latest.comments ?? null,
        };
      }
    } else {
      variant = 'status';
      auditPayload.variant = 'status';
      const { getMonthlyAuditCompletionStatus, getLatestAuditData } = await import('@/lib/firestore');
      const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
      const requestedAudit = auditPayload.requestedAudit || 'all';

      if (requestedAudit !== 'all') {
        hasData = true;
        const latest = await getLatestAuditData(workspaceId, requestedAudit, undefined, orgContext);
        const isCompletedThisMonth = Boolean(completionStatus?.[requestedAudit]);
        const friendlyName = formatAuditName(requestedAudit);
        let resolvedDoc: { downloadUrl: string | null; documentId: string | null } = {
          downloadUrl: null,
          documentId: null,
        };
        if (latest) {
          resolvedDoc = await resolveAuditDocumentInfo(workspaceId, orgContext || null, latest);
        }
        const downloadUrl = isCompletedThisMonth ? resolvedDoc.downloadUrl : null;
        const documentId = isCompletedThisMonth ? resolvedDoc.documentId : null;
        const snapshotDate = isCompletedThisMonth
          ? latest?.snapshotCreatedAt ?? latest?.auditDate ?? null
          : null;
        const scorePercent = isCompletedThisMonth ? latest?.scorePercent ?? null : null;

        const auditEntry: NonNullable<ChatMessage['audits']>[number] = {
          auditType: requestedAudit,
          name: friendlyName,
          isCompletedThisMonth,
          scorePercent,
          snapshotCreatedAt: snapshotDate,
          downloadUrl,
          documentId,
        };

        const completedDate = formatDateSafe(latest?.auditDate || latest?.snapshotCreatedAt);
        const completedBy = extractCompletedBy(latest);
        const scoreText = typeof scorePercent === 'number' ? `Score: ${scorePercent}%` : null;
        const highlightLines = isCompletedThisMonth ? extractAuditHighlightLines(latest) : [];
        let messageText: string;

        if (isCompletedThisMonth && latest) {
          const summaryParts: string[] = [`The ${friendlyName} is completed for this month.`];
          if (completedDate) summaryParts.push(`Completed on ${completedDate}`);
          if (completedBy) summaryParts.push(`by ${completedBy}`);
          if (scoreText) summaryParts.push(scoreText);
          messageText = summaryParts.join(' ') + '.';
          if (highlightLines.length > 0) {
            messageText += `\n\nKey notes:\n${highlightLines.slice(0, 3).map((line: string) => `• ${line}`).join('\n')}`;
          }
          messageText += `\n\nLet me know if you'd like to review or share this audit.`;
        } else {
          messageText = `I can't find a ${friendlyName.toLowerCase()} completed for this month yet. Would you like me to open the ${friendlyName.toLowerCase()} form so you can complete it now?`;
        }

        appendMessages({ sender: 'ai', text: messageText, audits: [auditEntry] });
        setIsTyping(false);
        return;
      }

      const auditTypes = Object.keys(completionStatus || {});
      if (auditTypes.length === 0) {
        appendMessages({ sender: 'ai', text: 'No audit status information available yet.' });
        setIsTyping(false);
        return;
      }
      hasData = true;
      const statusEntries = auditTypes.map((type) => ({
        auditType: type,
        isCompletedThisMonth: Boolean(completionStatus?.[type]),
      }));

      const latestScores: Array<{ auditType: string; scorePercent?: number | null }> = [];
      for (const type of auditTypes.slice(0, 12)) {
        const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
        if (latest && latest.scorePercent !== undefined) {
          latestScores.push({ auditType: type, scorePercent: latest.scorePercent });
        }
      }

      auditPayload.status = {
        completion: statusEntries,
        latestScores,
      };
    }

    if (!hasData) {
      appendMessages({ sender: 'ai', text: 'No audit information could be retrieved.' });
      setIsTyping(false);
      return;
    }

    // Build an audits array for UI cards (completed vs incomplete)
    let auditsArray: ChatMessage['audits'] = [];
    try {
      const { getMonthlyAuditCompletionStatus, getLatestAuditData } = await import('@/lib/firestore');
      const completionStatus = await getMonthlyAuditCompletionStatus(workspaceId, orgContext);
      const requestedAudit = auditPayload.requestedAudit || 'all';
      const auditTypes = requestedAudit === 'all'
        ? Object.keys(completionStatus || {})
        : [requestedAudit];
      for (const type of auditTypes) {
        try {
          const latest = await getLatestAuditData(workspaceId, type, undefined, orgContext);
          const friendlyName = formatAuditName(type);
          const isCompletedThisMonth = Boolean(completionStatus?.[type]);
          let resolvedDoc: { downloadUrl: string | null; documentId: string | null } = {
            downloadUrl: null,
            documentId: null,
          };
          if (latest) {
            resolvedDoc = await resolveAuditDocumentInfo(workspaceId, orgContext || null, latest);
          }
          const downloadUrl = isCompletedThisMonth ? resolvedDoc.downloadUrl : null;
          const documentId = isCompletedThisMonth ? resolvedDoc.documentId : null;
          const snapshotCreatedAt = isCompletedThisMonth
            ? latest?.snapshotCreatedAt ?? latest?.auditDate ?? null
            : null;
          const scorePercent = isCompletedThisMonth ? latest?.scorePercent ?? null : null;

          auditsArray.push({
            auditType: type,
            name: friendlyName,
            isCompletedThisMonth,
            scorePercent,
            snapshotCreatedAt,
            downloadUrl,
            documentId,
          });
        } catch (e) {
          auditsArray.push({
            auditType: type,
            name: formatAuditName(type),
            isCompletedThisMonth: Boolean(completionStatus?.[type]),
          });
        }
      }
    } catch (e) {
      auditsArray = [];
    }

    // Sanitize AI answer: strip raw Firebase storage download URLs to avoid exposing long storage links
    const aiRawAnswer = await askAIWithWorkspaceData(
      inputVal,
      {
        documentData: auditPayload,
        workspaceExtras: { auditVariant: variant, requestedAudit: auditPayload.requestedAudit },
        extraContext: {
          variant,
          requestedAudit: auditPayload.requestedAudit,
          originalInput,
        },
      },
      () => serializeForAI({
        workspaceId: selectedItem.workspaceId ?? null,
        organisationId: organisationId ?? null,
        selectedItem: {
          id: (selectedItem as any)?.id ?? null,
          name: (selectedItem as any)?.name ?? null,
          type: selectedItem.type,
        },
        activeDocumentId: null,
        lastContextDocumentId: null,
        user: user
          ? {
              id: user.id,
              name: user.name ?? undefined,
              email: user.email ?? undefined,
            }
          : null,
      })
    );

    // Remove firebase storage URLs like https://firebasestorage.googleapis.com/ and long gs:// links
    const storageUrlPattern = /(https?:\/\/[^\s)]+(?:firebasestorage|storage\.googleapis)[^\s)]*|gs:\/\/[\w\-/.]+)/gi;
    const aiAnswer = String(aiRawAnswer || '').replace(storageUrlPattern, '[document attached below]');

    appendMessages({ sender: 'ai', text: aiAnswer, audits: auditsArray });
  } catch (error) {
    console.error('Error fetching audit data:', error);
    appendMessages({ sender: 'ai', text: 'Sorry, I couldn\'t fetch the audit information. Please try again.' });
  } finally {
    setIsTyping(false);
  }
}