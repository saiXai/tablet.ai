import { MealSlotPreferences, TimeSlot, MealRelation } from '@/types';

export interface ScheduleBatchInputItem {
  medicine_name: string;
  strength?: string;
  dosage_instruction: string;
  meal_relation: MealRelation;
  daily_times: string[]; // ["08:30", "20:30"]
  suggested_slots?: TimeSlot[];
  duration_days: number;
}

export interface MaterializedTaskDraft {
  schedule_id: string;
  user_id: string;
  scheduled_for: string; // ISO string
  status: 'PENDING';
  medicine_name?: string;
  strength?: string | null;
  dosage_instruction?: string;
  meal_relation?: MealRelation;
  suggested_slots?: TimeSlot[];
}

export function mapSlotsToTimes(
  slots: TimeSlot[],
  prefs: MealSlotPreferences = {
    morning: '08:30',
    afternoon: '13:30',
    evening: '20:30',
    bedtime: '22:30',
  }
): string[] {
  const times: string[] = [];
  slots.forEach((s) => {
    switch (s) {
      case 'MORNING':
        times.push(prefs.morning);
        break;
      case 'AFTERNOON':
        times.push(prefs.afternoon);
        break;
      case 'EVENING':
        times.push(prefs.evening);
        break;
      case 'BEDTIME':
        times.push(prefs.bedtime);
        break;
    }
  });
  return times.sort();
}

export function generateMaterializedTasks(
  scheduleId: string,
  userId: string,
  startDateStr: string,
  item: ScheduleBatchInputItem
): MaterializedTaskDraft[] {
  const tasks: MaterializedTaskDraft[] = [];
  const start = new Date(startDateStr);

  for (let dayOffset = 0; dayOffset < item.duration_days; dayOffset++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + dayOffset);
    const dateStr = currentDay.toISOString().split('T')[0];

    item.daily_times.forEach((timeStr, idx) => {
      const scheduledIso = `${dateStr}T${timeStr}:00.000Z`;
      const slot = item.suggested_slots?.[idx] || 'MORNING';

      tasks.push({
        schedule_id: scheduleId,
        user_id: userId,
        scheduled_for: scheduledIso,
        status: 'PENDING',
        medicine_name: item.medicine_name,
        strength: item.strength || null,
        dosage_instruction: item.dosage_instruction,
        meal_relation: item.meal_relation,
        suggested_slots: [slot],
      });
    });
  }

  return tasks;
}
