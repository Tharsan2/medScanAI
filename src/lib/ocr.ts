// OCR Service — MedScan AI Next.js
// Handles text extraction from PDFs and images safely in Next.js Node environment

import fs from 'fs';
import path from 'path';

export async function extractText(filename: string, mimetype: string, filePath: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    return extractTextFromPDF(filePath);
  } else if (mimetype === 'image/jpeg' || mimetype === 'image/png' || mimetype.startsWith('image/')) {
    return extractTextFromImage(filePath);
  } else {
    return '';
  }
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const result = await pdfParse(dataBuffer);
    return result.text || '';
  } catch (err: any) {
    console.warn('pdf-parse error (handled):', err.message);
    return '';
  }
}

async function extractTextFromImage(filePath: string): Promise<string> {
  let worker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWorker } = require('tesseract.js');
    
    // Explicit process.cwd() path to prevent Next.js Turbopack F:\ROOT module error
    const workerPath = path.join(process.cwd(), 'node_modules', 'tesseract.js', 'src', 'worker-script', 'node', 'index.js');
    
    if (fs.existsSync(/*turbopackIgnore: true*/ workerPath)) {
      worker = await createWorker('eng', 1, { workerPath });
      const { data } = await worker.recognize(filePath);
      await worker.terminate();
      return data.text || '';
    } else {
      console.warn('Tesseract worker not found at:', workerPath);
      // Fallback: Just let createWorker use defaults, which might work in standard Node environments.
      worker = await createWorker('eng', 1);
      const { data } = await worker.recognize(filePath);
      await worker.terminate();
      return data.text || '';
    }
  } catch (err: any) {
    console.warn('Tesseract OCR warning (handled gracefully):', err.message);
    if (worker && typeof worker.terminate === 'function') {
      try { await worker.terminate(); } catch {}
    }
    return '';
  }
}
