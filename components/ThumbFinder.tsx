'use client';

import { useState } from 'react';
import type { TomicaCar } from '@/lib/tomica-data';
import { useApiKey } from '@/lib/useApiKey';
import { makeThumb, rejectCarThumb, saveCarThumb, searchThumbnail, thumbQuery } from '@/lib/thumbs';

type Status = 'idle' | 'searching' | 'found' | 'notFound';

// Search / replace / remove controls for catalog cars that have no official picture
export default function ThumbFinder({ car, hasImage }: { car: TomicaCar; hasImage: boolean }) {
  const [apiKey] = useApiKey();
  const [status, setStatus] = useState<Status>('idle');
  // Sources already shown in this visit, so "another one" keeps moving down the results
  const [tried, setTried] = useState<string[]>([]);

  const search = async (replace: boolean) => {
    setStatus('searching');
    if (replace) await rejectCarThumb(car.id);
    const found = await searchThumbnail(thumbQuery(car), apiKey, { carId: car.id, exclude: tried });
    const src = found ? await makeThumb(found.dataUrl) : undefined;
    if (found && src) {
      setTried((t) => [...t, found.source]);
      await saveCarThumb(car.id, src, found.source);
      setStatus('found');
    } else {
      setStatus('notFound');
    }
  };

  const remove = async () => {
    await rejectCarThumb(car.id);
    setStatus('idle');
  };

  const busy = status === 'searching';
  const btn =
    'text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50';

  return (
    <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-500">
      <div className="flex flex-wrap items-center gap-2">
        {hasImage ? (
          <>
            <span className="mr-auto">縮圖由網路搜尋補上，可能不準確</span>
            <button className={btn} disabled={busy} onClick={() => search(true)}>
              🔄 換一張
            </button>
            <button className={btn} disabled={busy} onClick={remove}>
              ✕ 圖不對，移除
            </button>
          </>
        ) : (
          <>
            <span className="mr-auto">圖鑑還沒有這台的縮圖</span>
            <button className={btn} disabled={busy} onClick={() => search(false)}>
              🔍 搜尋縮圖
            </button>
          </>
        )}
      </div>
      {status === 'searching' && <p className="mt-2">🔎 正在網路上搜尋並確認圖片…（約 20～60 秒）</p>}
      {status === 'found' && <p className="mt-2">🖼️ 找到了，已補上並分享到共用圖庫</p>}
      {status === 'notFound' && <p className="mt-2">網路上沒找到確定是這台車的圖片</p>}
    </div>
  );
}
