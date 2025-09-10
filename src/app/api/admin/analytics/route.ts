import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Temporarily disabled - needs migration to Firebase Admin SDK
    return NextResponse.json({
      overview: {
        totalWorkspaces: 0,
        totalDocuments: 0,
        totalFolders: 0,
        totalStorageUsage: '0 MB',
        documentsLast30Days: 0,
        documentsLast7Days: 0,
      },
      trends: {
        documentTrends: [],
        documentsLast90Days: 0,
        growthRate30Days: '0%',
      },
      distributions: {
        fileTypeDistribution: {},
        documentsByWorkspace: [],
        topTags: [],
      },
      workspaces: {
        analytics: [],
        mostActive: [],
      },
      careHomes: {
        totalCareHomes: 0,
        averageOccupancy: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        averageCompliance: 0,
        totalRenewalBacklog: 0,
        staffingDay: 0,
        staffingNight: 0,
      },
      careHomesList: [],
      dailyCheckins: {
        totalCheckinsLast30Days: 0,
        totalCheckinsLast7Days: 0,
        totalFallsLast30Days: 0,
        totalFallsLast7Days: 0,
        totalCqcNotificationsLast30Days: 0,
        totalSafeguardsLast30Days: 0,
        woundTypeCounts: { pressure: 0, break: 0, fracture: 0, bruise: 0, skintear: 0 },
        infectionCounts: { uti: 0, chest: 0, wound: 0 },
        weekly: [],
        perWorkspaceWeekly: [],
      },
      recentActivity: {
        documents: [],
      },
    });

    
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}