import Dexie, { type EntityTable } from 'dexie';

export interface CollectionItem {
  id?: number;
  tomicaNumber: number;
  variantId: string;
  addedAt: Date;
  notes?: string;
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
