// ==========================================================
// DB Service — MedScan AI Next.js
// JSON file-based persistence (works in Next.js server components)
// ==========================================================

import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_PATH = path.join(os.tmpdir(), 'data', 'medscan.json');
const dbDir = path.dirname(DB_PATH);

interface Store {
  sessions: Record<string, any>;
  documents: Record<string, any>;
  medical_records: Record<string, any>;
  patient_timeline: Record<string, any>;
  lab_results: Record<string, any>;
  medications: Record<string, any>;
  prescription_analysis: Record<string, any>;
  ai_responses: Record<string, any>;
}

let store: Store = {
  sessions: {},
  documents: {},
  medical_records: {},
  patient_timeline: {},
  lab_results: {},
  medications: {},
  prescription_analysis: {},
  ai_responses: {},
};

function ensureDir() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

function loadStore() {
  ensureDir();
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const keys = Object.keys(store) as (keyof Store)[];
      for (const k of keys) {
        if (!parsed[k]) parsed[k] = {};
      }
      store = parsed;
    } catch {
      // corrupted — start fresh
    }
  }
}

function saveStore() {
  ensureDir();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e: any) {
    console.error('DB save error:', e.message);
  }
}

// Load on import
loadStore();

// ---------- Sessions ----------
export function createSession(id: string, isDemo = false) {
  store.sessions[id] = {
    id,
    created_at: new Date().toISOString(),
    status: 'uploading',
    is_demo: isDemo ? 1 : 0,
  };
  saveStore();
  return id;
}

export function updateSessionStatus(id: string, status: string, overallConfidence: number | null = null) {
  if (store.sessions[id]) {
    store.sessions[id].status = status;
    if (overallConfidence !== null) store.sessions[id].overall_confidence = overallConfidence;
    saveStore();
  }
}

export function getSession(id: string) {
  return store.sessions[id] || null;
}

