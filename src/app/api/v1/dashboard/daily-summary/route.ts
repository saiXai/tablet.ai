import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const userId = searchParams.get('userId') || '00000000-0000-0000-0000-000000000001';

    const summary = await db.getDailySummary(userId, date);

    return NextResponse.json(summary);
  } catch (err: unknown) {
    console.error('Daily summary API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
