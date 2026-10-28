'use client';

import Link from 'next/link';
import type { CollectionItem } from '@/lib/db';
import { carId, displayCode } from '@/lib/tomica-data';
import CarThumb from '@/components/CarThumb';
import { NumberTab, OwnedStamp } from '@/components/CardParts';

export default function ScannedCard({ item }: { item: CollectionItem }) {
  const series = item.series || 'regular';
  const label = displayCode(item.code, item.tomicaNumber);
  return (
    <Link
      href={`/catalog/${carId(series, item.tomicaNumber)}`}
      className="press block h-full rounded-2xl focus-visible:outline-offset-4"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e50012]/50 bg-surface shadow-[0_1px_2px_var(--shadow)]">
        <div className="relative">
          <CarThumb
            src={item.thumb}
            series={item.series}
            number={item.tomicaNumber}
            code={item.code}
            size="card"
            hideTag
          />
          <div className="absolute left-0 top-0 z-[3]">
            <NumberTab series={series} label={label} />
          </div>
          <div className="absolute bottom-2 right-2 z-[3]">
            <OwnedStamp />
          </div>
        </div>
        <div className="p-3.5">
          <p className="line-clamp-2 text-[15px] font-medium leading-snug">{item.name}</p>
          <p className="mt-2 truncate text-[13px] text-muted">
            {item.variantName ? `${item.variantName}　` : ''}掃描加入
          </p>
        </div>
      </div>
    </Link>
  );
}
