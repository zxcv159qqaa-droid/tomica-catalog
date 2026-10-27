'use client';

import { useEffect } from 'react';
import { getSyncCode, installSyncHooks, syncNow } from '@/lib/sync';

// Keeps the collection in sync in the background: on open, when the app comes back to the
// foreground or online, and a few seconds after each local change (see installSyncHooks)
export default function SyncManager() {
  useEffect(() => {
    installSyncHooks();
    const maybeSync = () => {
      if (document.visibilityState === 'visible' && getSyncCode()) void syncNow();
    };
    maybeSync();
    document.addEventListener('visibilitychange', maybeSync);
    window.addEventListener('online', maybeSync);
    return () => {
      document.removeEventListener('visibilitychange', maybeSync);
      window.removeEventListener('online', maybeSync);
    };
  }, []);
  return null;
}
