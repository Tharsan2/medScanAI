import { NextRequest, NextResponse } from 'next/server';
import { getSession, getMedicationsBySession, getPrescriptionAnalysisBySession, getMedicalRecordsBySession } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
  }

  const medications = getMedicationsBySession(sessionId);
  const risks = getPrescriptionAnalysisBySession(sessionId);
  const records = getMedicalRecordsBySession(sessionId);

  const allAllergies = [...new Set(records.flatMap((r: any) => r.allergies || []))] as string[];

  // Deduplicate: most recent prescription per drug
  const currentMeds: Record<string, any> = {};
  for (const med of medications) {
    const key = med.drug_name.toLowerCase().trim();
    if (!currentMeds[key] || (med.prescribed_date || '') > (currentMeds[key].prescribed_date || '')) {
      currentMeds[key] = med;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      sessionId,
      allMedications: medications,
      currentMedications: Object.values(currentMeds),
      risks,
      allergies: allAllergies,
      riskSummary: {
        critical: risks.filter((r: any) => r.severity === 'critical').length,
        warnings: risks.filter((r: any) => r.severity === 'warning').length,
        info: risks.filter((r: any) => r.severity === 'info').length,
      },
    },
  });
}
