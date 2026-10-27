'use client';

import { useEffect, useState } from 'react';
import { findCatalogMatch, normalizeName, seriesLabel } from '@/lib/tomica-data';
import { useCollection } from '@/lib/useCollection';
import type { NewRelease } from '@/app/api/new-releases/route';

// Upcoming official releases with whether the garage already has each one
export default function NewReleases() {
  const [releases, setReleases] = useState<NewRelease[] | null>(null);
  const { qtyByCar, scannedItems } = useCollection();

  useEffect(() => {
    fetch('/api/new-releases')
      .then((r) => (r.ok ? r.json() : { releases: [] }))
      .then((d) => setReleases(d.releases ?? []))
      .catch(() => setReleases([]));
  }, []);

  if (!releases?.length) return null;

  const owned = (r: NewRelease) => {
    const { match } = findCatalogMatch(r.series, r.number, undefined, r.name);
    if (match && qtyByCar.has(match.id)) return true;
    const n = normalizeName(r.name);
    return scannedItems.some(
      (s) =>
        (s.series || 'regular') === r.series &&
        s.tomicaNumber === r.number &&
        (normalizeName(s.name).includes(n) || n.includes(normalizeName(s.name)))
    );
  };
  const missing = releases.filter((r) => !owned(r)).length;

  return (
    <details className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <summary className="list-none cursor-pointer p-4 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
            近期新車
          </span>
          <p className="font-bold mt-1.5">
            官網公布 {releases.length} 台新車，你還沒有 {missing} 台
          </p>
        </div>
        <span className="text-slate-400 group-open:rotate-180 transition">▾</span>
      </summary>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 pb-4">
        {releases.map((r) => {
          const has = owned(r);
          return (
            <li key={`${r.page}-${r.series}-${r.number}`}>
              <a
                href={r.page}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote official product image
                  <img
                    src={r.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-20 h-14 object-contain rounded-lg bg-white shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">
                    {r.series === 'regular' ? `No.${r.number}` : `${seriesLabel(r.series)} ${r.number}`} {r.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{r.release}</p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {has ? '已有' : '還沒有'}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
