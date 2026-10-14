import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: unknown) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not set; skipping message dispatch.');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Telegram sendMessage error:', err);
    }
  } catch (e) {
    console.error('Failed to send telegram message:', e);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (e) {
    console.error('Failed to answer callback query:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Handle incoming text messages
    if (payload.message && payload.message.text) {
      const chatId = payload.message.chat.id;
      const text: string = payload.message.text.trim();

      // Handle /start <token>
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const token = parts[1];

        if (token) {
          const user = await db.getUserByTelegramToken(token);
          if (user) {
            await db.updateUserTelegram(user.id, chatId, null);

            await sendTelegramMessage(
              chatId,
              `💊 <b>Welcome to tablet.ai, ${user.name}!</b>\n\n` +
              `Your account (<code>${user.email}</code>) is successfully connected. ` +
              `You will receive timely reminders 10 minutes before your scheduled medication slots.\n\n` +
              `💡 <i>Tip: Send /today anytime to inspect today's medication agenda.</i>`
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `⚠️ The link token is invalid or has expired. Please open the tablet.ai web app and click <b>"Connect Telegram"</b> to get a fresh connection link.`
            );
          }
        } else {
          // Check if already linked
          const existingUser = await db.getUserByTelegramChatId(chatId);
          if (existingUser) {
            await sendTelegramMessage(
              chatId,
              `👋 Hello <b>${existingUser.name}</b>! You are linked to <code>${existingUser.email}</code>.\n\n` +
              `Send /today to check your doses or visit the web app.`
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `👋 Welcome to <b>tablet.ai</b>!\n\n` +
              `To link this Telegram chat to your medication schedule, open the tablet.ai web dashboard and click <b>"Connect Telegram"</b>.`
            );
          }
        }
        return NextResponse.json({ ok: true });
      }

      // Handle /today
      if (text === '/today' || text === '/status') {
        const user = await db.getUserByTelegramChatId(chatId);
        if (!user) {
          await sendTelegramMessage(
            chatId,
            `⚠️ This chat is not yet linked to a tablet.ai account. Please connect via the web dashboard.`
          );
          return NextResponse.json({ ok: true });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const summary = await db.getDailySummary(user.id, todayStr);

        if (summary.tasks.length === 0) {
          await sendTelegramMessage(
            chatId,
            `📋 <b>No medication scheduled for today (${todayStr})!</b>\nStay healthy! 🌱`
          );
          return NextResponse.json({ ok: true });
        }

        let message = `📋 <b>Today's Medication Agenda (${todayStr})</b>\n` +
                      `Progress: <b>${summary.completed_count}/${summary.total_scheduled}</b> taken (${Math.round(summary.completion_rate * 100)}%)\n\n`;

        for (const t of summary.tasks) {
          const time = new Date(t.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const statusIcon = t.status === 'COMPLETED' ? '✅' : t.status === 'SKIPPED' ? '❌' : '⏳';
          message += `${statusIcon} <b>${time}</b> — ${t.medicine_name} (${t.strength || ''})\n   <i>${t.dosage_instruction} • ${t.meal_relation}</i>\n\n`;
        }

        await sendTelegramMessage(chatId, message);
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Callback Query (e.g. [ ✅ Taken ], [ ⏱️ Snooze 15m ], [ ❌ Skip ])
    if (payload.callback_query) {
      const cb = payload.callback_query;
      const callbackId = cb.id;
      const data: string = cb.data || '';

      if (data.startsWith('act:chk:')) {
        const taskId = data.replace('act:chk:', '');
        const updated = await db.toggleTaskStatus(taskId, 'COMPLETE', 'TELEGRAM');

        if (updated) {
          await answerCallbackQuery(callbackId, '✅ Marked as taken!');
        } else {
          await answerCallbackQuery(callbackId, 'Already logged or not found.');
        }
      } else if (data.startsWith('act:snz:')) {
        await answerCallbackQuery(callbackId, '⏱️ Snoozed for 15 minutes.');
      } else if (data.startsWith('act:skp:')) {
        const taskId = data.replace('act:skp:', '');
        await db.toggleTaskStatus(taskId, 'SKIP', 'TELEGRAM');
        await answerCallbackQuery(callbackId, '❌ Marked as skipped.');
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
