'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { getSyncCode, subscribeSync } from '@/lib/sync';
import { useCollection } from '@/lib/useCollection';

const KEY = 'tomica-backup-nudge';
const HIDE_MS = 14 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();
function subscribeDismiss(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
// Primitive snapshot so React sees a stable value between renders
function getDismissal(): 'dismissed' | 'show' {
  try {
    const at = Number(localStorage.getItem(KEY));
    return at && Date.now() - at < HIDE_MS ? 'dismissed' : 'show';
  } catch {
    return 'show';
  }
}

let dismissedInSession = false;
function snapshot() {
  return dismissedInSession ? 'dismissed' : getDismissal();
}

function dismiss() {
  dismissedInSession = true;
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {}
  listeners.forEach((l) => l());
}

// Quiet reminder that the collection only lives in this phone's browser
export default function BackupNudge() {
  const { ownedCount } = useCollection();
  const code = useSyncExternalStore(subscribeSync, getSyncCode, () => undefined);
  const dismissal = useSyncExternalStore(subscribeDismiss, snapshot, () => 'dismissed' as const);

  if (ownedCount < 1 || code || dismissal === 'dismissed') return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-medium">收藏只存在這支手機裡</p>
      <p className="mt-0.5 text-sm text-muted">開啟雲端同步後，換手機或清除瀏覽器資料也不會不見。</p>
      <div className="mt-2 flex items-center gap-2">
        <Link
          href="/settings"
          className="press inline-flex h-11 items-center rounded-[10px] bg-[#24272c] px-4 text-sm font-medium text-white dark:bg-[#eef0f3] dark:text-[#14161a]"
        >
          開啟同步
        </Link>
        <button onClick={dismiss} className="press min-h-11 px-3 text-sm text-muted">
          稍後再說
        </button>
      </div>
    </section>
  );
}
