import { NextRequest, NextResponse } from 'next/server';
import { findThumbnail } from '@/lib/thumb-search';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { query, apiKey: clientKey } = await req.json();
  const apiKey = clientKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ found: false, error: '未設定 Gemini API Key' }, { status: 400 });
  }
  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    return NextResponse.json({ found: false, error: '缺少車款名稱' }, { status: 400 });
  }

  const result = await findThumbnail(apiKey, query.trim());
  return NextResponse.json(result ? { found: true, ...result } : { found: false });
}
