'use client';

import { useState } from 'react';
import { displayCode, seriesLabel } from '@/lib/tomica-data';
import { CarIcon } from '@/components/icons';

interface CarThumbProps {
  src?: string;
  series?: string;
  number: number;
  code?: string;
  size?: 'sm' | 'lg' | 'card' | 'hero';
  hideTag?: boolean;
}

const FLUSH = { sm: '', lg: '', card: 'rounded-none border-0', hero: 'rounded-none border-0' };
const BOX = { sm: 'w-20 h-14', lg: 'w-28 h-20', card: 'w-full aspect-[4/3]', hero: 'w-full aspect-[16/10]' };
const ICON = { sm: 34, lg: 56, card: 96, hero: 150 };

export default function CarThumb({ src, series = 'regular', number, code, size = 'sm', hideTag = false }: CarThumbProps) {
  const [failed, setFailed] = useState(false);
  const box = BOX[size];
  const label = displayCode(code, number);
  const tag = `${series === 'regular' ? '' : seriesLabel(series) + ' '}${label}`;

  if (!src || failed) {
    // No photo yet: a quiet car silhouette on the stage; small sizes keep the code visible
    return (
      <div
        className={`${box} stage tnum shrink-0 ${FLUSH[size] || 'rounded-[10px]'} flex flex-col items-center justify-center text-[#9aa1ab]`}
      >
        <CarIcon size={ICON[size]} className="relative z-[1] opacity-80" strokeWidth={1.25} />
        {size === 'sm' && (
          <span className="relative z-[1] -mt-0.5 text-[11px] font-semibold leading-none text-[#6a707a]">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${box} stage shrink-0 ${FLUSH[size] || 'rounded-[10px] border border-black/5'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
      {!hideTag && (
        <span className="tnum absolute bottom-0 left-0 z-[2] rounded-tr bg-black/60 px-1 text-[11px] font-semibold leading-tight text-white">
          {tag}
        </span>
      )}
    </div>
  );
}
