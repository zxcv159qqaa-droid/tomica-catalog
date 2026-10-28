'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/CameraCapture';
import QuickLookup from '@/components/QuickLookup';
import BarcodeScan from '@/components/BarcodeScan';
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
      <div>
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            需要設定 Google Gemini API Key 才能使用拍照辨識功能
          </p>
          <Link
            href="/settings"
            className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium"
          >
            前往設定
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        拍攝 Tomica 包裝盒正面或車體，AI 會幫你辨識車款編號和版本
      </p>

      <CameraCapture onCapture={handleCapture} disabled={scanning} />

      {previewUrl && (
        <div className="mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img
            src={previewUrl}
            alt="拍攝的照片"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
          />
        </div>
      )}

      {scanning && (
        <div className="mt-6 text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">辨識中...</p>
        </div>
      )}

      {result && !scanning && (
        <div className="mt-6">
          {result.success ? (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                辨識結果
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-slate-500">編號：</span>
                  <strong>
                    {seriesLabel(series)} {displayCode(code, number)}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">車名：</span>
                  {result.name}
                </p>
                {result.variant && (
                  <p>
                    <span className="text-slate-500">版本：</span>
                    {result.variant}
                  </p>
                )}
                <p>
                  <span className="text-slate-500">信心度：</span>
                  {result.confidence === 'high'
                    ? '⭐⭐⭐ 高'
                    : result.confidence === 'medium'
                      ? '⭐⭐ 中'
                      : '⭐ 低'}
                </p>
              </div>

              {alreadyOwned && !added && (
                <p className="mt-3 p-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-sm font-medium">
                  ⚠️ 你已經有這台了，不用再買！
                </p>
              )}
              {catalogMatch ? (
                <p className="mt-3 text-xs text-slate-500">
                  已對應到圖鑑：「{catalogMatch.name_ja}」
                </p>
              ) : numberHolder && !code ? (
                <p className="mt-3 text-xs text-slate-500">
                  圖鑑中目前的 {seriesLabel(series)} {displayCode(code, number)} 是「{numberHolder.name_ja}」，與辨識結果不同（可能是舊款），會以辨識結果另外加入收藏。
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  圖鑑中沒有這台（可能已停售），會以辨識結果加入收藏。
                </p>
              )}

              {thumbStatus !== 'idle' && (
                <p className="mt-3 text-xs text-slate-500">
                  {thumbStatus === 'searching'
                    ? '🔎 圖鑑沒有這台的縮圖，正在網路上搜尋…'
                    : thumbStatus === 'found'
                      ? '🖼️ 已從網路找到縮圖並補上'
                      : catalogMatch
                        ? '網路上沒找到合適的縮圖，先用你拍的照片當縮圖'
                        : '網路上沒找到合適的縮圖，保留你拍的照片'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {alreadyOwned && !added ? (
                  <span className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-center rounded-lg text-sm text-slate-500">
                    已收藏
                  </span>
                ) : !added ? (
                  <button
                    onClick={handleAddToCollection}
                    className="flex-1 py-2 tomica-red text-white rounded-xl text-sm font-medium"
                  >
                    加入收藏
                  </button>
                ) : (
                  <span className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-center rounded-lg text-sm text-slate-500">
                    已加入收藏 ✓
                  </span>
                )}
                {(catalogMatch || added) && (
                  <Link
                    href={`/catalog/${catalogMatch ? catalogMatch.id : carId(series, number)}`}
                    className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-center rounded-lg text-sm font-medium"
                  >
                    查看詳情
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                辨識失敗
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                {result.error}
              </p>
              <Link
                href="/catalog"
                className="inline-block mt-3 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium"
              >
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
  { key: 'lookup', label: '🔢 編號速查' },
  { key: 'barcode', label: '▦ 條碼掃描' },
  { key: 'photo', label: '📷 拍照辨識' },
] as const;
type Mode = (typeof MODES)[number]['key'];

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>('lookup');

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-xl font-extrabold">掃描確認</h2>
      </div>
      <div className="inline-flex w-full rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 px-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              mode === m.key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'lookup' && <QuickLookup />}
      {mode === 'barcode' && <BarcodeScan />}
      {mode === 'photo' && <PhotoScan />}
    </div>
  );
}
