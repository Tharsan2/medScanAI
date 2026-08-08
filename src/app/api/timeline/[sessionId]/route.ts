import { NextRequest, NextResponse } from 'next/server';
import { getSession, getTimelineBySession, getDocumentsBySession, getMedicalRecordsBySession } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
  }

  const events = getTimelineBySession(sessionId);
  const docs = getDocumentsBySession(sessionId);
  const records = getMedicalRecordsBySession(sessionId);
  const patientRecord = records.find((r: any) => r.patient_name);

  const patient = patientRecord ? {
    name: patientRecord.patient_name,
    age: patientRecord.patient_age,
    gender: patientRecord.patient_gender,
    allergies: patientRecord.allergies || [],
  } : null;

  return NextResponse.json({
    success: true,
    data: { sessionId, patient, documentCount: docs.length, events },
  });
}
