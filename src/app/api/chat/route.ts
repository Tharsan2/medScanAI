import { NextRequest, NextResponse } from 'next/server';
import { getSession, getMedicalRecordsBySession, getLabResultsBySession, getMedicationsBySession, getDocumentsBySession, saveAiResponse } from '@/lib/db';
import { chatWithContext } from '@/lib/gemini';
import { v4 as uuidv4 } from 'uuid';

function buildContext(sessionId: string): string {
  const records = getMedicalRecordsBySession(sessionId);
  const labs = getLabResultsBySession(sessionId);
  const meds = getMedicationsBySession(sessionId);
  const docs = getDocumentsBySession(sessionId);

  const sections: string[] = [];

  if (records.length) {
    sections.push('=== PATIENT RECORDS ===');
    for (const r of records) {
      const doc = docs.find((d: any) => d.id === r.document_id);
      sections.push(`Document: ${doc?.original_name || 'Unknown'} | Date: ${r.visit_date || 'Unknown'} | Doctor: ${r.doctor_name || 'Unknown'} | Facility: ${r.facility_name || 'Unknown'}`);
      if (r.diagnoses?.length) sections.push(`Diagnoses: ${r.diagnoses.join(', ')}`);
      if (r.conditions?.length) sections.push(`Conditions: ${r.conditions.join(', ')}`);
      if (r.allergies?.length) sections.push(`Allergies: ${r.allergies.join(', ')}`);
      sections.push('');
    }
  }

  if (labs.length) {
    sections.push('=== LAB RESULTS ===');
    for (const l of labs) {
      sections.push(`${l.test_name}: ${l.value} ${l.unit || ''} (${l.status}) — Ref: ${l.reference_text || [l.reference_min, l.reference_max].filter(Boolean).join('-') || 'N/A'} — Date: ${l.test_date || 'N/A'} — Doc: ${l.document_name || 'N/A'}`);
    }
    sections.push('');
  }

  if (meds.length) {
    sections.push('=== MEDICATIONS ===');
    for (const m of meds) {
      sections.push(`${m.drug_name} ${m.dosage || ''} ${m.frequency || ''} | Prescribed: ${m.prescribed_date || 'N/A'} by ${m.prescribed_by || 'N/A'} | Doc: ${m.document_name || 'N/A'}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, language, history } = body;

    if (!sessionId || !message) {
      return NextResponse.json({ success: false, message: 'sessionId and message are required.' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
    }

    const context = buildContext(sessionId);
    const result = await chatWithContext(message, context, history || [], language);

    // Save to DB
    saveAiResponse({
      id: uuidv4(), sessionId, question: message,
      answer: result.answer || '',
      confidence: result.confidence || null,
      evidenceDocuments: result.evidenceDocuments || [],
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Chat error:', err.message);
    return NextResponse.json({
      success: true,
      data: {
        answer: "I'm unable to answer right now. Please check your API key or try again. Always consult a qualified doctor for medical decisions.",
        confidence: null,
        evidenceDocuments: [],
        keyFindings: [],
        disclaimer: "AI-generated information is for educational purposes only and is not medical advice.",
      },
    });
  }
}
