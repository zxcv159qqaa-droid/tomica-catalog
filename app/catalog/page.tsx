'use client';

import { useState, useMemo } from 'react';
import {
  getAllCars,
  searchCars,
  getAllManufacturers,
  normalizeName,
} from '@/lib/tomica-data';
import { SERIES_OPTIONS } from '@/components/seriesOptions';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import ScannedCard from '@/components/ScannedCard';
import SearchBar from '@/components/SearchBar';
import Segmented from '@/components/Segmented';
import EmptyState from '@/components/EmptyState';

type CatalogFilter = 'all' | 'collected' | 'uncollected';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState<string>('regular');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [manufacturer, setManufacturer] = useState('all');
  const [showHistory, setShowHistory] = useState(false);
  const { collectedByCar, qtyByCar, wishlistIds, scannedItems, imageByCar } = useCollection();

  // Scanned cars of this series that aren't in the current lineup (older releases, reused numbers)
  const seriesScanned = useMemo(
    () =>
      scannedItems
        .filter((c) => (c.series || 'regular') === series)
        .sort((a, b) => a.tomicaNumber - b.tomicaNumber),
    [scannedItems, series]
  );
  const visibleScanned = useMemo(() => {
    if (filter === 'uncollected' || manufacturer !== 'all') return [];
    const q = normalizeName(search);
    return seriesScanned.filter(
      (c) =>
        !q ||
        c.tomicaNumber.toString() === q ||
        normalizeName(c.name || '').includes(q)
    );
  }, [seriesScanned, filter, manufacturer, search]);

  const hasHistory = useMemo(
    () => getAllCars().some((c) => c.series === series && c.retired),
    [series]
  );
  const seriesCars = useMemo(
    () =>
      getAllCars()
        .filter((c) => c.series === series && (showHistory || !c.retired))
        .sort(
          (a, b) =>
            (a.code ? 1 : 0) - (b.code ? 1 : 0) ||
            a.number - b.number ||
            (a.code ?? '').localeCompare(b.code ?? '', undefined, { numeric: true }) ||
            Number(!!a.retired) - Number(!!b.retired) ||
            (b.gen ?? 0) - (a.gen ?? 0)
        ),
    [series, showHistory]
  );
  const manufacturers = useMemo(() => getAllManufacturers(seriesCars), [seriesCars]);
  const collectedInSeries = seriesCars.filter((c) =>
    collectedByCar.has(c.id)
  ).length;

  const filteredCars = useMemo(() => {
    let cars = searchCars(search, seriesCars);
    if (manufacturer !== 'all') {
      cars = cars.filter((c) => c.manufacturer === manufacturer);
    }
    if (filter === 'collected') cars = cars.filter((c) => collectedByCar.has(c.id));
    if (filter === 'uncollected') cars = cars.filter((c) => !collectedByCar.has(c.id));
    return cars;
  }, [search, filter, manufacturer, seriesCars, collectedByCar]);


  const seriesOptions = SERIES_OPTIONS;
  const filterOptions = [
    { key: 'all', label: `全部 (${seriesCars.length})` },
    { key: 'collected', label: `已收 (${collectedInSeries + seriesScanned.length})` },
    { key: 'uncollected', label: `未收 (${seriesCars.length - collectedInSeries})` },
  ] as const;

  return (
    <div className="px-4 pt-6 sm:px-6">
      <section className="space-y-3" aria-label="篩選">
        <Segmented
          scroll
          label="系列"
          options={seriesOptions}
          value={series}
          onChange={(s) => {
            setSeries(s);
            setManufacturer('all');
          }}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-80">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <Segmented scroll label="收藏狀態" options={filterOptions} value={filter} onChange={setFilter} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            aria-label="製造商"
            className="h-11 min-w-0 max-w-[50%] rounded-[10px] border border-line bg-surface px-3 text-sm text-ink focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30"
          >
            <option value="all">{series === 'dream' ? '所有主題' : series === 'disney' ? '所有角色' : '所有製造商'}</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {hasHistory && (
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#e50012]"
              />
              含歷代舊款（同編號以前的車）
            </label>
          )}
        </div>

        <p className="tnum text-sm text-muted">
          顯示 {filteredCars.length} 款　資料來源：タカラトミー官網現行商品
          {showHistory &&
            (series === 'premium'
              ? '；歷代舊款：トミカの森 プレミアム館'
              : series === 'disney'
                ? '；同代號歷代車款：ディズニーモータース官網'
                : series === 'asia'
                  ? '；資料來源：Takara Tomy Asia 官網'
                : '；歷代舊款：ピクシブ百科事典、こつめBLOG')}
        </p>
      </section>

      {visibleScanned.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 text-sm font-medium">你收藏的舊款（官網已下架或編號已輪替）</p>
          <div className={GRID}>
            {visibleScanned.map((item) => (
              <ScannedCard key={item.id} item={item} />
            ))}
          </div>
          <p className="mt-6 text-sm font-medium">目前在售車款</p>
        </section>
      )}

      <div className="mt-3">
        {filteredCars.length === 0 && visibleScanned.length === 0 ? (
          <EmptyState title="找不到符合條件的車款" />
        ) : (
          <div className={GRID}>
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
