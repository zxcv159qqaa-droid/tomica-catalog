import catalogData from '@/data/tomica-catalog.json';

export interface TomicaVariant {
  id: string;
  name: string;
  color?: string;
  release_year?: number;
  is_first_edition?: boolean;
}

export interface TomicaCar {
  id: string;
  number: number;
  series: string;
  name_ja: string;
  name_en?: string;
  manufacturer: string;
  scale?: string;
  variants: TomicaVariant[];
}

const catalog: TomicaCar[] = catalogData as TomicaCar[];

const byId = new Map(catalog.map((car) => [car.id, car]));
const byVariantId = new Map(
  catalog.flatMap((car) => car.variants.map((v) => [v.id, car] as const))
);

export const CATALOG_SERIES = ['regular', 'premium', 'unlimited'] as const;

export function carId(series: string, number: number): string {
  return `${series}-${number}`;
}

// Accepts "premium-5" or a bare number (regular series, used by older links)
export function parseCarId(id: string): { series: string; number: number } {
  const m = /^([a-z]+)-(\d+)$/.exec(id);
  if (m) return { series: m[1], number: parseInt(m[2], 10) };
  return { series: 'regular', number: parseInt(id, 10) };
}

export function getAllCars(): TomicaCar[] {
  return catalog;
}

export function getCar(series: string, number: number): TomicaCar | undefined {
  return byId.get(carId(series, number));
}

export function getCarByVariantId(variantId: string): TomicaCar | undefined {
  return byVariantId.get(variantId);
}

export function searchCars(query: string, cars = catalog): TomicaCar[] {
  const q = normalizeName(query);
  if (!q) return cars;
  return cars.filter(
    (car) =>
      car.number.toString() === q ||
      normalizeName(car.name_ja).includes(q) ||
      (car.name_en && normalizeName(car.name_en).includes(q)) ||
      normalizeName(car.manufacturer).includes(q)
  );
}

export function normalizeName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[\s・·\-_()（）]/g, '');
}

export function isSameCar(car: TomicaCar, scannedName: string): boolean {
  const s = normalizeName(scannedName);
  if (!s) return false;
  return [car.name_ja, car.name_en].some((n) => {
    if (!n) return false;
    const c = normalizeName(n);
    return c.includes(s) || s.includes(c);
  });
}

export function scanVariantId(
  number: number,
  name: string,
  series = 'regular'
): string {
  return `scan-${series}-${number}-${normalizeName(name)}`;
}

const SERIES_LABELS: Record<string, string> = {
  regular: '常規',
  premium: 'Premium',
  unlimited: 'Unlimited',
  dream: 'Dream',
  other: '其他',
};

export function seriesLabel(series?: string): string {
  return SERIES_LABELS[series || 'regular'] || series || '常規';
}

export function getAllManufacturers(cars = catalog): string[] {
  const set = new Set(cars.map((car) => car.manufacturer));
  const hasOther = set.delete('その他');
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  return hasOther ? [...sorted, 'その他'] : sorted;
}
