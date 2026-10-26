'use client';

import Link from 'next/link';
import type { CollectionItem } from '@/lib/db';
import { carId, displayCode, seriesLabel } from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';
import CarThumb from '@/components/CarThumb';

export default function ScannedCard({ item }: { item: CollectionItem }) {
  const series = item.series || 'regular';
  const label = displayCode(item.code, item.tomicaNumber);
  return (
    <Link
      href={`/catalog/${carId(series, item.tomicaNumber)}`}
      className="block h-full"
    >
      <div className="card-hover relative h-full flex flex-col overflow-hidden rounded-2xl border shadow-sm bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-900">
        <div className="relative p-3 pb-0">
          <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} size="card" hideTag />
          <span
            className={`absolute top-5 left-5 text-[11px] font-black px-2 py-0.5 rounded-md ${seriesStyle(series).badge}`}
          >
            {series === 'regular' ? 'No.' : `${seriesLabel(series)} `}
            {label}
          </span>
          <span className="absolute top-5 right-5 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            ✓ 已收藏
          </span>
        </div>
        <div className="p-3.5">
          <p className="font-bold text-sm leading-snug line-clamp-2">{item.name}</p>
          <p className="text-xs text-slate-400 truncate mt-2">
            {item.variantName ? `${item.variantName}・` : ''}掃描加入
          </p>
        </div>
      </div>
    </Link>
  );
}