// ---------- Documents ----------
export function saveDocument(doc: any) {
  store.documents[doc.id] = {
    id: doc.id,
    session_id: doc.sessionId,
    original_name: doc.originalName,
    filename: doc.filename,
    mimetype: doc.mimetype,
    size: doc.size,
    doc_type: doc.docType || 'unknown',
    status: doc.status || 'uploaded',
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function updateDocumentStatus(id: string, status: string) {
  if (store.documents[id]) {
    store.documents[id].status = status;
    saveStore();
  }
}

export function getDocumentsBySession(sessionId: string) {
  return Object.values(store.documents)
    .filter((d: any) => d.session_id === sessionId)
    .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
}

// ---------- Medical Records ----------
export function saveMedicalRecord(record: any) {
  store.medical_records[record.id] = {
    id: record.id,
    session_id: record.sessionId,
    document_id: record.documentId,
    patient_name: record.patientName || null,
    patient_age: record.patientAge || null,
    patient_gender: record.patientGender || null,
    visit_date: record.visitDate || null,
    doctor_name: record.doctorName || null,
    facility_name: record.facilityName || null,
    diagnoses: record.diagnoses || [],
    conditions: record.conditions || [],
    allergies: record.allergies || [],
    raw_text: record.rawText || null,
    confidence: record.confidence || null,
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function getMedicalRecordsBySession(sessionId: string) {
  return Object.values(store.medical_records)
    .filter((r: any) => r.session_id === sessionId)
    .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
}

// ---------- Timeline ----------
export function saveTimelineEvent(event: any) {
  store.patient_timeline[event.id] = {
    id: event.id,
    session_id: event.sessionId,
    event_date: event.eventDate || null,
    event_type: event.eventType || 'note',
    title: event.title,
    description: event.description || null,
    document_id: event.documentId || null,
    document_name: event.documentName || null,
    sort_key: event.sortKey || event.eventDate || '9999',
    significance: event.significance || 'medium',
    confidence: event.confidence || null,
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function getTimelineBySession(sessionId: string) {
  return Object.values(store.patient_timeline)
    .filter((e: any) => e.session_id === sessionId)
    .sort((a: any, b: any) => {
      const sk = a.sort_key.localeCompare(b.sort_key);
      if (sk !== 0) return sk;
      return a.created_at.localeCompare(b.created_at);
    });
}

export function clearTimeline(sessionId: string) {
  for (const id of Object.keys(store.patient_timeline)) {
    if (store.patient_timeline[id].session_id === sessionId) {
      delete store.patient_timeline[id];
    }
  }
  saveStore();
}

// ---------- Lab Results ----------
export function saveLabResult(result: any) {
  store.lab_results[result.id] = {
    id: result.id,
    session_id: result.sessionId,
    document_id: result.documentId,
    test_name: result.testName,
    value: result.value != null ? result.value : null,
    unit: result.unit || null,
    reference_min: result.referenceMin != null ? result.referenceMin : null,
    reference_max: result.referenceMax != null ? result.referenceMax : null,
    reference_text: result.referenceText || null,
    status: result.status || 'Unknown',
    test_date: result.testDate || null,
    document_name: store.documents[result.documentId]?.original_name || null,
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function getLabResultsBySession(sessionId: string) {
  return Object.values(store.lab_results)
    .filter((r: any) => r.session_id === sessionId)
    .sort((a: any, b: any) => {
      const n = a.test_name.localeCompare(b.test_name);
      if (n !== 0) return n;
      return (a.test_date || '').localeCompare(b.test_date || '');
    });
}

// ---------- Medications ----------
export function saveMedication(med: any) {
  store.medications[med.id] = {
    id: med.id,
    session_id: med.sessionId,
    document_id: med.documentId,
    drug_name: med.drugName,
    dosage: med.dosage || null,
    frequency: med.frequency || null,
    route: med.route || null,
    prescribed_date: med.prescribedDate || null,
    prescribed_by: med.prescribedBy || null,
    document_name: store.documents[med.documentId]?.original_name || null,
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function getMedicationsBySession(sessionId: string) {
  return Object.values(store.medications)
    .filter((m: any) => m.session_id === sessionId)
    .sort((a: any, b: any) =>
      (a.prescribed_date || '').localeCompare(b.prescribed_date || '') ||
      a.drug_name.localeCompare(b.drug_name)
    );
}

// ---------- Prescription Analysis ----------
export function savePrescriptionAnalysis(analysis: any) {
  store.prescription_analysis[analysis.id] = {
    id: analysis.id,
    session_id: analysis.sessionId,
    risk_type: analysis.riskType,
    severity: analysis.severity,
    title: analysis.title,
    description: analysis.description,
    recommendation: analysis.recommendation,
    drug_a: analysis.drugA || null,
    drug_b: analysis.drugB || null,
    evidence_documents: analysis.evidenceDocuments || [],
    confidence: analysis.confidence || null,
    created_at: new Date().toISOString(),
  };
  saveStore();
}

export function getPrescriptionAnalysisBySession(sessionId: string) {
  const severityOrder: Record<string, number> = { critical: 1, warning: 2, info: 3 };
  return Object.values(store.prescription_analysis)
    .filter((r: any) => r.session_id === sessionId)
    .sort(
      (a: any, b: any) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9)
    );
}

export function clearPrescriptionAnalysis(sessionId: string) {
  for (const id of Object.keys(store.prescription_analysis)) {
    if (store.prescription_analysis[id].session_id === sessionId) {
      delete store.prescription_analysis[id];
    }
  }
  saveStore();
}

// ---------- AI Responses ----------
export function saveAiResponse(response: any) {
  store.ai_responses[response.id] = {
    id: response.id,
    session_id: response.sessionId,
    question: response.question,
    answer: response.answer,
    confidence: response.confidence || null,
    evidence_documents: response.evidenceDocuments || [],
    created_at: new Date().toISOString(),
  };
  saveStore();
}
