import { NextRequest, NextResponse, connection } from 'next/server';
import { getCarById } from '@/lib/tomica-data';
import { storeConfigured } from '@/lib/sync-store';
import {
  MAX_SHARED_THUMB_CHARS,
  putShared,
  rejectShared,
  sharedIndex,
} from '@/lib/shared-thumbs';

const JPEG_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;

// carId -> version of every shared thumbnail; pictures are fetched one by one from /api/shared-thumbs/<carId>
export async function GET() {
  await connection();
  if (!storeConfigured()) return NextResponse.json({ versions: {} });
  try {
    return NextResponse.json(
      { versions: await sharedIndex() },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } }
    );
  } catch {
    return NextResponse.json({ versions: {} }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!storeConfigured()) {
    return NextResponse.json({ error: '雲端資料庫尚未設定' }, { status: 503 });
  }
  const { action, carId, src, source } = await req.json();
  const car = typeof carId === 'string' ? getCarById(carId) : undefined;
  // Only catalog cars still missing an official picture take shared ones
  if (!car || car.image) {
    return NextResponse.json({ error: '這台車不接受共用縮圖' }, { status: 400 });
  }

  try {
    if (action === 'put') {
      if (
        typeof src !== 'string' ||
        src.length > MAX_SHARED_THUMB_CHARS ||
        !JPEG_DATA_URL.test(src) ||
        typeof source !== 'string' ||
        source.length > 2000
      ) {
        return NextResponse.json({ error: '圖片格式不符' }, { status: 400 });
      }
      return NextResponse.json({ version: await putShared(car.id, src, source) });
    }
    if (action === 'reject') {
      await rejectShared(car.id);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  return NextResponse.json({ error: '未知的動作' }, { status: 400 });
}
