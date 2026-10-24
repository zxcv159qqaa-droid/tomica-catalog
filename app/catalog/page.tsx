'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type CollectionItem, type WishlistItem } from '@/lib/db';
import {
  getAllCars,
  searchCars,
  getAllManufacturers,
} from '@/lib/tomica-data';
import CarCard from '@/components/CarCard';
import SearchBar from '@/components/SearchBar';

type CatalogFilter = 'all' | 'collected' | 'uncollected';

export default function CatalogPage() {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [manufacturer, setManufacturer] = useState('all');
  const allCars = useMemo(() => getAllCars(), []);
  const manufacturers = useMemo(() => getAllManufacturers(), []);

  useEffect(() => {
    const load = async () => {
      const col = (await db.collection.toArray()).filter((c) => !c.name);
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
    let cars = search ? searchCars(search) : allCars;

    if (manufacturer !== 'all') {
      cars = cars.filter((c) => c.manufacturer === manufacturer);
    }

    switch (filter) {
      case 'collected':
        cars = cars.filter((c) => collectedNumbers.has(c.number));
        break;
      case 'uncollected':
        cars = cars.filter((c) => !collectedNumbers.has(c.number));
        break;
    }

    return cars;
  }, [search, filter, manufacturer, allCars, collectedNumbers]);

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">📖 Tomica 圖鑑</h1>

      <SearchBar value={search} onChange={setSearch} />

      <div className="flex gap-2 mt-4 overflow-x-auto">
        {(
          [
            { key: 'all', label: `全部 (${allCars.length})` },
            { key: 'collected', label: `已收 (${collectedNumbers.size})` },
            {
              key: 'uncollected',
              label: `未收 (${allCars.length - collectedNumbers.size})`,
            },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
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
          <option value="all">所有製造商</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        顯示 {filteredCars.length} 款
      </p>

      <div className="flex flex-col gap-3">
        {filteredCars.map((car) => (
          <CarCard
            key={car.number}
            car={car}
            isCollected={collectedNumbers.has(car.number)}
            isWishlisted={wishlistNumbers.has(car.number)}
            collectedVariants={collectedVariantsByNumber.get(car.number) || []}
          />
        ))}
      </div>
    </div>
  );
}
