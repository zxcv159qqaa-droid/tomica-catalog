'use client';

import { useEffect } from 'react';

export default function PersistStorage() {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    // Offline cache; skipped in development so it doesn't serve stale hot-reload bundles
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }
  }, []);
  return null;
}
