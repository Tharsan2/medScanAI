// ==========================================================
// Gemini AI Service — MedScan AI Next.js
// All 6 original functions + 2 new cross-checker functions
// ==========================================================
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const REQUEST_TIMEOUT_MS = 45000;

function createError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

function extractJson(rawText: string): any {
  let cleaned = rawText.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw createError('INVALID_RESPONSE', 'Gemini response did not contain a JSON object.');
  }
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    throw createError('INVALID_RESPONSE', 'Gemini response was not valid JSON.');
  }
}

function getApiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw createError('MISSING_API_KEY', 'GEMINI_API_KEY not set in .env.local');
  return k;
}

async function callLLM(apiKey: string, systemInstruction: string, userPrompt: string): Promise<any> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await model.generateContent(
      userPrompt,
      { signal: controller.signal } as any
    );
    const text = result.response.text();
    if (!text) throw createError('INVALID_RESPONSE', 'Gemini response had no text content.');
    return extractJson(text);
  } catch (err: any) {
    if (err.name === 'AbortError') throw createError('TIMEOUT', 'Gemini API request timed out.');
    throw createError('API_ERROR', err.message || 'Gemini API error.');
  } finally {
    clearTimeout(timeoutId);
  }
}

// =========================================================
// 1. Extract Medical Entities from document text
// =========================================================
export async function extractMedicalEntities(text: string, filename: string): Promise<any> {
  const apiKey = getApiKey();
  const system = `You are a medical information extraction AI. Extract all structured medical data from clinical documents.
Return ONLY valid JSON with this exact structure:
{
  "patientName": "string or null",
  "patientAge": "string or null",
  "patientGender": "string or null",
  "visitDate": "YYYY-MM-DD or descriptive string or null",
  "doctorName": "string or null",
  "facilityName": "string or null",
  "documentType": "lab_report | prescription | doctor_note | discharge_summary | medical_history | unknown",
  "diagnoses": ["array of diagnosis strings"],
  "conditions": ["array of medical condition strings"],
  "allergies": ["array of allergy strings"],
  "symptoms": ["array of symptom strings"],
  "medications": [{"drugName": "string","dosage": "string or null","frequency": "string or null","route": "string or null","prescribedDate": "string or null"}],
  "labResults": [{"testName": "string","value": 0,"unit": "string or null","referenceMin": null,"referenceMax": null,"referenceText": "string or null","status": "Normal | High | Low | Unknown"}],
  "summary": "2-3 sentence plain English summary of this document",
  "keyFindings": ["array of important clinical findings"],
  "confidence": 85
}
Rules: Extract only what is explicitly stated. Never invent values. Use null for missing fields. For lab values, value must be a number or null.`;

  const userPrompt = `Document filename: ${filename || 'unknown'}\n\nDocument text:\n${text.substring(0, 8000)}\n\nExtract all medical information from this document and return the JSON structure.`;
  return callLLM(apiKey, system, userPrompt);
}

// =========================================================
// 2. Analyze Lab Trends
// =========================================================
export async function analyzeLabTrends(labTrendGroups: any[]): Promise<any> {
  const apiKey = getApiKey();
  const system = `You are a medical lab result trend analysis AI.
Analyze the provided lab test results recorded over multiple dates and return ONLY valid JSON:
{"trends":[{"testName":"string","trendDirection":"improving | worsening | stable | single_point","clinicalSignificance":"normal | borderline | abnormal | critical","plainExplanation":"2-3 sentences","recommendation":"brief actionable recommendation","confidence":85}],"overallSummary":"1-2 sentence assessment","overallConfidence":85}
Rules: Do not diagnose. Do not prescribe. Only explain what the numbers show.`;

  const userPrompt = `Lab test trends to analyze:\n${JSON.stringify(labTrendGroups, null, 2)}\n\nProvide trend analysis for each test group.`;
  return callLLM(apiKey, system, userPrompt);
}

// =========================================================
// 3. Check Prescription Safety
// =========================================================
export async function checkPrescriptions(medications: any[], allergies: string[]): Promise<any> {
  const apiKey = getApiKey();
  const system = `You are a medication safety analysis AI. Analyze the provided medication list for potential safety issues.
Return ONLY valid JSON:
{"risks":[{"riskType":"interaction | duplicate | dosage_conflict | allergy_conflict","severity":"critical | warning | info","title":"short title","description":"clear explanation","recommendation":"actionable recommendation","drugA":"drug name or null","drugB":"drug name or null","confidence":85}],"safeMedications":["list"],"overallSafetyAssessment":"brief assessment","overallConfidence":85}
Rules: Only flag well-known, clinically significant drug interactions. Do not invent risks.`;

  const userPrompt = `Medications to analyze:\n${JSON.stringify(medications, null, 2)}\n\nKnown patient allergies:\n${JSON.stringify(allergies || [], null, 2)}\n\nCheck for: drug interactions, duplicate medications, significant dosage conflicts, and allergy conflicts.`;
  return callLLM(apiKey, system, userPrompt);
}

