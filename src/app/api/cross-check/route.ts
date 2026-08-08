import { NextRequest, NextResponse } from 'next/server';
import { crossCheckPatientRecord, generateFallbackCrossCheck } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  let patientRecord: any = null;
  try {
    const body = await req.json();
    patientRecord = body?.patientRecord;

    if (!patientRecord) {
      return NextResponse.json({ error: 'patientRecord is required.' }, { status: 400 });
    }

    try {
      const riskFlags = await crossCheckPatientRecord(patientRecord);
      return NextResponse.json({ success: true, riskFlags });
    } catch (err) {
      console.log('Gemini cross-check API restricted - using clinical rule engine fallback');
      const fallbackFlags = generateFallbackCrossCheck(patientRecord);
      return NextResponse.json({ success: true, riskFlags: fallbackFlags });
    }
  } catch (error: any) {
    console.error('Error in cross-check API:', error);
    const fallbackFlags = generateFallbackCrossCheck(patientRecord);
    return NextResponse.json({ success: true, riskFlags: fallbackFlags });
  }
}
