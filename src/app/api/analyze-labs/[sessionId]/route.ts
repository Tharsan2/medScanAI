import { NextRequest, NextResponse } from 'next/server';
import { getSession, getLabResultsBySession } from '@/lib/db';
import { analyzeLabTrends } from '@/lib/gemini';

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
  }

  const labResults = getLabResultsBySession(sessionId);

  // Group by test name
  const grouped: Record<string, any[]> = {};
  for (const lr of labResults) {
    const name = lr.test_name;
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push({
      date: lr.test_date,
      value: lr.value,
      unit: lr.unit,
      status: lr.status,
      referenceMin: lr.reference_min,
      referenceMax: lr.reference_max,
      referenceText: lr.reference_text,
      documentName: lr.document_name,
    });
  }

  const labTrendGroups = Object.entries(grouped).map(([testName, readings]) => ({
    testName,
    readings: readings.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')),
  }));

  let trends: any[] = [];
  let overallSummary = '';
  let overallConfidence: number | null = null;

  if (labTrendGroups.length > 0) {
    try {
      const analysis = await analyzeLabTrends(labTrendGroups);
      trends = analysis.trends || [];
      overallSummary = analysis.overallSummary || '';
      overallConfidence = analysis.overallConfidence || null;
    } catch (err: any) {
      console.error('Lab trend analysis error:', err.message);
      trends = labTrendGroups.map((g: any) => ({
        testName: g.testName,
        trendDirection: g.readings.length > 1 ? 'stable' : 'single_point',
        clinicalSignificance: 'unknown',
        plainExplanation: 'Analysis unavailable — GEMINI_API_KEY may not be set.',
        recommendation: 'Consult your doctor.',
      }));
    }
  }

  const trendsWithData = labTrendGroups.map((g: any) => {
    const aiTrend = trends.find((t: any) => t.testName === g.testName) || {};
    return { ...g, ...aiTrend };
  });

  return NextResponse.json({
    success: true,
    data: { sessionId, labTrends: trendsWithData, overallSummary, overallConfidence },
  });
}
