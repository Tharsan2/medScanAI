// Demo data — Sarah Johnson (diabetes management, 3 visits)
import { v4 as uuidv4 } from 'uuid';

export function buildDemoData(sessionId: string) {
  const docId1 = uuidv4();
  const docId2 = uuidv4();
  const docId3 = uuidv4();
  const recId1 = uuidv4();
  const recId2 = uuidv4();
  const recId3 = uuidv4();

  const documents = [
    { id: docId1, sessionId, originalName: 'Lab_Report_Jan2025.pdf', filename: 'demo-lab-jan.pdf', mimetype: 'application/pdf', size: 124000, docType: 'lab_report', status: 'analyzed' },
    { id: docId2, sessionId, originalName: 'Prescription_Jun2025.pdf', filename: 'demo-rx-jun.pdf', mimetype: 'application/pdf', size: 89000, docType: 'prescription', status: 'analyzed' },
    { id: docId3, sessionId, originalName: 'Discharge_Summary_Mar2026.pdf', filename: 'demo-discharge-mar.pdf', mimetype: 'application/pdf', size: 210000, docType: 'discharge_summary', status: 'analyzed' },
  ];

  const medicalRecords = [
    { id: recId1, sessionId, documentId: docId1, patientName: 'Sarah Johnson', patientAge: '52', patientGender: 'Female', visitDate: '2025-01-15', doctorName: 'Dr. Emily Chen', facilityName: 'St. Mary Medical Center', diagnoses: ['Type 2 Diabetes Mellitus', 'Hypertension'], conditions: ['Obesity', 'Dyslipidemia'], allergies: ['Penicillin'], confidence: 92 },
    { id: recId2, sessionId, documentId: docId2, patientName: 'Sarah Johnson', patientAge: '52', patientGender: 'Female', visitDate: '2025-06-10', doctorName: 'Dr. Mark Rivera', facilityName: 'City Care Clinic', diagnoses: ['Acute Respiratory Infection'], conditions: ['Type 2 Diabetes Mellitus'], allergies: [], confidence: 88 },
    { id: recId3, sessionId, documentId: docId3, patientName: 'Sarah Johnson', patientAge: '52', patientGender: 'Female', visitDate: '2026-03-22', doctorName: 'Dr. Emily Chen', facilityName: 'St. Mary Medical Center', diagnoses: ['Diabetic Nephropathy Stage 2', 'Uncontrolled Hypertension'], conditions: [], allergies: [], confidence: 94 },
  ];

  const labResults = [
    { id: uuidv4(), sessionId, documentId: docId1, testName: 'HbA1c', value: 7.2, unit: '%', referenceMin: null, referenceMax: 6.5, referenceText: '< 6.5%', status: 'High', testDate: '2025-01-15' },
    { id: uuidv4(), sessionId, documentId: docId1, testName: 'Fasting Glucose', value: 148, unit: 'mg/dL', referenceMin: 70, referenceMax: 100, status: 'High', testDate: '2025-01-15' },
    { id: uuidv4(), sessionId, documentId: docId1, testName: 'Serum Creatinine', value: 1.0, unit: 'mg/dL', referenceMin: 0.6, referenceMax: 1.2, status: 'Normal', testDate: '2025-01-15' },
    { id: uuidv4(), sessionId, documentId: docId3, testName: 'HbA1c', value: 7.9, unit: '%', referenceMin: null, referenceMax: 6.5, referenceText: '< 6.5%', status: 'High', testDate: '2026-03-22' },
    { id: uuidv4(), sessionId, documentId: docId3, testName: 'Serum Creatinine', value: 1.8, unit: 'mg/dL', referenceMin: 0.6, referenceMax: 1.2, status: 'High', testDate: '2026-03-22' },
    { id: uuidv4(), sessionId, documentId: docId3, testName: 'eGFR', value: 38, unit: 'mL/min', referenceMin: 60, referenceMax: null, referenceText: '> 60 mL/min', status: 'Low', testDate: '2026-03-22' },
    { id: uuidv4(), sessionId, documentId: docId3, testName: 'Serum Potassium', value: 5.4, unit: 'mmol/L', referenceMin: 3.5, referenceMax: 5.0, status: 'High', testDate: '2026-03-22' },
  ];

  const medications = [
    { id: uuidv4(), sessionId, documentId: docId1, drugName: 'Metformin SR', dosage: '1000mg', frequency: 'Twice daily (BD)', route: 'Oral', prescribedDate: '2025-01-15', prescribedBy: 'Dr. Emily Chen' },
    { id: uuidv4(), sessionId, documentId: docId1, drugName: 'Lisinopril', dosage: '20mg', frequency: 'Once daily (OD)', route: 'Oral', prescribedDate: '2025-01-15', prescribedBy: 'Dr. Emily Chen' },
    { id: uuidv4(), sessionId, documentId: docId2, drugName: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily (TDS)', route: 'Oral', prescribedDate: '2025-06-10', prescribedBy: 'Dr. Mark Rivera' },
    { id: uuidv4(), sessionId, documentId: docId3, drugName: 'Lisinopril', dosage: '20mg', frequency: 'Once daily (OD)', route: 'Oral', prescribedDate: '2026-03-22', prescribedBy: 'Dr. Emily Chen' },
    { id: uuidv4(), sessionId, documentId: docId3, drugName: 'Spironolactone', dosage: '25mg', frequency: 'Once morning (OM)', route: 'Oral', prescribedDate: '2026-03-22', prescribedBy: 'Dr. Emily Chen' },
    { id: uuidv4(), sessionId, documentId: docId3, drugName: 'Metformin SR', dosage: '1000mg', frequency: 'Twice daily (BD)', route: 'Oral', prescribedDate: '2026-03-22', prescribedBy: 'Dr. Emily Chen' },
  ];

  const prescriptionAnalysis = [
    {
      id: uuidv4(), sessionId,
      riskType: 'allergy_conflict', severity: 'critical',
      title: '🔴 CRITICAL ALLERGY TRIGGER: Amoxicillin Prescribed to Penicillin-Allergic Patient',
      description: 'Amoxicillin 500mg was prescribed at City Care Clinic (Jun 2025) but the patient has a documented life-threatening Penicillin allergy (Jan 2025 records).',
      recommendation: 'Substitute Amoxicillin immediately with a non-beta-lactam antibiotic (Azithromycin or Clindamycin). Consult physician urgently.',
      drugA: 'Amoxicillin', drugB: 'Penicillin (Allergy)', evidenceDocuments: ['Lab_Report_Jan2025.pdf', 'Prescription_Jun2025.pdf'], confidence: 98,
    },
    {
      id: uuidv4(), sessionId,
      riskType: 'drug_interaction', severity: 'critical',
      title: '🔴 HYPERKALEMIA RISK: Lisinopril + Spironolactone Co-Prescription',
      description: 'Both Lisinopril (ACE inhibitor) and Spironolactone (potassium-sparing diuretic) are prescribed. Serum Potassium is already ELEVATED at 5.4 mmol/L.',
      recommendation: 'Re-evaluate Potassium and eGFR within 7 days. Reduce dose or add potassium binder. Avoid potassium-rich foods.',
      drugA: 'Lisinopril', drugB: 'Spironolactone', evidenceDocuments: ['Discharge_Summary_Mar2026.pdf'], confidence: 95,
    },
    {
      id: uuidv4(), sessionId,
      riskType: 'dosage_conflict', severity: 'warning',
      title: '🟡 DOSAGE CONFLICT: Metformin Prescribed with Impaired Renal Function',
      description: 'Metformin SR 1000mg BD is continued despite elevated Serum Creatinine (1.8 mg/dL) and low eGFR (38 mL/min), which risks lactic acidosis.',
      recommendation: 'Cap Metformin to 1000mg/day maximum for eGFR 30-45. Monitor renal panel every 3 months.',
      drugA: 'Metformin SR', drugB: null, evidenceDocuments: ['Discharge_Summary_Mar2026.pdf'], confidence: 91,
    },
  ];

  const timelineEvents = [
    { id: uuidv4(), sessionId, eventDate: 'January 15, 2025', sortKey: '2025-01-15', eventType: 'visit', title: 'Diabetes & Hypertension Management Visit', description: 'Initial visit with Dr. Chen. Diagnosed with Type 2 Diabetes Mellitus and Hypertension. HbA1c 7.2%. Started on Metformin and Lisinopril.', documentName: 'Lab_Report_Jan2025.pdf', significance: 'high', confidence: 92 },
    { id: uuidv4(), sessionId, eventDate: 'January 15, 2025', sortKey: '2025-01-15', eventType: 'lab_result', title: 'Lab Panel — Elevated HbA1c & Fasting Glucose', description: 'HbA1c 7.2% (above 6.5% target). Fasting glucose 148 mg/dL (elevated). Creatinine 1.0 mg/dL (normal at this time).', documentName: 'Lab_Report_Jan2025.pdf', significance: 'high', confidence: 95 },
    { id: uuidv4(), sessionId, eventDate: 'January 15, 2025', sortKey: '2025-01-15', eventType: 'allergy', title: 'Documented Penicillin Allergy (Anaphylaxis)', description: 'Documented life-threatening Penicillin allergy (anaphylactic reaction). Critical flag for future prescriptions.', documentName: 'Lab_Report_Jan2025.pdf', significance: 'high', confidence: 98 },
    { id: uuidv4(), sessionId, eventDate: 'June 10, 2025', sortKey: '2025-06-10', eventType: 'visit', title: 'Acute Respiratory Infection — City Care Clinic', description: 'Presented with upper respiratory tract infection. Dr. Rivera prescribed Amoxicillin 500mg TDS. ALLERGY CONFLICT NOT CHECKED.', documentName: 'Prescription_Jun2025.pdf', significance: 'high', confidence: 88 },
    { id: uuidv4(), sessionId, eventDate: 'June 10, 2025', sortKey: '2025-06-10', eventType: 'medication', title: 'Amoxicillin 500mg Prescribed (ALLERGY RISK)', description: 'Amoxicillin prescribed despite documented Penicillin allergy — cross-reactivity risk. Critical safety flag detected.', documentName: 'Prescription_Jun2025.pdf', significance: 'high', confidence: 98 },
    { id: uuidv4(), sessionId, eventDate: 'March 22, 2026', sortKey: '2026-03-22', eventType: 'diagnosis', title: 'Diabetic Nephropathy Stage 2 Diagnosed', description: 'Follow-up at St. Mary. Worsening renal function — Creatinine 1.8 mg/dL (↑ from 1.0), eGFR 38 mL/min. Diabetic Nephropathy Stage 2 diagnosed.', documentName: 'Discharge_Summary_Mar2026.pdf', significance: 'high', confidence: 94 },
    { id: uuidv4(), sessionId, eventDate: 'March 22, 2026', sortKey: '2026-03-22', eventType: 'lab_result', title: 'Lab Panel — Worsening Renal Function', description: 'HbA1c 7.9% (worsened). Creatinine 1.8 mg/dL (high). eGFR 38 mL/min (low). Potassium 5.4 mmol/L (elevated).', documentName: 'Discharge_Summary_Mar2026.pdf', significance: 'high', confidence: 95 },
    { id: uuidv4(), sessionId, eventDate: 'March 22, 2026', sortKey: '2026-03-22', eventType: 'medication', title: 'Spironolactone Added — Hyperkalemia Risk with Lisinopril', description: 'Spironolactone 25mg OM added alongside Lisinopril 20mg OD. Combined potassium-raising effect with already-elevated K+ (5.4 mmol/L).', documentName: 'Discharge_Summary_Mar2026.pdf', significance: 'high', confidence: 95 },
  ];

  return { documents, medicalRecords, labResults, medications, prescriptionAnalysis, timelineEvents };
}
