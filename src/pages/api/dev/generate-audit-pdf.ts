import type { NextApiRequest, NextApiResponse } from 'next';
import { saveAuditPDFToFolder } from '@/lib/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { workspaceId, auditType } = req.query as any;
    if (!workspaceId || !auditType) {
      return res.status(400).json({ error: 'workspaceId and auditType required' });
    }

    // Example minimal audit data
    const auditData = {
      home: 'Test Home',
      auditDate: new Date().toISOString(),
      completedBy: 'Test User',
      comments: 'Generated for test',
      sampleField: 'Sample value'
    };

    const { getAuditPDFFilename, generateAuditPDF } = await import('@/lib/pdf-generator');
    const filename = getAuditPDFFilename(auditType, auditData.home, auditData.auditDate);
    const pdfBuffer = generateAuditPDF({ auditType, home: auditData.home, auditDate: auditData.auditDate, completedBy: auditData.completedBy, data: auditData, comments: auditData.comments });

    const docId = await saveAuditPDFToFolder(workspaceId, auditType, pdfBuffer as any, filename, auditData.auditDate);

    res.status(200).json({ success: true, docId });
  } catch (e) {
    console.error('dev generate error', e);
    res.status(500).json({ error: String(e) });
  }
}
