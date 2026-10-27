import { NextRequest, NextResponse } from 'next/server';
import { pull, push, storeConfigured, SYNC_CODE_RE } from '@/lib/sync-store';

export async function POST(req: NextRequest) {
  if (!storeConfigured()) {
    return NextResponse.json({ error: '伺服器還沒設定雲端資料庫' }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
  if (!SYNC_CODE_RE.test(code)) {
    return NextResponse.json({ error: '同步碼格式不對' }, { status: 400 });
  }

  try {
    if (body.action === 'pull') {
      return NextResponse.json(await pull(code));
    }
    if (body.action === 'push') {
      const images = body.addImages && typeof body.addImages === 'object' ? body.addImages : {};
      const remove = Array.isArray(body.removeImages) ? body.removeImages.map(String) : [];
      for (const v of Object.values(images)) {
        if (typeof v !== 'string' || !v.startsWith('data:image/')) {
          return NextResponse.json({ error: '圖片格式不對' }, { status: 400 });
        }
      }
      const updatedAt = await push(code, body.data, images as Record<string, string>, remove);
      return NextResponse.json({ updatedAt });
    }
    return NextResponse.json({ error: '未知的動作' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '同步失敗' },
      { status: 502 }
    );
  }
}
