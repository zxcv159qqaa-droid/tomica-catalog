import { NextRequest, NextResponse } from 'next/server';
import { findThumbnail, ThumbSearchBusy } from '@/lib/thumb-search';
import { badSources } from '@/lib/shared-thumbs';
import { storeConfigured } from '@/lib/sync-store';

// A search can fall through to a second model and check several pictures
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { query, apiKey: clientKey, carId, exclude } = await req.json();
  const apiKey = clientKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ found: false, error: '未設定 Gemini API Key' }, { status: 400 });
  }
  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    return NextResponse.json({ found: false, error: '缺少車款名稱' }, { status: 400 });
  }

  const skip = Array.isArray(exclude) ? exclude.filter((s): s is string => typeof s === 'string') : [];
  if (typeof carId === 'string' && storeConfigured()) {
    skip.push(...(await badSources(carId).catch(() => [])));
  }

  try {
    const result = await findThumbnail(apiKey, query.trim(), skip.slice(0, 50));
    return NextResponse.json(result ? { found: true, ...result } : { found: false });
  } catch (err) {
    if (err instanceof ThumbSearchBusy) {
      return NextResponse.json({ found: false, busy: true, error: err.message }, { status: 503 });
    }
    throw err;
  }
}
