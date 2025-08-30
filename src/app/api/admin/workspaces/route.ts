import { NextResponse } from 'next/server';
import { createWorkspace, getAllWorkspaces } from '@/lib/firestore';
export async function GET() {
  try {
    const workspaces = await getAllWorkspaces();
    return NextResponse.json({ workspaces });
  } catch (e) {
    console.error('Failed to load all workspaces', e);
    return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, ownerId, members } = body || {};
    if (!name || !ownerId) return NextResponse.json({ error: 'Missing name or ownerId' }, { status: 400 });
    const ws = await createWorkspace({ name, ownerId, members: members || [ownerId] });
    return NextResponse.json({ ok: true, workspace: ws });
  } catch (e) {
    console.error('Failed to create workspace', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
