import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const requestedUserId = searchParams.get('userId');

    let userId: string | null = requestedUserId;
    if (!userId) {
      const activeUser = await db.getUser();
      userId = activeUser ? activeUser.id : null;
    }

    if (!userId) {
      return NextResponse.json({
        date,
        total_scheduled: 0,
        completed_count: 0,
        completion_rate: 0,
        current_streak_days: 0,
        tasks: [],
      });
    }

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
