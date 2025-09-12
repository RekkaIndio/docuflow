import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { Appraisal } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Appraisal ID is required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('appraisals').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Appraisal not found' },
        { status: 404 }
      );
    }

    const appraisal: Appraisal = {
      id: doc.id,
      ...doc.data()
    } as Appraisal;

    return NextResponse.json({ appraisal });

  } catch (error) {
    console.error('Failed to fetch appraisal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appraisal' },
      { status: 500 }
    );
  }
}