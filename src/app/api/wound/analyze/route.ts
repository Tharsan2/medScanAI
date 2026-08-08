import { NextRequest, NextResponse } from 'next/server';
import { analyzeWoundImage, generateFallbackWoundAnalysis } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, userNotes } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 photo is required.' }, { status: 400 });
    }

    try {
      const woundAnalysis = await analyzeWoundImage(imageBase64, userNotes || '');
      return NextResponse.json({ success: true, woundAnalysis });
    } catch (err) {
      console.log('Gemini Wound API fallback triggered');
      const fallbackWound = generateFallbackWoundAnalysis();
      return NextResponse.json({ success: true, woundAnalysis: fallbackWound });
    }
  } catch (error: any) {
    console.error('Error in wound analyze API:', error);
    const fallbackWound = generateFallbackWoundAnalysis();
    return NextResponse.json({ success: true, woundAnalysis: fallbackWound });
  }
}
