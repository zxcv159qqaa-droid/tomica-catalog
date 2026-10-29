'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  getAllCars,
  getCurrentCars,
  searchCars,
  normalizeName,
  CATALOG_SERIES,
} from '@/lib/tomica-data';
import ScannedCard from '@/components/ScannedCard';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';
import NewReleases from '@/components/NewReleases';
import Segmented from '@/components/Segmented';
import SeriesBar from '@/components/SeriesBar';
import { SERIES_OPTIONS } from '@/components/seriesOptions';
import EmptyState from '@/components/EmptyState';
import { BookIcon, ScanIcon } from '@/components/icons';

type FilterMode = 'collected' | 'wishlist' | 'missing';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

const HOME_SERIES_OPTIONS = [{ key: 'all', label: '全部' }, ...SERIES_OPTIONS];

const FILTERS = [
  { key: 'collected', label: '已收藏' },
  { key: 'wishlist', label: '想要' },
  { key: 'missing', label: '未收藏' },
] as const;

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('collected');
  const [series, setSeries] = useState<string>('all');
  const allCars = useMemo(() => getAllCars(), []);
  const currentCars = useMemo(() => getCurrentCars(), []);
  const { collectedByCar, qtyByCar, scannedItems, wishlistIds, ownedCount, imageByCar } =
    useCollection();
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;

  // Progress split by series so each series keeps its own colour
  const segments = useMemo(
    () =>
      CATALOG_SERIES.map((s) => {
        const cars = currentCars.filter((c) => c.series === s);
        const have = cars.filter((c) => collectedByCar.has(c.id)).length;
        return { series: s, total: cars.length, have };
      }).filter((g) => g.total > 0),
    [currentCars, collectedByCar]
  );

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

  const showScanned = filter === 'collected' && visibleScanned.length > 0;
  const resultCount = filteredCars.length + (showScanned ? visibleScanned.length : 0);

  return (
    <div className="px-4 pt-6 sm:px-6">
      {/* Hero: plain on the page, not a card */}
      <h1 className="sr-only">我的車庫</h1>
      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className="text-sm text-muted">
          Tomica 收藏進度
        </h2>
        <div className="mt-1 flex items-end justify-between gap-6">
          <p className="flex items-baseline gap-2">
            <span className="tnum font-display text-[88px] font-medium leading-[0.85] sm:text-[112px]">{collectedCurrent}</span>
            <span className="tnum text-lg text-muted">/ {currentCars.length} 款現行</span>
          </p>
          <p className="flex shrink-0 flex-col items-end pb-1 text-right">
            <span className="tnum font-display text-[44px] font-medium leading-none text-brand-text">{ownedCount}</span>
            <span className="text-sm text-muted">台在庫</span>
          </p>
        </div>

        <div className="mt-5">
          <SeriesBar
            animate
            segments={segments}
            label={`現行車款已收 ${collectedCurrent} / ${currentCars.length}`}
          />
        </div>
      </section>

      <div className="mt-6">
        <NewReleases />
      </div>

      <section className="mt-6 space-y-3" aria-label="篩選">
        <Segmented scroll label="系列" options={HOME_SERIES_OPTIONS} value={series} onChange={setSeries} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented options={FILTERS} value={filter} onChange={setFilter} label="收藏狀態" />
          <div className="sm:w-80">
            <SearchBar value={search} onChange={setSearch} />
          </div>
        </div>
        <p className="tnum text-sm text-muted">顯示 {resultCount} 款車型</p>
      </section>

      <div className="mt-3">
        {resultCount === 0 ? (
          search ? (
            <EmptyState title={`找不到符合「${search}」的結果`} />
          ) : filter === 'collected' && series !== 'all' ? (
            <EmptyState title="這個系列還沒有收藏" hint="到「圖鑑」或「掃描」開始加入吧！" />
          ) : filter === 'collected' ? (
            <EmptyState title="還沒有收藏任何車款" hint="到「圖鑑」或「掃描」開始加入吧！">
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
          </div>
        )}
      </div>
    </div>
  );
}
