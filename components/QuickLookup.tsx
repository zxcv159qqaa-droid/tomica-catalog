'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CATALOG_SERIES,
  displayCode,
  genLabel,
  lookupCars,
  seriesLabel,
  type TomicaCar,
} from '@/lib/tomica-data';
import { useCollection } from '@/lib/useCollection';
import { addCopy } from '@/lib/collection-actions';
import { itemQty } from '@/lib/db';
import CarThumb from '@/components/CarThumb';
import Segmented from '@/components/Segmented';
import { BackspaceIcon, CheckIcon, PlusIcon } from '@/components/icons';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'];

// Type the number on the box and see at once whether it's already in the garage
export default function QuickLookup() {
  const [series, setSeries] = useState<string>('regular');
  const [input, setInput] = useState('');
  const [justAdded, setJustAdded] = useState<string>();
  const { qtyByCar, scannedItems, imageByCar } = useCollection();

  const cars = useMemo(() => lookupCars(series, input), [series, input]);
  const n = /^\d+$/.test(input) ? parseInt(input, 10) : undefined;
  // Scanned cars that don't match a catalog entry still count for their number
  const scannedHere = useMemo(
    () =>
      scannedItems.filter(
        (s) =>
          (s.series || 'regular') === series &&
          (n !== undefined ? s.tomicaNumber === n && !s.code : s.code?.toUpperCase() === input.toUpperCase())
      ),
    [scannedItems, series, n, input]
  );

  const current = cars.find((c) => !c.retired);
  const currentQty = current ? qtyByCar.get(current.id) ?? 0 : 0;
  const ownedOlder = cars.filter((c) => c.retired && qtyByCar.has(c.id)).length + scannedHere.length;

  const press = (key: string) => {
    setJustAdded(undefined);
    if (key === 'CLEAR') setInput('');
    else if (key === 'BACK') setInput((v) => v.slice(0, -1));
    else setInput((v) => (v + key).slice(0, 6));
  };

  const add = async (car: TomicaCar) => {
    await addCopy(car);
    setJustAdded(car.id);
  };

  const seriesOptions = CATALOG_SERIES.map((s) => ({ key: s as string, label: seriesLabel(s) }));
  const placeholder =
    series === 'dream'
      ? '編號或代號，例如 151、SP、RD-01'
      : series === 'disney'
        ? '盒子上的編號，例如 2 或 DM-02'
        : series === 'asia'
          ? '盒子上的編號，例如 6 或 AO-06'
          : '盒子上的編號，例如 46';

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-sm text-muted">
          在店裡看到想買的車？輸入盒子上的編號，馬上知道車庫裡有沒有（含歷代舊款）。
        </p>
        <Segmented scroll label="系列" options={seriesOptions} value={series} onChange={setSeries} />

        {/* Keypad display styled like the box number tab */}
        <div className="flex items-center gap-3 on-red rounded-2xl rounded-tl-none bg-[#e50012] px-4 py-2 text-white shadow-[0_2px_6px_var(--shadow-strong)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
          <span className="shrink-0 text-xs font-semibold opacity-90">
            {series === 'regular' ? 'No.' : seriesLabel(series)}
          </span>
          <input
            value={input}
            onChange={(e) => {
              setJustAdded(undefined);
              setInput(e.target.value.toUpperCase().slice(0, 8));
            }}
            inputMode="numeric"
            aria-label="盒子上的編號"
            placeholder="—"
            className="font-display tnum min-w-0 flex-1 bg-transparent text-[64px] font-black italic leading-[1.05] tracking-tight text-white placeholder:text-white/40 focus:outline-none"
            style={{ fontVariationSettings: '"wdth" 62' }}
          />
        </div>
        <p className="text-[13px] text-muted">{placeholder}</p>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              aria-label={k === 'CLEAR' ? '清空' : k === 'BACK' ? '刪除一位' : k}
              className={`press flex h-14 items-center justify-center rounded-[10px] border border-line ${
                k === 'CLEAR' || k === 'BACK' ? 'bg-transparent text-sm text-muted' : 'bg-surface text-2xl font-medium'
              }`}
            >
              {k === 'CLEAR' ? '清空' : k === 'BACK' ? <BackspaceIcon size={22} /> : <span className="tnum">{k}</span>}
            </button>
          ))}
        </div>
      </section>

      {input && (
        <section aria-live="polite">
          {cars.length === 0 && scannedHere.length === 0 ? (
            <p className="py-4 text-sm text-muted">
              圖鑑裡找不到 {seriesLabel(series)} {input}。可以改用拍照辨識加入。
            </p>
          ) : (
            <>
              {current && (
                <div
                  className={`rounded-2xl p-4 ${
                    currentQty > 0 ? 'bg-[#e50012] text-white' : 'border-2 border-ink/80 bg-surface'
                  }`}
                >
                  <p className="flex items-center gap-2 text-xl font-medium">
                    {currentQty > 0 && <CheckIcon size={22} />}
                    {currentQty > 0 ? `已經有了（${currentQty} 台）` : '車庫裡還沒有'}
                  </p>
                  <p className={`mt-0.5 text-sm ${currentQty > 0 ? 'text-white/85' : 'text-muted'}`}>
                    現行的 {seriesLabel(series)} {displayCode(current.code, current.number)} 是「{current.name_ja}」
                  </p>
                </div>
              )}
              {!current && ownedOlder > 0 && (
                <div className="rounded-2xl bg-[#ffc400] p-4 text-[#24272c]">
                  <p className="text-xl font-medium">這個編號你有 {ownedOlder} 台舊款</p>
                </div>
              )}
              <ul className="mt-2 divide-y divide-line">
                {cars.map((car) => {
                  const qty = qtyByCar.get(car.id) ?? 0;
                  return (
                    <li key={car.id} className="flex items-center gap-3 py-3">
                      <Link href={`/catalog/${car.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <CarThumb
                          src={car.image ?? imageByCar.get(car.id)}
                          series={car.series}
                          number={car.number}
                          code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium">
                            {car.retired && (
                              <span className="mr-1.5 rounded bg-[color-mix(in_srgb,var(--line)_80%,transparent)] px-1.5 py-0.5 align-middle text-xs font-normal text-muted">
                                舊款
                              </span>
                            )}
                            {car.name_ja}
                          </p>
                          <p className="tnum text-[13px] text-muted">{car.period ?? car.manufacturer}</p>
                        </div>
                      </Link>
                      <span
                        className={`shrink-0 text-sm ${qty > 0 ? 'font-medium text-brand-text' : 'text-muted'}`}
                      >
                        {qty > 0 ? `有 ${qty} 台` : '沒有'}
                      </span>
                      <button
                        onClick={() => add(car)}
                        aria-label={`加入 1 台：${car.name_ja}`}
                        className="press flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-[10px] border border-ink/25 px-3 text-sm font-medium"
                      >
                        {justAdded === car.id ? (
                          <>
                            <CheckIcon size={14} className="stamp-in" />
                            已加
                          </>
                        ) : (
                          <>
                            <PlusIcon size={14} />1
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
                {scannedHere.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{item.name}</p>
                      <p className="text-[13px] text-muted">掃描加入</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-brand-text">
                      有 {itemQty(item)} 台
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
