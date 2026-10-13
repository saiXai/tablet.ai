// Domain types for tablet.ai

export type MealRelation = 'BEFORE_FOOD' | 'AFTER_FOOD' | 'WITH_FOOD' | 'EMPTY_STOMACH' | 'NONE';

export type TaskStatus = 'PENDING' | 'DUE' | 'COMPLETED' | 'SKIPPED' | 'MISSED';

export type ChannelSource = 'APP_UI' | 'TELEGRAM' | 'SYSTEM_TIMEOUT';

export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'BEDTIME';

export type FrequencyPattern =
  | 'ONCE_DAILY'
  | 'TWICE_DAILY'
  | 'THRICE_DAILY'
  | 'FOUR_TIMES_DAILY'
  | 'AS_NEEDED'
  | 'UNKNOWN';

export interface MealSlotPreferences {
  morning: string;    // e.g. "08:30"
  afternoon: string;  // e.g. "13:30"
  evening: string;    // e.g. "20:30"
  bedtime: string;    // e.g. "22:30"
}

export interface User {
  id: string;
  email: string;
  name: string;
  telegram_chat_id?: number | null;
  telegram_auth_token?: string | null;
  timezone: string;
  lead_time_minutes: number;
  meal_slot_preferences: MealSlotPreferences;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMedication {
  temp_id?: string;
  medicine_name: string;
  strength: string;
  dosage_quantity: string;
  frequency_pattern: FrequencyPattern;
  meal_timing: MealRelation;
  suggested_slots: TimeSlot[];
  total_quantity: number;
  inferred_duration_days: number;
}

export interface ExtractionResponse {
  scan_id?: string;
  confidence_score: number;
  is_pharmacy_receipt: boolean;
  items: ExtractedMedication[];
}

export interface MedicationSchedule {
  id: string;
  user_id: string;
  scan_id?: string | null;
  medicine_name: string;
  strength?: string | null;
  dosage_instruction: string;
  meal_relation: MealRelation;
  daily_times: string[]; // HH:mm format
  suggested_slots: TimeSlot[];
  start_date: string;    // YYYY-MM-DD
  end_date: string;      // YYYY-MM-DD
  duration_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdherenceTask {
  id: string;
  schedule_id: string;
  user_id: string;
  scheduled_for: string; // ISO timestamp
  status: TaskStatus;
  completed_at?: string | null;
  channel_source?: ChannelSource | null;
  bullmq_job_id?: string | null;
  created_at: string;
  updated_at: string;
  // Hydrated fields
  medicine_name?: string;
  strength?: string | null;
  dosage_instruction?: string;
  meal_relation?: MealRelation;
  suggested_slots?: TimeSlot[];
}

export interface DailySummary {
  date: string;
  total_scheduled: number;
  completed_count: number;
  completion_rate: number;
  current_streak_days: number;
  tasks: AdherenceTask[];
}

export interface HeatmapDay {
  date: string;
  dayOfWeek: string;
  total: number;
  completed: number;
  status: 'full' | 'partial' | 'missed' | 'empty';
}
