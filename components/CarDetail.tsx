'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCarByNumber } from '@/lib/tomica-data';
import { db } from '@/lib/db';

export default function CarDetail({ carNumber }: { carNumber: number }) {
  const router = useRouter();
  const car = getCarByNumber(carNumber);

  const [collectedVariants, setCollectedVariants] = useState<Set<string>>(
    new Set()
  );
  const [wishlistNumbers, setWishlistNumbers] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const load = async () => {
      const items = await db.collection
        .where('tomicaNumber')
        .equals(carNumber)
        .toArray();
      setCollectedVariants(new Set(items.map((i) => i.variantId)));

      const wish = await db.wishlist
        .where('tomicaNumber')
        .equals(carNumber)
        .toArray();
      setWishlistNumbers(new Set(wish.map((w) => w.tomicaNumber)));
    };
    load();
  }, [carNumber]);

  if (!car) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-4xl mb-3">❓</p>
        <p>找不到 No.{carNumber} 的資料</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
        >
          返回
        </button>
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
        tomicaNumber: carNumber,
        variantId,
        addedAt: new Date(),
      });
      setCollectedVariants((prev) => new Set(prev).add(variantId));
    }
  };

  const toggleWishlist = async () => {
    if (wishlistNumbers.has(carNumber)) {
      await db.wishlist.where('tomicaNumber').equals(carNumber).delete();
      setWishlistNumbers((prev) => {
        const next = new Set(prev);
        next.delete(carNumber);
        return next;
      });
    } else {
      await db.wishlist.add({
        tomicaNumber: carNumber,
        addedAt: new Date(),
      });
      setWishlistNumbers((prev) => new Set(prev).add(carNumber));
    }
  };

  const isWishlisted = wishlistNumbers.has(carNumber);

  return (
    <div className="px-4 pt-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-1"
      >
        ← 返回
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {car.number}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{car.name_ja}</h1>
              <p className="text-sm text-gray-500">{car.name_en}</p>
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
            <p className="text-gray-400 text-xs">比例</p>
            <p className="font-medium">{car.scale}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs">系列</p>
            <p className="font-medium">
              {car.series === 'regular' ? '常規系列' : car.series}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-gray-400 text-xs">收藏進度</p>
            <p className="font-medium">
              {collectedVariants.size} / {car.variants.length}
            </p>
          </div>
        </div>

        <h2 className="font-semibold mb-3">
          版本一覽（{car.variants.length}）
        </h2>
        <div className="space-y-2">
          {car.variants.map((variant) => {
            const isOwned = collectedVariants.has(variant.id);
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
                  <p className="text-xs text-gray-400 mt-0.5">
                    {variant.color} · {variant.release_year}
                  </p>
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
