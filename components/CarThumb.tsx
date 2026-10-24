'use client';

import { useState } from 'react';
import { displayCode, seriesLabel } from '@/lib/tomica-data';

interface CarThumbProps {
  src?: string;
  series?: string;
  number: number;
  code?: string;
  size?: 'sm' | 'lg';
}

export default function CarThumb({ src, series = 'regular', number, code, size = 'sm' }: CarThumbProps) {
  const [failed, setFailed] = useState(false);
  const box = size === 'lg' ? 'w-28 h-20' : 'w-20 h-14';
  const label = displayCode(code, number);
  const tag = `${series === 'regular' ? '' : seriesLabel(series) + ' '}${label}`;

  if (!src || failed) {
    return (
      <div className={`${box} shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center`}>
        {series !== 'regular' && (
          <span className="text-[9px] leading-none text-gray-500 dark:text-gray-400">
            {seriesLabel(series)}
          </span>
        )}
        <span className={`${label.length > 3 ? 'text-sm' : 'text-lg'} font-bold text-gray-600 dark:text-gray-300 leading-tight`}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className={`${box} shrink-0 relative rounded-lg overflow-hidden bg-white border border-gray-100 dark:border-gray-700`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />
      <span className="absolute bottom-0 left-0 px-1 text-[10px] font-bold leading-tight text-white bg-black/60 rounded-tr">
        {tag}
      </span>
    </div>
  );
}
