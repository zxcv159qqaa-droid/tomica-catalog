'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, itemQty, type CollectionItem } from '@/lib/db';
import { getCarByVariantId } from '@/lib/tomica-data';

const EMPTY: never[] = [];

// Live view of the collection; re-renders whenever the tables change (edits, imports, cloud sync)
export function useCollection() {
  const collection = useLiveQuery(() => db.collection.toArray(), []) ?? EMPTY;
  const wishlist = useLiveQuery(() => db.wishlist.toArray(), []) ?? EMPTY;
  const carImages = useLiveQuery(() => db.carImages.toArray(), []) ?? EMPTY;

  // carId -> thumbnail found after scanning, for catalog cars without an official image
  const imageByCar = useMemo(
    () => new Map(carImages.map((i) => [i.carId, i.src])),
    [carImages]
  );

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

  // carId -> total copies owned across variants
  const qtyByCar = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of collection) {
      if (item.name) continue;
      const car = getCarByVariantId(item.variantId);
      if (car) map.set(car.id, (map.get(car.id) ?? 0) + itemQty(item));
    }
    return map;
  }, [collection]);

  const scannedItems = useMemo(
    () => collection.filter((c): c is CollectionItem & { name: string } => !!c.name),
    [collection]
  );

  const wishlistIds = useMemo(
    () => new Set(wishlist.map((w) => w.variantId).filter(Boolean) as string[]),
    [wishlist]
  );

  const ownedCount = collection.reduce((n, item) => n + itemQty(item), 0);

  return {
    collection,
    collectedByCar,
    qtyByCar,
    scannedItems,
    wishlistIds,
    ownedCount,
    imageByCar,
  };
}
