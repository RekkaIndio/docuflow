import { NextResponse } from 'next/server';
import { getHomeById, updateHome } from '@/lib/care-homes-store';

export async function GET(req: Request, { params }: any) {
  const { id } = params || { id: 'unknown' };
  const h = getHomeById(id);
  if (!h) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(h);
}

export async function PATCH(req: Request, { params }: any) {
  const { id } = params || { id: 'unknown' };
  const body = await req.json().catch(() => ({}));
  const allowed: any = {};
  if (body.occupancy !== undefined) allowed.occupancy = Number(body.occupancy) || 0;

  const updated = updateHome(id, allowed);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
