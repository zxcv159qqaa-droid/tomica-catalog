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
import { seriesStyle } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { addCopy } from '@/lib/collection-actions';
import { itemQty } from '@/lib/db';
import CarThumb from '@/components/CarThumb';

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

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <p className="text-xs text-slate-500">
          在店裡看到想買的車？輸入盒子上的編號，馬上知道車庫裡有沒有（含歷代舊款）。
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATALOG_SERIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeries(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                series === s
                  ? seriesStyle(s).pillActive
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {seriesLabel(s)}
            </button>
          ))}
        </div>
        <input
          value={input}
          onChange={(e) => {
            setJustAdded(undefined);
            setInput(e.target.value.toUpperCase().slice(0, 8));
          }}
          inputMode="numeric"
          placeholder={series === 'dream' ? '編號或代號，例如 151、SP、RD-01' : '盒子上的編號，例如 46'}
          className="w-full px-4 py-3 text-xl font-black tracking-wide bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-red-600 focus:bg-white"
        />
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={`py-3 rounded-xl font-bold transition active:scale-95 ${
                k === 'CLEAR'
                  ? 'bg-rose-50 text-rose-600 text-xs dark:bg-rose-950'
                  : k === 'BACK'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-lg'
              }`}
            >
              {k === 'CLEAR' ? '清空' : k === 'BACK' ? '⌫' : k}
            </button>
          ))}
        </div>
      </div>

      {input && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {cars.length === 0 && scannedHere.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              圖鑑裡找不到 {seriesLabel(series)} {input}。可以改用拍照辨識加入。
            </p>
          ) : (
            <>
              {current && (
                <div
                  className={`p-4 text-white ${currentQty > 0 ? 'bg-emerald-600' : 'tomica-red'}`}
                >
                  <p className="text-lg font-black">
                    {currentQty > 0 ? `✓ 已經有了（${currentQty} 台）` : '✗ 車庫裡還沒有'}
                  </p>
                  <p className="text-xs opacity-90">
                    現行的 {seriesLabel(series)} {displayCode(current.code, current.number)} 是「{current.name_ja}」
                  </p>
                </div>
              )}
              {!current && ownedOlder > 0 && (
                <div className="p-4 bg-amber-500 text-white">
                  <p className="text-lg font-black">這個編號你有 {ownedOlder} 台舊款</p>
                </div>
              )}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {cars.map((car) => {
                  const qty = qtyByCar.get(car.id) ?? 0;
                  return (
                    <li key={car.id} className="flex items-center gap-3 p-3">
                      <Link href={`/catalog/${car.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <CarThumb
                          src={car.image ?? imageByCar.get(car.id)}
                          series={car.series}
                          number={car.number}
                          code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">
                            {car.retired && (
                              <span className="mr-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                舊款
                              </span>
                            )}
                            {car.name_ja}
                          </p>
                          <p className="text-xs text-slate-400">{car.period ?? car.manufacturer}</p>
                        </div>
                      </Link>
                      {qty > 0 ? (
                        <span className="text-xs font-bold text-emerald-600 shrink-0">有 {qty} 台</span>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">沒有</span>
                      )}
                      <button
                        onClick={() => add(car)}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white active:scale-95"
                      >
                        {justAdded === car.id ? '✓ 已加' : '+1'}
                      </button>
                    </li>
                  );
                })}
                {scannedHere.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3">
                    <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">掃描加入</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">有 {itemQty(item)} 台</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