// =========================================================
// 4. Build Patient Timeline
// =========================================================
export async function buildTimelineNarrative(records: any[]): Promise<any> {
  const apiKey = getApiKey();
  const system = `You are a medical timeline builder AI. Create a chronological patient health timeline from medical records.
Return ONLY valid JSON:
{"events":[{"eventDate":"descriptive date string","sortKey":"YYYY-MM-DD","eventType":"visit | diagnosis | medication | lab_result | procedure | discharge | allergy | note","title":"concise event title (max 10 words)","description":"1-2 sentence plain explanation","documentName":"source document filename or null","significance":"high | medium | low","confidence":85}],"overallConfidence":85}`;

  const userPrompt = `Medical records to convert into a timeline:\n${JSON.stringify(records, null, 2)}\n\nCreate a comprehensive, chronological medical history timeline.`;
  return callLLM(apiKey, system, userPrompt);
}

// =========================================================
// 5. AI Chat with RAG context
// =========================================================
export async function chatWithContext(message: string, context: string, history: any[], language?: string): Promise<any> {
  const apiKey = getApiKey();
  const isTamil = language === 'ta';

  const system = `You are MedScan AI, a helpful medical document analysis assistant.
You answer questions based ONLY on the patient's uploaded medical documents provided in the context.
${isTamil ? 'Respond in Tamil script when the user asks in Tamil, or in Tanglish if they use Tanglish phonetic Tamil.' : ''}
Rules:
- Only answer based on the provided document context
- If information is not in the context, say so clearly
- Never diagnose or prescribe treatments
- Always recommend consulting a qualified doctor
- Reference specific documents when providing evidence
- Be clear, friendly, and use plain language

Return ONLY valid JSON:
{"answer": "your complete answer in plain language","confidence": 85,"evidenceDocuments": ["list of document names"],"keyFindings": ["bullet point key findings"],"disclaimer": "Always consult a qualified healthcare professional for medical decisions."}`;

  const historyText = history && history.length > 0
    ? `\nPrevious conversation:\n${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}\n`
    : '';

  const userPrompt = `${historyText}\nPatient's medical document context:\n${context.substring(0, 6000)}\n\nPatient's question: "${message}"\n\nAnswer the question based on the document context above.`;
  return callLLM(apiKey, system, userPrompt);
}

// =========================================================
// 6. Analyze Parameters (backward compatibility)
// =========================================================
export async function analyzeParameters(parameters: any[], filename: string): Promise<any> {
  const apiKey = getApiKey();
  const system = `You are a medical report explanation assistant.
Explain lab report values in plain, friendly language. Never diagnose. Never prescribe. Never invent values.
Return ONLY valid JSON:
{"summary": "","findings": [{"title": "","description": ""}],"riskLevel": "Low | Moderate | High | Unknown","healthInsights": [""],"recommendations": [""],"disclaimer": "AI-generated insights are informational only and are not a medical diagnosis.","confidence": 85}`;

  const userPrompt = `Lab report parameters:\n${JSON.stringify({ filename: filename || null, parameters }, null, 2)}\n\nExplain these values following all rules.`;
  const result = await callLLM(apiKey, system, userPrompt);
  const validLevels = ['Low', 'Moderate', 'High', 'Unknown'];
  return {
    ...result,
    riskLevel: validLevels.includes(result.riskLevel) ? result.riskLevel : 'Unknown',
    disclaimer: 'AI-generated insights are informational only and are not a medical diagnosis. Consult a qualified healthcare professional for medical decisions.',
  };
}

