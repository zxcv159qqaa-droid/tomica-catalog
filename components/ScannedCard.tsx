'use client';

import Link from 'next/link';
import type { CollectionItem } from '@/lib/db';
import { carId } from '@/lib/tomica-data';
import CarThumb from '@/components/CarThumb';

export default function ScannedCard({ item }: { item: CollectionItem }) {
  return (
    <Link
      href={`/catalog/${carId(item.series || 'regular', item.tomicaNumber)}`}
      className="relative flex items-center gap-3 p-4 rounded-xl border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
    >
      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
        已收藏
      </div>
      <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} />
      <div className="min-w-0 flex-1 pr-14">
        <p className="font-semibold text-sm line-clamp-2">{item.name}</p>
        <p className="text-xs text-gray-500 truncate mt-1">
          {item.variantName ? `${item.variantName}・` : ''}掃描加入
        </p>
      </div>
    </Link>
  );
}
