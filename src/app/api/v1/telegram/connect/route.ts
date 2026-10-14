import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const body = await req.json();
      userId = body.userId;
    } catch {
      // Body is optional
    }

    const user = await db.getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to connect Telegram.' },
        { status: 401 }
      );
    }
    const token = `tk_${Math.random().toString(36).substring(2, 12)}`;

    await db.updateUserTelegram(user.id, null, token);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TabletAiReminderBot';
    const deepLink = `https://t.me/${botUsername}?start=${token}`;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Automatically register webhook with Telegram if deployed on a public domain
    let webhookRegistered = false;
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = req.nextUrl?.origin || (host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL);

    if (origin && !origin.includes('localhost') && botToken) {
      const webhookUrl = `${origin}/api/v1/telegram/webhook`;
      try {
        const hookRes = await fetch(
          `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
        );
        const hookData = await hookRes.json();
        webhookRegistered = hookData.ok === true;
        console.log('Auto-registered Telegram webhook to:', webhookUrl, hookData);
      } catch (e) {
        console.warn('Failed auto-registering telegram webhook:', e);
      }
    }

    return NextResponse.json({
      token,
      deepLink,
      connected: !!user.telegram_chat_id,
      chat_id: user.telegram_chat_id || null,
      user_email: user.email,
      webhook_auto_registered: webhookRegistered,
    });
  } catch (err: unknown) {
    console.error('Telegram connect error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
