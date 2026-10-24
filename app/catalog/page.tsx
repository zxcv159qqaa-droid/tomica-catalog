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
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import ScannedCard from '@/components/ScannedCard';
import SearchBar from '@/components/SearchBar';

type CatalogFilter = 'all' | 'collected' | 'uncollected';

const pill = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
    active
      ? 'bg-blue-600 text-white'
      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  }`;

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState<string>('regular');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [manufacturer, setManufacturer] = useState('all');
  const [showHistory, setShowHistory] = useState(false);
  const { collectedByCar, wishlistIds, scannedItems } = useCollection();

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
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">📖 Tomica 圖鑑</h1>

      <div className="flex gap-2 mb-3">
        {CATALOG_SERIES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSeries(s);
              setManufacturer('all');
            }}
            className={pill(series === s)}
          >
            {seriesLabel(s)}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {hasHistory && (
        <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showHistory}
            onChange={(e) => setShowHistory(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          含歷代舊款（同編號以前的車）
        </label>
      )}

      <div className="flex gap-2 mt-4 overflow-x-auto">
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

      <div className="mt-3 mb-4">
        <select
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{series === 'dream' ? '所有主題' : '所有製造商'}</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        顯示 {filteredCars.length} 款・資料來源：タカラトミー官網現行商品
        {showHistory && '；歷代舊款：こつめBLOG（2026/5 存檔）'}
      </p>

      {visibleScanned.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            你收藏的舊款（官網已下架或編號已輪替）
          </p>
          <div className="flex flex-col gap-3">
            {visibleScanned.map((item) => (
              <ScannedCard key={item.id} item={item} />
            ))}
          </div>
          <p className="text-xs font-medium text-gray-500 mt-4">目前在售車款</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredCars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            isWishlisted={wishlistIds.has(car.id)}
            collectedVariants={collectedByCar.get(car.id)}
          />
        ))}
      </div>
    </div>
  );
}
