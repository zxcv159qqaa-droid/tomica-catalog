'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { getCurrentCars } from '@/lib/tomica-data';
import { useCollection } from '@/lib/useCollection';
import { navItems, isNavActive } from '@/components/nav-items';

export default function AppHeader() {
  const pathname = usePathname();
  const { collectedByCar, ownedCount } = useCollection();
  const currentCars = useMemo(() => getCurrentCars(), []);
  const collectedCurrent = currentCars.filter((c) => collectedByCar.has(c.id)).length;
  const rate = Math.round((collectedCurrent / currentCars.length) * 100);

  return (
    <header className="tomica-red text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-inner shrink-0">
            <span className="text-[#e60012] font-black text-xl tracking-tighter">T</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg sm:text-xl tracking-tight leading-none">
                TOMICA GARAGE
              </h1>
              <span className="hidden sm:inline text-[11px] font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                收藏圖鑑管家
              </span>
            </div>
            <p className="text-xs text-red-100 mt-0.5 truncate">
              常規 ・ Premium ・ Unlimited ・ Dream 完整收錄
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-4 bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-xs border border-white/15">
            <div>
              <span className="text-red-100">現行車款</span>
              <span className="font-extrabold text-white text-sm ml-1">{collectedCurrent}</span>
              <span className="text-red-200"> / {currentCars.length}</span>
            </div>
            <div className="h-3.5 w-px bg-white/20" />
            <div>
              <span className="text-red-100">總收藏</span>
              <span className="font-extrabold text-amber-300 text-sm ml-1">{ownedCount}</span>
              <span className="text-red-200"> 台</span>
            </div>
            <div className="h-3.5 w-px bg-white/20 hidden md:block" />
            <div className="hidden md:block">
              <span className="text-red-100">達成率</span>
              <span className="font-extrabold text-emerald-300 text-sm ml-1">{rate}%</span>
            </div>
          </div>

          <Link
            href="/scan"
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md transition active:scale-95"
          >
            <span>📷</span>
            <span>掃描</span>
          </Link>
        </div>
      </div>

      <div className="hidden md:block bg-black/15 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition ${
                  active
                    ? 'border-white text-white font-bold'
                    : 'border-transparent text-red-100 hover:text-white font-medium'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
