'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCar, parseCarId, seriesLabel } from '@/lib/tomica-data';
import { db, type CollectionItem } from '@/lib/db';

export default function CarDetail({ carKey }: { carKey: string }) {
  const router = useRouter();
  const { series, number } = parseCarId(carKey);
  const car = getCar(series, number);
  const label = `${series === 'regular' ? '' : seriesLabel(series) + ' '}No.${number}`;

  const [collectedVariants, setCollectedVariants] = useState<Set<string>>(
    new Set()
  );
  const [scanned, setScanned] = useState<CollectionItem[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const items = await db.collection
        .where('tomicaNumber')
        .equals(number)
        .toArray();
      const variantIds = new Set(car?.variants.map((v) => v.id));
      setCollectedVariants(
        new Set(
          items
            .filter((i) => !i.name && variantIds.has(i.variantId))
            .map((i) => i.variantId)
        )
      );
      setScanned(
        items.filter((i) => i.name && (i.series || 'regular') === series)
      );
      if (car) {
        const wish = await db.wishlist.where('variantId').equals(car.id).count();
        setIsWishlisted(wish > 0);
      }
    };
    load();
  }, [car, number, series]);

  const backButton = (
    <button
      onClick={() => router.back()}
      className="text-sm text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-1"
    >
      ← 返回
    </button>
  );

  const removeScanned = async (id: number) => {
    await db.collection.delete(id);
    setScanned((prev) => prev.filter((i) => i.id !== id));
  };

  const scannedSection = scanned.length > 0 && (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 mb-4">
      <h2 className="font-semibold mb-3">已收藏的 {label}</h2>
      <div className="space-y-2">
        {scanned.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.name}</p>
              {item.variantName && (
                <p className="text-xs text-gray-400 mt-0.5">{item.variantName}</p>
              )}
            </div>
            <button
              onClick={() => item.id && removeScanned(item.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              移除
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (!car) {
    return (
      <div className="px-4 pt-6">
        {backButton}
        {scannedSection || (
          <div className="text-center">
            <p className="text-4xl mb-3">❓</p>
            <p>圖鑑中沒有 {label} 的資料</p>
          </div>
        )}
      </div>
    );
  }

  const toggleVariant = async (variantId: string) => {
    if (collectedVariants.has(variantId)) {
      await db.collection.where('variantId').equals(variantId).delete();
      setCollectedVariants((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    } else {
      await db.collection.add({
        tomicaNumber: car.number,
        variantId,
        series: car.series,
        addedAt: new Date(),
      });
      setCollectedVariants((prev) => new Set(prev).add(variantId));
    }
  };

  const toggleWishlist = async () => {
    if (isWishlisted) {
      await db.wishlist.where('variantId').equals(car.id).delete();
    } else {
      await db.wishlist.add({
        tomicaNumber: car.number,
        variantId: car.id,
        addedAt: new Date(),
      });
    }
    setIsWishlisted(!isWishlisted);
  };

  return (
    <div className="px-4 pt-6">
      {backButton}

      {scannedSection}

      {scanned.length > 0 && (
        <p className="text-xs text-gray-500 mb-2">圖鑑中目前的 {label}：</p>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 shrink-0 bg-blue-100 dark:bg-blue-900 rounded-xl flex flex-col items-center justify-center">
              {car.series !== 'regular' && (
                <span className="text-[10px] leading-none text-blue-500">
                  {seriesLabel(car.series)}
                </span>
              )}
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {car.number}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold">{car.name_ja}</h1>
              {car.name_en && (
                <p className="text-sm text-gray-500">{car.name_en}</p>
              )}
            </div>
          </div>
          <button
            onClick={toggleWishlist}
            className={`text-2xl transition-transform hover:scale-110 ${isWishlisted ? '' : 'grayscale opacity-30'}`}
          >
            ⭐
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs">製造商</p>
            <p className="font-medium">{car.manufacturer}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs">系列</p>
            <p className="font-medium">
              {car.series === 'regular' ? '常規系列' : `Tomica ${seriesLabel(car.series)}`}
            </p>
          </div>
        </div>

        <h2 className="font-semibold mb-3">版本一覽（{car.variants.length}）</h2>
        <div className="space-y-2">
          {car.variants.map((variant) => {
            const isOwned = collectedVariants.has(variant.id);
            const meta = [variant.color, variant.release_year].filter(Boolean).join(' · ');
            return (
              <div
                key={variant.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  isOwned
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{variant.name}</p>
                    {variant.is_first_edition && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        初回
                      </span>
                    )}
                  </div>
                  {meta && <p className="text-xs text-gray-400 mt-0.5">{meta}</p>}
                </div>
                <button
                  onClick={() => toggleVariant(variant.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isOwned
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isOwned ? '已收藏 ✓' : '加入收藏'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
