'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/CameraCapture';
import QuickLookup from '@/components/QuickLookup';
import BarcodeScan from '@/components/BarcodeScan';
import Segmented from '@/components/Segmented';
import { NumberTab } from '@/components/CardParts';
import { BarcodeIcon, CheckIcon, PlusIcon, ScanIcon, SearchIcon, WarningIcon } from '@/components/icons';
import type { ScanResult } from '@/lib/gemini';
import {
  carId,
  displayCode,
  findCatalogMatch,
  scanVariantId,
  seriesLabel,
} from '@/lib/tomica-data';
import { db } from '@/lib/db';
import { useApiKey } from '@/lib/useApiKey';
import { hasSharedThumb, loadSharedThumbs, makeThumb, saveCarThumb, searchThumbnail } from '@/lib/thumbs';

function PhotoScan() {
  const [apiKey] = useApiKey();
  const [hasServerKey, setHasServerKey] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  // Ownership check result, tagged with the scan it belongs to so a new scan starts unowned
  const [ownedCheck, setOwnedCheck] = useState<{ scan: ScanResult; owned: boolean } | null>(null);
  const alreadyOwned = !!result && ownedCheck?.scan === result && ownedCheck.owned;
  const [thumbStatus, setThumbStatus] = useState<'idle' | 'searching' | 'found' | 'notFound'>('idle');

  const series = result?.series || 'regular';
  const number = result?.number || 0;
  // Keep codes like "SP" / "DM-13"; plain numbers are already in `number`
  const code = result?.code && /\D/.test(result.code) ? result.code.toUpperCase() : undefined;
  const { match: catalogMatch, holder: numberHolder } = useMemo(
    () =>
      result?.success && result.name
        ? findCatalogMatch(series, number, code, result.name)
        : {},
    [result, series, number, code]
  );
  const scanId = scanVariantId(number, `${code ?? ''}${result?.name ?? ''}`, series);
  // Normal and first-edition boxes share a number: pick the one the scan read
  const scanVariant = useMemo(() => {
    if (!catalogMatch) return undefined;
    const first = /初回|first/i.test(result?.variant ?? '');
    return (
      catalogMatch.variants.find((v) => !!v.is_first_edition === first) ?? catalogMatch.variants[0]
    );
  }, [catalogMatch, result]);

  useEffect(() => {
    if (!result?.success) return;
    const ids = scanVariant ? [scanVariant.id] : [scanId];
    db.collection
      .where('variantId')
      .anyOf(ids)
      .count()
      .then((n) => setOwnedCheck({ scan: result, owned: n > 0 }));
  }, [result, scanVariant, scanId]);

  useEffect(() => {
    fetch('/api/scan', { method: 'HEAD' })
      .then((res) => {
        if (res.ok || res.status === 405) setHasServerKey(true);
      })
      .catch(() => {});
  }, []);

  const handleCapture = async (base64: string, mimeType: string) => {
    setScanning(true);
    setResult(null);
    setAdded(false);
    setThumbStatus('idle');
    setPreviewUrl(`data:${mimeType};base64,${base64}`);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          apiKey: apiKey || undefined,
        }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: '網路連線錯誤，請稍後再試' });
    }
    setScanning(false);
  };

  const handleAddToCollection = async () => {
    if (!result?.success || alreadyOwned) return;

    const ownPhoto = previewUrl ? await makeThumb(previewUrl) : undefined;
    let scannedId: number | undefined;
    if (catalogMatch && scanVariant) {
      await db.collection.add({
        tomicaNumber: catalogMatch.number,
        variantId: scanVariant.id,
        series,
        addedAt: new Date(),
      });
    } else {
      scannedId = await db.collection.add({
        tomicaNumber: number,
        variantId: scanId,
        name: result.name || `No.${number}`,
        variantName: result.variant,
        series,
        code,
        thumb: ownPhoto,
        addedAt: new Date(),
      });
    }
    setAdded(true);

    // Catalog cars with an official image need nothing more
    if (catalogMatch?.image) return;
    // Someone already filled this car in the shared library
    if (catalogMatch) {
      await loadSharedThumbs();
      if (hasSharedThumb(catalogMatch.id)) return;
    }
    const name = catalogMatch?.name_ja ?? result.name ?? '';
    const box = `${seriesLabel(series)} ${displayCode(code, number)}`;
    setThumbStatus('searching');
    const { found } = await searchThumbnail(`${box} ${name}`, apiKey, { carId: catalogMatch?.id });
    const src = found ? await makeThumb(found.dataUrl) : undefined;

    if (catalogMatch) {
      // Fall back to the user's own photo so the catalog card isn't blank
      if (src) await saveCarThumb(catalogMatch.id, src, found!.source);
      else if (ownPhoto) await saveCarThumb(catalogMatch.id, ownPhoto, 'scan');
    } else if (src && scannedId) {
      await db.collection.update(scannedId, { thumb: src });
    }
    setThumbStatus(src ? 'found' : 'notFound');
  };

  const canScan = apiKey || hasServerKey;

  if (!canScan) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-3 flex items-start gap-2 text-sm">
          <WarningIcon size={18} className="mt-0.5 shrink-0 text-brand-text" />
          需要設定 Google Gemini API Key 才能使用拍照辨識功能
        </p>
        <Link
          href="/settings"
          className="press inline-flex h-11 items-center rounded-[10px] bg-[#24272c] px-4 text-sm font-medium text-white dark:bg-[#eef0f3] dark:text-[#14161a]"
        >
          前往設定
        </Link>
      </div>
    );
  }

  const confidenceText =
    result?.confidence === 'high' ? '高' : result?.confidence === 'medium' ? '中' : '低';
  const confidenceLevel = result?.confidence === 'high' ? 3 : result?.confidence === 'medium' ? 2 : 1;
  const secondaryBtn =
    'press inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-line bg-surface px-4 text-sm font-medium';

  return (
    <div>
      <p className="mb-5 text-sm text-muted">
        拍攝 Tomica 包裝盒正面或車體，AI 會幫你辨識車款編號和版本
      </p>

      <CameraCapture onCapture={handleCapture} disabled={scanning} />

      {previewUrl && (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img src={previewUrl} alt="拍攝的照片" className="w-full rounded-2xl border border-line" />
        </div>
      )}

      {scanning && (
        <div className="mt-6 py-8 text-center" role="status">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#e50012] border-t-transparent motion-reduce:animate-none" />
          <p className="mt-3 text-sm text-muted">辨識中...</p>
        </div>
      )}

      {result && !scanning && (
        <div className="mt-6">
          {result.success ? (
            <div>
              {/* The main message: owned or not */}
              <div
                className={`flex items-center gap-3 rounded-2xl p-4 ${
                  alreadyOwned && !added
                    ? 'bg-[#ffc400] text-[#24272c]'
                    : 'border border-line bg-surface'
                }`}
              >
                <NumberTab series={series} label={displayCode(code, number)} />
                <div className="min-w-0 flex-1">
                  {alreadyOwned && !added ? (
                    <p className="flex items-center gap-1.5 text-lg font-medium">
                      <WarningIcon size={20} className="shrink-0" />
                      你已經有這台了，不用再買！
                    </p>
                  ) : added ? (
                    <p className="flex items-center gap-1.5 text-lg font-medium">
                      <CheckIcon size={18} className="shrink-0 text-brand-text" />
                      已加入收藏
                    </p>
                  ) : (
                    <p className="text-lg font-medium">辨識結果</p>
                  )}
                </div>
              </div>

              <dl className="mt-3 divide-y divide-line border-y border-line text-[15px]">
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-sm text-muted">編號</dt>
                  <dd className="tnum text-right">
                    {seriesLabel(series)} {displayCode(code, number)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-sm text-muted">車名</dt>
                  <dd className="text-right">{result.name}</dd>
                </div>
                {result.variant && (
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-sm text-muted">版本</dt>
                    <dd className="text-right">{result.variant}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-muted">信心度</dt>
                  <dd className="flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={`h-2 w-4 rounded-sm ${n <= confidenceLevel ? 'bg-[#e50012]' : 'bg-line'}`}
                        />
                      ))}
                    </span>
                    {confidenceText}
                  </dd>
                </div>
              </dl>

              {catalogMatch ? (
                <p className="mt-3 text-sm text-muted">已對應到圖鑑：「{catalogMatch.name_ja}」</p>
              ) : numberHolder && !code ? (
                <p className="mt-3 text-sm text-muted">
                  圖鑑中目前的 {seriesLabel(series)} {displayCode(code, number)} 是「{numberHolder.name_ja}」，與辨識結果不同（可能是舊款），會以辨識結果另外加入收藏。
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">圖鑑中沒有這台（可能已停售），會以辨識結果加入收藏。</p>
              )}

              {thumbStatus !== 'idle' && (
                <p className="mt-3 text-sm text-muted">
                  {thumbStatus === 'searching'
                    ? '圖鑑沒有這台的縮圖，正在網路上搜尋…'
                    : thumbStatus === 'found'
                      ? '已從網路找到縮圖並補上'
                      : catalogMatch
                        ? '網路上沒找到合適的縮圖，先用你拍的照片當縮圖'
                        : '網路上沒找到合適的縮圖，保留你拍的照片'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {alreadyOwned && !added ? (
                  <span className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-line text-sm text-muted">
                    已收藏
                  </span>
                ) : !added ? (
                  <button
                    onClick={handleAddToCollection}
                    className="press flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#e50012] text-sm font-medium text-white"
                  >
                    <PlusIcon size={18} />
                    加入收藏
                  </button>
                ) : (
                  <span className="stamp-in flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-line text-sm text-muted">
                    <CheckIcon size={16} />
                    已加入收藏
                  </span>
                )}
                {(catalogMatch || added) && (
                  <Link
                    href={`/catalog/${catalogMatch ? catalogMatch.id : carId(series, number)}`}
                    className={secondaryBtn}
                  >
                    查看詳情
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e50012]/40 bg-surface p-4">
              <h3 className="mb-1 flex items-center gap-2 font-medium">
                <WarningIcon size={18} className="text-brand-text" />
                辨識失敗
              </h3>
              <p className="text-sm text-muted">{result.error}</p>
              <Link href="/catalog" className={`${secondaryBtn} mt-3 w-fit flex-none`}>
                手動搜尋
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MODES = [
  {
    key: 'lookup',
    label: (
      <>
        <SearchIcon size={16} />
        編號速查
      </>
    ),
  },
  {
    key: 'barcode',
    label: (
      <>
        <BarcodeIcon size={16} />
        條碼掃描
      </>
    ),
  },
  {
    key: 'photo',
    label: (
      <>
        <ScanIcon size={16} />
        拍照辨識
      </>
    ),
  },
] as const;
type Mode = (typeof MODES)[number]['key'];

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>('lookup');

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-medium">掃描確認</h1>
      <div className="mb-5">
        <Segmented fill label="辨識方式" options={MODES} value={mode} onChange={setMode} />
      </div>
      {mode === 'lookup' && <QuickLookup />}
      {mode === 'barcode' && <BarcodeScan />}
      {mode === 'photo' && <PhotoScan />}
    </div>
  );
}
