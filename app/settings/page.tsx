'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { exportBackup, importBackup } from '@/lib/backup';
import { useApiKey } from '@/lib/useApiKey';
import CloudSyncSection from '@/components/CloudSyncSection';
import { CheckIcon, ChevronDownIcon, DownloadIcon, TrashIcon, UploadIcon } from '@/components/icons';

const section = 'border-t border-line py-6';
const field =
  'h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30';
const primary = 'press h-11 w-full rounded-[10px] bg-[#e50012] text-sm font-medium text-white disabled:opacity-40';
const secondary = 'press h-11 w-full rounded-[10px] border border-line bg-surface text-sm font-medium disabled:opacity-40';

export default function SettingsPage() {
  const [storedKey, saveKey] = useApiKey();
  // null until the user edits, so the field shows the saved key
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const stats = useLiveQuery(
    async () => ({ collection: await db.collection.count(), wishlist: await db.wishlist.count() }),
    []
  ) ?? { collection: 0, wishlist: 0 };

  const saveApiKey = () => {
    saveKey(draftKey ?? storedKey);
    setDraftKey(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = JSON.stringify(await exportBackup(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tomica-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    try {
      await importBackup(JSON.parse(importText));
      setImportStatus('匯入成功！');
      setImportText('');
    } catch {
      setImportStatus('匯入失敗：JSON 格式錯誤');
    }
    setTimeout(() => setImportStatus(''), 3000);
  };

  const handleClearAll = async () => {
    if (!confirm('確定要清除所有收藏資料嗎？此操作無法復原！')) return;
    await db.collection.clear();
    await db.wishlist.clear();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
      <h1 className="mb-5 text-2xl font-medium">設定</h1>

      <CloudSyncSection className={section} />

      <section className={section}>
        <h2 className="mb-3 text-base font-medium">資料統計</h2>
        <dl className="tnum flex gap-10">
          <div className="flex flex-col">
            <dt className="order-2 mt-1 text-sm text-muted">收藏筆數</dt>
            <dd className="font-display text-5xl font-medium leading-none">{stats.collection}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="order-2 mt-1 text-sm text-muted">願望清單</dt>
            <dd className="font-display text-5xl font-medium leading-none">{stats.wishlist}</dd>
          </div>
        </dl>
      </section>

      <section className={section}>
        <h2 className="mb-3 text-base font-medium">匯出 / 匯入</h2>
        <button onClick={handleExport} className={`${secondary} mb-4 flex items-center justify-center gap-1.5`}>
          <DownloadIcon size={18} />
          匯出收藏資料 (JSON)
        </button>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="貼上 JSON 資料來匯入..."
          aria-label="要匯入的 JSON 資料"
          rows={4}
          className="mb-2 w-full rounded-[10px] border border-line bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30"
        />
        <button
          onClick={handleImport}
          disabled={!importText}
          className={`${primary} flex items-center justify-center gap-1.5`}
        >
          <UploadIcon size={18} />
          匯入
        </button>
        {importStatus && (
          <p className="mt-2 text-center text-sm" role="status">
            {importStatus}
          </p>
        )}
      </section>

      <details className="group border-t border-line py-3">
        <summary className="press flex h-11 cursor-pointer list-none items-center justify-between text-base font-medium [&::-webkit-details-marker]:hidden">
          進階：自己的 Gemini API Key
          <ChevronDownIcon size={20} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-3 pb-3">
          <h2 className="mb-1 text-base font-medium">Google Gemini API Key</h2>
          <p className="mb-3 text-sm text-muted">
            前往{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-text underline"
            >
              Google AI Studio
            </a>{' '}
            免費取得 API Key（線上版已內建，可不填）
          </p>
          <input
            type="password"
            value={draftKey ?? storedKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="輸入 API Key..."
            aria-label="Google Gemini API Key"
            className={`${field} mb-2`}
          />
          <button onClick={saveApiKey} className={primary}>
            {saved ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                已儲存 <CheckIcon size={16} className="stamp-in" />
              </span>
            ) : (
              '儲存'
            )}
          </button>
        </div>
      </details>

      <section className={section}>
        <h2 className="mb-3 text-base font-medium text-brand-text">危險區域</h2>
        <button
          onClick={handleClearAll}
          className="press flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-brand-text text-sm font-medium text-brand-text"
        >
          <TrashIcon size={18} />
          清除所有收藏資料
        </button>
      </section>
    </div>
  );
}
