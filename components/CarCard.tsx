'use client';

import Link from 'next/link';
import type { TomicaCar } from '@/lib/tomica-data';
import CarThumb from '@/components/CarThumb';

interface CarCardProps {
  car: TomicaCar;
  isWishlisted: boolean;
  collectedVariants?: string[];
}

export default function CarCard({
  car,
  isWishlisted,
  collectedVariants = [],
}: CarCardProps) {
  const isCollected = collectedVariants.length > 0;
  const variantCount = car.variants.length;

  return (
    <Link href={`/catalog/${car.id}`}>
      <div
        className={`relative rounded-xl p-4 border transition-all hover:shadow-md ${
          isCollected
            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        {isCollected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            已收藏
          </div>
        )}
        {isWishlisted && !isCollected && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
            想要
          </div>
        )}

        <div className="flex items-center gap-3">
          <CarThumb src={car.image} series={car.series} number={car.number} />

          <div className="flex-1 min-w-0 pr-14">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
              {car.name_ja}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>{car.manufacturer}</span>
              {variantCount > 1 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>
                    {collectedVariants.length}/{variantCount} 版本
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
