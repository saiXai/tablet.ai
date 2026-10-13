import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
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

    // 1. Handle incoming text message (e.g. /start <token>)
    if (payload.message && payload.message.text) {
      const chatId = payload.message.chat.id;
      const text: string = payload.message.text.trim();

      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const token = parts[1];

        if (token) {
          const user = await db.getUser();
          await db.updateUserTelegram(user.id, chatId, null);

          await sendTelegramMessage(
            chatId,
            `<b>✅ Linked successfully to tablet.ai!</b>\n\nYou will now receive timely reminders 10 minutes before your scheduled medication times directly in this chat.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 Welcome to <b>tablet.ai</b>!\nPlease link your account through the tablet.ai web app settings.`
          );
        }
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
          await answerCallbackQuery(callbackId, 'Already logged via App!');
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
