'use client';

import { useState } from 'react';
import type { TomicaCar } from '@/lib/tomica-data';
import { useApiKey } from '@/lib/useApiKey';
import { makeThumb, rejectCarThumb, saveCarThumb, searchThumbnail, thumbQuery } from '@/lib/thumbs';
import { CloseIcon, ImageIcon, RefreshIcon, SearchIcon } from '@/components/icons';

type Status = 'idle' | 'searching' | 'found' | 'notFound' | 'busy';

// Search / replace / remove controls for catalog cars that have no official picture
export default function ThumbFinder({ car, hasImage }: { car: TomicaCar; hasImage: boolean }) {
  const [apiKey] = useApiKey();
  const [status, setStatus] = useState<Status>('idle');
  // Sources already shown in this visit, so "another one" keeps moving down the results
  const [tried, setTried] = useState<string[]>([]);

  const search = async (replace: boolean) => {
    setStatus('searching');
    if (replace) await rejectCarThumb(car.id);
    const { found, busy } = await searchThumbnail(thumbQuery(car), apiKey, { carId: car.id, exclude: tried });
    const src = found ? await makeThumb(found.dataUrl) : undefined;
    if (found && src) {
      setTried((t) => [...t, found.source]);
      await saveCarThumb(car.id, src, found.source);
      setStatus('found');
    } else {
      setStatus(busy ? 'busy' : 'notFound');
    }
  };

  const remove = async () => {
    await rejectCarThumb(car.id);
    setStatus('idle');
  };

  const busy = status === 'searching';
  const btn =
    'press inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-sm font-medium hover:bg-paper disabled:opacity-50';

  return (
    <div className="text-sm text-muted">
      <div className="flex flex-wrap items-center gap-2">
        {hasImage ? (
          <>
            <span className="mr-auto">縮圖由網路搜尋補上，可能不準確</span>
            <button className={btn} disabled={busy} onClick={() => search(true)}>
              <RefreshIcon size={16} />
              換一張
            </button>
            <button className={btn} disabled={busy} onClick={remove}>
              <CloseIcon size={16} />
              圖不對，移除
            </button>
          </>
        ) : (
          <>
            <span className="mr-auto">圖鑑還沒有這台的縮圖</span>
            <button className={btn} disabled={busy} onClick={() => search(false)}>
              <SearchIcon size={16} />
              搜尋縮圖
            </button>
          </>
        )}
      </div>
      {status === 'searching' && (
        <p className="mt-2 flex items-center gap-1.5">
          <SearchIcon size={16} />
          正在網路上搜尋並確認圖片…（約 20～60 秒）
        </p>
      )}
      {status === 'found' && (
        <p className="mt-2 flex items-center gap-1.5">
          <ImageIcon size={16} />
          找到了，已補上並分享到共用圖庫
        </p>
      )}
      {status === 'notFound' && <p className="mt-2">網路上沒找到確定是這台車的圖片</p>}
      {status === 'busy' && (
        <p className="mt-2 text-[#9a5b00] dark:text-[#ffc400]">
          Gemini 額度暫時用完或忙碌中，過一陣子（或明天）再試；在設定填入自己的 API Key 也可以
        </p>
      )}
    </div>
  );
}
