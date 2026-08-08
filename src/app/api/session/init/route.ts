import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId || 'sess_' + Math.random().toString(36).substring(2, 12);
    
    let existing = getSession(sessionId);
    if (!existing) {
      createSession(sessionId);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      token: 'jwt_mock_' + sessionId,
      database: 'JSON Store'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
