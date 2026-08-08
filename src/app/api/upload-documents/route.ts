import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createSession, saveDocument } from '@/lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

function detectDocType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('lab') || lower.includes('blood') || lower.includes('cbc') || lower.includes('test') || lower.includes('report')) return 'lab_report';
  if (lower.includes('prescription') || lower.includes('rx') || lower.includes('medication') || lower.includes('drug')) return 'prescription';
  if (lower.includes('discharge') || lower.includes('summary')) return 'discharge_summary';
  if (lower.includes('doctor') || lower.includes('note') || lower.includes('consultation')) return 'doctor_note';
  if (lower.includes('history') || lower.includes('record')) return 'medical_history';
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const files = formData.getAll('documents') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'No files uploaded.' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ success: false, message: `File type ${file.type} not supported. Only PDF, JPG, PNG allowed.` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ success: false, message: `File "${file.name}" exceeds 15 MB limit.` }, { status: 400 });
      }
    }

    const sessionId = uuidv4();
    createSession(sessionId, false);

    const savedDocs = [];
    for (const file of files) {
      const ext = path.extname(file.name);
      const filename = `doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      const arrayBuffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));

      const docId = uuidv4();
      const docType = detectDocType(file.name);

      saveDocument({
        id: docId,
        sessionId,
        originalName: file.name,
        filename,
        mimetype: file.type,
        size: file.size,
        docType,
      });

      savedDocs.push({
        id: docId,
        originalName: file.name,
        filename,
        mimetype: file.type,
        size: file.size,
        docType,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} document(s) uploaded successfully.`,
      data: { sessionId, documents: savedDocs },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, message: 'Upload failed: ' + err.message }, { status: 500 });
  }
}
