import { NextRequest, NextResponse } from 'next/server';
import { extractMedicationsFromImage } from '@/services/geminiExtraction';

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

    // Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = image_base64.replace(/^data:image\/[a-z]+;base64,/, '');

    const extractionResult = await extractMedicationsFromImage(
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
