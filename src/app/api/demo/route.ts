import { NextResponse } from 'next/server';
import { buildDemoData } from '@/lib/demoData';
import {
  createSession as dbCreateSession,
  saveDocument,
  saveMedicalRecord,
  saveLabResult,
  saveMedication,
  savePrescriptionAnalysis,
  saveTimelineEvent,
  updateSessionStatus,
} from '@/lib/db';

export async function POST() {
  const sessionId = crypto.randomUUID();
  dbCreateSession(sessionId, true);

  const data = buildDemoData(sessionId);

  for (const doc of data.documents) {
    saveDocument({ ...doc, originalName: doc.originalName, docType: doc.docType });
  }
  for (const record of data.medicalRecords) {
    saveMedicalRecord(record);
  }
  for (const lr of data.labResults) {
    saveLabResult(lr);
  }
  for (const med of data.medications) {
    saveMedication(med);
  }
  for (const analysis of data.prescriptionAnalysis) {
    savePrescriptionAnalysis(analysis);
  }
  for (const event of data.timelineEvents) {
    saveTimelineEvent(event);
  }

  updateSessionStatus(sessionId, 'completed');

  return NextResponse.json({
    success: true,
    message: 'Demo session created with sample patient data.',
    data: {
      sessionId,
      patient: { name: 'Sarah Johnson', age: '52', gender: 'Female' },
      documentCount: data.documents.length,
      summary: '3 medical documents analyzed across 3 visits (Jan 2025, Jun 2025, Mar 2026). Diabetic nephropathy progression tracked. Critical allergy conflict and drug interactions detected.',
    },
  });
}
