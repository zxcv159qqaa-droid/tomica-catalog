'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getAllWorldItems, getWorldLines, type WorldItem } from '@/lib/world-data';
import { normalizeName } from '@/lib/tomica-data';
import SearchBar from '@/components/SearchBar';
import Segmented from '@/components/Segmented';
import EmptyState from '@/components/EmptyState';
import { OwnedStamp } from '@/components/CardParts';
import { CheckIcon, PlusIcon } from '@/components/icons';

type OwnFilter = 'all' | 'owned' | 'unowned';

const GRID = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4';

const ALL = getAllWorldItems();
const LINES = getWorldLines();

async function toggleOwned(id: string, owned: boolean) {
  if (owned) await db.worldItems.delete(id);
  else await db.worldItems.put({ id, addedAt: new Date() });
}

function WorldCard({ item, owned }: { item: WorldItem; owned: boolean }) {
  // The stamp plays only when the user marks it owned here, not on page load
  const [justMarked, setJustMarked] = useState(false);
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_1px_2px_var(--shadow)] ${
        owned ? 'border-[#e50012]/50' : 'border-line'
      }`}
    >
      <div className="stage aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
        />
        {owned && (
          <div className="absolute bottom-2 right-2 z-[3]">
            <OwnedStamp animate={justMarked} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-3 text-[15px] font-medium leading-snug">{item.name}</h3>
        <div className="tnum flex flex-wrap gap-x-3 text-[13px] text-muted">
          <span>{item.line}</span>
          {item.price !== undefined && <span>¥{item.price.toLocaleString()}</span>}
        </div>
        {item.note && <p className="line-clamp-2 text-[13px] text-muted">{item.note}</p>}
        <button
          onClick={() => {
            setJustMarked(!owned);
            void toggleOwned(item.id, owned);
          }}
          aria-pressed={owned}
          className={`press mt-auto flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] text-sm font-medium ${
            owned
              ? 'border border-line text-muted hover:text-ink'
              : 'border border-ink/25 text-ink hover:bg-paper'
          }`}
        >
          {owned ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
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

  const lineOptions = [{ key: 'all', label: '全部' }, ...LINES.map((l) => ({ key: l, label: l }))];
  const filterOptions = [
    { key: 'all', label: '全部' },
    { key: 'owned', label: `已收 (${ownedTotal})` },
    { key: 'unowned', label: `未收 (${ALL.length - ownedTotal})` },
  ] as const;

  return (
    <div className="px-4 pt-6 sm:px-6">
      <section aria-label="篩選" className="space-y-3">
        <h1 className="sr-only">建物圖鑑</h1>
        <p className="tnum flex items-baseline gap-2">
          <span className="font-display text-[64px] font-medium leading-[0.85]">{ownedTotal}</span>
          <span className="text-lg text-muted">/ {ALL.length} 項已收</span>
        </p>
        <Segmented scroll label="系列" options={lineOptions} value={line} onChange={setLine} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-80">
            <SearchBar value={search} onChange={setSearch} placeholder="搜尋建物名稱..." />
          </div>
          <Segmented scroll label="收藏狀態" options={filterOptions} value={filter} onChange={setFilter} />
        </div>
        <p className="tnum text-sm text-muted">
          顯示 {filtered.length} 項　資料來源：タカラトミー官網 トミカワールド商品一覽
        </p>
      </section>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState title="找不到符合條件的建物" />
        ) : (
          <div className={GRID}>
            {filtered.map((item) => (
              <WorldCard key={item.id} item={item} owned={ownedIds.has(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
