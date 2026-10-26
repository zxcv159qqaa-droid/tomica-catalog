'use client';

import Link from 'next/link';
import { genLabel, displayCode, seriesLabel, type TomicaCar } from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';
import CarThumb from '@/components/CarThumb';

interface CarCardProps {
  car: TomicaCar;
  isWishlisted: boolean;
  collectedVariants?: string[];
  // Thumbnail found after scanning, used when the catalog has no image
  fallbackImage?: string;
}

export default function CarCard({
  car,
  isWishlisted,
  collectedVariants = [],
  fallbackImage,
}: CarCardProps) {
  const isCollected = collectedVariants.length > 0;
  const variantCount = car.variants.length;
  const style = seriesStyle(car.series);
  const boxLabel =
    car.retired && car.series === 'regular' ? genLabel(car) : displayCode(car.code, car.number);

  return (
    <Link href={`/catalog/${car.id}`} className="block h-full">
      <div
        className={`card-hover relative h-full flex flex-col overflow-hidden rounded-2xl border shadow-sm ${
          isCollected
            ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-900'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="relative p-3 pb-0">
          <CarThumb
            src={car.image ?? fallbackImage}
            series={car.series}
            number={car.number}
            code={boxLabel}
            size="card"
            hideTag
          />
          <span
            className={`absolute top-5 left-5 text-[11px] font-black px-2 py-0.5 rounded-md ${style.badge}`}
          >
            {car.series === 'regular' ? 'No.' : `${seriesLabel(car.series)} `}
            {boxLabel}
          </span>
          {isCollected && (
            <span className="absolute top-5 right-5 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
              ✓ 已收藏
            </span>
          )}
          {isWishlisted && !isCollected && (
            <span className="absolute top-5 right-5 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
              ♥ 想要
            </span>
          )}
        </div>

        <div className="p-3.5 flex-1 flex flex-col">
          <h3 className="font-bold text-sm leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
            {car.retired && (
              <span className="mr-1 text-[10px] font-medium align-middle px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                舊款
              </span>
            )}
            {car.name_ja}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-auto pt-2 text-xs text-slate-400 dark:text-slate-500">
            <span>{car.manufacturer}</span>
            {car.period && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>{car.period}</span>
              </>
            )}
            {variantCount > 1 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>
                  {collectedVariants.length}/{variantCount} 版本
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
