'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { getCurrentCars } from '@/lib/tomica-data';
import { useCollection } from '@/lib/useCollection';
import { navItems, isNavActive } from '@/components/nav-items';
import { ScanIcon } from '@/components/icons';

export default function AppHeader() {
  const pathname = usePathname();
  const { collectedByCar, ownedCount } = useCollection();
  const currentCars = useMemo(() => getCurrentCars(), []);
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;
  const rate = Math.round((collectedCurrent / currentCars.length) * 100);

  return (
    <header className="tomica-red on-red sticky top-0 z-30 text-white shadow-[0_6px_20px_-8px_rgba(20,24,32,0.45)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center"
          aria-label="TOMICA GARAGE 首頁"
        >
          <span className="font-display truncate text-[24px] font-bold italic leading-none sm:text-[28px]">
            TOMICA GARAGE
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <div className="tnum hidden items-center gap-4 text-sm sm:flex">
            <div>
              <span className="text-white/90">現行車款</span>
              <span className="ml-1.5 font-semibold text-white">{collectedCurrent}</span>
              <span className="text-white/90"> / {currentCars.length}</span>
            </div>
            <div className="h-3.5 w-px bg-white/30" />
            <div>
              <span className="text-white/90">總收藏</span>
              <span className="ml-1.5 font-semibold text-white">{ownedCount}</span>
              <span className="text-white/90"> 台</span>
            </div>
            <div className="hidden h-3.5 w-px bg-white/30 md:block" />
            <div className="hidden md:block">
              <span className="text-white/90">達成率</span>
              <span className="ml-1.5 font-semibold text-white">{rate}%</span>
            </div>
          </div>

          <Link
            href="/scan"
            className="press flex h-11 items-center gap-1.5 rounded-[10px] bg-[#ffc400] px-4 text-sm font-semibold text-[#24272c] hover:bg-[#ffd12e]"
          >
            <ScanIcon size={18} />
            <span>掃描</span>
          </Link>
        </div>
      </div>

      <div className="box-stripe" aria-hidden="true" />

      <div className="hidden bg-[#1b1d22] md:block">
        <nav aria-label="主選單" className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm transition-colors ${
                  active
                    ? 'border-[#e50012] font-medium text-white'
                    : 'border-transparent text-[#aeb4be] hover:text-white'
                }`}
              >
                <item.Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
