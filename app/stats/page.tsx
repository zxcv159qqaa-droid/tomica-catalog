'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CATALOG_SERIES, getAllCars, getCarByVariantId, seriesLabel } from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';
import { itemQty } from '@/lib/db';
import { useCollection } from '@/lib/useCollection';

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm';
const BAR: Record<string, string> = {
  regular: 'bg-red-600',
  premium: 'bg-amber-500',
  unlimited: 'bg-slate-500',
  dream: 'bg-indigo-600',
  disney: 'bg-sky-500',
  asia: 'bg-emerald-500',
};

export default function StatsPage() {
  const { collection, qtyByCar, scannedItems } = useCollection();
  const cars = useMemo(() => getAllCars(), []);

  const perSeries = CATALOG_SERIES.map((s) => {
    const current = cars.filter((c) => c.series === s && !c.retired);
    return {
      series: s,
      total: current.length,
      owned: current.filter((c) => qtyByCar.has(c.id)).length,
    };
  });

  const copies = collection.reduce((n, i) => n + itemQty(i), 0);
  const spent = collection.reduce((n, i) => n + (i.price ?? 0) * itemQty(i), 0);
  const priced = collection.filter((i) => i.price).length;

  // Regular No.1–N wall: current car owned, only an older car of that number owned, or none
  const wall = useMemo(() => {
    const current = cars.filter((c) => c.series === 'regular' && !c.retired && !c.code);
    const max = Math.max(...current.map((c) => c.number));
    const olderOwned = new Set<number>();
    for (const c of cars) {
      if (c.series === 'regular' && c.retired && qtyByCar.has(c.id)) olderOwned.add(c.number);
    }
    for (const s of scannedItems) {
      if ((s.series || 'regular') === 'regular') olderOwned.add(s.tomicaNumber);
    }
    return Array.from({ length: max }, (_, i) => {
      const n = i + 1;
      const car = current.find((c) => c.number === n);
      const state = car && qtyByCar.has(car.id) ? 'current' : olderOwned.has(n) ? 'older' : 'none';
      return { n, car, state };
    });
  }, [cars, qtyByCar, scannedItems]);

  const makers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of collection) {
      const maker = item.name ? '（掃描加入）' : getCarByVariantId(item.variantId)?.manufacturer;
      if (maker) counts.set(maker, (counts.get(maker) ?? 0) + itemQty(item));
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [collection]);
  const topMaker = makers[0]?.[1] ?? 1;

  return (
    <div className="px-4 sm:px-6 pt-5 space-y-5">
      <h2 className="text-xl font-extrabold">📊 收藏統計</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {perSeries.map((s) => (
          <div key={s.series} className={`${card} p-4`}>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${seriesStyle(s.series).dot}`} />
              {seriesLabel(s.series)} 現行
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black">{s.owned}</span>
              <span className="text-xs text-slate-400">/ {s.total} 款</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`${BAR[s.series]} h-full rounded-full transition-all duration-500`}
                style={{ width: `${s.total ? (s.owned / s.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className={`${card} p-4`}>
          <p className="text-xs text-slate-500">實體車在庫</p>
          <p className="mt-1 text-2xl font-black">
            {copies} <span className="text-xs font-normal text-slate-400">台</span>
          </p>
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs text-slate-500">累計購入金額</p>
          <p className="mt-1 text-2xl font-black">
            <span className="text-xs font-bold text-slate-400">NT$ </span>
            {spent.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">有填價格的 {priced} 筆</p>
        </div>
      </div>

      <section className={`${card} p-4 sm:p-5 space-y-3`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-extrabold">常規 No.1 – No.{wall.length} 百格牆</h3>
            <p className="text-xs text-slate-500">點格子看那個編號的車</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600" /> 有現行款</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> 只有舊款</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /> 沒有</span>
          </div>
        </div>
        <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1.5">
          {wall.map(({ n, car, state }) => (
            <Link
              key={n}
              href={`/catalog/regular-${n}`}
              title={car?.name_ja ?? `No.${n}`}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition hover:scale-110 ${
                state === 'current'
                  ? 'bg-red-600 text-white'
                  : state === 'older'
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      </section>

      {makers.length > 0 && (
        <section className={`${card} p-4 sm:p-5`}>
          <h3 className="font-extrabold mb-3">收藏最多的廠牌</h3>
          <ul className="space-y-2">
            {makers.map(([maker, count]) => (
              <li key={maker} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate">{maker}</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full rounded-full" style={{ width: `${(count / topMaker) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs text-slate-500">{count} 台</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
