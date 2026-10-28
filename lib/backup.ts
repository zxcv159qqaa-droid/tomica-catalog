import { db } from '@/lib/db';

// Everything the user has entered on this device; used by JSON export/import and cloud sync
export interface Backup {
  collection: Record<string, unknown>[];
  wishlist: Record<string, unknown>[];
  carImages?: Record<string, unknown>[];
  janCodes?: Record<string, unknown>[];
  worldItems?: Record<string, unknown>[];
  exportedAt: string;
}

export async function exportBackup(): Promise<Backup> {
  const [collection, wishlist, carImages, janCodes, worldItems] = await Promise.all([
    db.collection.toArray(),
    db.wishlist.toArray(),
    db.carImages.toArray(),
    db.janCodes.toArray(),
    db.worldItems.toArray(),
  ]);
  return {
    collection: collection as unknown as Record<string, unknown>[],
    wishlist: wishlist as unknown as Record<string, unknown>[],
    carImages: carImages as unknown as Record<string, unknown>[],
    janCodes: janCodes as unknown as Record<string, unknown>[],
    worldItems: worldItems as unknown as Record<string, unknown>[],
    exportedAt: new Date().toISOString(),
  };
}

// JSON turns Dates into strings; auto-increment ids are reassigned on import
function revive<T>(rows: Record<string, unknown>[] | undefined, dropId: boolean): T[] {
  return (rows ?? []).map((row) => {
    const { id, ...rest } = row;
    const out: Record<string, unknown> = dropId ? rest : { id, ...rest };
    if (out.addedAt) out.addedAt = new Date(out.addedAt as string);
    return out as T;
  });
}

// Replaces this device's data with the backup; tables missing from older backups are left alone
export async function importBackup(data: Partial<Backup>): Promise<void> {
  if (!Array.isArray(data.collection)) throw new Error('不是有效的備份資料');
  await db.transaction('rw', [db.collection, db.wishlist, db.carImages, db.janCodes, db.worldItems], async () => {
    await db.collection.clear();
    await db.collection.bulkAdd(revive(data.collection, true));
    if (data.wishlist) {
      await db.wishlist.clear();
      await db.wishlist.bulkAdd(revive(data.wishlist, true));
    }
    if (data.carImages) {
      await db.carImages.clear();
      await db.carImages.bulkPut(revive(data.carImages, false));
    }
    if (data.janCodes) {
      await db.janCodes.clear();
      await db.janCodes.bulkPut(revive(data.janCodes, false));
    }
    if (data.worldItems) {
      await db.worldItems.clear();
      await db.worldItems.bulkPut(revive(data.worldItems, false));
    }
  });
}
