import catalogData from '@/data/tomica-catalog.json';

export interface TomicaVariant {
  id: string;
  name: string;
  color: string;
  release_year: number;
  is_first_edition: boolean;
}

export interface TomicaCar {
  number: number;
  series: string;
  name_ja: string;
  name_en: string;
  manufacturer: string;
  scale: string;
  variants: TomicaVariant[];
}

const catalog: TomicaCar[] = catalogData as TomicaCar[];

export function getAllCars(): TomicaCar[] {
  return catalog;
}

export function getCarByNumber(number: number): TomicaCar | undefined {
  return catalog.find((car) => car.number === number);
}

export function searchCars(query: string): TomicaCar[] {
  const q = query.toLowerCase().trim();
  if (!q) return catalog;
  return catalog.filter(
    (car) =>
      car.number.toString().includes(q) ||
      car.name_ja.toLowerCase().includes(q) ||
      car.name_en.toLowerCase().includes(q) ||
      car.manufacturer.toLowerCase().includes(q)
  );
}

export function normalizeName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[\s・·\-_]/g, '');
}

export function isSameCar(car: TomicaCar, scannedName: string): boolean {
  const s = normalizeName(scannedName);
  if (!s) return false;
  return [car.name_ja, car.name_en].some((n) => {
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

export function getCarsByManufacturer(manufacturer: string): TomicaCar[] {
  return catalog.filter(
    (car) => car.manufacturer.toLowerCase() === manufacturer.toLowerCase()
  );
}

export function getAllManufacturers(): string[] {
  const set = new Set(catalog.map((car) => car.manufacturer));
  return Array.from(set).sort();
}
