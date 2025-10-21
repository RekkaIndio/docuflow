import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { RdComplianceAudit } from '@/types';
import * as admin from 'firebase-admin';

const COLLECTION_NAME = 'rdComplianceAudits';

const computeMonthKey = (auditDate: string | null | undefined) => {
  if (!auditDate) return null;
  const parsed = new Date(auditDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export async function POST(request: Request) {
  try {
    const body: Omit<RdComplianceAudit, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    if (!body.workspaceId) {
      return NextResponse.json({ error: 'Missing required field: workspaceId' }, { status: 400 });
    }

    if (!body.auditDate) {
      return NextResponse.json({ error: 'Missing required field: auditDate' }, { status: 400 });
    }

    const monthKey = computeMonthKey(body.auditDate);

    const auditDoc = {
      ...body,
      monthKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as RdComplianceAudit;

    const docRef = await adminDb.collection(COLLECTION_NAME).add(auditDoc);

    return NextResponse.json({
      success: true,
      auditId: docRef.id,
      message: 'RD compliance audit saved successfully',
    });
  } catch (error) {
    console.error('Failed to save RD compliance audit:', error);
    return NextResponse.json({ error: 'Failed to save RD compliance audit' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const monthKey = searchParams.get('monthKey');

    let query: admin.firestore.Query = adminDb.collection(COLLECTION_NAME);

    if (workspaceId) {
      query = query.where('workspaceId', '==', workspaceId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (monthKey) {
      query = query.where('monthKey', '==', monthKey);
    }

    query = query.orderBy('auditDate', 'desc');

    const snapshot = await query.get();
    const audits: RdComplianceAudit[] = [];

    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      audits.push({
        id: doc.id,
        ...(doc.data() as RdComplianceAudit),
      });
    });

    return NextResponse.json({ audits, total: audits.length });
  } catch (error) {
    console.error('Failed to fetch RD compliance audits:', error);
    return NextResponse.json({ error: 'Failed to fetch RD compliance audits' }, { status: 500 });
  }
}
