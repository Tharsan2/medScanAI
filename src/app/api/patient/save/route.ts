import { NextRequest, NextResponse } from 'next/server';
import { saveMedicalRecord } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientRecord, sessionId } = body;

    if (!patientRecord) {
      return NextResponse.json({ error: 'patientRecord is required.' }, { status: 400 });
    }

    const sId = sessionId || 'sess_default';
    saveMedicalRecord({
      id: uuidv4(),
      sessionId: sId,
      patientName: patientRecord.name,
      patientAge: patientRecord.age,
      patientGender: patientRecord.gender,
      allergies: patientRecord.allergies || [],
    });

    return NextResponse.json({ success: true, sessionId: sId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
