import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  getSession, getDocumentsBySession, updateDocumentStatus, updateSessionStatus,
  saveMedicalRecord, saveLabResult, saveMedication, savePrescriptionAnalysis,
  saveTimelineEvent, clearTimeline, clearPrescriptionAnalysis,
  getMedicalRecordsBySession, getLabResultsBySession, getMedicationsBySession, getDocumentsBySession as getDocs,
} from '@/lib/db';
import { extractText } from '@/lib/ocr';
import {
  extractMedicalEntities, checkPrescriptions, buildTimelineNarrative,
} from '@/lib/gemini';

const UPLOAD_DIR = path.join(os.tmpdir(), 'uploads');

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'sessionId is required.' }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
  }

  const documents = getDocumentsBySession(sessionId);
  if (!documents.length) {
    return NextResponse.json({ success: false, message: 'No documents in this session.' }, { status: 400 });
  }

  updateSessionStatus(sessionId, 'processing');

  const results: any[] = [];
  const allMedications: any[] = [];
  const allAllergies: string[] = [];

  for (const doc of documents) {
    const filePath = path.join(UPLOAD_DIR, doc.filename);
    if (!fs.existsSync(filePath)) {
      updateDocumentStatus(doc.id, 'missing');
      results.push({ documentId: doc.id, error: 'File not found on disk.' });
      continue;
    }

    updateDocumentStatus(doc.id, 'processing');

    try {
      // Step 1: OCR
      const rawText = await extractText(doc.filename, doc.mimetype, filePath);
      const text = rawText.trim();

      // Step 2: Gemini entity extraction
      let extracted: any;
      if (text.length > 50) {
        extracted = await extractMedicalEntities(text, doc.original_name);
      } else {
        extracted = {
          patientName: null, patientAge: null, patientGender: null, visitDate: null,
          doctorName: null, facilityName: null, documentType: doc.doc_type || 'unknown',
          diagnoses: [], conditions: [], allergies: [], symptoms: [], medications: [], labResults: [],
          summary: 'Could not extract readable text from this document.', keyFindings: [],
        };
      }

      // Step 3: Save medical record
      const recordId = uuidv4();
      saveMedicalRecord({
        id: recordId, sessionId, documentId: doc.id,
        patientName: extracted.patientName, patientAge: extracted.patientAge,
        patientGender: extracted.patientGender, visitDate: extracted.visitDate,
        doctorName: extracted.doctorName, facilityName: extracted.facilityName,
        diagnoses: extracted.diagnoses || [], conditions: extracted.conditions || [],
        allergies: extracted.allergies || [], rawText: text,
        confidence: extracted.confidence || null,
      });

      // Step 4: Lab results
      for (const lr of extracted.labResults || []) {
        saveLabResult({
          id: uuidv4(), sessionId, documentId: doc.id,
          testName: lr.testName, value: lr.value, unit: lr.unit,
          referenceMin: lr.referenceMin, referenceMax: lr.referenceMax,
          referenceText: lr.referenceText, status: lr.status,
          testDate: extracted.visitDate,
        });
      }

      // Step 5: Medications
      for (const med of extracted.medications || []) {
        saveMedication({
          id: uuidv4(), sessionId, documentId: doc.id,
          drugName: med.drugName, dosage: med.dosage, frequency: med.frequency,
          route: med.route, prescribedDate: med.prescribedDate || extracted.visitDate,
          prescribedBy: extracted.doctorName,
        });
        allMedications.push({ ...med, documentName: doc.original_name, prescribedDate: med.prescribedDate || extracted.visitDate });
      }

      if (extracted.allergies) allAllergies.push(...extracted.allergies);

      // Cleanup file
      try { fs.unlinkSync(filePath); } catch {}

      updateDocumentStatus(doc.id, 'analyzed');
      results.push({ documentId: doc.id, extracted });

    } catch (err: any) {
      console.error(`Extraction error for ${doc.original_name}:`, err.message);
      updateDocumentStatus(doc.id, 'failed');
      results.push({ documentId: doc.id, error: err.message });
    }
  }

  // Step 6: Prescription safety check
  let safetyConfidence: number | null = null;
  if (allMedications.length > 0) {
    try {
      const safetyResult = await checkPrescriptions(allMedications, [...new Set(allAllergies)]);
      safetyConfidence = safetyResult.overallConfidence || null;
      clearPrescriptionAnalysis(sessionId);
      for (const risk of safetyResult.risks || []) {
        savePrescriptionAnalysis({
          id: uuidv4(), sessionId, riskType: risk.riskType || 'interaction',
          severity: risk.severity || 'warning', title: risk.title,
          description: risk.description, recommendation: risk.recommendation,
          drugA: risk.drugA || null, drugB: risk.drugB || null,
          evidenceDocuments: [], confidence: risk.confidence || null,
        });
      }
    } catch (err: any) {
      console.error('Prescription check error:', err.message);
    }
  }

  // Step 7: Build timeline
  let timelineConfidence: number | null = null;
  try {
    const records = getMedicalRecordsBySession(sessionId);
    const docs = getDocs(sessionId);
    const docsMap: Record<string, any> = Object.fromEntries(docs.map((d: any) => [d.id, d]));
    const labs = getLabResultsBySession(sessionId);
    const meds = getMedicationsBySession(sessionId);

    const timelineInput = records.map((r: any) => ({
      visitDate: r.visit_date, documentName: docsMap[r.document_id]?.original_name || 'Unknown Document',
      patientName: r.patient_name, doctorName: r.doctor_name,
      diagnoses: r.diagnoses, conditions: r.conditions, allergies: r.allergies,
      medications: meds.filter((m: any) => m.document_id === r.document_id).map((m: any) => ({ drugName: m.drug_name, dosage: m.dosage, frequency: m.frequency })),
      labResults: labs.filter((l: any) => l.document_id === r.document_id).map((l: any) => ({ testName: l.test_name, value: l.value, unit: l.unit, status: l.status })),
    }));

    const timelineResult = await buildTimelineNarrative(timelineInput);
    timelineConfidence = timelineResult.overallConfidence || null;
    clearTimeline(sessionId);

    for (const event of timelineResult.events || []) {
      const docMatch = records.find((r: any) => docsMap[r.document_id]?.original_name === event.documentName);
      saveTimelineEvent({
        id: uuidv4(), sessionId, eventDate: event.eventDate, sortKey: event.sortKey || event.eventDate,
        eventType: event.eventType || 'note', title: event.title, description: event.description,
        documentId: docMatch ? docMatch.document_id : null, documentName: event.documentName,
        significance: event.significance, confidence: event.confidence || null,
      });
    }
  } catch (err: any) {
    console.error('Timeline build error:', err.message);
  }

  // Calculate overall confidence
  const scores = [safetyConfidence, timelineConfidence, ...results.filter((r: any) => r.extracted?.confidence).map((r: any) => r.extracted.confidence)].filter(Boolean) as number[];
  const overallConfidence = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  updateSessionStatus(sessionId, 'completed', overallConfidence);

  return NextResponse.json({
    success: true,
    message: 'Medical data extraction complete.',
    data: {
      sessionId,
      processedCount: results.filter((r: any) => !r.error).length,
      totalCount: documents.length,
      results,
    },
  });
}
