import { GoogleGenerativeAI, type Tool } from '@google/generative-ai';

const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
// Cheap yes/no image check; named versions get retired, so the "-latest" aliases come first
const CHECK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
const FETCH_TIMEOUT = 6000;
const MAX_PAGE_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 3_000_000;
const MIN_IMAGE_BYTES = 3_000;
const MAX_CANDIDATES = 6;
const MAX_PAGES = 8;
const PAGE_IMAGES = 3;

// The SDK only types the Gemini 1.5 retrieval tool; 2.x models take `googleSearch`
const SEARCH_TOOL = { googleSearch: {} } as unknown as Tool;

export interface ThumbResult {
  dataUrl: string;
  source: string;
}

// Server-side fetches go to URLs picked by a model, so keep them off private hosts
function isPublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return false;
  return true;
}

async function safeFetch(url: string, accept: string): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    if (!isPublicUrl(current)) return null;
    try {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: { Accept: accept, 'User-Agent': 'TomicaGarage/1.0 (thumbnail lookup)' },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      return res.ok ? res : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function readLimited(res: Response, limit: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > limit) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf.byteLength > limit ? null : buf;
}

const NOT_A_PHOTO = /logo|icon|sprite|banner|avatar|spacer|blank|loading|button|badge|\.svg|\.gif/i;

// The page's share picture, then the first photo-looking <img> tags (many shops have no og:image)
async function pageImages(pageUrl: string): Promise<string[]> {
  const res = await safeFetch(pageUrl, 'text/html');
  if (!res || !(res.headers.get('content-type') || '').includes('html')) return [];
  const body = await readLimited(res, MAX_PAGE_BYTES);
  if (!body) return [];
  const html = new TextDecoder().decode(body);
  const found: string[] = [];
  const og =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html);
  if (og) found.push(og[1]);
  for (const m of html.matchAll(/<img[^>]+?(?:data-src|data-original|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    if (found.length >= PAGE_IMAGES) break;
    if (!NOT_A_PHOTO.test(m[1])) found.push(m[1]);
  }
  const out: string[] = [];
  for (const raw of found) {
    try {
      out.push(new URL(raw.replace(/&amp;/g, '&'), res.url || pageUrl).toString());
    } catch {
      // skip malformed URLs
    }
  }
  return out;
}

async function downloadImage(url: string): Promise<{ base64: string; mimeType: string } | null> {
  const res = await safeFetch(url, 'image/*');
  if (!res) return null;
  const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType)) return null;
  const body = await readLimited(res, MAX_IMAGE_BYTES);
  if (!body || body.byteLength < MIN_IMAGE_BYTES) return null;
  return { base64: Buffer.from(body).toString('base64'), mimeType };
}

function parseJson(text: string): { images?: string[]; pages?: string[] } {
  const m = /\{[\s\S]*\}/.exec(text);
  try {
    return m ? JSON.parse(m[0]) : {};
  } catch {
    return {};
  }
}

async function searchCandidates(genAI: GoogleGenerativeAI, query: string): Promise<string[]> {
  const prompt = `請用 Google 搜尋 Tomica（トミカ）小汽車「${query}」的商品照片。
只回傳 JSON（不要 markdown）：
{"images": ["<直接指向這台車照片的圖片網址>"], "pages": ["<介紹這台車、有它照片的網頁網址>"]}
各最多 5 個，只放確實是這台車的結果，找不到就給空陣列。`;

  let answered = false;
  for (const name of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: name, tools: [SEARCH_TOOL] });
      const result = await model.generateContent(prompt);
      answered = true;
      const parsed = parseJson(result.response.text());
      const grounded = (result.response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
        .map((c) => c.web?.uri)
        .filter(Boolean) as string[];

      // Pictures taken from pages the search actually visited come first; image URLs the model
      // writes out itself are often made up (dead YouTube thumbnails and the like)
      const fromPages = await Promise.all(
        [...new Set([...(parsed.pages ?? []), ...grounded])].slice(0, MAX_PAGES).map(pageImages)
      );
      // Take each page's best picture before anyone's second one
      const ranked = [0, 1, 2].flatMap((i) => fromPages.map((p) => p[i]).filter(Boolean));
      const images = [...ranked, ...(parsed.images ?? [])];
      const out = [...new Set(images.filter(isPublicUrl))].slice(0, MAX_CANDIDATES);
      console.info('[thumb] candidates', name, { parsed: parsed.images?.length ?? 0, pages: parsed.pages?.length ?? 0, grounded: grounded.length, out });
      // Nothing usable: a different model searches differently, so give the next one a go
      if (out.length) return out;
    } catch (err) {
      // Model unavailable or quota hit: try the next one
      console.warn('[thumb] search failed', name, (err as Error).message);
    }
  }
  if (!answered) throw new ThumbSearchBusy();
  return [];
}

// Every model refused (quota used up or overloaded), as opposed to searching and finding nothing
export class ThumbSearchBusy extends Error {
  constructor() {
    super('Gemini 額度用完或忙碌中');
  }
}

// Asks the model whether the downloaded picture really shows this car, so site logos are skipped
async function looksLikeCar(
  genAI: GoogleGenerativeAI,
  query: string,
  image: { base64: string; mimeType: string }
): Promise<boolean> {
  for (const name of CHECK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent([
        `這張圖是 Tomica 小汽車「${query}」（車本體或包裝盒）的照片嗎？只回答 yes 或 no。`,
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
      ]);
      return /^\s*yes/i.test(result.response.text());
    } catch (err) {
      // Retired model or quota hit: try the next one
      console.warn('[thumb] check failed', name, (err as Error).message);
    }
  }
  return false;
}

// `exclude` holds sources already shown and rejected, so "try another" moves on
export async function findThumbnail(
  apiKey: string,
  query: string,
  exclude: string[] = []
): Promise<ThumbResult | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const skip = new Set(exclude);
  for (const url of await searchCandidates(genAI, query)) {
    if (skip.has(url)) continue;
    const image = await downloadImage(url);
    const ok = !!image && (await looksLikeCar(genAI, query, image));
    console.info('[thumb] candidate', url, image ? (ok ? 'accepted' : 'rejected by check') : 'download failed');
    if (image && ok) {
      return { dataUrl: `data:${image.mimeType};base64,${image.base64}`, source: url };
    }
  }
  return null;
}
