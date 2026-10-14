import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateMaterializedTasks, ScheduleBatchInputItem } from '@/services/scheduleEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scan_id, start_date, items, user_id } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array must not be empty' },
        { status: 400 }
      );
    }
    const user = await db.getUser(user_id);
    if (!user) {
      return NextResponse.json(
        { error: 'User is not authenticated or not found' },
        { status: 401 }
      );
    }
    const startDate = start_date || new Date().toISOString().split('T')[0];

    let schedulesCreatedCount = 0;
    let totalTasksMaterialized = 0;

    for (const item of items as ScheduleBatchInputItem[]) {
      const durationDays = item.duration_days || 7;
      const end = new Date(startDate);
      end.setDate(end.getDate() + durationDays);
      const endDate = end.toISOString().split('T')[0];

      // 1. Create Schedule
      const schedule = await db.createSchedule({
        user_id: user.id,
        scan_id: scan_id || null,
        medicine_name: item.medicine_name,
        strength: item.strength || null,
        dosage_instruction: item.dosage_instruction,
        meal_relation: item.meal_relation || 'NONE',
        daily_times: item.daily_times || ['08:30'],
        suggested_slots: item.suggested_slots || ['MORNING'],
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      });

      schedulesCreatedCount++;

      // 2. Materialize Tasks
      const tasksDrafts = generateMaterializedTasks(
        schedule.id,
        user.id,
        startDate,
        {
          ...item,
          duration_days: durationDays,
        }
      );

      const tasksCreated = await db.bulkCreateTasks(tasksDrafts);
      totalTasksMaterialized += tasksCreated;
    }

    return NextResponse.json(
      {
        success: true,
        schedules_created: schedulesCreatedCount,
        total_tasks_materialized: totalTasksMaterialized,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Batch create schedule error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
