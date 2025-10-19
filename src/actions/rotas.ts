'use server';

import { addDays, format, parse, parseISO } from 'date-fns';
import { workspaceDocPath } from '@/lib/paths';
import { sendWithMailgun } from '@/lib/mailgun';
import { adminDb } from '@/lib/firebase-admin';

interface SendRotaEmailsInput {
  workspaceId: string;
  organisationId?: string | null;
  workspaceName: string;
  weekStartKey: string;
  weeksToShow: number;
}

interface RotaShift {
  id: string;
  staffId: string;
  staffName?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  date: string;
  notes?: string;
  leave?: {
    groupId?: string;
    totalHours?: number;
  };
}

interface StaffRecord {
  id: string;
  name: string;
  email?: string;
  roles?: string;
}

interface SendRotaEmailsResult {
  successCount: number;
  skippedWithoutEmail: number;
  failureCount: number;
  totalRecipients: number;
}

const staffCollections = [
  'managers',
  'nurses',
  'ctms',
  'domestics',
  'maintenances',
  'kitchens',
  'activities',
] as const;

function calculateShiftHours(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  if ([startHour, startMin, endHour, endMin].some((value) => Number.isNaN(value))) {
    return 0;
  }

  let hours = endHour - startHour;
  let minutes = endMin - startMin;

  if (hours < 0) {
    hours += 24;
  }

  const totalHours = hours + minutes / 60;
  return Number.isFinite(totalHours) ? totalHours : 0;
}

function buildStaffLookup(workspaceData: Record<string, any>): Map<string, StaffRecord> {
  const lookup = new Map<string, StaffRecord>();

  staffCollections.forEach((collectionName) => {
    const members: any[] = Array.isArray(workspaceData?.[collectionName]) ? workspaceData[collectionName] : [];

    members.forEach((member) => {
      const idCandidates = [member?.id, member?.userId, member?.uid].filter(Boolean);
      const emailKey = typeof member?.email === 'string' && member.email ? member.email.toLowerCase() : null;

      if (idCandidates.length === 0 && !emailKey) {
        return;
      }

      const record: StaffRecord = {
        id: String(idCandidates[0] ?? emailKey ?? ''),
        name: typeof member?.name === 'string' && member.name.trim() ? member.name : 'Unnamed Staff Member',
        email: typeof member?.email === 'string' ? member.email : undefined,
        roles: typeof member?.roles === 'string' ? member.roles : undefined,
      };

      idCandidates.forEach((idCandidate) => {
        lookup.set(String(idCandidate), record);
      });

      if (emailKey) {
        lookup.set(emailKey, record);
      }
    });
  });

  return lookup;
}

function formatShiftLine(shift: RotaShift) {
  const date = (() => {
    try {
      return format(parseISO(shift.date), 'EEEE d MMMM');
    } catch (_error) {
      return shift.date;
    }
  })();

  if (shift.type === 'AnnualLeave') {
    const totalHours = shift.leave?.totalHours ?? 0;
    const hoursText = totalHours > 0 ? ` for ${totalHours.toFixed(1)}h` : '';
    return `<li><strong>${date}</strong>: Annual leave${hoursText}</li>`;
  }

  const timeRange = shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : 'Time TBC';
  const hours = shift.startTime && shift.endTime ? ` (${calculateShiftHours(shift.startTime, shift.endTime).toFixed(1)}h)` : '';
  const type = shift.type ? ` • ${shift.type} shift` : '';

  return `<li><strong>${date}</strong>: ${timeRange}${hours}${type}</li>`;
}

