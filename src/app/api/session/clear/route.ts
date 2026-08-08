import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 12);
  return NextResponse.json({
    success: true,
    message: 'Session cleared',
    newToken: 'jwt_mock_' + newSessionId,
    newSessionId
  });
}
