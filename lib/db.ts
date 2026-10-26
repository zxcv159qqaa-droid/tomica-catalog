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

// Thumbnail found for a catalog car that ships without an image (older releases)
export interface CarImage {
  carId: string;
  // Small JPEG data URL
  src: string;
  // Page/image URL it came from, or 'scan' when it's the user's own photo
  source: string;
  addedAt: Date;
}

const db = new Dexie('TomicaCatalogDB') as Dexie & {
  collection: EntityTable<CollectionItem, 'id'>;
  wishlist: EntityTable<WishlistItem, 'id'>;
  carImages: EntityTable<CarImage, 'carId'>;
};

db.version(1).stores({
  collection: '++id, tomicaNumber, variantId, addedAt',
  wishlist: '++id, tomicaNumber, variantId, addedAt',
});

db.version(2).stores({
  carImages: 'carId',
});

export { db };
