'use client';

import Link from 'next/link';
import { genLabel, displayCode, type TomicaCar } from '@/lib/tomica-data';
import CarThumb from '@/components/CarThumb';
import { NumberTab, OwnedStamp, WishStamp } from '@/components/CardParts';

interface CarCardProps {
  car: TomicaCar;
  isWishlisted: boolean;
  collectedVariants?: string[];
  // Thumbnail found after scanning, used when the catalog has no image
  fallbackImage?: string;
  // Copies owned across variants
  qty?: number;
}

export default function CarCard({
  car,
  isWishlisted,
  collectedVariants = [],
  fallbackImage,
  qty = 0,
}: CarCardProps) {
  const isCollected = collectedVariants.length > 0;
  const variantCount = car.variants.length;
  const boxLabel =
    (car.retired && car.series === 'regular' ? genLabel(car) : undefined) ??
    displayCode(car.code, car.number);

  return (
    <Link
      href={`/catalog/${car.id}`}
      className="press block h-full rounded-2xl focus-visible:outline-offset-4"
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_1px_2px_var(--shadow)] ${
          isCollected ? 'border-[#e50012]/50' : 'border-line'
        }`}
      >
        <div className="relative">
          <CarThumb
            src={car.image ?? fallbackImage}
            series={car.series}
            number={car.number}
            code={boxLabel}
            size="card"
            hideTag
          />
          <div className="absolute left-0 top-0 z-[3]">
            <NumberTab series={car.series} label={boxLabel} />
          </div>
          {(isCollected || isWishlisted) && (
            <div className="absolute bottom-2 right-2 z-[3]">
              {isCollected ? <OwnedStamp qty={qty} /> : <WishStamp />}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
            {car.retired && (
              <span className="mr-1.5 rounded bg-[color-mix(in_srgb,var(--line)_80%,transparent)] px-1.5 py-0.5 align-middle text-[11px] font-normal text-muted">
                舊款
              </span>
            )}
            {car.name_ja}
          </h3>
          <div className="tnum mt-auto space-y-0.5 pt-2 text-[13px] text-muted">
            <p className="truncate">{car.manufacturer}</p>
            {(car.period || variantCount > 1) && (
              <p className="flex flex-wrap gap-x-3">
                {car.period && <span>{car.period}</span>}
                {variantCount > 1 && (
                  <span>
                    {collectedVariants.length}/{variantCount} 版本
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
