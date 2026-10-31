'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  connectSync,
  disconnectSync,
  getLastSyncedAt,
  getSyncCode,
  getSyncStatus,
  newSyncCode,
  normalizeSyncCode,
  subscribeSync,
  syncNow,
} from '@/lib/sync';
import { CheckIcon, CloudIcon, WarningIcon } from '@/components/icons';

const OFF = { kind: 'off' } as const;

const btnPrimary = 'press h-11 w-full rounded-[10px] bg-[#e50012] text-sm font-medium text-white';
const btnInk =
  'press h-11 shrink-0 rounded-[10px] bg-[#24272c] px-4 text-sm font-medium text-white dark:bg-[#eef0f3] dark:text-[#14161a]';
const errText = 'text-brand-text';

export default function CloudSyncSection({ className }: { className?: string }) {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus, () => OFF);
  // Re-read the code whenever the status changes (connect/disconnect go through it)
  const code = useSyncExternalStore(subscribeSync, getSyncCode, () => undefined);
  const lastSynced = useSyncExternalStore(subscribeSync, getLastSyncedAt, () => undefined);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const statusText =
    status.kind === 'syncing'
      ? '同步中…'
      : status.kind === 'ok'
        ? `已同步 ${new Date(status.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
        : status.kind === 'error'
          ? status.message
          : lastSynced
            ? `上次同步 ${new Date(lastSynced).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`
            : '尚未同步';
  const statusIcon =
    status.kind === 'ok' ? <CheckIcon size={14} /> : status.kind === 'error' ? <WarningIcon size={14} /> : null;

  return (
    <section className={className}>
      <h2 className="mb-1 flex items-center gap-2 text-base font-medium">
        <CloudIcon size={20} />
        雲端同步
      </h2>
      <p className="mb-3 text-sm text-muted">
        收藏會自動備份到雲端，在另一台手機或電腦輸入同一組同步碼就能共用。同步碼等於鑰匙，別給別人。
      </p>

      {code ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--line)_55%,transparent)] px-3 font-mono text-sm font-medium tracking-wider">
              {code}
            </code>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className={btnInk}
            >
              {copied ? '已複製' : '複製'}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={`flex items-center gap-1 ${status.kind === 'error' ? errText : 'text-muted'}`}>
              {statusIcon}
              {statusText}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => void syncNow()}
                className={'press min-h-11 px-3 font-medium underline underline-offset-4'}
              >
                立即同步
              </button>
              <button
                onClick={() => confirm('這台裝置停止同步？資料會留在這台，雲端也不會刪除。') && disconnectSync()}
                className="press min-h-11 px-3 text-muted"
              >
                停止同步
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => void connectSync(newSyncCode())} className={btnPrimary}>
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
              aria-label="同步碼"
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 text-sm placeholder:text-muted focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30"
            />
            <button className={btnInk}>連結</button>
          </form>
          {status.kind === 'error' && <p className={`text-sm ${errText}`}>{statusText}</p>}
        </div>
      )}
    </section>
  );
}
