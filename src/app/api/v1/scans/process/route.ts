import { NextRequest, NextResponse } from 'next/server';
import { extractMedicationsWithOpenAI } from '@/services/openAIExtraction';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image_base64, mime_type } = body;

    if (!image_base64) {
      return NextResponse.json(
        { error: 'Missing image_base64 in request body' },
        { status: 400 }
      );
    }

    const cleanBase64 = image_base64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Invoke OpenAI Vision Extraction Engine
    const extractionResult = await extractMedicationsWithOpenAI(
      cleanBase64,
      mime_type || 'image/jpeg'
    );

    return NextResponse.json({
      scan_id: `scan-${Date.now()}`,
      ...extractionResult,
    });
  } catch (err: unknown) {
    console.error('Scan processing API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
