import { collection, getDocs, query, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { workspaceCollectionPath } from './paths';
import { AUDIT_TYPES } from './audit-types';

// Define audit data interface
interface AuditData {
  id: string;
  auditType?: string;
  scorePercent?: number;
  completedAt: Date;
  comments?: string;
  areasForImprovement?: string;
  goodPractice?: string;
  actionRequired?: string;
  [key: string]: any;
}

/**
 * Get audit trends for a specific audit type or all audits
 */
export async function getAuditTrends(workspaceId: string, auditType?: string, orgId?: string | null): Promise<string> {
  try {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));

    let q;
    if (auditType && auditType !== 'all') {
      q = query(auditsCol, where('auditType', '==', auditType), orderBy('completedAt', 'desc'), limit(10));
    } else {
      q = query(auditsCol, orderBy('completedAt', 'desc'), limit(50));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 'No audit data found.';
    }

    const audits = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        auditType: data.auditType,
        scorePercent: data.scorePercent,
        completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
        comments: data.comments,
        areasForImprovement: data.areasForImprovement,
        goodPractice: data.goodPractice,
        actionRequired: data.actionRequired,
        ...data
      } as AuditData;
    });

    // Group by audit type and calculate trends
    const trendsByType: Record<string, Array<{ date: Date; score: number }>> = {};

    audits.forEach(audit => {
      const type = audit.auditType || 'unknown';
      if (!trendsByType[type]) {
        trendsByType[type] = [];
      }
      if (audit.scorePercent !== undefined) {
        trendsByType[type].push({
          date: audit.completedAt,
          score: audit.scorePercent
        });
      }
    });

    let response = '📊 **Audit Trends**\n\n';

    Object.entries(trendsByType).forEach(([type, data]) => {
      if (data.length > 0) {
        // Sort by date
        data.sort((a, b) => a.date.getTime() - b.date.getTime());

        response += `**${type.replace(/-/g, ' ')}**\n`;
        response += `• Total audits: ${data.length}\n`;
        response += `• Average score: ${(data.reduce((sum, item) => sum + item.score, 0) / data.length).toFixed(1)}%\n`;

        if (data.length >= 2) {
          const recent = data.slice(-3);
          const oldest = data[0];
          const newest = data[data.length - 1];
          const improvement = newest.score - oldest.score;

          response += `• Trend: ${improvement > 0 ? '📈 Improving' : improvement < 0 ? '📉 Declining' : '➡️ Stable'}\n`;
          response += `• Change: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% from first to last\n`;

          if (recent.length >= 2) {
            response += `• Recent scores: ${recent.map(r => `${r.score}%`).join(', ')}\n`;
          }
        }
        response += '\n';
      }
    });

    return response;
  } catch (error) {
    console.error('Error getting audit trends:', error);
    return 'Error retrieving audit trends.';
  }
}

/**
 * Get audit comments for a specific audit type or all audits
 */
export async function getAuditComments(workspaceId: string, auditType?: string, orgId?: string | null): Promise<string> {
  try {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));

    let q;
    if (auditType && auditType !== 'all') {
      q = query(auditsCol, where('auditType', '==', auditType), orderBy('completedAt', 'desc'), limit(20));
    } else {
      q = query(auditsCol, orderBy('completedAt', 'desc'), limit(50));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 'No audit comments found.';
    }

    const auditsWithComments = snapshot.docs
      .filter(doc => {
        const data = doc.data() as any;
        return data.comments || data.areasForImprovement || data.goodPractice || data.actionRequired;
      })
      .map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          auditType: data.auditType,
          scorePercent: data.scorePercent,
          completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
          comments: data.comments,
          areasForImprovement: data.areasForImprovement,
          goodPractice: data.goodPractice,
          actionRequired: data.actionRequired,
          ...data
        } as AuditData;
      });

    if (auditsWithComments.length === 0) {
      return 'No audits with comments found.';
    }

    let response = '💬 **Audit Comments**\n\n';

    auditsWithComments.forEach(audit => {
      const auditTypeDisplay = (audit.auditType || 'unknown').replace(/-/g, ' ');
      const date = audit.completedAt.toLocaleDateString();

      response += `**${auditTypeDisplay}** - ${date}\n`;

      if (audit.comments) {
        response += `• Comments: ${audit.comments}\n`;
      }
      if (audit.areasForImprovement) {
        response += `• Areas for improvement: ${audit.areasForImprovement}\n`;
      }
      if (audit.goodPractice) {
        response += `• Good practice: ${audit.goodPractice}\n`;
      }
      if (audit.actionRequired) {
        response += `• Action required: ${audit.actionRequired}\n`;
      }

      response += '\n';
    });

    return response;
  } catch (error) {
    console.error('Error getting audit comments:', error);
    return 'Error retrieving audit comments.';
  }
}

/**
 * Get general audit data for a specific audit type or all audits
 */
