'use client';

import { useState, useMemo } from 'react';
import {
  getAllCars,
  searchCars,
  getAllManufacturers,
  normalizeName,
  seriesLabel,
  CATALOG_SERIES,
} from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import ScannedCard from '@/components/ScannedCard';
import SearchBar from '@/components/SearchBar';

type CatalogFilter = 'all' | 'collected' | 'uncollected';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

const pill = (active: boolean, activeClass = 'bg-red-600 text-white shadow-sm') =>
  `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
    active
      ? activeClass
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  }`;

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

  return (
    <div className="px-4 sm:px-6 pt-5 space-y-5">
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {CATALOG_SERIES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSeries(s);
                  setManufacturer('all');
                }}
                className={pill(series === s, seriesStyle(s).pillActive + ' shadow-sm')}
              >
                <span className={`w-2 h-2 rounded-full ${seriesStyle(s).dot}`} />
                {seriesLabel(s)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex-1 sm:w-72">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <select
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{series === 'dream' ? '所有主題' : series === 'disney' ? '所有角色' : '所有製造商'}</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: 'all', label: `全部 (${seriesCars.length})` },
                { key: 'collected', label: `已收 (${collectedInSeries + seriesScanned.length})` },
                { key: 'uncollected', label: `未收 (${seriesCars.length - collectedInSeries})` },
              ] as const
            ).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} className={pill(filter === key)}>
                {label}
              </button>
            ))}
          </div>
          {hasHistory && (
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              含歷代舊款（同編號以前的車）
            </label>
          )}
        </div>

        <p className="text-xs text-slate-400">
          顯示 {filteredCars.length} 款・資料來源：タカラトミー官網現行商品
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
        <section>
          <p className="text-xs font-bold text-slate-500 mb-2">
            你收藏的舊款（官網已下架或編號已輪替）
          </p>
          <div className={GRID}>
            {visibleScanned.map((item) => (
              <ScannedCard key={item.id} item={item} />
            ))}
          </div>
          <p className="text-xs font-bold text-slate-500 mt-5">目前在售車款</p>
        </section>
      )}

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
    </div>
  );
}
