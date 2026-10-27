'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'gemini-api-key';
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

// The user's own Gemini key from settings; empty on the server and when unset
export function useApiKey(): [string, (key: string) => void] {
  const key = useSyncExternalStore(subscribe, read, () => '');
  const save = (next: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [key, save];
}
