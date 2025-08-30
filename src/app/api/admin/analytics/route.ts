import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAllWorkspaces, getAllCareHomes } from '@/lib/firestore';

export async function GET() {
  try {
    // Fetch all data
    const [workspaces, careHomes] = await Promise.all([
      getAllWorkspaces(),
      getAllCareHomes()
    ]);

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
    };

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
      recentActivity: {
        documents: recentDocuments,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}