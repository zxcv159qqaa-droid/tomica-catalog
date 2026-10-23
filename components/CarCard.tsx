'use client';

import Link from 'next/link';
import type { TomicaCar } from '@/lib/tomica-data';

interface CarCardProps {
  car: TomicaCar;
  isCollected: boolean;
  isWishlisted: boolean;
  collectedVariants?: string[];
}

export default function CarCard({
  car,
  isCollected,
  isWishlisted,
  collectedVariants = [],
}: CarCardProps) {
  const variantCount = car.variants.length;
  const collectedCount = collectedVariants.length;

  return (
    <Link href={`/catalog/${car.number}`}>
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

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
              {car.number}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {car.name_ja}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {car.name_en}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {car.manufacturer}
              </span>
              <span className="text-xs text-gray-300 dark:text-gray-600">
                |
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {car.scale}
              </span>
              {variantCount > 1 && (
                <>
                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    |
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {collectedCount}/{variantCount} 版本
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
