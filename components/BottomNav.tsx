'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, isNavActive } from '@/components/nav-items';

// Phone-only tab bar; wider screens use the tabs in AppHeader
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? 'text-red-600 font-bold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
