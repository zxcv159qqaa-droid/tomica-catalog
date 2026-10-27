'use client';

import { useState } from 'react';
import { CONDITIONS, db, itemQty, type CollectionItem, type Condition } from '@/lib/db';
import { removeCopy } from '@/lib/collection-actions';

const field =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

// Quantity stepper plus the per-copy details (condition, price, location, notes) for one owned variant
export default function CopyEditor({ item, onAdd }: { item?: CollectionItem; onAdd: () => void }) {
  const [open, setOpen] = useState(false);

  if (!item) {
    return (
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
      >
        加入收藏
      </button>
    );
  }

  const save = (patch: Partial<CollectionItem>) => item.id && db.collection.update(item.id, patch);
  const summary = [item.condition, item.price ? `NT$${item.price}` : '', item.location]
    .filter(Boolean)
    .join('・');

  return (
    <div className="w-full mt-3 pt-3 border-t border-red-200/60 dark:border-red-900/60 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen(!open)} className="text-xs text-slate-500 text-left min-w-0 truncate">
          {open ? '▾ 收起細節' : `▸ ${summary || '盒況、價格、收納位置'}`}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => removeCopy(item)}
            aria-label="減少一台"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold"
          >
            −
          </button>
          <span className="w-6 text-center font-black">{itemQty(item)}</span>
          <button
            onClick={() => save({ qty: itemQty(item) + 1 })}
            aria-label="增加一台"
            className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold"
          >
            +
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-xs text-slate-500">
            盒況
            <select
              value={item.condition ?? ''}
              onChange={(e) => save({ condition: (e.target.value || undefined) as Condition | undefined })}
              className={field}
            >
              <option value="">未填</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            購入單價 (NT$)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={item.price ?? ''}
              onBlur={(e) => save({ price: e.target.value ? Number(e.target.value) : undefined })}
              className={field}
            />
          </label>
          <label className="text-xs text-slate-500">
            收納位置
            <input
              defaultValue={item.location ?? ''}
              placeholder="例如 A 櫃第 2 層"
              onBlur={(e) => save({ location: e.target.value.trim() || undefined })}
              className={field}
            />
          </label>
          <label className="text-xs text-slate-500">
            備註
            <input
              defaultValue={item.notes ?? ''}
              placeholder="例如 東京車站購入"
              onBlur={(e) => save({ notes: e.target.value.trim() || undefined })}
              className={field}
            />
          </label>
        </div>
      )}
    </div>
  );
}
