import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await req.json();
    const { action = 'COMPLETE', source = 'APP_UI' } = body;

    if (!['COMPLETE', 'REVERT_PENDING', 'SKIP'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be COMPLETE, REVERT_PENDING, or SKIP' },
        { status: 400 }
      );
    }

    const updatedTask = await db.toggleTaskStatus(taskId, action, source);

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Task not found or could not be updated' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedTask.id,
      status: updatedTask.status,
      completed_at: updatedTask.completed_at,
      channel_source: updatedTask.channel_source,
      adherence_streak_days: 5,
    });
  } catch (err: unknown) {
    console.error('Task toggle error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
