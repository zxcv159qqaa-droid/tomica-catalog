import { NextResponse } from 'next/server';
import { cacheLife } from 'next/cache';

// Upcoming Tomica cars from the official monthly new-product pages (/products/tomica/new/YYMM.htm).
// Only single cars with a box number are kept: "No.34 F80" (regular) and "15 トヨタ ハイエース" (Premium).

const BASE = 'https://www.takaratomy.co.jp/products/tomica/new/';

export interface NewRelease {
  series: 'regular' | 'premium';
  number: number;
  name: string;
  release: string;
  image?: string;
  month: string;
  page: string;
}

function monthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function clean(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchMonth(key: string): Promise<NewRelease[]> {
  const page = `${BASE}${key}.htm`;
  const res = await fetch(page).catch(() => null);
  if (!res?.ok) return [];
  const html = await res.text();
  const out: NewRelease[] = [];
  // Each product is a title box: <h3 class="CarName">…</h3><p class="CarPrice">…</p>, followed by its pictures
  const blocks = html.split(/<h3 class="CarName">/).slice(1);
  for (const block of blocks) {
    const name = clean(block.slice(0, block.indexOf('</h3>')));
    const price = /<p class="CarPrice">([\s\S]*?)<\/p>/.exec(block);
    const regular = /^No\.(\d+)\s+(.+)$/.exec(name);
    const premium = /^(\d+)\s+(.+)$/.exec(name);
    const m = regular || premium;
    if (!m) continue;
    const img = /src="(images\/\d{4}\/pic_[^"]+)"/.exec(block);
    out.push({
      series: regular ? 'regular' : 'premium',
      number: parseInt(m[1], 10),
      name: m[2],
      release: price ? clean(price[1]).replace(/\s*メーカー希望小売価格.*$/, '') : '',
      image: img ? new URL(img[1], page).toString() : undefined,
      month: `20${key.slice(0, 2)}/${key.slice(2)}`,
      page,
    });
  }
  return out;
}

// Refreshed about once a day; the official pages change a few times a month
async function getReleases() {
  'use cache';
  cacheLife('days');
  const months = await Promise.all(monthKeys(3).map(fetchMonth));
  return { releases: months.flat(), checkedAt: new Date().toISOString() };
}

export async function GET() {
  return NextResponse.json(await getReleases());
}