export async function sendRotaEmails({
  workspaceId,
  organisationId,
  workspaceName,
  weekStartKey,
  weeksToShow,
}: SendRotaEmailsInput): Promise<SendRotaEmailsResult> {
  if (!workspaceId) {
    throw new Error('Workspace ID is required to send rota emails.');
  }

  if (!weekStartKey) {
    throw new Error('Week start key is required to send rota emails.');
  }

  const weekStartDate = parse(weekStartKey, 'yyyy-MM-dd', new Date());
  if (Number.isNaN(weekStartDate.getTime())) {
    throw new Error('Invalid week start key provided.');
  }

  const totalWeeks = Math.max(1, weeksToShow);
  const workspacePath = workspaceDocPath(workspaceId, undefined, organisationId || undefined);
  if (!workspacePath) {
    throw new Error('Workspace path could not be resolved.');
  }

  const workspaceRef = adminDb.doc(workspacePath);
  const workspaceSnap = await workspaceRef.get();
  if (!workspaceSnap.exists) {
    throw new Error('Workspace could not be found.');
  }

  const workspaceData = workspaceSnap.data() as Record<string, any>;
  const staffLookup = buildStaffLookup(workspaceData);

  const shiftsByStaff = new Map<string, RotaShift[]>();

  for (let offset = 0; offset < totalWeeks; offset += 1) {
    const weekDate = addDays(weekStartDate, offset * 7);
    const weekKey = format(weekDate, 'yyyy-MM-dd');
    const rotaRef = adminDb.doc(`${workspacePath}/rotas/${weekKey}`);
    const rotaSnap = await rotaRef.get();
    if (!rotaSnap.exists) {
      continue;
    }

    const rotaData = rotaSnap.data() as { shifts?: RotaShift[] };
    const shifts: RotaShift[] = Array.isArray(rotaData?.shifts) ? rotaData.shifts : [];

    shifts.forEach((shift) => {
      if (!shift?.staffId) {
        return;
      }
      const staffId = String(shift.staffId);
      const existing = shiftsByStaff.get(staffId) ?? [];
      existing.push(shift);
      shiftsByStaff.set(staffId, existing);
    });
  }

  const periodStart = format(weekStartDate, 'd MMM yyyy');
  const periodEnd = format(addDays(weekStartDate, totalWeeks * 7 - 1), 'd MMM yyyy');
  const mailCollectionRef = adminDb.collection('mail');

  let successCount = 0;
  let skippedWithoutEmail = 0;
  let failureCount = 0;

  for (const [staffId, staffShifts] of shiftsByStaff.entries()) {
    if (staffShifts.length === 0) {
      continue;
    }

    const staffInfo = staffLookup.get(staffId) ?? staffLookup.get(staffId.toLowerCase());
    const recipientEmail = staffInfo?.email;

    if (!recipientEmail) {
      skippedWithoutEmail += 1;
      continue;
    }

    const staffName = staffInfo?.name || staffShifts[0]?.staffName || 'Team member';

    const sortedShifts = [...staffShifts].sort((a, b) => {
      if (a.date === b.date) {
        return (a.startTime || '').localeCompare(b.startTime || '');
      }
      return a.date.localeCompare(b.date);
    });

    const shiftListHtml = sortedShifts.map(formatShiftLine).join('');
    const totalHours = sortedShifts.reduce((total, shift) => {
      return total + calculateShiftHours(shift.startTime, shift.endTime);
    }, 0);

    const subject = `Your rota for ${workspaceName} (${periodStart} - ${periodEnd})`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin-bottom: 0.5rem;">Hello ${staffName.split(' ')[0] || staffName},</h2>
        <p>Here are your scheduled shifts for <strong>${workspaceName}</strong> covering <strong>${periodStart}</strong> to <strong>${periodEnd}</strong>.</p>
        <ul style="padding-left: 1.25rem;">${shiftListHtml}</ul>
        <p>Total scheduled hours: <strong>${totalHours.toFixed(1)} hours</strong>.</p>
        <p style="margin-top: 1.5rem;">If anything looks incorrect, please contact your manager.</p>
        <p style="margin-top: 1.5rem;">Thanks,<br/>The CG360 Team</p>
      </div>
    `;

    try {
      await sendWithMailgun({ to: [recipientEmail], subject, html });
      successCount += 1;
      continue;
    } catch (mailgunError) {
      console.warn('Mailgun send failed, falling back to Firestore mail queue', mailgunError);
    }

    try {
      await mailCollectionRef.add({
        to: [recipientEmail],
        message: {
          subject,
          html,
        },
      });
      successCount += 1;
    } catch (enqueueError) {
      failureCount += 1;
      console.error('Failed to enqueue rota email for', recipientEmail, enqueueError);
    }
  }

  return {
    successCount,
    skippedWithoutEmail,
    failureCount,
    totalRecipients: shiftsByStaff.size,
  };
}
