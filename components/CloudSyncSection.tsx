'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  connectSync,
  disconnectSync,
  getSyncCode,
  getSyncStatus,
  newSyncCode,
  normalizeSyncCode,
  subscribeSync,
  syncNow,
} from '@/lib/sync';

const OFF = { kind: 'off' } as const;

export default function CloudSyncSection({ className }: { className?: string }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus, () => OFF);
  // Re-read the code whenever the status changes (connect/disconnect go through it)
  const code = useSyncExternalStore(subscribeSync, getSyncCode, () => undefined);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const statusText =
    status.kind === 'syncing'
      ? '同步中…'
      : status.kind === 'ok'
        ? `已同步 ✓ ${new Date(status.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
        : status.kind === 'error'
          ? `⚠️ ${status.message}`
          : '尚未同步';

  return (
    <section className={className}>
      <h2 className="font-semibold mb-1">☁️ 雲端同步</h2>
      <p className="text-xs text-slate-400 mb-3">
        收藏會自動備份到雲端，在另一台手機或電腦輸入同一組同步碼就能共用。同步碼等於鑰匙，別給別人。
      </p>

      {code ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono font-bold tracking-wider text-center">
              {code}
            </code>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              {copied ? '已複製' : '複製'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={status.kind === 'error' ? 'text-rose-600' : 'text-slate-500'}>{statusText}</span>
            <div className="flex gap-3">
              <button onClick={() => void syncNow()} className="text-blue-600 font-bold">
                立即同步
              </button>
              <button
                onClick={() => confirm('這台裝置停止同步？資料會留在這台，雲端也不會刪除。') && disconnectSync()}
                className="text-slate-400"
              >
                停止同步
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => void connectSync(newSyncCode())}
            className="w-full py-2 tomica-red text-white rounded-xl text-sm font-bold"
          >
            開始雲端同步（產生同步碼）
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = normalizeSyncCode(input);
              if (/^TG(-[A-Z0-9]{4}){3}$/.test(c)) void connectSync(c);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="已有同步碼？例如 TG-7F3K-92QX-AB4D"
              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono"
            />
            <button className="px-4 rounded-lg bg-slate-800 text-white text-sm font-bold">連結</button>
          </form>
          {status.kind === 'error' && <p className="text-xs text-rose-600">{statusText}</p>}
        </div>
      )}
    </section>
  );
}
