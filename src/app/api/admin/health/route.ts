import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const creds = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.warn('Failed to initialize firebase-admin in /api/admin/health:', e?.toString?.() ?? e);
  }
}

const adminDb = admin.firestore();

export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();

    // Check Firebase connection
    let firestoreStatus = 'unknown';
    let firestoreLatency = 0;
    try {
      const firestoreStart = Date.now();
      await adminDb.collection('users').limit(1).get();
      firestoreLatency = Date.now() - firestoreStart;
      firestoreStatus = 'healthy';
    } catch (error) {
      firestoreStatus = 'unhealthy';
      console.warn('Firestore health check failed:', error);
    }

    // Check Firebase Auth
    let authStatus = 'unknown';
    let authLatency = 0;
    try {
      const authStart = Date.now();
      // Try to get a user count or just check if auth is accessible
      await admin.auth().listUsers(1);
      authLatency = Date.now() - authStart;
      authStatus = 'healthy';
    } catch (error) {
      authStatus = 'unhealthy';
      console.warn('Auth health check failed:', error);
    }

    // Get basic platform metrics
    let metrics = {
      totalUsers: 0,
      totalOrganisations: 0,
      totalWorkspaces: 0,
      totalDocuments: 0,
    };

    try {
      const [usersSnap, orgsSnap, workspacesSnap, docsSnap] = await Promise.all([
        adminDb.collection('users').count().get(),
        adminDb.collection('organisations').count().get(),
        adminDb.collectionGroup('workspaces').count().get(),
        adminDb.collectionGroup('documents').count().get(),
      ]);

      metrics = {
        totalUsers: usersSnap.data().count || 0,
        totalOrganisations: orgsSnap.data().count || 0,
        totalWorkspaces: workspacesSnap.data().count || 0,
        totalDocuments: docsSnap.data().count || 0,
      };
    } catch (error) {
      console.warn('Metrics collection failed:', error);
    }

    const totalLatency = Date.now() - startTime;
    const overallStatus = firestoreStatus === 'healthy' && authStatus === 'healthy' ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        firestore: {
          status: firestoreStatus,
          latency: firestoreLatency,
        },
        auth: {
          status: authStatus,
          latency: authLatency,
        },
      },
      metrics,
      responseTime: totalLatency,
    });
  } catch (error) {
    console.error('/api/admin/health error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}