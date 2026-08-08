# MedScan AI

MedScan AI is an intelligent healthcare platform built with Next.js that leverages the power of Google's Gemini AI to analyze, triage, and organize medical data. It is designed to act as a comprehensive medical assistant, processing complex documents and visualizing patient histories through a modern, glassmorphic UI.

## 🌟 Features

- **AI Medical Document Extraction:** Upload lab reports, prescriptions, or discharge summaries (PDF/Images) and automatically extract key patient metadata, diagnoses, and lab values using OCR and Gemini LLM.
- **Wound Vision & Triage:** Upload photos of skin wounds or burns. The AI visually assesses the severity, assigns a triage level (Emergency, Urgent, Routine, Homecare), provides a diagnosis in English and Tamil, and lists hygienic cleaning steps.
- **Prescription Safety Cross-Checker:** Deterministically evaluates current medications against new prescriptions to catch dangerous drug interactions and allergies.
- **Patient Timeline:** Automatically constructs a chronological history of all medical visits, diagnoses, and prescriptions based on uploaded records.
- **Lab Trend Analysis:** Visualizes and tracks how specific lab values (e.g., Blood Glucose) fluctuate over time.
- **AI Medical Assistant:** Ask contextual questions directly about the uploaded patient records and get instant, evidence-based answers.

## 🚀 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** Vanilla CSS with custom glassmorphism and modern UI tokens.
- **AI Integration:** [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini Models)
- **Icons:** [Boxicons](https://boxicons.com/)

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js (v18+) installed. You will also need a Google Gemini API Key.

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 🧠 AI Architecture

MedScan AI centralizes its AI processing through the `src/lib/gemini.ts` service layer. 
- It relies on the `gemini-flash-latest` model to ensure robust performance across various tasks (image analysis, structured JSON extraction, chat).
- The fallback mechanisms guarantee that even under heavy rate limits, the app seamlessly degrades to available models.

## 🔒 Privacy & Safety

- **No Permanent Storage:** Uploaded files and generated AI records are strictly localized to the active session. When the session is cleared, data is dropped.
- **Medical Disclaimer:** MedScan AI is built as an educational and triage-assistance tool. It does *not* constitute professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.

## 🎨 Design System

MedScan AI uses a state-of-the-art medical dashboard aesthetic, prioritizing clear visual hierarchy:
- Deep blue gradients and glassmorphic panels (`--color-bg-2`, `--color-border-accent`).
- Dynamic alerting systems (e.g., pulsating red glows for severe medical risks).
- Responsive, interactive components (Dropzones, Feature Grids, and KPIs).

---
*Built for the future of intelligent healthcare.*
