import { Pool } from 'pg';
import { User, MedicationSchedule, AdherenceTask, DailySummary } from '@/types';

// Optional PostgreSQL pool
let pool: Pool | null = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_URL.includes('supabase') 
        ? { rejectUnauthorized: false } 
        : undefined,
    });
  } catch (err) {
    console.warn('PostgreSQL pool init failed, falling back to local memory store:', err);
  }
}

// In-Memory Fallback Store (Pre-seeded with both users)
const SEED_USER_1: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'saiphaneendra09@gmail.com',
  name: 'Sai Phaneendra',
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
};

const SEED_USER_2: User = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'saiphanimba09@gmail.com',
  name: 'Sai Phanimba',
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
};

const memoryStore = {
  users: [SEED_USER_1, SEED_USER_2] as User[],
  activeUserId: SEED_USER_1.id,
  schedules: [] as MedicationSchedule[],
  tasks: [] as AdherenceTask[],
};

// Seed initial sample medication for both users if empty
function ensureSeedData() {
  if (memoryStore.schedules.length === 0) {
    const today = new Date().toISOString().split('T')[0];

    // Schedules for User 1
    const s1Id = 'sched-amox-sai-1';
    memoryStore.schedules.push({
      id: s1Id,
      user_id: SEED_USER_1.id,
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

    memoryStore.tasks.push(
      {
        id: `task-u1-1`,
        schedule_id: s1Id,
        user_id: SEED_USER_1.id,
        scheduled_for: `${today}T08:30:00.000Z`,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        channel_source: 'APP_UI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medicine_name: 'Amoxicillin',
        strength: '500mg',
        dosage_instruction: '1 capsule',
        meal_relation: 'AFTER_FOOD',
        suggested_slots: ['MORNING'],
      },
      {
        id: `task-u1-2`,
        schedule_id: s1Id,
        user_id: SEED_USER_1.id,
        scheduled_for: `${today}T20:30:00.000Z`,
        status: 'PENDING',
        completed_at: null,
        channel_source: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medicine_name: 'Amoxicillin',
        strength: '500mg',
        dosage_instruction: '1 capsule',
        meal_relation: 'AFTER_FOOD',
        suggested_slots: ['EVENING'],
      }
    );

    // Schedules for User 2
    const s2Id = 'sched-metform-sai-2';
    memoryStore.schedules.push({
      id: s2Id,
      user_id: SEED_USER_2.id,
      medicine_name: 'Metformin',
      strength: '500mg',
      dosage_instruction: '1 tablet',
      meal_relation: 'WITH_FOOD',
      daily_times: ['08:30', '20:30'],
      suggested_slots: ['MORNING', 'EVENING'],
      start_date: today,
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      duration_days: 30,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    memoryStore.tasks.push(
      {
        id: `task-u2-1`,
        schedule_id: s2Id,
        user_id: SEED_USER_2.id,
        scheduled_for: `${today}T08:30:00.000Z`,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        channel_source: 'TELEGRAM',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medicine_name: 'Metformin',
        strength: '500mg',
        dosage_instruction: '1 tablet',
        meal_relation: 'WITH_FOOD',
        suggested_slots: ['MORNING'],
      },
      {
        id: `task-u2-2`,
        schedule_id: s2Id,
        user_id: SEED_USER_2.id,
        scheduled_for: `${today}T20:30:00.000Z`,
        status: 'PENDING',
        completed_at: null,
        channel_source: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        medicine_name: 'Metformin',
        strength: '500mg',
        dosage_instruction: '1 tablet',
        meal_relation: 'WITH_FOOD',
        suggested_slots: ['EVENING'],
      }
    );
  }
}

ensureSeedData();

export const db = {
  async getUser(id?: string): Promise<User> {
    const targetId = id || memoryStore.activeUserId;
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB query failed, using memory store fallback:', e);
      }
    }
    const found = memoryStore.users.find((u) => u.id === targetId);
    return found || memoryStore.users[0];
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB query failed:', e);
      }
    }
    return memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async getUserByTelegramToken(token: string): Promise<User | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE telegram_auth_token = $1', [token]);
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB query failed:', e);
      }
    }
    return memoryStore.users.find((u) => u.telegram_auth_token === token) || null;
  },

  async getUserByTelegramChatId(chatId: number): Promise<User | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users WHERE telegram_chat_id = $1', [chatId]);
        if (res.rows[0]) return res.rows[0];
      } catch (e) {
        console.warn('DB query failed:', e);
      }
    }
    return memoryStore.users.find((u) => u.telegram_chat_id === chatId) || null;
  },

  async setActiveUser(idOrEmail: string): Promise<User> {
    const user = (await this.getUserByEmail(idOrEmail)) || (await this.getUser(idOrEmail));
    if (user) {
      memoryStore.activeUserId = user.id;
    }
    return user || memoryStore.users[0];
  },

  async listUsers(): Promise<User[]> {
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
        if (res.rows.length > 0) return res.rows;
      } catch (e) {
        console.warn('DB query failed:', e);
      }
    }
    return memoryStore.users;
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
    const user = memoryStore.users.find((u) => u.id === userId);
    if (user) {
      user.telegram_chat_id = chatId;
      user.telegram_auth_token = token;
      user.updated_at = new Date().toISOString();
    }
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
    const currentStreakDays = 5;

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

  async getPendingTasksForTelegramReminder(): Promise<Array<{ task: AdherenceTask; user: User }>> {
    const results: Array<{ task: AdherenceTask; user: User }> = [];
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT t.*, s.medicine_name, s.strength, s.dosage_instruction, s.meal_relation,
                  u.id as user_id, u.email as user_email, u.name as user_name, u.telegram_chat_id
           FROM adherence_tasks t
           JOIN medication_schedules s ON t.schedule_id = s.id
           JOIN users u ON t.user_id = u.id
           WHERE t.status = 'PENDING'
             AND u.telegram_chat_id IS NOT NULL
             AND t.scheduled_for >= NOW() - INTERVAL '1 hour'
             AND t.scheduled_for <= NOW() + INTERVAL '30 minutes'`
        );
        return res.rows.map((r) => ({
          task: {
            id: r.id,
            schedule_id: r.schedule_id,
            user_id: r.user_id,
            scheduled_for: r.scheduled_for,
            status: r.status,
            medicine_name: r.medicine_name,
            strength: r.strength,
            dosage_instruction: r.dosage_instruction,
            meal_relation: r.meal_relation,
            created_at: r.created_at,
            updated_at: r.updated_at,
          },
          user: {
            id: r.user_id,
            email: r.user_email,
            name: r.user_name,
            telegram_chat_id: r.telegram_chat_id,
            timezone: 'Asia/Kolkata',
            lead_time_minutes: 10,
            meal_slot_preferences: { morning: '08:30', afternoon: '13:30', evening: '20:30', bedtime: '22:30' },
            created_at: '',
            updated_at: '',
          },
        }));
      } catch (e) {
        console.warn('DB query reminders failed:', e);
      }
    }

    // Memory store fallback
    for (const t of memoryStore.tasks) {
      if (t.status === 'PENDING') {
        const u = memoryStore.users.find((user) => user.id === t.user_id && user.telegram_chat_id);
        if (u) {
          results.push({ task: t, user: u });
        }
      }
    }
    return results;
  },
};
