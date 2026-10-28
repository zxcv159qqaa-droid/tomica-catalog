'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CATALOG_SERIES, getAllCars, getCarByVariantId, seriesLabel } from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';
import { itemQty } from '@/lib/db';
import { useCollection } from '@/lib/useCollection';
import SeriesBar from '@/components/SeriesBar';

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

  const ownedTotal = perSeries.reduce((n, s) => n + s.owned, 0);
  const currentTotal = perSeries.reduce((n, s) => n + s.total, 0);

  return (
    <div className="px-4 pt-6 sm:px-6">
      <h1 className="text-sm text-muted">收藏統計</h1>

      {/* Hero: plain on the page */}
      <section className="mt-1">
        <p className="flex items-baseline gap-2">
          <span className="tnum font-display text-[88px] font-medium leading-[0.85] sm:text-[112px]">{ownedTotal}</span>
          <span className="tnum text-lg text-muted">/ {currentTotal} 款現行</span>
        </p>
        <div className="mt-5">
          <SeriesBar
            segments={perSeries.filter((p) => p.total > 0).map((p) => ({ series: p.series, total: p.total, have: p.owned }))}
            label={`現行車款已收 ${ownedTotal} / ${currentTotal}`}
            legend={false}
          />
        </div>
        <dl className="tnum mt-5 flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <dt className="text-sm text-muted">實體車在庫</dt>
            <dd className="text-3xl font-medium">
              {copies} <span className="text-sm font-normal text-muted">台</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">累計購入金額</dt>
            <dd className="text-3xl font-medium">
              <span className="text-sm font-normal text-muted">NT$ </span>
              {spent.toLocaleString()}
            </dd>
            <dd className="text-[13px] text-muted">有填價格的 {priced} 筆</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h3 className="mb-1 text-base font-medium">各系列現行款</h3>
        <ul className="tnum divide-y divide-line border-y border-line">
          {perSeries.map((s) => (
            <li key={s.series} className="flex items-center gap-3 py-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seriesStyle(s.series).dot}`} aria-hidden="true" />
              <span className="w-28 shrink-0 truncate text-[15px]">{seriesLabel(s.series)}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: s.owned > 0 ? `max(4px, ${(s.owned / s.total) * 100}%)` : 0,
                    background: seriesStyle(s.series).accent,
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm text-muted">
                <span className="font-medium text-ink">{s.owned}</span> / {s.total} 款
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h3 className="text-base font-medium">常規 No.1 – No.{wall.length} 百格牆</h3>
            <p className="text-sm text-muted">點格子看那個編號的車</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#e50012]" />有現行款</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#ffc400]" />只有舊款</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] border border-line bg-surface" />沒有</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-10 sm:gap-1.5 lg:grid-cols-14">
          {wall.map(({ n, car, state }) => (
            <Link
              key={n}
              href={`/catalog/regular-${n}`}
              title={car?.name_ja ?? `No.${n}`}
              aria-label={`No.${n}${state === 'current' ? '，有現行款' : state === 'older' ? '，只有舊款' : '，沒有'}`}
              className={`press tnum flex aspect-square min-h-11 items-center justify-center rounded-[6px] text-sm font-medium ${
                state === 'current'
                  ? 'bg-[#e50012] text-white'
                  : state === 'older'
                    ? 'bg-[#ffc400] text-[#24272c]'
                    : 'border border-line bg-surface text-muted'
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      </section>

      {makers.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1 text-base font-medium">收藏最多的廠牌</h3>
          <ul className="tnum divide-y divide-line border-y border-line">
            {makers.map(([maker, count]) => (
              <li key={maker} className="flex items-center gap-3 py-2.5 text-[15px]">
                <span className="w-28 shrink-0 truncate">{maker}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${(count / topMaker) * 100}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-muted">{count} 台</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
