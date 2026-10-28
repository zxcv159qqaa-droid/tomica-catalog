// Builds data/tomica-world.json from the official Takara Tomy Tomica World lineup page.
// Usage: node scripts/build-world-data.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const PAGE = 'https://www.takaratomy.co.jp/products/tomica/lineup/world/';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function text(html) {
  return html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, e) => ENT[e] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

// Series group, derived from the product name (the page itself has no section headings)
function lineOf(name) {
  if (/スクランブルポリス|スクランブル/.test(name)) return 'スクランブルポリス';
  if (/ビークルタウン/.test(name)) return 'トミカビークルタウン';
  if (/トミカタウン/.test(name)) return 'トミカタウン';
  if (/パーキング|トレイ|ケース|コレクションボックス|ボックス|収納/.test(name)) return '収納・パーキング';
  if (/トミカ付き|トミカ\d+台付き|トミカ.台付き/.test(name)) return 'トミカ付きセット';
  if (/アドベントカレンダー/.test(name)) return 'アドベントカレンダー';
  if (/消防|消火|ファイヤー|ポリス|パトロール|レスキュー|交番/.test(name)) return '消防・警察';
  if (/どうろ|道路|コース|ドライブ|ハンドル|キャリアカー/.test(name)) return 'どうろ・コース';
  return 'その他';
}

const res = await fetch(PAGE);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const html = await res.text();

const boxes = html.split('<div class="lineup-box">').slice(1);
const items = [];
const seen = new Set();
for (const raw of boxes) {
  const box = raw.split(/<div class="lineup-box">/)[0];
  const nameM = box.match(/<(?:span|p)[^>]*class="CarName[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p)>/);
  if (!nameM) { console.warn('no name in box, skipped'); continue; }
  const name = text(nameM[1]);
  const priceM = text((box.match(/class="CarPrice[^"]*"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? '').match(/([\d,]+)\s*円/);
  const price = priceM ? Number(priceM[1].replace(/,/g, '')) : undefined;
  // Most boxes have one .car-pic image; a few use a slider, so fall back to its first picture
  const imgM =
    box.match(/<div class="car-pic"[^>]*>\s*<img[^>]*src="([^"]+)"/) ??
    box.match(/<div class="item-Wrapper[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
  if (!imgM) { console.warn(`no image for ${name}, skipped`); continue; }
  const image = new URL(imgM[1], PAGE).href;
  const noteM = box.match(/class="mark-attention[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  const note = noteM ? text(noteM[1]) : undefined;
  const base = 'w-' + image.split('/').pop().replace(/\.[^.]+$/, '');
  let id = base;
  for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
  seen.add(id);
  const item = { id, name, line: lineOf(name) };
  if (price !== undefined) item.price = price;
  item.image = image;
  if (note) item.note = note;
  items.push(item);
}

mkdirSync('data', { recursive: true });
writeFileSync('data/tomica-world.json', JSON.stringify(items, null, 2) + '\n');
const groups = {};
for (const i of items) groups[i.line] = (groups[i.line] ?? 0) + 1;
console.log(`${items.length} items`, groups);
