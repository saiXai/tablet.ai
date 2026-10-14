import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('id');

    let user = null;
    if (email) {
      user = await db.getUserByEmail(email);
    } else if (userId) {
      user = await db.getUser(userId);
    } else {
      user = await db.getUser();
    }

    return NextResponse.json({ user: user || null });
  } catch (err: unknown) {
    console.error('User fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.logout) {
      await db.setActiveUser(null);
      return NextResponse.json({ success: true, user: null });
    }

    const { email, id } = body;
    const user = await db.setActiveUser(email || id);
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    console.error('Active user switch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
