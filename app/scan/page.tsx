'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CameraCapture from '@/components/CameraCapture';
import type { ScanResult } from '@/lib/gemini';
import {
  carId,
  displayCode,
  findCatalogMatch,
  scanVariantId,
  seriesLabel,
} from '@/lib/tomica-data';
import { db } from '@/lib/db';

function makeThumb(dataUrl: string, maxSide = 240): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

export default function ScanPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

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

  useEffect(() => {
    setAlreadyOwned(false);
    if (!result?.success) return;
    const ids = catalogMatch ? catalogMatch.variants.map((v) => v.id) : [scanId];
    db.collection
      .where('variantId')
      .anyOf(ids)
      .count()
      .then((n) => setAlreadyOwned(n > 0));
  }, [result, catalogMatch, scanId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gemini-api-key');
      if (stored) setApiKey(stored);
    } catch {}

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

    if (catalogMatch) {
      await db.collection.add({
        tomicaNumber: catalogMatch.number,
        variantId: catalogMatch.variants[0].id,
        series,
        addedAt: new Date(),
      });
    } else {
      await db.collection.add({
        tomicaNumber: number,
        variantId: scanId,
        name: result.name || `No.${number}`,
        variantName: result.variant,
        series,
        code,
        thumb: previewUrl ? await makeThumb(previewUrl) : undefined,
        addedAt: new Date(),
      });
    }
    setAdded(true);
  };

  const canScan = apiKey || hasServerKey;

  if (!canScan) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold mb-4">📷 拍照辨識</h1>
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
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">📷 拍照辨識</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        拍攝 Tomica 包裝盒正面或車體，AI 會幫你辨識車款編號和版本
      </p>

      <CameraCapture onCapture={handleCapture} disabled={scanning} />

      {previewUrl && (
        <div className="mt-6">
          <img
            src={previewUrl}
            alt="拍攝的照片"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}

      {scanning && (
        <div className="mt-6 text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">辨識中...</p>
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
                  <span className="text-gray-500">編號：</span>
                  <strong>
                    {seriesLabel(series)} {displayCode(code, number)}
                  </strong>
                </p>
                <p>
                  <span className="text-gray-500">車名：</span>
                  {result.name}
                </p>
                {result.variant && (
                  <p>
                    <span className="text-gray-500">版本：</span>
                    {result.variant}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">信心度：</span>
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
                <p className="mt-3 text-xs text-gray-500">
                  已對應到圖鑑：「{catalogMatch.name_ja}」
                </p>
              ) : numberHolder && !code ? (
                <p className="mt-3 text-xs text-gray-500">
                  圖鑑中目前的 {seriesLabel(series)} {displayCode(code, number)} 是「{numberHolder.name_ja}」，與辨識結果不同（可能是舊款），會以辨識結果另外加入收藏。
                </p>
              ) : (
                <p className="mt-3 text-xs text-gray-500">
                  圖鑑中沒有這台（可能已停售），會以辨識結果加入收藏。
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {alreadyOwned && !added ? (
                  <span className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-center rounded-lg text-sm text-gray-500">
                    已收藏
                  </span>
                ) : !added ? (
                  <button
                    onClick={handleAddToCollection}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    加入收藏
                  </button>
                ) : (
                  <span className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-center rounded-lg text-sm text-gray-500">
                    已加入收藏 ✓
                  </span>
                )}
                {(catalogMatch || added) && (
                  <Link
                    href={`/catalog/${catalogMatch ? catalogMatch.id : carId(series, number)}`}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-center rounded-lg text-sm font-medium"
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
                className="inline-block mt-3 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium"
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
