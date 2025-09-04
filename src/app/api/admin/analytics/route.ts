import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { startOfWeek } from 'date-fns';
import { db } from '@/lib/firebase';
import { getAllWorkspaces, getAllCareHomes } from '@/lib/firestore';
import { getHomes } from '@/lib/care-homes-store';

export async function GET() {
  try {
    // Fetch all data
    const workspaces = await getAllWorkspaces();
    // Build care-home-like entries from workspaces (these are used in the Care Homes page)
    const mappedFromWorkspaces = workspaces.map(ws => ({
      id: ws.id,
      name: ws.name || ws.id,
      occupancy: typeof (ws as any).occupancy === 'number' ? (ws as any).occupancy : (typeof (ws as any).occupiedBeds === 'number' && typeof (ws as any).totalBeds === 'number' && (ws as any).totalBeds > 0 ? ((ws as any).occupiedBeds / (ws as any).totalBeds) : undefined),
      totalBeds: (ws as any).totalBeds,
      occupiedBeds: (ws as any).occupiedBeds,
      complianceScore: (ws as any).complianceScore,
      renewalBacklog: (ws as any).renewalBacklog || 0,
      staffingDay: (ws as any).staffingDay,
      staffingNight: (ws as any).staffingNight,
    }));

    // Also include any dev-mode care-homes from the in-memory store (used by /api/care-homes).
    // Avoid duplicates: prefer workspace-derived entries when ids collide.
    let careHomes = mappedFromWorkspaces.slice();
    try {
      const devHomes = getHomes();
      if (Array.isArray(devHomes) && devHomes.length > 0) {
        const mappedDev = devHomes.map((h: any) => ({
          id: h.id,
          name: h.name,
          occupancy: typeof h.occupancy === 'number' ? h.occupancy : undefined,
          totalBeds: typeof h.totalBeds === 'number' ? h.totalBeds : undefined,
          occupiedBeds: typeof h.occupiedBeds === 'number' ? h.occupiedBeds : undefined,
          complianceScore: typeof h.complianceScore === 'number' ? h.complianceScore : undefined,
          renewalBacklog: typeof h.renewalBacklog === 'number' ? h.renewalBacklog : 0,
          staffingDay: typeof h.staffingDay === 'number' ? h.staffingDay : undefined,
          staffingNight: typeof h.staffingNight === 'number' ? h.staffingNight : undefined,
        }));
        const existingIds = new Set(careHomes.map(c => c.id));
        mappedDev.forEach(dh => { if (!existingIds.has(dh.id)) careHomes.push(dh); });
      }
    } catch (e) {
      // ignore dev homes errors
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Aggregate all documents across all workspaces
    const allDocuments: any[] = [];
    const allFolders: any[] = [];
    
    workspaces.forEach(workspace => {
      const extractDocumentsAndFolders = (items: any[]) => {
        items.forEach(item => {
          if (item.type === 'document') {
            allDocuments.push({
              ...item,
              workspaceId: workspace.id,
              workspaceName: workspace.name,
            });
          } else if (item.type === 'folder') {
            allFolders.push({
              ...item,
              workspaceId: workspace.id,
              workspaceName: workspace.name,
            });
            if (item.items) {
              extractDocumentsAndFolders(item.items);
            }
          }
        });
      };
      
      if (workspace.folders) {
        extractDocumentsAndFolders(workspace.folders);
      }
    });

    // Document statistics
    const totalDocuments = allDocuments.length;
    const documentsLast30Days = allDocuments.filter(doc => 
      new Date(doc.createdAt) >= thirtyDaysAgo
    ).length;
    const documentsLast7Days = allDocuments.filter(doc => 
      new Date(doc.createdAt) >= sevenDaysAgo
    ).length;

    // File type distribution
    const fileTypeDistribution: Record<string, number> = {};
    allDocuments.forEach(doc => {
      const fileType = doc.fileType || 'unknown';
      fileTypeDistribution[fileType] = (fileTypeDistribution[fileType] || 0) + 1;
    });

    // Storage usage (approximate based on document count)
    const averageFileSize = 2.5; // MB approximate
    const totalStorageUsage = totalDocuments * averageFileSize;

    // Daily document creation trends for last 30 days
    const documentTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = allDocuments.filter(doc => 
        doc.createdAt && doc.createdAt.split('T')[0] === dateStr
      ).length;
      documentTrends.push({ date: dateStr, count });
    }

    // Workspace analytics
    const workspaceAnalytics = workspaces.map(ws => ({
      id: ws.id,
      name: ws.name,
      memberCount: ws.members?.length || 0,
      folderCount: allFolders.filter(f => f.workspaceId === ws.id).length,
      documentCount: allDocuments.filter(d => d.workspaceId === ws.id).length,
      recentActivity: allDocuments.filter(d => 
        d.workspaceId === ws.id && new Date(d.createdAt) >= sevenDaysAgo
      ).length,
    }));

    // Most active workspaces
    const mostActiveWorkspaces = workspaceAnalytics
      .sort((a, b) => b.recentActivity - a.recentActivity)
      .slice(0, 5);

    // Document creation by workspace
    const documentsByWorkspace = workspaces.map(ws => ({
      name: ws.name,
      count: allDocuments.filter(d => d.workspaceId === ws.id).length,
    })).sort((a, b) => b.count - a.count);

    // Recent documents
    const recentDocuments = allDocuments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        fileType: doc.fileType,
        createdAt: doc.createdAt,
        workspaceName: doc.workspaceName,
        owner: doc.owner,
      }));

    // Care home analytics
    // Daily checkins analytics (aggregate across workspaces)
    let totalCheckins30 = 0;
    let totalCheckins7 = 0;
    let totalFalls30 = 0;
    let totalFalls7 = 0;
    let totalCqc30 = 0;
    let totalSafeguards30 = 0;
    let totalStaffingDay30 = 0;
    let totalStaffingNight30 = 0;
    const woundsCounts: Record<string, number> = { pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 };
    const infectionsCounts: Record<string, number> = { uti: 0, chest: 0, wound: 0 };

    const careHomeAnalytics = {
      totalCareHomes: careHomes.length,
      averageOccupancy: careHomes.length > 0 
        ? careHomes.reduce((sum, home) => sum + (home.occupancy || 0), 0) / careHomes.length 
        : 0,
      totalBeds: careHomes.reduce((sum, home) => sum + (home.totalBeds || 0), 0),
      occupiedBeds: careHomes.reduce((sum, home) => sum + (home.occupiedBeds || 0), 0),
      averageCompliance: careHomes.length > 0 
        ? careHomes.reduce((sum, home) => sum + (home.complianceScore || 0), 0) / careHomes.length 
        : 0,
      totalRenewalBacklog: careHomes.reduce((sum, home) => sum + (home.renewalBacklog || 0), 0),
      staffingDay: totalStaffingDay30,
      staffingNight: totalStaffingNight30,
    };

    

    // Weekly aggregation for last N weeks
    const weeksBack = 12;
    const weeklyMap: Record<string, { weekStart: string; checkins: number; falls: number; cqc: number; safeguards: number }> = {};
    const nowDate = new Date();
    const earliestWeekStart = startOfWeek(new Date(nowDate.getTime() - (weeksBack - 1) * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });

    // initialize weeks
    for (let i = 0; i < weeksBack; i++) {
      const wk = startOfWeek(new Date(nowDate.getTime() - (weeksBack - 1 - i) * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
      const key = wk.toISOString().split('T')[0];
      weeklyMap[key] = { weekStart: key, checkins: 0, falls: 0, cqc: 0, safeguards: 0 };
    }

    const perWorkspaceWeekly: any[] = [];

    // For each workspace, query its daily-checkins since earliestWeekStart
    for (const ws of workspaces) {
      try {
        const colRef = collection(db, `workspaces/${ws.id}/daily-checkins`);
        const q30 = query(colRef, where('createdAt', '>=', Timestamp.fromDate(earliestWeekStart)));
        const snaps = await getDocs(q30);
        // prepare per-workspace weekly map
        const wsWeeklyMap: Record<string, { weekStart: string; checkins: number; falls: number; cqc: number; safeguards: number }> = {};
        // initialize weeks for this workspace
        for (let i = 0; i < weeksBack; i++) {
          const wk = startOfWeek(new Date(nowDate.getTime() - (weeksBack - 1 - i) * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
          const key = wk.toISOString().split('T')[0];
          wsWeeklyMap[key] = { weekStart: key, checkins: 0, falls: 0, cqc: 0, safeguards: 0 };
        }
        if (!snaps.empty) {
          // per-workspace staffing accumulators (30-day)
          let wsStaffingDay = 0;
          let wsStaffingNight = 0;
          // per-workspace wound/infection accumulators
          const wsWoundsCounts: Record<string, number> = { pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 };
          const wsInfectionsCounts: Record<string, number> = { uti: 0, chest: 0, wound: 0 };
          snaps.forEach(snap => {
            const d: any = snap.data();
            const createdAt: Date | null = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
            if (!createdAt) return;

            // 30/7 day aggregates
            if (createdAt >= thirtyDaysAgo) {
              totalCheckins30++;
              totalFalls30 += Number(d.falls?.count || 0);
              totalCqc30 += Number(d.cqcNotifications || 0);
              totalSafeguards30 += Number(d.safeguards || 0);
              // aggregate staffing saved on daily-checkins
              wsStaffingDay += Number(d.staffingDay || 0);
              wsStaffingNight += Number(d.staffingNight || 0);
              totalStaffingDay30 += Number(d.staffingDay || 0);
              totalStaffingNight30 += Number(d.staffingNight || 0);
            }
            if (createdAt >= sevenDaysAgo) {
              totalCheckins7++;
              totalFalls7 += Number(d.falls?.count || 0);
            }

            // weekly bucket
            const wkStart = startOfWeek(createdAt, { weekStartsOn: 1 });
            const wkKey = wkStart.toISOString().split('T')[0];
            if (!weeklyMap[wkKey]) {
              weeklyMap[wkKey] = { weekStart: wkKey, checkins: 0, falls: 0, cqc: 0, safeguards: 0 };
            }
            weeklyMap[wkKey].checkins += 1;
            weeklyMap[wkKey].falls += Number(d.falls?.count || 0);
            weeklyMap[wkKey].cqc += Number(d.cqcNotifications || 0);
            weeklyMap[wkKey].safeguards += Number(d.safeguards || 0);

            // per-workspace weekly bucket
            if (!wsWeeklyMap[wkKey]) {
              wsWeeklyMap[wkKey] = { weekStart: wkKey, checkins: 0, falls: 0, cqc: 0, safeguards: 0 };
            }
            wsWeeklyMap[wkKey].checkins += 1;
            wsWeeklyMap[wkKey].falls += Number(d.falls?.count || 0);
            wsWeeklyMap[wkKey].cqc += Number(d.cqcNotifications || 0);
            wsWeeklyMap[wkKey].safeguards += Number(d.safeguards || 0);

            // wounds.types can now be numeric counts — sum them
            const wounds = d.wounds?.types || {};
            Object.keys(woundsCounts).forEach(k => {
              const add = Number((wounds && wounds[k]) || 0);
              if (add) {
                wsWoundsCounts[k] += add;
                woundsCounts[k] += add;
              }
            });

            const inf = d.infections || {};
            const addUti = Number(inf.uti || 0);
            const addChest = Number(inf.chest || 0);
            const addWoundInf = Number(inf.wound || 0);
            if (addUti) {
              wsInfectionsCounts.uti += addUti;
              infectionsCounts.uti += addUti;
            }
            if (addChest) {
              wsInfectionsCounts.chest += addChest;
              infectionsCounts.chest += addChest;
            }
            if (addWoundInf) {
              wsInfectionsCounts.wound += addWoundInf;
              infectionsCounts.wound += addWoundInf;
            }
          });
          // after processing snaps for workspace, push sorted weekly array
          const wsWeeklyArray = Object.values(wsWeeklyMap).sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
          // compute 30-day totals for this workspace
          const last30Totals = {
            checkins: 0,
            falls: 0,
            cqc: 0,
            safeguards: 0,
            wounds: Object.assign({}, wsWoundsCounts),
            infections: Object.assign({}, wsInfectionsCounts),
            staffingDay: wsStaffingDay,
            staffingNight: wsStaffingNight,
          };
          // aggregate from wsWeeklyArray (weeks within last ~5 weeks may contain data)
          wsWeeklyArray.forEach(w => {
            last30Totals.checkins += w.checkins || 0;
            last30Totals.falls += w.falls || 0;
            last30Totals.cqc += w.cqc || 0;
            last30Totals.safeguards += w.safeguards || 0;
          });
          perWorkspaceWeekly.push({ workspaceId: ws.id, workspaceName: ws.name, weekly: wsWeeklyArray, totalsLast30: last30Totals, totalBeds: ws.totalBeds || 0, occupiedBeds: ws.occupiedBeds || 0, occupancy: typeof (ws as any).occupancy === 'number' ? (ws as any).occupancy : undefined });
        }
      } catch (e) {
        console.warn('Failed to read daily-checkins for workspace', ws.id, e);
      }
    }

    // Convert weeklyMap to sorted array
    const weeklyArray = Object.values(weeklyMap).sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

    // Growth metrics (comparing periods)
    const documentsLast90Days = allDocuments.filter(doc => 
      new Date(doc.createdAt) >= ninetyDaysAgo
    ).length;

    // Tag analysis (from documents with tags)
    const tagDistribution: Record<string, number> = {};
    allDocuments.forEach(doc => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => {
          tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
        });
      }
    });

    const topTags = Object.entries(tagDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({
      overview: {
        totalWorkspaces: workspaces.length,
        totalDocuments,
        totalFolders: allFolders.length,
        totalStorageUsage: `${totalStorageUsage.toFixed(1)} MB`,
        documentsLast30Days,
        documentsLast7Days,
      },
      trends: {
        documentTrends,
        documentsLast90Days,
        growthRate30Days: documentsLast30Days > 0 ? 
          (((documentsLast30Days - documentsLast90Days) / Math.max(documentsLast90Days, 1)) * 100).toFixed(1) + '%' : '0%',
      },
      distributions: {
        fileTypeDistribution,
        documentsByWorkspace,
        topTags,
      },
      workspaces: {
        analytics: workspaceAnalytics,
        mostActive: mostActiveWorkspaces,
      },
  careHomes: careHomeAnalytics,
  careHomesList: careHomes,
      dailyCheckins: {
        totalCheckinsLast30Days: totalCheckins30,
        totalCheckinsLast7Days: totalCheckins7,
        totalFallsLast30Days: totalFalls30,
        totalFallsLast7Days: totalFalls7,
        totalCqcNotificationsLast30Days: totalCqc30,
        totalSafeguardsLast30Days: totalSafeguards30,
        woundTypeCounts: woundsCounts,
        infectionCounts: infectionsCounts,
        weekly: weeklyArray,
        perWorkspaceWeekly,
      },
      recentActivity: {
        documents: recentDocuments,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}