export async function getAuditData(workspaceId: string, auditType?: string, dataType?: string, orgId?: string | null): Promise<string> {
  try {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));

    let q;
    if (auditType && auditType !== 'all') {
      q = query(auditsCol, where('auditType', '==', auditType), orderBy('completedAt', 'desc'), limit(10));
    } else {
      q = query(auditsCol, orderBy('completedAt', 'desc'), limit(20));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 'No audit data found.';
    }

    const audits = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        auditType: data.auditType,
        scorePercent: data.scorePercent,
        completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
        comments: data.comments,
        areasForImprovement: data.areasForImprovement,
        goodPractice: data.goodPractice,
        actionRequired: data.actionRequired,
        ...data
      } as AuditData;
    });

    let response = '📋 **Audit Data**\n\n';

    if (dataType === 'scores') {
      // Focus on scores only
      const scoreData = audits.filter(audit => audit.scorePercent !== undefined);

      if (scoreData.length === 0) {
        return 'No audit scores found.';
      }

      const scoresByType: Record<string, number[]> = {};

      scoreData.forEach(audit => {
        const type = audit.auditType || 'unknown';
        if (!scoresByType[type]) {
          scoresByType[type] = [];
        }
        scoresByType[type].push(audit.scorePercent!);
      });

      Object.entries(scoresByType).forEach(([type, scores]) => {
        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);

        response += `**${type.replace(/-/g, ' ')}**\n`;
        response += `• Average: ${avg.toFixed(1)}%\n`;
        response += `• Range: ${min}% - ${max}%\n`;
        response += `• Latest: ${scores[0]}%\n`;
        response += `• Total audits: ${scores.length}\n\n`;
      });
    } else {
      // General overview
      const statsByType: Record<string, {
        count: number;
        avgScore: number;
        completedCount: number;
        pendingCount: number;
        latestDate?: Date;
      }> = {};

      audits.forEach(audit => {
        const type = audit.auditType || 'unknown';
        if (!statsByType[type]) {
          statsByType[type] = {
            count: 0,
            avgScore: 0,
            completedCount: 0,
            pendingCount: 0
          };
        }

        statsByType[type].count++;

        if (audit.scorePercent !== undefined) {
          statsByType[type].avgScore = ((statsByType[type].avgScore * (statsByType[type].count - 1)) + audit.scorePercent) / statsByType[type].count;
        }

        if (audit.completedAt) {
          statsByType[type].completedCount++;
          if (!statsByType[type].latestDate || audit.completedAt > statsByType[type].latestDate!) {
            statsByType[type].latestDate = audit.completedAt;
          }
        } else {
          statsByType[type].pendingCount++;
        }
      });

      Object.entries(statsByType).forEach(([type, stats]) => {
        response += `**${type.replace(/-/g, ' ')}**\n`;
        response += `• Total audits: ${stats.count}\n`;
        response += `• Completed: ${stats.completedCount}\n`;
        response += `• Pending: ${stats.pendingCount}\n`;
        if (stats.avgScore > 0) {
          response += `• Average score: ${stats.avgScore.toFixed(1)}%\n`;
        }
        if (stats.latestDate) {
          response += `• Last completed: ${stats.latestDate.toLocaleDateString()}\n`;
        }
        response += '\n';
      });
    }

    return response;
  } catch (error) {
    console.error('Error getting audit data:', error);
    return 'Error retrieving audit data.';
  }
}

/**
 * Get monthly audit completion status
 */
export async function getMonthlyAuditCompletionStatus(workspaceId: string, orgId?: string | null): Promise<Record<string, boolean>> {
  try {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));

    // Get audits from current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const q = query(
      auditsCol,
      where('completedAt', '>=', startOfMonth),
      where('completedAt', '<=', endOfMonth),
      orderBy('completedAt', 'desc')
    );

    const snapshot = await getDocs(q);

    // Get all audit types that should exist
    const completionStatus: Record<string, boolean> = Object.fromEntries(
      AUDIT_TYPES.map((type) => [type, false])
    );

    // Mark completed audits as true
    snapshot.docs.forEach(doc => {
      const data = doc.data() as any;
      const auditType = data.auditType;
      if (auditType && completionStatus.hasOwnProperty(auditType)) {
        completionStatus[auditType] = true;
      }
    });

    return completionStatus;
  } catch (error) {
    console.error('Error getting monthly audit completion status:', error);
    return {};
  }
}

/**
 * Get latest audit data for a specific audit type
 */
export async function getLatestAuditData(workspaceId: string, auditType: string, orgId?: string | null): Promise<any> {
  try {
  const auditsCol = collection(db, workspaceCollectionPath(workspaceId, 'audits', orgId || null));

    const q = query(
      auditsCol,
      where('auditType', '==', auditType),
      orderBy('completedAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as any;
      return {
        ...data,
        id: snapshot.docs[0].id,
        completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting latest audit data:', error);
    return null;
  }
}