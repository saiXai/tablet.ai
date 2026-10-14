import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramDoseAlert(
  chatId: number,
  task: {
    id: string;
    medicine_name?: string;
    strength?: string | null;
    dosage_instruction?: string;
    meal_relation?: string;
    scheduled_for: string;
  }
) {
  if (!TELEGRAM_BOT_TOKEN) return false;

  const timeStr = new Date(task.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const text =
    `⏰ <b>Medication Reminder (${timeStr})</b>\n\n` +
    `It is time for your dose:\n` +
    `💊 <b>${task.medicine_name || 'Prescribed Medicine'}</b> ${task.strength || ''}\n` +
    `📋 <i>Instruction:</i> ${task.dosage_instruction || '1 dose'}\n` +
    `🍽️ <i>Meal relation:</i> <b>${task.meal_relation || 'NONE'}</b>\n\n` +
    `Please tap an action below to update your adherence log:`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Taken', callback_data: `act:chk:${task.id}` },
        { text: '⏱️ Snooze 15m', callback_data: `act:snz:${task.id}` },
        { text: '❌ Skip', callback_data: `act:skp:${task.id}` },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to send telegram dose alert:', e);
    return false;
  }
}

// POST /api/v1/telegram/notify
// Can be triggered manually, by cron worker, or by a test button in UI
export async function POST(req: NextRequest) {
  try {
    let specificTaskId: string | undefined;
    try {
      const body = await req.json();
      specificTaskId = body.taskId;
    } catch {
      // Body is optional
    }

    if (specificTaskId) {
      // Send reminder for specific task
      const user = await db.getUser();
      if (!user.telegram_chat_id) {
        return NextResponse.json(
          { error: 'User does not have a connected Telegram chat' },
          { status: 400 }
        );
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const summary = await db.getDailySummary(user.id, todayStr);
      const task = summary.tasks.find((t) => t.id === specificTaskId);

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const sent = await sendTelegramDoseAlert(user.telegram_chat_id, task);
      return NextResponse.json({ success: sent, taskId: task.id, recipient: user.telegram_chat_id });
    }

    // Otherwise, find all pending tasks due for reminder
    const pending = await db.getPendingTasksForTelegramReminder();
    const dispatched: string[] = [];

    for (const item of pending) {
      if (item.user.telegram_chat_id) {
        const sent = await sendTelegramDoseAlert(item.user.telegram_chat_id, item.task);
        if (sent) dispatched.push(item.task.id);
      }
    }

    return NextResponse.json({
      success: true,
      reminders_dispatched: dispatched.length,
      task_ids: dispatched,
    });
  } catch (err: unknown) {
    console.error('Telegram notify error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
