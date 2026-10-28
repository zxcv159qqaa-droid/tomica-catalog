// Merges the Disney Motors numbered line (DM-01 … DM-xx, DM-EX01 …) into data/tomica-catalog.json
// as series 'disney', from the official full list (all years, including 販売終了).
// Only items whose official title starts with a "DM-" box code are taken; the many releases that the
// official page lists without a box code (special editions, sets, …) are not part of the numbered line.
// Idempotent: re-running replaces only the series 'disney' entries.
// Usage: node scripts/build-disney-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://www.takaratomy.co.jp';
const PAGE = `${ORIGIN}/products/disney/disneymotors/search/`;
const CATALOG = 'data/tomica-catalog.json';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function text(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, e) => ENT[e] ?? m)
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

const res = await fetch(PAGE);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const html = await res.text();

const blocks = html.split('<div class="col07 ').slice(1);
const items = [];
for (const raw of blocks) {
  const block = raw.split(/<div class="col07 /)[0];
  const t1 = block.match(/class="text01">([\s\S]*?)<\/p>/);
  if (!t1) continue;
  const title = text(t1[1]);
  const m = /^DM-(EX)?(\d+)\s*(.+)$/.exec(title);
  if (!m) continue; // not part of the numbered line
  const isEx = !!m[1];
  const digits = m[2];
  const name = m[3];
  const code = `DM-${isEx ? 'EX' : ''}${digits}`;

  const imgM = block.match(/<img src="([^"]+)"[^>]*class="ph01"/);
  const image = imgM ? new URL(imgM[1], PAGE).href : undefined;
  const year = Number((image ?? raw).match(/\/disneymotors\/(\d{4})\//)?.[1] ?? (raw.match(/id="list(\d{4})_/) ?? [])[1]);
  if (!year) throw new Error(`no year for ${title}`);

  const status = text((block.match(/class="day01[^"]*">([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
  const priceM = block.match(/class="text02">メーカー希望小売価格\s*<strong[^>]*>([\d,]+)<\/strong>/);
  const model = text((block.match(/class="text03">([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
  const vehicle = /車種：(.+?)(?:\s*キャラ：|$)/.exec(model)?.[1];
  const character = /キャラ：(.+)$/.exec(model)?.[1];
  const text04 = text((block.match(/class="text04">([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
  const icons = [...block.matchAll(/<img[^>]*alt="([^"]+)"[^>]*class="icon0\d"/g)].map((x) => x[1]);

  const noteParts = [];
  if (text04) noteParts.push(text04);
  for (const i of icons) if (!noteParts.includes(i)) noteParts.push(i);
  if (/非売品/.test(status)) noteParts.push('非売品');
  if (priceM) noteParts.push(`希望小売価格 ${priceM[1]}円（税込）`);

  items.push({
    code, isEx, n: Number(digits), name, year, image,
    status, vehicle, character, note: noteParts.join('／'),
    listId: (raw.match(/id="(list[^"]+)"/) ?? [])[1] ?? '',
  });
}

// Same code is reused by different cars over the years: oldest keeps the plain id, later ones get -2, -3 …
// Output order: by code, then by year, so duplicates sit next to each other.
items.sort(
  (a, b) => Number(a.isEx) - Number(b.isEx) || a.n - b.n || a.year - b.year || a.listId.localeCompare(b.listId)
);

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).filter((c) => c.series !== 'disney');
const taken = new Set([...catalog.map((c) => c.id), ...catalog.flatMap((c) => c.variants.map((v) => v.id))]);
const byCode = new Map();
for (const it of items) {
  const list = byCode.get(it.code) ?? [];
  list.push(it);
  byCode.set(it.code, list);
}

const out = [];
for (const it of items) {
  const same = byCode.get(it.code);
  const idx = same.indexOf(it);
  const base = it.code.toLowerCase();
  const suffix = idx === 0 ? '' : `-${idx + 1}`;
  const id = `disney-${base}${suffix}`;
  const variantId = `${base}${suffix}`;
  if (taken.has(id) || taken.has(variantId)) throw new Error(`id clash: ${id}`);
  taken.add(id);
  taken.add(variantId);
  // The latest car on a code is the "current" one; earlier cars on the same code are history (retired)
  const superseded = idx < same.length - 1;
  const car = {
    id,
    number: it.isEx ? 0 : it.n,
    code: it.code,
    series: 'disney',
    name_ja: it.name,
  };
  if (it.vehicle) car.name_en = it.vehicle;
  car.manufacturer = it.character || 'その他';
  if (it.image) car.image = it.image;
  car.variants = [{ id: variantId, name: '通常版', release_year: it.year }];
  if (superseded) car.retired = true;
  car.period = `${it.year}年・${it.status || '販売終了'}`;
  if (it.note) car.note = it.note;
  out.push(car);
}

writeFileSync(CATALOG, JSON.stringify([...catalog, ...out], null, 2) + '\n');
const years = {};
for (const it of items) years[it.year] = (years[it.year] ?? 0) + 1;
console.log(`${out.length} disney items`, years);
console.log(`retired (superseded): ${out.filter((c) => c.retired).length}`);
console.log(`duplicated codes: ${[...byCode].filter(([, l]) => l.length > 1).length}`);
