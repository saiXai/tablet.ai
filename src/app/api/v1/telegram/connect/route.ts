import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const user = await db.getUser();
    const token = `tk_${Math.random().toString(36).substring(2, 12)}`;

    await db.updateUserTelegram(user.id, null, token);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TabletAiReminderBot';
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      token,
      deepLink,
      connected: !!user.telegram_chat_id,
      chat_id: user.telegram_chat_id || null,
    });
  } catch (err: unknown) {
    console.error('Telegram connect error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
