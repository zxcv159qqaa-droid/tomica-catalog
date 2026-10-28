'use client';

import { useEffect, useState } from 'react';
import { findCatalogMatch, normalizeName, seriesLabel } from '@/lib/tomica-data';
import { useCollection } from '@/lib/useCollection';
import { ChevronDownIcon } from '@/components/icons';
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
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-full bg-[#ffc400] px-2.5 py-0.5 text-xs font-semibold text-[#24272c]">
            近期新車
          </span>
          <span className="text-sm font-medium">
            官網公布 {releases.length} 台新車，你還沒有 {missing} 台
          </span>
        </span>
        <ChevronDownIcon size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <ul className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
        {releases.map((r) => {
          const has = owned(r);
          return (
            <li key={`${r.page}-${r.series}-${r.number}`}>
              <a
                href={r.page}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex min-h-16 items-center gap-3 rounded-xl p-2 hover:bg-paper"
              >
                {r.image && (
                  <div className="stage h-14 w-20 shrink-0 rounded-[10px]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote official product image */}
                    <img
                      src={r.image}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.series === 'regular' ? `No.${r.number}` : `${seriesLabel(r.series)} ${r.number}`} {r.name}
                  </p>
                  <p className="truncate text-[13px] text-muted">{r.release}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    has
                      ? 'bg-[#e50012] text-white'
                      : 'border border-line text-muted'
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
