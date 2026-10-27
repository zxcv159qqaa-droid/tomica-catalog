import { createHash } from 'crypto';

// Server side of cloud sync. One record per sync code in Upstash Redis (REST API):
//   sync:<hash>      JSON document (collection, wishlist, JAN links; no pictures)
//   sync:<hash>:img  hash of picture key -> small JPEG data URL
// Codes are hashed so the database never holds them in a usable form.

const URL_ENV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_ENV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const SYNC_CODE_RE = /^TG(-[A-HJ-NP-Z2-9]{4}){3}$/;

export function storeConfigured(): boolean {
  return !!(URL_ENV && TOKEN_ENV) || process.env.NODE_ENV === 'development';
}

function keyFor(code: string): string {
  return `sync:${createHash('sha256').update(code).digest('hex').slice(0, 32)}`;
}

// Local development without Redis keeps records in memory so the flow can be exercised
const memory = new Map<string, string | Map<string, string>>();

async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  if (!URL_ENV || !TOKEN_ENV) return commands.map(runInMemory);
  const res = await fetch(`${URL_ENV}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_ENV}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`雲端資料庫錯誤 (${res.status})`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(failed.error);
  return out.map((r) => r.result);
}

function runInMemory([cmd, key, ...args]: (string | number)[]): unknown {
  const k = String(key);
  switch (cmd) {
    case 'GET':
      return typeof memory.get(k) === 'string' ? memory.get(k) : null;
    case 'SET':
      memory.set(k, String(args[0]));
      return 'OK';
    case 'HGETALL': {
      const h = memory.get(k);
      return h instanceof Map ? [...h.entries()].flat() : [];
    }
    case 'HSET': {
      const h = memory.get(k) instanceof Map ? (memory.get(k) as Map<string, string>) : new Map();
      for (let i = 0; i < args.length; i += 2) h.set(String(args[i]), String(args[i + 1]));
      memory.set(k, h);
      return args.length / 2;
    }
    case 'HDEL': {
      const h = memory.get(k);
      if (h instanceof Map) args.forEach((f) => h.delete(String(f)));
      return 1;
    }
    default:
      throw new Error(`unsupported ${cmd}`);
  }
}

export interface SyncDoc {
  updatedAt: number;
  data: unknown;
}

export async function pull(code: string): Promise<{ doc: SyncDoc | null; images: Record<string, string> }> {
  const key = keyFor(code);
  const [doc, flat] = (await redis([
    ['GET', key],
    ['HGETALL', `${key}:img`],
  ])) as [string | null, string[]];
  const images: Record<string, string> = {};
  for (let i = 0; i < (flat?.length ?? 0); i += 2) images[flat[i]] = flat[i + 1];
  return { doc: doc ? (JSON.parse(doc) as SyncDoc) : null, images };
}

export async function push(
  code: string,
  data: unknown,
  addImages: Record<string, string>,
  removeImages: string[]
): Promise<number> {
  const key = keyFor(code);
  const updatedAt = Date.now();
  const commands: (string | number)[][] = [['SET', key, JSON.stringify({ updatedAt, data })]];
  const pairs = Object.entries(addImages).flat();
  if (pairs.length) commands.push(['HSET', `${key}:img`, ...pairs]);
  if (removeImages.length) commands.push(['HDEL', `${key}:img`, ...removeImages]);
  await redis(commands);
  return updatedAt;
}
