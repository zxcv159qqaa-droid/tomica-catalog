'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getAllWorldItems, getWorldLines, type WorldItem } from '@/lib/world-data';
import { normalizeName } from '@/lib/tomica-data';
import SearchBar from '@/components/SearchBar';

type OwnFilter = 'all' | 'owned' | 'unowned';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

const pill = (active: boolean) =>
  `px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
    active
      ? 'bg-red-600 text-white shadow-sm'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
  }`;

const ALL = getAllWorldItems();
const LINES = getWorldLines();

async function toggleOwned(id: string, owned: boolean) {
  if (owned) await db.worldItems.delete(id);
  else await db.worldItems.put({ id, addedAt: new Date() });
}

function WorldCard({ item, owned }: { item: WorldItem; owned: boolean }) {
  return (
    <div
      className={`card-hover relative h-full flex flex-col overflow-hidden rounded-2xl border shadow-sm ${
        owned
          ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-900'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="relative p-3 pb-0">
        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white border border-gray-100 dark:border-gray-700 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>
        {owned && (
          <span className="absolute top-5 right-5 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            ✓ 已收藏
          </span>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col gap-1">
        <h3 className="font-bold text-sm leading-snug text-slate-900 dark:text-slate-100 line-clamp-3">
          {item.name}
        </h3>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {item.line}
          {item.price !== undefined && ` ・ ¥${item.price.toLocaleString()}`}
        </div>
        {item.note && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2">{item.note}</p>
        )}
        <button
          onClick={() => void toggleOwned(item.id, owned)}
          className={`mt-auto w-full rounded-xl py-2 text-xs font-bold transition ${
            owned
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {owned ? '取消已收' : '標記已收'}
        </button>
      </div>
    </div>
  );
}

export default function WorldPage() {
  const [search, setSearch] = useState('');
  const [line, setLine] = useState('all');
  const [filter, setFilter] = useState<OwnFilter>('all');
  const ownedRows = useLiveQuery(() => db.worldItems.toArray(), []);
  const ownedIds = useMemo(() => new Set((ownedRows ?? []).map((r) => r.id)), [ownedRows]);

  const ownedTotal = ALL.filter((i) => ownedIds.has(i.id)).length;

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    return ALL.filter(
      (i) =>
        (line === 'all' || i.line === line) &&
        (filter === 'all' || ownedIds.has(i.id) === (filter === 'owned')) &&
        (!q || normalizeName(i.name).includes(q))
    );
  }, [search, line, filter, ownedIds]);

  return (
    <div className="px-4 sm:px-6 pt-5 space-y-5">
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <button onClick={() => setLine('all')} className={pill(line === 'all')}>
              全部
            </button>
            {LINES.map((l) => (
              <button key={l} onClick={() => setLine(l)} className={pill(line === l)}>
                {l}
              </button>
            ))}
          </div>
          <div className="sm:w-72">
            <SearchBar value={search} onChange={setSearch} placeholder="搜尋建物名稱..." />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'owned', label: `已收 (${ownedTotal})` },
                { key: 'unowned', label: `未收 (${ALL.length - ownedTotal})` },
              ] as const
            ).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} className={pill(filter === key)}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            已收 {ownedTotal} / {ALL.length}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          顯示 {filtered.length} 項・資料來源：タカラトミー官網 トミカワールド商品一覽
        </p>
      </section>

      <div className={GRID}>
        {filtered.map((item) => (
          <WorldCard key={item.id} item={item} owned={ownedIds.has(item.id)} />
        ))}
      </div>
    </div>
  );
}
