'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type CollectionItem, type WishlistItem } from '@/lib/db';
import Link from 'next/link';
import {
  getAllCars,
  searchCars,
  normalizeName,
  seriesLabel,
  type TomicaCar,
} from '@/lib/tomica-data';
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

  const catalogItems = useMemo(
    () => collection.filter((c) => !c.name),
    [collection]
  );

  const scannedItems = useMemo(() => {
    const q = normalizeName(search);
    return collection
      .filter((c) => c.name)
      .filter(
        (c) =>
          !q ||
          c.tomicaNumber.toString().includes(q) ||
          normalizeName(c.name!).includes(q)
      )
      .sort((a, b) => a.tomicaNumber - b.tomicaNumber);
  }, [collection, search]);

  const collectedNumbers = useMemo(
    () => new Set(catalogItems.map((c) => c.tomicaNumber)),
    [catalogItems]
  );

  const wishlistNumbers = useMemo(
    () => new Set(wishlist.map((w) => w.tomicaNumber)),
    [wishlist]
  );

  const collectedVariantsByNumber = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const item of catalogItems) {
      const existing = map.get(item.tomicaNumber) || [];
      existing.push(item.variantId);
      map.set(item.tomicaNumber, existing);
    }
    return map;
  }, [catalogItems]);

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

  const collectedTotal = collection.length;

  return (
    <div className="px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🚗 我的 Tomica 收藏</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            圖鑑{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {collectedNumbers.size}
            </strong>{' '}
            / {allCars.length} 款
          </span>
          <span>
            共收藏{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {collectedTotal}
            </strong>{' '}
            台
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

      {filter === 'collected' && scannedItems.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {scannedItems.map((item) => {
            const isRegular = !item.series || item.series === 'regular';
            const body = (
              <>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex flex-col items-center justify-center shrink-0">
                  {!isRegular && (
                    <span className="text-[9px] leading-none text-blue-500">
                      {seriesLabel(item.series)}
                    </span>
                  )}
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {item.tomicaNumber}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.variantName || '掃描加入'}
                  </p>
                </div>
              </>
            );
            const cls =
              'flex items-center gap-3 p-4 rounded-xl border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
            return isRegular ? (
              <Link key={item.id} href={`/catalog/${item.tomicaNumber}`} className={cls}>
                {body}
              </Link>
            ) : (
              <div key={item.id} className={cls}>
                {body}
                <button
                  onClick={async () => {
                    if (!item.id || !confirm(`移除「${item.name}」？`)) return;
                    await db.collection.delete(item.id);
                    setCollection((prev) => prev.filter((c) => c.id !== item.id));
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0"
                >
                  移除
                </button>
              </div>
            );
          })}
        </div>
      )}

      {filteredCars.length === 0 && !(filter === 'collected' && scannedItems.length > 0) ? (
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
