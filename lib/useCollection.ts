'use client';

import { useState, useEffect, useMemo } from 'react';
import { db, type CarImage, type CollectionItem, type WishlistItem } from '@/lib/db';
import { getCarByVariantId } from '@/lib/tomica-data';

export function useCollection() {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [carImages, setCarImages] = useState<CarImage[]>([]);

  useEffect(() => {
    Promise.all([
      db.collection.toArray(),
      db.wishlist.toArray(),
      db.carImages.toArray(),
    ]).then(([col, wish, imgs]) => {
      setCollection(col);
      setWishlist(wish);
      setCarImages(imgs);
    });
  }, []);

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

  return { collectedByCar, scannedItems, wishlistIds, ownedCount, imageByCar };
}
