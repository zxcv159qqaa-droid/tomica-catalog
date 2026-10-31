'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  getAllCars,
  getCurrentCars,
  searchCars,
  normalizeName,
  type TomicaCar,
} from '@/lib/tomica-data';
import ScannedCard from '@/components/ScannedCard';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';
import BackupNudge from '@/components/BackupNudge';
import NewReleases from '@/components/NewReleases';
import Segmented from '@/components/Segmented';
import { SERIES_OPTIONS } from '@/components/seriesOptions';
import EmptyState from '@/components/EmptyState';
import { BookIcon, ChevronDownIcon, ScanIcon } from '@/components/icons';

type FilterMode = 'collected' | 'wishlist' | 'missing';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

const HOME_SERIES_OPTIONS = [{ key: 'all', label: '全部' }, ...SERIES_OPTIONS];

const SORTS = [
  { key: 'recent', label: '最近加入' },
  { key: 'number', label: '編號' },
] as const;

type SortMode = (typeof SORTS)[number]['key'];

const FILTERS = [
  { key: 'collected', label: '已收藏' },
  { key: 'wishlist', label: '想要' },
  { key: 'missing', label: '未收藏' },
] as const;

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('collected');
  const [sort, setSort] = useState<SortMode>('recent');
  const [series, setSeries] = useState<string>('all');
  const allCars = useMemo(() => getAllCars(), []);
  const currentCars = useMemo(() => getCurrentCars(), []);
  const {
    collectedByCar,
    qtyByCar,
    lastAddedByCar,
    scannedItems,
    wishlistIds,
    ownedCount,
    imageByCar,
  } = useCollection();
  // Nothing to filter yet: show only the compact empty state
  const brandNew = ownedCount === 0 && wishlistIds.size === 0 && search === '';
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;

  const visibleScanned = useMemo(() => {
    const q = normalizeName(search);
    return scannedItems
      .filter(
        (c) =>
          (series === 'all' || (c.series || 'regular') === series) &&
          (!q ||
            c.tomicaNumber.toString() === q ||
            normalizeName(c.name!).includes(q))
      )
      .sort((a, b) => a.tomicaNumber - b.tomicaNumber);
  }, [scannedItems, search, series]);

  const filteredCars = useMemo(() => {
    const cars = searchCars(search, allCars).filter(
      (c) => series === 'all' || c.series === series
    );
    switch (filter) {
      case 'collected':
        return cars.filter((c) => collectedByCar.has(c.id));
      case 'wishlist':
        return cars.filter((c) => wishlistIds.has(c.id));
      case 'missing':
        return cars.filter((c) => !c.retired && !collectedByCar.has(c.id));
    }
  }, [search, filter, series, allCars, collectedByCar, wishlistIds]);

  // 最近加入: one list mixing catalog cars and scanned items, newest first (stable on ties)
  const recentEntries = useMemo(() => {
    type Entry =
      | { kind: 'car'; car: TomicaCar; t: number }
      | { kind: 'scanned'; item: (typeof visibleScanned)[number]; t: number };
    const entries: Entry[] = [
      ...visibleScanned.map((item): Entry => ({
        kind: 'scanned',
        item,
        t: new Date(item.addedAt).getTime(),
      })),
      ...filteredCars.map((car): Entry => ({
        kind: 'car',
        car,
        t: lastAddedByCar.get(car.id) ?? 0,
      })),
    ];
    return entries.sort((a, b) => b.t - a.t);
  }, [visibleScanned, filteredCars, lastAddedByCar]);

  const showScanned = filter === 'collected' && visibleScanned.length > 0;
  const resultCount = filteredCars.length + (showScanned ? visibleScanned.length : 0);

  return (
    <div className="px-4 pt-6 sm:px-6">
      {/* Hero: plain on the page, not a card */}
      <h1 className="sr-only">我的車庫</h1>
      <section>
        <p className="flex items-baseline gap-2">
          <span className="tnum font-display text-[88px] font-medium leading-[0.85] sm:text-[112px]">
            {ownedCount}
          </span>
          <span className="text-lg text-muted">台在我的車庫</span>
        </p>
        <Link href="/stats" className="press mt-1 inline-flex min-h-11 items-center gap-1 text-sm text-muted">
          <span className="tnum">
            現行車款已收 {collectedCurrent} / {currentCars.length}
          </span>
          <ChevronDownIcon size={16} className="-rotate-90" />
        </Link>
      </section>

      <div className="mt-6 space-y-6">
        <BackupNudge />
        <NewReleases />
      </div>

      {!brandNew && (
        <section className="mt-6 space-y-3" aria-label="篩選">
          <Segmented scroll label="系列" options={HOME_SERIES_OPTIONS} value={series} onChange={setSeries} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented options={FILTERS} value={filter} onChange={setFilter} label="收藏狀態" />
            {filter === 'collected' && (
              <Segmented options={SORTS} value={sort} onChange={setSort} label="排序" />
            )}
          </div>
          <SearchBar value={search} onChange={setSearch} />
          {(filter !== 'collected' || series !== 'all' || search !== '') && (
            <p className="tnum text-sm text-muted">顯示 {resultCount} 款車型</p>
          )}
        </section>
      )}

      <div className="mt-3">
        {resultCount === 0 || brandNew ? (
          search ? (
            <EmptyState title={`找不到符合「${search}」的結果`} />
          ) : !brandNew && filter === 'collected' && series !== 'all' ? (
            <EmptyState title="這個系列還沒有收藏" hint="到「圖鑑」或「掃描」開始加入吧！" />
          ) : brandNew || filter === 'collected' ? (
            <EmptyState title="還沒有收藏任何車款" hint="到「圖鑑」或「掃描」開始加入吧！" compact={brandNew}>
              <Link
                href="/scan"
                className="press inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-[#e50012] px-4 text-sm font-medium text-white"
              >
                <ScanIcon size={18} />
                掃描
              </Link>
              <Link
                href="/catalog"
                className="press inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-4 text-sm font-medium"
              >
                <BookIcon size={18} />
                圖鑑
              </Link>
            </EmptyState>
          ) : filter === 'wishlist' ? (
            <EmptyState title="願望清單是空的" />
          ) : (
            <EmptyState title="你已經收集所有車款了！" />
          )
        ) : (
          <div className={GRID}>
            {filter === 'collected' && sort === 'recent' ? (
              recentEntries.map((e) =>
                e.kind === 'scanned' ? (
                  <ScannedCard key={e.item.id} item={e.item} />
                ) : (
                  <CarCard
                    key={e.car.id}
                    car={e.car}
                    isWishlisted={wishlistIds.has(e.car.id)}
                    collectedVariants={collectedByCar.get(e.car.id)}
                    fallbackImage={imageByCar.get(e.car.id)}
                    qty={qtyByCar.get(e.car.id)}
                  />
                )
              )
            ) : (
              <>
                {showScanned &&
                  visibleScanned.map((item) => <ScannedCard key={item.id} item={item} />)}
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    isWishlisted={wishlistIds.has(car.id)}
                    collectedVariants={collectedByCar.get(car.id)}
                    fallbackImage={imageByCar.get(car.id)}
                    qty={qtyByCar.get(car.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
