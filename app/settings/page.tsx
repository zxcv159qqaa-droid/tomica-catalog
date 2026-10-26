'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [stats, setStats] = useState({ collection: 0, wishlist: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gemini-api-key');
      if (stored) setApiKey(stored);
    } catch {}

    const loadStats = async () => {
      const colCount = await db.collection.count();
      const wishCount = await db.wishlist.count();
      setStats({ collection: colCount, wishlist: wishCount });
    };
    loadStats();
  }, []);

  const saveApiKey = () => {
    try {
      localStorage.setItem('gemini-api-key', apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleExport = async () => {
    const collection = await db.collection.toArray();
    const wishlist = await db.wishlist.toArray();
    const carImages = await db.carImages.toArray();
    const data = JSON.stringify(
      { collection, wishlist, carImages, exportedAt: new Date().toISOString() },
      null,
      2
    );
    setExportData(data);

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
      const data = JSON.parse(importText);
      if (data.collection) {
        await db.collection.clear();
        await db.collection.bulkAdd(
          data.collection.map((item: Record<string, unknown>) => ({
            tomicaNumber: item.tomicaNumber,
            variantId: item.variantId,
            addedAt: new Date(item.addedAt as string),
            notes: item.notes,
            name: item.name,
            variantName: item.variantName,
            series: item.series,
            code: item.code,
            thumb: item.thumb,
          }))
        );
      }
      if (data.wishlist) {
        await db.wishlist.clear();
        await db.wishlist.bulkAdd(
          data.wishlist.map((item: Record<string, unknown>) => ({
            tomicaNumber: item.tomicaNumber,
            variantId: item.variantId,
            addedAt: new Date(item.addedAt as string),
          }))
        );
      }
      if (data.carImages) {
        await db.carImages.clear();
        await db.carImages.bulkPut(
          data.carImages.map((item: Record<string, unknown>) => ({
            carId: item.carId,
            src: item.src,
            source: item.source,
            addedAt: new Date(item.addedAt as string),
          }))
        );
      }
      setImportStatus('匯入成功！');
      setImportText('');
      const colCount = await db.collection.count();
      const wishCount = await db.wishlist.count();
      setStats({ collection: colCount, wishlist: wishCount });
    } catch {
      setImportStatus('匯入失敗：JSON 格式錯誤');
    }
    setTimeout(() => setImportStatus(''), 3000);
  };

  const handleClearAll = async () => {
    if (!confirm('確定要清除所有收藏資料嗎？此操作無法復原！')) return;
    await db.collection.clear();
    await db.wishlist.clear();
    setStats({ collection: 0, wishlist: 0 });
  };

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold mb-5">⚙️ 設定</h2>

      <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm border-slate-200 dark:border-slate-700 mb-4">
        <h2 className="font-semibold mb-3">Google Gemini API Key</h2>
        <p className="text-xs text-slate-400 mb-3">
          前往{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            Google AI Studio
          </a>{' '}
          免費取得 API Key
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="輸入 API Key..."
          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm mb-2"
        />
        <button
          onClick={saveApiKey}
          className="w-full py-2 tomica-red text-white rounded-xl text-sm font-medium"
        >
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm border-slate-200 dark:border-slate-700 mb-4">
        <h2 className="font-semibold mb-3">資料統計</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.collection}</p>
            <p className="text-xs text-slate-400">收藏數</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.wishlist}</p>
            <p className="text-xs text-slate-400">願望清單</p>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm border-slate-200 dark:border-slate-700 mb-4">
        <h2 className="font-semibold mb-3">匯出 / 匯入</h2>
        <button
          onClick={handleExport}
          className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium mb-3"
        >
          匯出收藏資料 (JSON)
        </button>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="貼上 JSON 資料來匯入..."
          rows={4}
          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono mb-2"
        />
        <button
          onClick={handleImport}
          disabled={!importText}
          className="w-full py-2 bg-blue-600 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium"
        >
          匯入
        </button>
        {importStatus && (
          <p className="text-sm mt-2 text-center">{importStatus}</p>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm border-red-200 dark:border-red-800 mb-4">
        <h2 className="font-semibold text-red-600 mb-3">危險區域</h2>
        <button
          onClick={handleClearAll}
          className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
        >
          清除所有收藏資料
        </button>
      </section>
    </div>
  );
}
