'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type CollectionItem, type WishlistItem } from '@/lib/db';
import { getAllCars, searchCars, type TomicaCar } from '@/lib/tomica-data';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';

type FilterMode = 'collected' | 'wishlist' | 'missing';

export default function HomePage() {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('collected');
  const allCars = useMemo(() => getAllCars(), []);

  useEffect(() => {
    const load = async () => {
      const col = await db.collection.toArray();
      const wish = await db.wishlist.toArray();
      setCollection(col);
      setWishlist(wish);
    };
    load();
  }, []);

  const collectedNumbers = useMemo(
    () => new Set(collection.map((c) => c.tomicaNumber)),
    [collection]
  );

  const wishlistNumbers = useMemo(
    () => new Set(wishlist.map((w) => w.tomicaNumber)),
    [wishlist]
  );

  const collectedVariantsByNumber = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const item of collection) {
      const existing = map.get(item.tomicaNumber) || [];
      existing.push(item.variantId);
      map.set(item.tomicaNumber, existing);
    }
    return map;
  }, [collection]);

  const filteredCars = useMemo(() => {
    let cars: TomicaCar[] = search ? searchCars(search) : allCars;

    switch (filter) {
      case 'collected':
        cars = cars.filter((c) => collectedNumbers.has(c.number));
        break;
      case 'wishlist':
        cars = cars.filter((c) => wishlistNumbers.has(c.number));
        break;
      case 'missing':
        cars = cars.filter((c) => !collectedNumbers.has(c.number));
        break;
    }

    return cars;
  }, [search, filter, allCars, collectedNumbers, wishlistNumbers]);

  const totalVariants = allCars.reduce(
    (sum, car) => sum + car.variants.length,
    0
  );
  const collectedTotal = collection.length;

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🚗 我的 Tomica 收藏</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            已收藏{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {collectedNumbers.size}
            </strong>{' '}
            / {allCars.length} 款
          </span>
          <span>
            共{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {collectedTotal}
            </strong>{' '}
            / {totalVariants} 版本
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${allCars.length > 0 ? (collectedNumbers.size / allCars.length) * 100 : 0}%`,
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

      {filteredCars.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter === 'collected' && !search && (
            <div>
              <p className="text-4xl mb-3">📦</p>
              <p>還沒有收藏任何車款</p>
              <p className="text-sm mt-1">到「圖鑑」或「掃描」開始加入吧！</p>
            </div>
          )}
          {filter === 'wishlist' && !search && (
            <div>
              <p className="text-4xl mb-3">⭐</p>
              <p>願望清單是空的</p>
            </div>
          )}
          {filter === 'missing' && !search && (
            <div>
              <p className="text-4xl mb-3">🎉</p>
              <p>你已經收集所有車款了！</p>
            </div>
          )}
          {search && <p>找不到符合「{search}」的結果</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCars.map((car) => (
            <CarCard
              key={car.number}
              car={car}
              isCollected={collectedNumbers.has(car.number)}
              isWishlisted={wishlistNumbers.has(car.number)}
              collectedVariants={
                collectedVariantsByNumber.get(car.number) || []
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
