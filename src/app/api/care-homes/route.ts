import { NextResponse } from 'next/server';
import { getHomes } from '@/lib/care-homes-store';

export async function GET() {
  const homes = getHomes();
  return NextResponse.json({ homes });
}
