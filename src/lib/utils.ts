import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MealRelation, TimeSlot } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timeStr: string): string {
  // Handles "08:30" or "08:30:00" or ISO timestamps
  try {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = minutes || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `${formattedH}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function getMealRelationLabel(relation: MealRelation, slot?: TimeSlot): string {
  const mealName = slot ? slot.toLowerCase() : 'food';
  switch (relation) {
    case 'BEFORE_FOOD':
      return `Before ${mealName}`;
    case 'AFTER_FOOD':
      return `After ${mealName}`;
    case 'WITH_FOOD':
      return `With ${mealName}`;
    case 'EMPTY_STOMACH':
      return 'Empty stomach';
    case 'NONE':
    default:
      return 'No food restriction';
  }
}

export function getSlotLabel(slot: TimeSlot): string {
  switch (slot) {
    case 'MORNING':
      return 'Morning (Breakfast)';
    case 'AFTERNOON':
      return 'Afternoon (Lunch)';
    case 'EVENING':
      return 'Evening (Dinner)';
    case 'BEDTIME':
      return 'Night (Bedtime)';
  }
}
