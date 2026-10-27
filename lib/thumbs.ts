'use client';

import { useSyncExternalStore } from 'react';
import { db } from '@/lib/db';
import { genLabel, seriesLabel, type TomicaCar } from '@/lib/tomica-data';

// Client side of thumbnail search and the shared thumbnail library (see lib/shared-thumbs.ts)

export function makeThumb(dataUrl: string, maxSide = 240): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

// `busy`: Gemini refused (quota or overload), so "not found" would be misleading
export async function searchThumbnail(
  query: string,
  apiKey: string,
  opts: { carId?: string; exclude?: string[] } = {}
): Promise<{ found: { dataUrl: string; source: string } | null; busy: boolean }> {
  try {
    const res = await fetch('/api/thumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, apiKey: apiKey || undefined, ...opts }),
    });
    const data = await res.json();
    return {
      found: data.found ? { dataUrl: data.dataUrl, source: data.source } : null,
      busy: !!data.busy,
    };
  } catch {
    return { found: null, busy: true };
  }
}

export function thumbQuery(car: TomicaCar): string {
  const box = car.series === 'regular' ? (genLabel(car) ?? `No.${car.number}`) : `${seriesLabel(car.series)} ${car.code ?? car.number}`;
  return `${box} ${car.name_ja}`;
}

// ---- shared library index: carId -> version, loaded once per page load ----

let versions: Record<string, number> = {};
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const EMPTY: Record<string, number> = {};

function emit() {
  listeners.forEach((l) => l());
}

export function loadSharedThumbs(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = fetch('/api/shared-thumbs', force ? { cache: 'no-store' } : undefined)
    .then((r) => (r.ok ? r.json() : { versions: {} }))
    .then((d: { versions?: Record<string, number> }) => {
      versions = d.versions ?? {};
      emit();
    })
    .catch(() => {});
  return loading;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  loadSharedThumbs();
  return () => listeners.delete(cb);
}

export function useSharedThumbVersions(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => versions, () => EMPTY);
}

export function sharedThumbUrl(carId: string, version: number): string {
  return `/api/shared-thumbs/${encodeURIComponent(carId)}?v=${version}`;
}

export function hasSharedThumb(carId: string): boolean {
  return carId in versions;
}

async function postShared(body: object): Promise<{ version?: number } | null> {
  try {
    const res = await fetch('/api/shared-thumbs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Saves a found picture locally (so it syncs with the garage) and offers it to everyone
export async function saveCarThumb(carId: string, src: string, source: string): Promise<void> {
  await db.carImages.put({ carId, src, source, addedAt: new Date() });
  if (source === 'scan') return; // the user's own photo stays private
  const out = await postShared({ action: 'put', carId, src, source });
  if (out?.version) {
    versions = { ...versions, [carId]: out.version };
    emit();
  }
}

// "Wrong car": removes the local copy and the shared one, and blocks that source for future searches
// (the user's own scan photo is only removed locally; the shared picture under it is left alone)
export async function rejectCarThumb(carId: string): Promise<void> {
  const local = await db.carImages.get(carId);
  await db.carImages.delete(carId);
  if (local?.source !== 'scan' && carId in versions) {
    await postShared({ action: 'reject', carId });
    const rest = { ...versions };
    delete rest[carId];
    versions = rest;
    emit();
  }
}