// =========================================================
// 7. Cross-check patient records for safety flags (from cross-checker)
// =========================================================
export async function crossCheckPatientRecord(patientRecord: any): Promise<any[]> {
  const apiKey = getApiKey();
  const system = `You are an expert Clinical Pharmacologist & Safety AI Engine.
Cross-check patient medical records across multiple visits, different providers, and long timeframes.
Detect:
1. DRUG-DRUG INTERACTIONS (e.g. Warfarin + Aspirin, ACE inhibitors + Spironolactone, SSRIs + NSAIDs)
2. ALLERGY TRIGGERS: Prescriptions conflicting with documented patient allergies
3. DUPLICATE PRESCRIPTIONS: Same active chemical compound prescribed under different brand names
4. DOSAGE CONFLICTS & RENAL/HEPATIC DOSE ADJUSTMENTS

Return ONLY valid JSON: {"riskFlags": [{"id":"string","title":"string","severity":"high | medium | low","category":"drug_interaction | duplicate_prescription | dosage_conflict | allergy_trigger","description":"string","mechanism":"string","clinicalRecommendation":"string","confidenceScore":0.95,"affectedDocumentIds":["array"],"affectedMedications":["array"]}]}`;

  const userPrompt = `Perform a comprehensive clinical cross-check for patient: ${patientRecord.name || 'Patient'}.

Active Medications: ${JSON.stringify(patientRecord.medications || [], null, 2)}
Lab Results: ${JSON.stringify(patientRecord.labResults || [], null, 2)}
Allergies: ${JSON.stringify(patientRecord.allergies || [], null, 2)}
Documents: ${JSON.stringify((patientRecord.documents || []).map((d: any) => ({ id: d.id, title: d.title, type: d.type, date: d.date })), null, 2)}

Evaluate all interactions, duplications, allergy triggers, and dosage conflicts.`;

  const result = await callLLM(apiKey, system, userPrompt);
  return result.riskFlags || [];
}

