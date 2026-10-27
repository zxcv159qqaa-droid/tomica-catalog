'use client';

import { useState, useMemo } from 'react';
import { getAllCars, getCurrentCars, searchCars, normalizeName } from '@/lib/tomica-data';
import ScannedCard from '@/components/ScannedCard';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';
import NewReleases from '@/components/NewReleases';

type FilterMode = 'collected' | 'wishlist' | 'missing';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('collected');
  const allCars = useMemo(() => getAllCars(), []);
  const currentCars = useMemo(() => getCurrentCars(), []);
  const { collectedByCar, qtyByCar, scannedItems, wishlistIds, ownedCount, imageByCar } =
    useCollection();
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;
  const percent = (collectedCurrent / currentCars.length) * 100;

  const visibleScanned = useMemo(() => {
    const q = normalizeName(search);
    return scannedItems
      .filter(
        (c) =>
          !q ||
          c.tomicaNumber.toString() === q ||
          normalizeName(c.name!).includes(q)
      )
      .sort((a, b) => a.tomicaNumber - b.tomicaNumber);
  }, [scannedItems, search]);

  const filteredCars = useMemo(() => {
    const cars = searchCars(search, allCars);
    switch (filter) {
      case 'collected':
        return cars.filter((c) => collectedByCar.has(c.id));
      case 'wishlist':
        return cars.filter((c) => wishlistIds.has(c.id));
      case 'missing':
        return cars.filter((c) => !c.retired && !collectedByCar.has(c.id));
    }
  }, [search, filter, allCars, collectedByCar, wishlistIds]);

  const showScanned = filter === 'collected' && visibleScanned.length > 0;
  const resultCount = filteredCars.length + (showScanned ? visibleScanned.length : 0);

  return (
    <div className="px-4 sm:px-6 pt-5 space-y-5">
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-red-600 bg-red-50 dark:bg-red-950 px-2.5 py-0.5 rounded-full">
              我的車庫
            </span>
            <h2 className="text-xl font-extrabold mt-1.5">Tomica 收藏進度</h2>
          </div>
          <div className="flex items-baseline gap-5 text-sm">
            <div>
              <span className="text-2xl font-black">{collectedCurrent}</span>
              <span className="text-slate-400"> / {currentCars.length} 款現行</span>
            </div>
            <div>
              <span className="text-2xl font-black text-red-600">{ownedCount}</span>
              <span className="text-slate-400"> 台在庫</span>
            </div>
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-red-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      <NewReleases />

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-1.5">
            {(
              [
                { key: 'collected', label: '已收藏' },
                { key: 'wishlist', label: '想要' },
                { key: 'missing', label: '未收藏' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  filter === key
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="sm:w-80">
            <SearchBar value={search} onChange={setSearch} />
          </div>
        </div>
        <p className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          顯示 {resultCount} 款車型
        </p>
      </section>

      {resultCount === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-2 text-slate-400">
          {search ? (
            <p>找不到符合「{search}」的結果</p>
          ) : filter === 'collected' ? (
            <>
              <p className="text-4xl">📦</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">還沒有收藏任何車款</p>
              <p className="text-sm">到「圖鑑」或「掃描」開始加入吧！</p>
            </>
          ) : filter === 'wishlist' ? (
            <>
              <p className="text-4xl">⭐</p>
              <p>願望清單是空的</p>
            </>
          ) : (
            <>
              <p className="text-4xl">🎉</p>
              <p>你已經收集所有車款了！</p>
            </>
          )}
        </div>
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
  );
}
