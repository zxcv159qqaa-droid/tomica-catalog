'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, isNavActive } from '@/components/nav-items';

// Phone-only floating dock; wider screens use the tabs in AppHeader
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主選單"
      className="on-ink md:hidden fixed inset-x-3 z-40 mx-auto max-w-md"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex items-stretch justify-between gap-0.5 rounded-[22px] bg-[#1b1d22]/90 p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-xl">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                  active ? 'bg-[#e50012] text-white' : 'text-[#aeb4be] hover:text-white'
                }`}
              >
                <item.Icon size={22} />
                <span className="text-[11px] font-medium leading-none">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
