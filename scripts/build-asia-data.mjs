// Merges the Tomica Asia Original line (AO-01 … AO-08) into data/tomica-catalog.json as series 'asia'.
// Data is from the official Takara Tomy Asia product pages
// (https://www.takaratomyasia.com/en/toys/tomica/tomica-others/tomica-asia-original-ao-0N-<slug>/).
// Images are verified (HTTP 200 + image content type) before use; otherwise the image is left empty.
// Idempotent: re-running replaces only the series 'asia' entries.
// Usage: node scripts/build-asia-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://www.takaratomyasia.com';
const CATALOG = 'data/tomica-catalog.json';

const ITEMS = [
  { n: 1, name: 'Lamborghini Veneno', brand: 'Lamborghini', image: '/media/4dsjrzwf/903956-image-001.webp' },
  { n: 2, name: 'Isuzu ELF Vehicle Transporter', brand: 'Isuzu', image: '/media/zkrdimf1/903963-image-001.webp' },
  { n: 3, name: 'Lamborghini Aventador LP 700-4', brand: 'Lamborghini', image: '/media/zthptrfh/903970-image-001.webp' },
  { n: 4, name: 'Chevrolet Camaro', brand: 'Chevrolet', image: '/media/sk4jtoun/903987-image-001.webp' },
  { n: 5, name: 'Mini John Cooper Works', brand: 'MINI', image: '/media/hujpruin/903994-image-001.webp' },
  { n: 6, name: 'Chevrolet Corvette ZR1', brand: 'Chevrolet', image: '/media/0kqe50p3/904007-image-001.webp' },
  { n: 7, name: 'Honda Civic Type R', brand: 'Honda', image: '/media/2ebpudmh/904014-image-001.webp' },
  { n: 8, name: 'Lamborghini Reventón', brand: 'Lamborghini', image: '/media/5vddlfuo/904021-image-001.webp' },
];
const YEAR = 2023;

async function verify(url) {
  try {
    const res = await fetch(url);
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).filter((c) => c.series !== 'asia');
const taken = new Set([...catalog.map((c) => c.id), ...catalog.flatMap((c) => c.variants.map((v) => v.id))]);

const out = [];
for (const it of ITEMS) {
  const code = `AO-${String(it.n).padStart(2, '0')}`;
  const base = code.toLowerCase();
  const id = `asia-${base}`;
  if (taken.has(id) || taken.has(base)) throw new Error(`id clash: ${id}`);
  const url = ORIGIN + it.image;
  const ok = await verify(url);
  if (!ok) console.warn(`image check failed, leaving empty: ${url}`);
  const car = { id, number: it.n, code, series: 'asia', name_ja: it.name, name_en: it.name, manufacturer: it.brand };
  if (ok) car.image = url;
  car.variants = [{ id: base, name: '通常版', release_year: YEAR }];
  car.period = `${YEAR}年`;
  car.note = `Asia Original・${YEAR}年`;
  out.push(car);
}

writeFileSync(CATALOG, JSON.stringify([...catalog, ...out], null, 2) + '\n');
console.log(`${out.length} asia items, ${out.filter((c) => c.image).length} with image`);
