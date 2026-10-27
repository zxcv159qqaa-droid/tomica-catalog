import { GoogleGenerativeAI, type Tool } from '@google/generative-ai';

const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
const FETCH_TIMEOUT = 6000;
const MAX_PAGE_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 3_000_000;
const MIN_IMAGE_BYTES = 3_000;
const MAX_CANDIDATES = 6;

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

async function pageImage(pageUrl: string): Promise<string | null> {
  const res = await safeFetch(pageUrl, 'text/html');
  if (!res || !(res.headers.get('content-type') || '').includes('html')) return null;
  const body = await readLimited(res, MAX_PAGE_BYTES);
  if (!body) return null;
  const html = new TextDecoder().decode(body);
  const m =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html);
  if (!m) return null;
  try {
    return new URL(m[1].replace(/&amp;/g, '&'), res.url || pageUrl).toString();
  } catch {
    return null;
  }
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

  for (const name of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: name, tools: [SEARCH_TOOL] });
      const result = await model.generateContent(prompt);
      const parsed = parseJson(result.response.text());
      const grounded = (result.response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
        .map((c) => c.web?.uri)
        .filter(Boolean) as string[];

      const images: string[] = [...(parsed.images ?? [])];
      for (const page of [...(parsed.pages ?? []), ...grounded].slice(0, MAX_CANDIDATES)) {
        const img = await pageImage(page);
        if (img) images.push(img);
      }
      return [...new Set(images.filter(isPublicUrl))].slice(0, MAX_CANDIDATES);
    } catch {
      // Model unavailable or quota hit: try the next one
    }
  }
  return [];
}

// Asks the model whether the downloaded picture really shows this car, so site logos are skipped
async function looksLikeCar(
  genAI: GoogleGenerativeAI,
  query: string,
  image: { base64: string; mimeType: string }
): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent([
      `這張圖是 Tomica 小汽車「${query}」（車本體或包裝盒）的照片嗎？只回答 yes 或 no。`,
      { inlineData: { mimeType: image.mimeType, data: image.base64 } },
    ]);
    return /^\s*yes/i.test(result.response.text());
  } catch {
    return false;
  }
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
    if (image && (await looksLikeCar(genAI, query, image))) {
      return { dataUrl: `data:${image.mimeType};base64,${image.base64}`, source: url };
    }
  }
  return null;
}
