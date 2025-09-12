import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Appraisal } from '@/types';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const appraisalData: Omit<Appraisal, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    // Validate required fields
    if (!appraisalData.workspaceId || !appraisalData.managerId) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId and managerId' },
        { status: 400 }
      );
    }

    // Create the appraisal document
    const appraisalDoc = {
      ...appraisalData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('appraisals').add(appraisalDoc);

    return NextResponse.json({
      success: true,
      appraisalId: docRef.id,
      message: 'Appraisal saved successfully'
    });

  } catch (error) {
    console.error('Failed to save appraisal:', error);
    return NextResponse.json(
      { error: 'Failed to save appraisal' },
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

    let query = adminDb.collection('appraisals');

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
    const appraisals: Appraisal[] = [];

    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      appraisals.push({
        id: doc.id,
        ...doc.data()
      } as Appraisal);
    });

    return NextResponse.json({
      appraisals,
      total: appraisals.length
    });

  } catch (error) {
    console.error('Failed to fetch appraisals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appraisals' },
      { status: 500 }
    );
  }
}