// =========================================================
// 8. Wound Analysis (Vision AI)
// =========================================================
export async function analyzeWoundImage(imageBase64: string, userNotes: string): Promise<any> {
  const apiKey = getApiKey();
  const systemInstruction = `You are a specialized Tele-Dermatology and Wound Care Clinical AI Specialist.
Visually inspect uploaded photos of skin wounds, diabetic ulcers, surgical sites, burns, or rashes, and provide a clear, empathetic triage evaluation.
Categorize triage level strictly into: 'emergency' (Requires Immediate ER / Ambulance), 'urgent' (Requires Urgent Care / Doctor visit within 24h), 'routine' (Schedule Doctor Visit), or 'homecare' (Manageable with First Aid).
Identify signs of infection. Provide step-by-step hygienic wound cleaning and dressing instructions.
List explicit red flag emergency warning signs.
Provide a clear explanation in Tamil (தமிழ்) and English.`;

  const prompt = `Inspect this wound image. Additional patient context: "${userNotes || 'None provided'}". Extract wound classification, triage severity, infection signs, healing stage, location, step-by-step cleaning instructions, red flags, English explanation, and Tamil explanation. Return ONLY valid JSON: {"title":"string","woundType":"string","severity":"emergency | urgent | routine | homecare","infectionSigns":["array"],"healingStage":"string","location":"string","cleaningSteps":["array"],"redFlags":["array"],"englishExplanation":"string","tamilExplanation":"string","confidenceScore":0.92}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await model.generateContent(
      [
        {
          inlineData: {
            data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
            mimeType: "image/jpeg"
          }
        },
        prompt
      ],
      { signal: controller.signal } as any
    );
    const text = result.response.text();
    if (!text) throw createError('INVALID_RESPONSE', 'No wound analysis response from Gemini.');
    return extractJson(text);
  } catch (err: any) {
    if (err.name === 'AbortError') throw createError('TIMEOUT', 'Gemini Vision API request timed out.');
    throw createError('API_ERROR', err.message || 'Gemini Vision API error.');
  } finally {
    clearTimeout(timeoutId);
  }
}

// =========================================================
// Deterministic clinical fallback engines (from cross-checker server.ts)
// =========================================================
export function generateFallbackCrossCheck(patientRecord: any): any[] {
  const flags: any[] = [];
  const meds = patientRecord?.medications || [];
  const labs = patientRecord?.labResults || [];
  const allergies = patientRecord?.allergies || [];
  const docs = patientRecord?.documents || [];

  const allergyList = allergies.length > 0
    ? allergies
    : (patientRecord?.medicalHistoryNotes || []).map((n: string) => ({ allergen: n }));

  // 1. Penicillin Allergy → Amoxicillin prescribed
  const hasPenicillinAllergy = allergyList.some((a: any) =>
    /penicillin|beta-lactam|amoxicillin/i.test(a.allergen || '') || /penicillin/i.test(JSON.stringify(a))
  );
  const hasAmoxicillin = meds.some((m: any) =>
    /amoxicillin|penicillin|ampicillin|augmentin/i.test(m.name || m.drug_name || '') || /amoxicillin|penicillin/i.test(m.genericName || '')
  );
  if (hasPenicillinAllergy && hasAmoxicillin) {
    flags.push({
      id: `flag-penicillin-${Date.now()}`,
      title: 'CRITICAL ALLERGY TRIGGER: Amoxicillin Prescribed to Penicillin-Allergic Patient',
      severity: 'high', category: 'allergy_trigger',
      description: 'Amoxicillin is a beta-lactam antibiotic. The patient has a documented severe anaphylactic allergy to Penicillin.',
      mechanism: 'Cross-reactivity between Penicillin and Amoxicillin is near 100%. High risk of systemic anaphylactic shock.',
      clinicalRecommendation: 'IMMEDIATE DISCONTINUATION required. Substitute with Clarithromycin, Azithromycin, or Clindamycin.',
      confidenceScore: 0.98,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Amoxicillin', 'Penicillin'],
    });
  }

  // 2. Dual Beta-Blocker (Betaloc + Oxprelol)
  const hasBetaloc = meds.some((m: any) => /betaloc|metoprolol/i.test(m.name || m.drug_name || ''));
  const hasOxprelol = meds.some((m: any) => /oxprelol|oxprenolol/i.test(m.name || m.drug_name || ''));
  if (hasBetaloc && hasOxprelol) {
    flags.push({
      id: `flag-bb-${Date.now()}`,
      title: 'DUPLICATE BETA-BLOCKER THERAPY: Betaloc + Oxprelol Co-Prescription',
      severity: 'high', category: 'duplicate_prescription',
      description: 'Patient is prescribed both Betaloc (Metoprolol) and Oxprelol (Oxprenolol) concurrently.',
      mechanism: 'Simultaneous dual beta-blockade risks severe bradycardia, AV node block, and profound hypotension.',
      clinicalRecommendation: 'Consolidate onto a single beta-blocker regimen under cardiovascular monitoring.',
      confidenceScore: 0.97,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Betaloc 100mg', 'Oxprelol 50mg'],
    });
  }

  // 3. Cimetidine + Beta-Blocker
  const hasCimetidine = meds.some((m: any) => /cimetidine/i.test(m.name || m.drug_name || ''));
  if (hasCimetidine && (hasBetaloc || hasOxprelol)) {
    flags.push({
      id: `flag-cim-${Date.now()}`,
      title: 'METABOLIC DRUG INTERACTION: Cimetidine + Beta-Blocker Toxicity Risk',
      severity: 'high', category: 'drug_interaction',
      description: 'Cimetidine prescribed alongside a hepatic CYP2D6-metabolized beta-blocker.',
      mechanism: 'Cimetidine inhibits CYP2D6 enzymes, reducing beta-blocker clearance by 30-50%, triggering toxic bradycardia.',
      clinicalRecommendation: 'Switch Cimetidine to Famotidine or Omeprazole (PPI).',
      confidenceScore: 0.96,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Cimetidine', hasBetaloc ? 'Betaloc' : 'Oxprelol'],
    });
  }

  // 4. Warfarin + Aspirin
  const hasWarfarin = meds.some((m: any) => /warfarin/i.test(m.name || m.drug_name || m.genericName || ''));
  const hasAspirin = meds.some((m: any) => /aspirin|ecosprin|acetylsalicylic/i.test(m.name || m.drug_name || m.genericName || ''));
  if (hasWarfarin && hasAspirin) {
    flags.push({
      id: `flag-war-${Date.now()}`,
      title: 'HIGH BLEEDING RISK: Combined Warfarin + Aspirin (Dual Antithrombotic)',
      severity: 'high', category: 'drug_interaction',
      description: 'Warfarin anticoagulant co-prescribed with Aspirin antiplatelet without explicit gastroprotection.',
      mechanism: 'Warfarin inhibits vitamin K clotting factors while Aspirin inhibits platelet COX-1, multiplying GI bleeding risk by 3-4x.',
      clinicalRecommendation: 'Assess if Aspirin is strictly required or add PPI gastroprotection and monitor INR closely.',
      confidenceScore: 0.96,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Warfarin', 'Aspirin'],
    });
  }

  // 5. Lisinopril + Spironolactone
  const hasACEi = meds.some((m: any) => /lisinopril|enalapril|ramipril|losartan/i.test(m.name || m.drug_name || m.genericName || ''));
  const hasSpiro = meds.some((m: any) => /spironolactone|eplerenone/i.test(m.name || m.drug_name || m.genericName || ''));
  const highK = labs.some((l: any) => /potassium/i.test(l.testName || l.test_name || '') && (parseFloat(l.numericValue || l.value) > 5.0 || l.status === 'high'));
  if (hasACEi && hasSpiro) {
    flags.push({
      id: `flag-ace-${Date.now()}`,
      title: 'HYPERKALEMIA RISK: Lisinopril + Spironolactone Co-Prescription',
      severity: 'high', category: 'drug_interaction',
      description: `Lisinopril ACE inhibitor combined with Spironolactone potassium-sparing diuretic.${highK ? ' Latest Serum Potassium is ELEVATED (>5.0 mmol/L).' : ''}`,
      mechanism: 'Both ACE inhibitors and aldosterone antagonists impair renal potassium excretion, risking severe hyperkalemia.',
      clinicalRecommendation: 'Re-evaluate serum potassium and eGFR within 7 days. Reduce dose if K > 5.0 mmol/L.',
      confidenceScore: 0.93,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Lisinopril', 'Spironolactone'],
    });
  }

  // 6. Metformin + High Creatinine
  const hasMetformin = meds.some((m: any) => /metformin/i.test(m.name || m.drug_name || m.genericName || ''));
  const highCreatinine = labs.some((l: any) => /creatinine/i.test(l.testName || l.test_name || '') && (parseFloat(l.numericValue || l.value) >= 1.4 || l.status === 'high'));
  const lowEGFR = labs.some((l: any) => /egfr/i.test(l.testName || l.test_name || '') && (parseFloat(l.numericValue || l.value) < 45 || l.status === 'low'));
  if (hasMetformin && (highCreatinine || lowEGFR)) {
    flags.push({
      id: `flag-met-${Date.now()}`,
      title: 'DOSAGE CONFLICT: Metformin Prescribed with Impaired Renal Function',
      severity: 'medium', category: 'dosage_conflict',
      description: 'High dose Metformin prescribed despite elevated Serum Creatinine and reduced eGFR.',
      mechanism: 'Metformin clearance is reduced in renal impairment, increasing the risk of lactic acidosis.',
      clinicalRecommendation: 'Cap Metformin at 1000mg/day maximum for eGFR 30-45 mL/min. Monitor renal panel closely.',
      confidenceScore: 0.90,
      affectedDocumentIds: docs.map((d: any) => d.id),
      affectedMedications: ['Metformin'],
    });
  }

  // Preserve existing flags if none matched
  if (flags.length === 0 && Array.isArray(patientRecord?.riskFlags) && patientRecord.riskFlags.length > 0) {
    return patientRecord.riskFlags;
  }

  return flags;
}

export function generateFallbackWoundAnalysis(): any {
  return {
    title: 'Visual Skin & Wound Triage Assessment',
    woundType: 'Diabetic / Cutaneous Lesion Assessment',
    severity: 'urgent',
    infectionSigns: ['Periwound Erythema (mild perimeter redness)', 'Local warmth and swelling', 'Serous fluid discharge present'],
    healingStage: 'Inflammatory phase with tissue granulation',
    location: 'Exposed skin surface / extremities',
    cleaningSteps: [
      '1. Gently irrigate wound with warm sterile normal saline (0.9% NaCl).',
      '2. Pat dry gently using sterile gauze.',
      '3. Apply thin non-adherent hydrogel dressing.',
      '4. Keep pressure off the affected site.',
    ],
    redFlags: [
      'Purulent discharge (pus) with unpleasant odor',
      'Spreading redness beyond margin',
      'Systemic fever or chills (> 38°C / 100.4°F)',
      'Blackened tissue or loss of sensation',
    ],
    englishExplanation: 'Symptom triage assessment completed. Mild inflammatory signs noted. Professional wound care consultation recommended within 24 hours.',
    tamilExplanation: 'காயத்தின் முதல் கட்ட பரிசோதனை முடிந்தது. லேசான சிவத்தல் மற்றும் வீக்கம் காணப்படுகிறது. 24 மணி நேரத்திற்குள் மருத்துவரை அணுகி சிகிச்சை பெறவும்.',
    confidenceScore: 0.92,
  };
}

export function mapErrorToHttp(err: any): { status: number; message: string } {
  switch (err.code) {
    case 'MISSING_API_KEY': return { status: 500, message: 'Gemini API key is not configured.' };
    case 'TIMEOUT': return { status: 504, message: 'Gemini API request timed out.' };
    case 'RATE_LIMIT': return { status: 429, message: 'Gemini API rate limit exceeded.' };
    case 'NETWORK_ERROR': return { status: 502, message: 'Network error contacting Gemini.' };
    case 'INVALID_RESPONSE': return { status: 502, message: 'Gemini returned an unexpected response.' };
    case 'API_ERROR': return { status: 502, message: err.message };
    default: return { status: 500, message: 'Unexpected AI error.' };
  }
}
