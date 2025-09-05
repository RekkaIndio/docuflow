import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    // Revalidate the policies API cache
    revalidatePath('/api/policies');
    revalidatePath('/policies');
    revalidatePath('/admin/policies');
    
    return NextResponse.json({ success: true, message: 'Policies cache refreshed' });
  } catch (error) {
    console.error('Error refreshing policies cache:', error);
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}