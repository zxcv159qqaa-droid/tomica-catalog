'use client';

import { useState } from 'react';
import { CONDITIONS, db, itemQty, type CollectionItem, type Condition } from '@/lib/db';
import { removeCopy } from '@/lib/collection-actions';
import { ChevronDownIcon, MinusIcon, PlusIcon } from '@/components/icons';

const field =
  'mt-1 h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30';

// Quantity stepper plus the per-copy details (condition, price, location, notes) for one owned variant
export default function CopyEditor({ item, onAdd }: { item?: CollectionItem; onAdd: () => void }) {
  const [open, setOpen] = useState(false);

  if (!item) {
    return (
      <button
        onClick={onAdd}
        className="press inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-ink/25 px-4 text-sm font-medium text-ink hover:bg-paper"
      >
        <PlusIcon size={16} />
        加入收藏
      </button>
    );
  }

  const save = (patch: Partial<CollectionItem>) => item.id && db.collection.update(item.id, patch);
  const summary = [item.condition, item.price ? `NT$${item.price}` : '', item.location]
    .filter(Boolean)
    .join('　');

  return (
    <div className="mt-2 w-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen(!open)} className="flex min-h-11 min-w-0 items-center gap-1 text-left text-sm text-muted">
          <ChevronDownIcon size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : '-rotate-90'}`} />
          <span className="truncate">{open ? '收起細節' : summary || '盒況、價格、收納位置'}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => removeCopy(item)}
            aria-label="減少一台"
            className="press flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-surface"
          >
            <MinusIcon size={18} />
          </button>
          <span className="tnum min-w-6 text-center text-lg font-medium">{itemQty(item)}</span>
          <button
            onClick={() => save({ qty: itemQty(item) + 1 })}
            aria-label="增加一台"
            className="press flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#e50012] text-white"
          >
            <PlusIcon size={18} />
          </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-sm text-muted">
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
          <label className="text-sm text-muted">
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
          <label className="text-sm text-muted">
            收納位置
            <input
              defaultValue={item.location ?? ''}
              placeholder="例如 A 櫃第 2 層"
              onBlur={(e) => save({ location: e.target.value.trim() || undefined })}
              className={field}
            />
          </label>
          <label className="text-sm text-muted">
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
