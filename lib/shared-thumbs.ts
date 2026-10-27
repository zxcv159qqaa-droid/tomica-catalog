import { redis } from '@/lib/sync-store';

// Shared thumbnail library for catalog cars without an official image, filled in by everyone:
//   thumbs:v    carId -> version (timestamp), small enough to send the whole index to clients
//   thumbs:img  carId -> JPEG data URL
//   thumbs:src  carId -> page/image URL the picture came from
//   thumbs:bad  carId -> JSON list of sources people marked as the wrong car, skipped by later searches

export const MAX_SHARED_THUMB_CHARS = 120_000;

export async function sharedIndex(): Promise<Record<string, number>> {
  const [flat] = (await redis([['HGETALL', 'thumbs:v']])) as [string[]];
  const out: Record<string, number> = {};
  for (let i = 0; i < (flat?.length ?? 0); i += 2) out[flat[i]] = Number(flat[i + 1]);
  return out;
}

export async function sharedImage(carId: string): Promise<string | null> {
  const [src] = (await redis([['HGET', 'thumbs:img', carId]])) as [string | null];
  return src;
}

export async function badSources(carId: string): Promise<string[]> {
  const [raw] = (await redis([['HGET', 'thumbs:bad', carId]])) as [string | null];
  try {
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function putShared(carId: string, src: string, source: string): Promise<number> {
  const version = Date.now();
  await redis([
    ['HSET', 'thumbs:img', carId, src],
    ['HSET', 'thumbs:src', carId, source],
    ['HSET', 'thumbs:v', carId, version],
  ]);
  return version;
}

// Drops the picture and remembers its source so the next search picks something else
export async function rejectShared(carId: string): Promise<void> {
  const [source] = (await redis([['HGET', 'thumbs:src', carId]])) as [string | null];
  const bad = await badSources(carId);
  if (source && !bad.includes(source)) bad.push(source);
  await redis([
    ['HSET', 'thumbs:bad', carId, JSON.stringify(bad.slice(-20))],
    ['HDEL', 'thumbs:img', carId],
    ['HDEL', 'thumbs:src', carId],
    ['HDEL', 'thumbs:v', carId],
  ]);
}
