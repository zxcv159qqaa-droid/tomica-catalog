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
  // Copies of this variant owned; missing means 1
  qty?: number;
  condition?: Condition;
  // Purchase price per copy, NT$
  price?: number;
  // Where it's stored, e.g. "A 櫃第 2 層"
  location?: string;
}

export const CONDITIONS = ['未拆封', '已拆・盒車俱全', '展示中', '裸車無盒'] as const;
export type Condition = (typeof CONDITIONS)[number];

export function itemQty(item: CollectionItem): number {
  return item.qty ?? 1;
}

// JAN barcode (box bottom, 13 digits) the user linked to a catalog car or scanned car
export interface JanCode {
  jan: string;
  carId?: string;
  // Scanned cars that aren't in the catalog are linked by their collection variantId
  variantId?: string;
  addedAt: Date;
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
  janCodes: EntityTable<JanCode, 'jan'>;
};

db.version(1).stores({
  collection: '++id, tomicaNumber, variantId, addedAt',
  wishlist: '++id, tomicaNumber, variantId, addedAt',
});

db.version(2).stores({
  carImages: 'carId',
});

db.version(3).stores({
  janCodes: 'jan, carId, variantId',
});

export { db };
