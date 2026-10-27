import { db, itemQty, type CollectionItem } from '@/lib/db';
import type { TomicaCar } from '@/lib/tomica-data';

// Adds one copy of a catalog variant: bumps the quantity if it's already owned
export async function addCopy(car: TomicaCar, variantId = car.variants[0].id): Promise<void> {
  const existing = await db.collection.where('variantId').equals(variantId).first();
  if (existing?.id) {
    await db.collection.update(existing.id, { qty: itemQty(existing) + 1 });
    return;
  }
  await db.collection.add({
    tomicaNumber: car.number,
    variantId,
    series: car.series,
    addedAt: new Date(),
  });
}

// Removes one copy; the row goes away with the last copy
export async function removeCopy(item: CollectionItem): Promise<void> {
  if (!item.id) return;
  if (itemQty(item) > 1) await db.collection.update(item.id, { qty: itemQty(item) - 1 });
  else await db.collection.delete(item.id);
}
