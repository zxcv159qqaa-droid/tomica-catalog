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
  // Box label when it isn't a plain number, e.g. "SP", "RD-01"
  code?: string;
  series: string;
  name_ja: string;
  name_en?: string;
  manufacturer: string;
  scale?: string;
  image?: string;
  variants: TomicaVariant[];
}

const catalog: TomicaCar[] = catalogData as TomicaCar[];

const byId = new Map(catalog.map((car) => [car.id, car]));
const byVariantId = new Map(
  catalog.flatMap((car) => car.variants.map((v) => [v.id, car] as const))
);

export const CATALOG_SERIES = ['regular', 'premium', 'unlimited', 'dream'] as const;

export function displayCode(code: string | undefined, number: number): string {
  return code || String(number);
}

export function getCarById(id: string): TomicaCar | undefined {
  return byId.get(id);
}

function normalizeCode(code?: string): string {
  return (code || '').normalize('NFKC').toUpperCase().replace(/\s/g, '');
}

// Finds the catalog car for a scan. `holder` is a different car currently using that number/code.
export function findCatalogMatch(
  series: string,
  number: number | undefined,
  code: string | undefined,
  name: string
): { match?: TomicaCar; holder?: TomicaCar } {
  const c = normalizeCode(code);
  const candidates = catalog.filter(
    (car) =>
      car.series === series &&
      (car.code ? normalizeCode(car.code) === c : !!number && car.number === number)
  );
  let match: TomicaCar | undefined;
  let best = SAME_CAR_THRESHOLD;
  for (const car of candidates) {
    const score = nameScore(car, name);
    if (score >= best) {
      best = score;
      match = car;
    }
  }
  return { match, holder: candidates[0] };
}

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

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

// Dice coefficient; tolerates small OCR / wording differences like "!?" vs "!？"
function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  A.forEach((g) => B.has(g) && common++);
  return (2 * common) / (A.size + B.size);
}

function nameScore(car: TomicaCar, scannedName: string): number {
  const s = normalizeName(scannedName);
  if (!s) return 0;
  return Math.max(
    ...[car.name_ja, car.name_en].map((n) => {
      if (!n) return 0;
      const c = normalizeName(n);
      return c.includes(s) || s.includes(c) ? 1 : similarity(c, s);
    })
  );
}

const SAME_CAR_THRESHOLD = 0.6;

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
  disney: 'Disney Motors',
  asia: 'Asia Original',
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
