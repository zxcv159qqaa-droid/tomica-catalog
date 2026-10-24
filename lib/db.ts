import Dexie, { type EntityTable } from 'dexie';

export interface CollectionItem {
  id?: number;
  tomicaNumber: number;
  variantId: string;
  addedAt: Date;
  notes?: string;
  // Set only for scanned cars that don't match the built-in catalog entry for this number
  name?: string;
  variantName?: string;
  series?: string;
  code?: string;
  // Small JPEG data URL of the user's own scan photo
  thumb?: string;
}

export interface WishlistItem {
  id?: number;
  tomicaNumber: number;
  variantId?: string;
  addedAt: Date;
}

const db = new Dexie('TomicaCatalogDB') as Dexie & {
  collection: EntityTable<CollectionItem, 'id'>;
  wishlist: EntityTable<WishlistItem, 'id'>;
};

db.version(1).stores({
  collection: '++id, tomicaNumber, variantId, addedAt',
  wishlist: '++id, tomicaNumber, variantId, addedAt',
});

export { db };
