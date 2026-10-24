'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type CollectionItem, type WishlistItem } from '@/lib/db';
import { getCarByVariantId } from '@/lib/tomica-data';

export function useCollection() {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    Promise.all([db.collection.toArray(), db.wishlist.toArray()]).then(
      ([col, wish]) => {
        setCollection(col);
        setWishlist(wish);
      }
    );
  }, []);

  // carId -> collected catalog variant ids
  const collectedByCar = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of collection) {
      if (item.name) continue;
      const car = getCarByVariantId(item.variantId);
      if (!car) continue;
      map.set(car.id, [...(map.get(car.id) || []), item.variantId]);
    }
    return map;
  }, [collection]);

  const scannedItems = useMemo(
    () => collection.filter((c) => c.name),
    [collection]
  );

  const wishlistIds = useMemo(
    () => new Set(wishlist.map((w) => w.variantId).filter(Boolean) as string[]),
    [wishlist]
  );

  const ownedCount =
    scannedItems.length +
    Array.from(collectedByCar.values()).reduce((n, v) => n + v.length, 0);

  return { collectedByCar, scannedItems, wishlistIds, ownedCount };
}
