'use client';

import { useState, useMemo } from 'react';
import { getAllCars, getCurrentCars, searchCars, normalizeName } from '@/lib/tomica-data';
import ScannedCard from '@/components/ScannedCard';
import { useCollection } from '@/lib/useCollection';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';

type FilterMode = 'collected' | 'wishlist' | 'missing';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('collected');
  const allCars = useMemo(() => getAllCars(), []);
  const currentCars = useMemo(() => getCurrentCars(), []);
  const { collectedByCar, scannedItems, wishlistIds, ownedCount } =
    useCollection();
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;

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

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🚗 我的 Tomica 收藏</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            現行車款{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {collectedCurrent}
            </strong>{' '}
            / {currentCars.length} 款
          </span>
          <span>
            共收藏{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {ownedCount}
            </strong>{' '}
            台
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${(collectedCurrent / currentCars.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div className="flex gap-2 mt-4 mb-4">
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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showScanned && (
        <div className="flex flex-col gap-3 mb-3">
          {visibleScanned.map((item) => (
            <ScannedCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {filteredCars.length === 0 && !showScanned ? (
        <div className="text-center py-12 text-gray-400">
          {search ? (
            <p>找不到符合「{search}」的結果</p>
          ) : filter === 'collected' ? (
            <div>
              <p className="text-4xl mb-3">📦</p>
              <p>還沒有收藏任何車款</p>
              <p className="text-sm mt-1">到「圖鑑」或「掃描」開始加入吧！</p>
            </div>
          ) : filter === 'wishlist' ? (
            <div>
              <p className="text-4xl mb-3">⭐</p>
              <p>願望清單是空的</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-3">🎉</p>
              <p>你已經收集所有車款了！</p>
            </div>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
