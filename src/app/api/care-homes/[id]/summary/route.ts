import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: any) {
  const { id } = params || { id: 'unknown' };

  // simple mock response tailored by id
  const data = {
    id,
    name: id === 'oakview' ? 'Oakview Care Home' : `Care Home ${id}`,
    occupancy: id === 'maplewood' ? 0.63 : 0.85,
    totalRooms: 40,
    occupiedRooms: id === 'maplewood' ? 25 : 34,
    totalDocuments: 420,
    expiringDocuments: id === 'willow' ? 1 : 6,
    recentUploads: [
      { id: 'd1', name: 'Medication List.pdf', createdAt: new Date().toISOString(), fileType: 'pdf' },
      { id: 'd2', name: 'Care Plan.docx', createdAt: new Date().toISOString(), fileType: 'docx' },
    ],
    timelineCounts: Array.from({ length: 30 }).map(() => Math.floor(Math.random() * 3)),
  };

  return NextResponse.json(data);
}
