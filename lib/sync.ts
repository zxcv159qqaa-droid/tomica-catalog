'use client';

import { db } from '@/lib/db';
import { exportBackup, importBackup, type Backup } from '@/lib/backup';

// Client side of cloud sync: the whole collection is one document per sync code.
// Each device remembers which remote version it last saw and whether it changed anything since;
// when both sides changed, the two are merged (more copies wins, lists are unioned).

const STATE_KEY = 'tomica-sync';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface SyncState {
  code?: string;
  // Remote updatedAt this device last pulled or pushed
  remoteAt?: number;
  // When this device last changed data, and when it last finished a sync
  localChangedAt: number;
  syncedAt: number;
}

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'syncing' }
  | { kind: 'ok'; at: number }
  | { kind: 'error'; message: string };

let status: SyncStatus = { kind: 'off' };
const listeners = new Set<() => void>();
let applyingRemote = false;
let running: Promise<void> | null = null;
let debounce: ReturnType<typeof setTimeout> | undefined;

function readState(): SyncState {
  try {
    return { localChangedAt: 0, syncedAt: 0, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') };
  } catch {
    return { localChangedAt: 0, syncedAt: 0 };
  }
}

function writeState(patch: Partial<SyncState>) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {}
}

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export function subscribeSync(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function getSyncCode(): string | undefined {
  return readState().code;
}

export function newSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `TG-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function normalizeSyncCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^TG/, '');
  return raw.length === 12 ? `TG-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}` : input;
}

// Any local write marks the device dirty and schedules a sync
function markChanged() {
  if (applyingRemote) return;
  writeState({ localChangedAt: Date.now() });
  if (!readState().code) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), 3000);
}

let hooked = false;
export function installSyncHooks() {
  if (hooked) return;
  hooked = true;
  for (const table of [db.collection, db.wishlist, db.carImages, db.janCodes]) {
    table.hook('creating', markChanged);
    table.hook('updating', markChanged);
    table.hook('deleting', markChanged);
  }
}

// Pictures travel separately from the document so it stays small
interface SyncData extends Omit<Backup, 'carImages'> {
  carImages: Record<string, unknown>[];
}

function split(backup: Backup): { data: SyncData; images: Record<string, string> } {
  const images: Record<string, string> = {};
  const collection = backup.collection.map((row) => {
    const { thumb, ...rest } = row;
    if (typeof thumb === 'string') images[`v:${row.variantId}`] = thumb;
    return rest;
  });
  const carImages = (backup.carImages ?? []).map((row) => {
    const { src, ...rest } = row;
    if (typeof src === 'string') images[`c:${row.carId}`] = src;
    return rest;
  });
  return { data: { ...backup, collection, carImages }, images };
}

function join(data: SyncData, images: Record<string, string>): Backup {
  return {
    ...data,
    collection: data.collection.map((row) => ({ ...row, thumb: images[`v:${row.variantId}`] })),
    carImages: data.carImages
      .filter((row) => images[`c:${row.carId}`])
      .map((row) => ({ ...row, src: images[`c:${row.carId}`] })),
  };
}

function unionBy<T extends Record<string, unknown>>(remote: T[] = [], local: T[] = [], key: string, pick?: (r: T, l: T) => T) {
  const map = new Map<unknown, T>();
  remote.forEach((r) => map.set(r[key], r));
  local.forEach((l) => {
    const r = map.get(l[key]);
    map.set(l[key], r && pick ? pick(r, l) : l);
  });
  return [...map.values()];
}

function merge(remote: Backup, local: Backup): Backup {
  const qty = (row: Record<string, unknown>) => (typeof row.qty === 'number' ? row.qty : 1);
  return {
    collection: unionBy(remote.collection, local.collection, 'variantId', (r, l) => ({
      ...r,
      ...l,
      qty: Math.max(qty(r), qty(l)),
    })),
    wishlist: unionBy(remote.wishlist, local.wishlist, 'variantId'),
    carImages: unionBy(remote.carImages, local.carImages, 'carId'),
    janCodes: unionBy(remote.janCodes, local.janCodes, 'jan'),
    exportedAt: new Date().toISOString(),
  };
}

async function api<T>(body: object): Promise<T> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `同步失敗 (${res.status})`);
  return json as T;
}

async function applyLocally(backup: Backup) {
  applyingRemote = true;
  try {
    await importBackup(backup);
  } finally {
    applyingRemote = false;
  }
}

async function runSync(): Promise<void> {
  const state = readState();
  if (!state.code) return;
  const code = state.code;
  setStatus({ kind: 'syncing' });
  try {
    const remote = await api<{ doc: { updatedAt: number; data: SyncData } | null; images: Record<string, string> }>({
      action: 'pull',
      code,
    });
    const startedAt = Date.now();
    const local = await exportBackup();
    const localDirty = state.localChangedAt > state.syncedAt;
    const remoteChanged = !!remote.doc && remote.doc.updatedAt !== state.remoteAt;

    let toPush: Backup | null = null;
    if (!remote.doc) {
      toPush = local;
    } else if (remoteChanged && !localDirty) {
      await applyLocally(join(remote.doc.data, remote.images));
      writeState({ remoteAt: remote.doc.updatedAt });
    } else if (remoteChanged && localDirty) {
      const merged = merge(join(remote.doc.data, remote.images), local);
      await applyLocally(merged);
      toPush = merged;
    } else if (localDirty) {
      toPush = local;
    }

    if (toPush) {
      const { data, images } = split(toPush);
      const addImages = Object.fromEntries(
        Object.entries(images).filter(([k, v]) => remote.images[k] !== v)
      );
      const removeImages = Object.keys(remote.images).filter((k) => !(k in images));
      const { updatedAt } = await api<{ updatedAt: number }>({
        action: 'push',
        code,
        data,
        addImages,
        removeImages,
      });
      writeState({ remoteAt: updatedAt });
    }
    // Changes made while this sync ran stay dirty for the next round
    const changedDuring = readState().localChangedAt > startedAt;
    writeState({ syncedAt: changedDuring ? startedAt : Date.now() });
    setStatus({ kind: 'ok', at: Date.now() });
  } catch (e) {
    setStatus({ kind: 'error', message: e instanceof Error ? e.message : '同步失敗' });
  }
}

export function syncNow(): Promise<void> {
  if (!running) running = runSync().finally(() => (running = null));
  return running;
}

// Starts syncing this device with a code (new or from another device)
export async function connectSync(code: string): Promise<void> {
  const local = await db.collection.count();
  // A device with its own data merges it in; an empty one just downloads
  writeState({ code, remoteAt: undefined, localChangedAt: local ? Date.now() : 0, syncedAt: 0 });
  await syncNow();
}

export function disconnectSync() {
  writeState({ code: undefined, remoteAt: undefined });
  setStatus({ kind: 'off' });
}
