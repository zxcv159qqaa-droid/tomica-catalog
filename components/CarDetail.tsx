'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCar,
  getCarById,
  getCarByVariantId,
  genLabel,
  getGenerations,
  parseCarId,
  seriesLabel,
} from '@/lib/tomica-data';
import { db, type CollectionItem } from '@/lib/db';
import CarThumb from '@/components/CarThumb';

export default function CarDetail({ carKey }: { carKey: string }) {
  const router = useRouter();
  const parsed = parseCarId(carKey);
  const car = getCarById(carKey) ?? getCar(parsed.series, parsed.number);
  const series = car?.series ?? parsed.series;
  const number = car?.number ?? parsed.number;
  const label = `${series === 'regular' ? '' : seriesLabel(series) + ' '}${car?.code ?? `No.${number}`}`;

  const [collectedVariants, setCollectedVariants] = useState<Set<string>>(
    new Set()
  );
  const [scanned, setScanned] = useState<CollectionItem[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [foundImage, setFoundImage] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [ownedCarIds, setOwnedCarIds] = useState<Set<string>>(new Set());
  const generations = car && !car.code ? getGenerations(series, number) : [];

  useEffect(() => {
    const load = async () => {
      const items = await db.collection
        .where('tomicaNumber')
        .equals(number)
        .toArray();
      setOwnedCarIds(
        new Set(
          items
            .filter((i) => !i.name)
            .map((i) => getCarByVariantId(i.variantId)?.id)
            .filter(Boolean) as string[]
        )
      );
      const variantIds = new Set(car?.variants.map((v) => v.id));
      setCollectedVariants(
        new Set(
          items
            .filter((i) => !i.name && variantIds.has(i.variantId))
            .map((i) => i.variantId)
        )
      );
      // SP/RD cars don't own a unique number, so scanned cars can't be tied to them
      setScanned(
        car?.code || car?.retired
          ? []
          : items.filter((i) => i.name && (i.series || 'regular') === series)
      );
      if (car) {
        const wish = await db.wishlist.where('variantId').equals(car.id).count();
        setIsWishlisted(wish > 0);
        if (!car.image) setFoundImage((await db.carImages.get(car.id))?.src);
      }
      setLoaded(true);
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
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 mb-4">
      <h2 className="font-semibold mb-3">已收藏的 {label}</h2>
      <div className="space-y-2">
        {scanned.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
          >
            <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.name}</p>
              {item.variantName && (
                <p className="text-xs text-slate-400 mt-0.5">{item.variantName}</p>
              )}
            </div>
            <button
              onClick={() => item.id && removeScanned(item.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              移除
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (!loaded) {
    return <div className="px-4 sm:px-6 pt-5 max-w-3xl mx-auto">{backButton}</div>;
  }

  if (!car) {
    return (
      <div className="px-4 sm:px-6 pt-5 max-w-3xl mx-auto">
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
    <div className="px-4 sm:px-6 pt-5 max-w-3xl mx-auto">
      {backButton}

      {scannedSection}

      <Collapsible
        collapsed={scanned.length > 0}
        summary={
          <>
            ⚠️ 編號已輪替：官網目前的 {label} 是另一台車「{car.name_ja}」，跟你收藏的不同。
            <span className="underline ml-1">查看</span>
          </>
        }
      >
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className={`px-5 py-3 flex items-center gap-2 text-white ${car.series === 'regular' ? 'tomica-red' : 'bg-slate-900'}`}>
          <span className="px-2.5 py-0.5 rounded-md bg-white text-red-600 font-black text-xs">
            {label}
          </span>
          <span className="text-xs font-semibold bg-black/25 px-2 py-0.5 rounded-full">
            {car.series === 'regular' ? '常規系列' : `Tomica ${seriesLabel(car.series)}`}
          </span>
        </div>
        <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <CarThumb
              src={car.image ?? foundImage}
              series={car.series}
              number={car.number}
              code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
              size="lg"
            />
            <div className="min-w-0">
              {car.retired && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  舊款
                </span>
              )}
              <h2 className="text-lg font-bold">{car.name_ja}</h2>
              {car.name_en && (
                <p className="text-sm text-slate-500">{car.name_en}</p>
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
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <p className="text-slate-400 text-xs">{car.series === 'dream' ? '主題' : '製造商'}</p>
            <p className="font-medium">{car.manufacturer}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
            <p className="text-slate-400 text-xs">系列</p>
            <p className="font-medium">
              {car.series === 'regular' ? '常規系列' : `Tomica ${seriesLabel(car.series)}`}
              {genLabel(car) ? `（${genLabel(car)}）` : ''}
            </p>
          </div>
          {car.period && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 col-span-2">
              <p className="text-slate-400 text-xs">販售期間</p>
              <p className="font-medium">
                {car.period}
                {car.retired && <span className="ml-2 text-xs text-slate-500">（已停售）</span>}
              </p>
              {car.note && <p className="text-xs text-slate-500 mt-1">{car.note}</p>}
            </div>
          )}
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
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
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
                  {meta && <p className="text-xs text-slate-400 mt-0.5">{meta}</p>}
                </div>
                <button
                  onClick={() => toggleVariant(variant.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isOwned
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
      </Collapsible>

      {generations.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 mt-4 mb-4">
          <h2 className="font-semibold mb-1">歷代 {label}（{generations.length}）</h2>
          <p className="text-xs text-slate-400 mb-3">
            同一個編號以前出過的車，由新到舊。資料來源：
            {series === 'premium' ? 'トミカの森 プレミアム館' : 'ピクシブ百科事典、こつめBLOG'}。
          </p>
          <div className="space-y-2">
            {generations.map((g) => {
              const owned =
                ownedCarIds.has(g.id) || (g.id === car.id && collectedVariants.size > 0);
              return (
                <Link
                  key={g.id}
                  href={`/catalog/${g.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    g.id === car.id
                      ? 'border-blue-400 dark:border-blue-600'
                      : 'border-slate-200 dark:border-slate-700'
                  } ${owned ? 'bg-blue-50 dark:bg-blue-950' : 'bg-slate-50 dark:bg-slate-900'}`}
                >
                  <span className="w-12 shrink-0 text-xs font-bold text-slate-500">
                    {genLabel(g) ?? `No.${number}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name_ja}</p>
                    <p className="text-xs text-slate-400">
                      {g.retired ? g.period || '已停售' : `現行${g.period ? `・${g.period}` : ''}`}
                    </p>
                  </div>
                  {owned && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full shrink-0">
                      已收藏
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Collapsible({
  collapsed,
  summary,
  children,
}: {
  collapsed: boolean;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <details className="group">
      <summary className="list-none cursor-pointer text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
        {summary}
      </summary>
      {children}
    </details>
  );
}
