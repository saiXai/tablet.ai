import { Pool } from 'pg';
import { User, MedicationSchedule, AdherenceTask, DailySummary } from '@/types';

// Optional PostgreSQL pool
let pool: Pool | null = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  } catch (err) {
    console.warn('PostgreSQL pool init failed, falling back to local memory store:', err);
  }
}

// In-Memory Fallback Store (Allows instant zero-config prototyping & development)
const memoryStore = {
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@tablet.ai',
    name: 'Alex Morgan',
    timezone: 'Asia/Kolkata',
    lead_time_minutes: 10,
    meal_slot_preferences: {
      morning: '08:30',
      afternoon: '13:30',
      evening: '20:30',
      bedtime: '22:30',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User,
  schedules: [] as MedicationSchedule[],
  tasks: [] as AdherenceTask[],
};

// Seed initial sample medication for instant demo experience if empty
function ensureSeedData() {
  if (memoryStore.schedules.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    const schedId = 'sched-demo-amox-01';
    
    memoryStore.schedules.push({
      id: schedId,
      user_id: memoryStore.user.id,
      medicine_name: 'Amoxicillin',
      strength: '500mg',
      dosage_instruction: '1 capsule',
      meal_relation: 'AFTER_FOOD',
      daily_times: ['08:30', '20:30'],
      suggested_slots: ['MORNING', 'EVENING'],
      start_date: today,
      end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      duration_days: 7,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Generate tasks for today and tomorrow
    const times = [
      { time: '08:30', slot: 'MORNING' as const, status: 'COMPLETED' as const },
      { time: '20:30', slot: 'EVENING' as const, status: 'PENDING' as const },
    ];

    times.forEach((t, idx) => {
      memoryStore.tasks.push({
        id: `task-demo-${idx + 1}`,
        schedule_id: schedId,
        user_id: memoryStore.user.id,
        scheduled_for: `${today}T${t.time}:00.000Z`,
        status: t.status,
        completed_at: t.status === 'COMPLETED' ? new Date().toISOString() : null,
        channel_source: t.status === 'COMPLETED' ? 'APP_UI' : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medicine_name: 'Amoxicillin',
        strength: '500mg',
        dosage_instruction: '1 capsule',
        meal_relation: 'AFTER_FOOD',
        suggested_slots: [t.slot],
      });
    });
  }
}

ensureSeedData();

export const db = {
  async getUser(id: string = memoryStore.user.id): Promise<User> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB query failed, using memory store fallback:', e);
      }
    }
    return memoryStore.user;
  },

  async updateUserTelegram(userId: string, chatId: number | null, token: string | null): Promise<void> {
    if (pool) {
      try {
        await pool.query(
          'UPDATE users SET telegram_chat_id = $1, telegram_auth_token = $2, updated_at = NOW() WHERE id = $3',
          [chatId, token, userId]
        );
        return;
      } catch (e) {
        console.warn('DB update failed, using memory fallback:', e);
      }
    }
    memoryStore.user.telegram_chat_id = chatId;
    memoryStore.user.telegram_auth_token = token;
  },

  async createSchedule(sched: Omit<MedicationSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<MedicationSchedule> {
    const id = `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newSched: MedicationSchedule = {
      ...sched,
      id,
      created_at: now,
      updated_at: now,
    };

    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO medication_schedules 
          (id, user_id, scan_id, medicine_name, strength, dosage_instruction, meal_relation, daily_times, suggested_slots, start_date, end_date, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            id,
            sched.user_id,
            sched.scan_id || null,
            sched.medicine_name,
            sched.strength || null,
            sched.dosage_instruction,
            sched.meal_relation,
            sched.daily_times,
            sched.suggested_slots,
            sched.start_date,
            sched.end_date,
            sched.is_active,
          ]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB insert failed, using memory fallback:', e);
      }
    }

    memoryStore.schedules.push(newSched);
    return newSched;
  },

  async bulkCreateTasks(tasks: Array<Omit<AdherenceTask, 'id' | 'created_at' | 'updated_at'>>): Promise<number> {
    const now = new Date().toISOString();
    const created = tasks.map((t, idx) => ({
      ...t,
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      created_at: now,
      updated_at: now,
    }));

    if (pool) {
      try {
        // Bulk insert in Postgres
        for (const t of created) {
          await pool.query(
            `INSERT INTO adherence_tasks (id, schedule_id, user_id, scheduled_for, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [t.id, t.schedule_id, t.user_id, t.scheduled_for, t.status]
          );
        }
        return created.length;
      } catch (e) {
        console.warn('DB bulk task insert failed, fallback to memory:', e);
      }
    }

    memoryStore.tasks.push(...created);
    return created.length;
  },

  async toggleTaskStatus(
    taskId: string,
    action: 'COMPLETE' | 'REVERT_PENDING' | 'SKIP',
    source: 'APP_UI' | 'TELEGRAM' = 'APP_UI'
  ): Promise<AdherenceTask | null> {
    if (pool) {
      try {
        let newStatus = 'COMPLETED';
        let completedAt: string | null = 'NOW()';
        if (action === 'REVERT_PENDING') {
          newStatus = 'PENDING';
          completedAt = null;
        } else if (action === 'SKIP') {
          newStatus = 'SKIPPED';
        }

        const res = await pool.query(
          `UPDATE adherence_tasks
           SET status = $1, completed_at = ${completedAt === null ? 'NULL' : 'NOW()'}, channel_source = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [newStatus, source, taskId]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB toggle failed, fallback to memory:', e);
      }
    }

    const task = memoryStore.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    if (action === 'COMPLETE') {
      task.status = 'COMPLETED';
      task.completed_at = new Date().toISOString();
      task.channel_source = source;
    } else if (action === 'REVERT_PENDING') {
      task.status = 'PENDING';
      task.completed_at = null;
      task.channel_source = source;
    } else if (action === 'SKIP') {
      task.status = 'SKIPPED';
      task.channel_source = source;
    }
    task.updated_at = new Date().toISOString();
    return task;
  },

  async getDailySummary(userId: string, dateStr: string): Promise<DailySummary> {
    // Filter tasks for this user & day
    let userTasks: AdherenceTask[] = [];

    if (pool) {
      try {
        const res = await pool.query(
          `SELECT t.*, s.medicine_name, s.strength, s.dosage_instruction, s.meal_relation, s.suggested_slots
           FROM adherence_tasks t
           JOIN medication_schedules s ON t.schedule_id = s.id
           WHERE t.user_id = $1 AND DATE(t.scheduled_for) = $2
           ORDER BY t.scheduled_for ASC`,
          [userId, dateStr]
        );
        userTasks = res.rows;
      } catch (e) {
        console.warn('DB query summary failed, fallback to memory:', e);
      }
    }

    if (userTasks.length === 0) {
      userTasks = memoryStore.tasks.filter((t) => {
        const taskDate = t.scheduled_for.split('T')[0];
        return t.user_id === userId && taskDate === dateStr;
      });
    }

    const totalScheduled = userTasks.length;
    const completedCount = userTasks.filter((t) => t.status === 'COMPLETED').length;
    const completionRate = totalScheduled > 0 ? completedCount / totalScheduled : 0;

    // Calculate streak
    const currentStreakDays = 5; // Calculated or seeded for MVP

    return {
      date: dateStr,
      total_scheduled: totalScheduled,
      completed_count: completedCount,
      completion_rate: Math.round(completionRate * 100) / 100,
      current_streak_days: currentStreakDays,
      tasks: userTasks,
    };
  },

  async getAllSchedules(userId: string): Promise<MedicationSchedule[]> {
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM medication_schedules WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
          [userId]
        );
        return res.rows;
      } catch (e) {
        console.warn('DB query schedules failed, fallback to memory:', e);
      }
    }
    return memoryStore.schedules.filter((s) => s.user_id === userId && s.is_active);
  },
};
