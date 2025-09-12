import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Supervision } from '@/types';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const supervisionData: Omit<Supervision, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    // Validate required fields
    if (!supervisionData.workspaceId || !supervisionData.managerId) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId and managerId' },
        { status: 400 }
      );
    }

    // Create the supervision document
    const supervisionDoc = {
      ...supervisionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('supervisions').add(supervisionDoc);

    return NextResponse.json({
      success: true,
      supervisionId: docRef.id,
      message: 'Supervision saved successfully'
    });

  } catch (error) {
    console.error('Failed to save supervision:', error);
    return NextResponse.json(
      { error: 'Failed to save supervision' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const managerId = searchParams.get('managerId');
    const status = searchParams.get('status');

    let query = adminDb.collection('supervisions');

    // Apply filters
    if (workspaceId) {
      query = query.where('workspaceId', '==', workspaceId);
    }

    if (managerId) {
      query = query.where('managerId', '==', managerId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Order by creation date, most recent first
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const supervisions: Supervision[] = [];

    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      supervisions.push({
        id: doc.id,
        ...doc.data()
      } as Supervision);
    });

    return NextResponse.json({
      supervisions,
      total: supervisions.length
    });

  } catch (error) {
    console.error('Failed to fetch supervisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervisions' },
      { status: 500 }
    );
  }
}