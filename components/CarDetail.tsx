'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getCar,
  getCarById,
  getCarByVariantId,
  genLabel,
  getCodeGenerations,
  getGenerations,
  parseCarId,
  seriesLabel,
} from '@/lib/tomica-data';
import { db, itemQty } from '@/lib/db';
import { addCopy } from '@/lib/collection-actions';
import CarThumb from '@/components/CarThumb';
import CopyEditor from '@/components/CopyEditor';
import ThumbFinder from '@/components/ThumbFinder';
import { NumberTab, OwnedStamp } from '@/components/CardParts';
import { ArrowLeftIcon, CarIcon, CheckIcon, HeartIcon, WarningIcon } from '@/components/icons';
import { sharedThumbUrl, useSharedThumbVersions } from '@/lib/thumbs';

export default function CarDetail({ carKey }: { carKey: string }) {
  const router = useRouter();
  // Set when the user adds a copy here, so the owned stamp plays its "stamp" only for that action
  const [justAdded, setJustAdded] = useState(false);
  const parsed = parseCarId(carKey);
  const car = getCarById(carKey) ?? getCar(parsed.series, parsed.number);
  const series = car?.series ?? parsed.series;
  const number = car?.number ?? parsed.number;
  const label = `${series === 'regular' ? '' : seriesLabel(series) + ' '}${car?.code ?? `No.${number}`}`;
  // Disney Motors reuses its DM-xx codes for new cars, so coded cars list their code's history too
  const generations = !car
    ? []
    : car.code
      ? series === 'disney' || series === 'asia'
        ? getCodeGenerations(series, car.code)
        : []
      : getGenerations(series, number);

  const data = useLiveQuery(async () => {
    const items = await db.collection.where('tomicaNumber').equals(number).toArray();
    const wish = car ? await db.wishlist.where('variantId').equals(car.id).count() : 0;
    const found = car && !car.image ? (await db.carImages.get(car.id))?.src : undefined;
    return { items, isWishlisted: wish > 0, foundImage: found };
  }, [car, number]);

  const items = data?.items ?? [];
  const isWishlisted = data?.isWishlisted ?? false;
  const shared = useSharedThumbVersions();
  const sharedVersion = car && !car.image ? shared[car.id] : undefined;
  const foundImage =
    data?.foundImage ?? (sharedVersion ? sharedThumbUrl(car!.id, sharedVersion) : undefined);
  const ownedCarIds = new Set(
    items
      .filter((i) => !i.name)
      .map((i) => getCarByVariantId(i.variantId)?.id)
      .filter(Boolean) as string[]
  );
  const itemByVariant = new Map(items.filter((i) => !i.name).map((i) => [i.variantId, i]));
  const ownsThisCar = !!car?.variants.some((v) => itemByVariant.has(v.id));
  // SP/RD cars don't own a unique number, so scanned cars can't be tied to them
  const scanned =
    car?.code || car?.retired
      ? []
      : items.filter((i) => i.name && (i.series || 'regular') === series);

  const backButton = (
    <button
      onClick={() => router.back()}
      className="press -ml-2 mb-2 flex h-11 items-center gap-1.5 rounded-[10px] px-2 text-sm text-muted hover:text-ink"
    >
      <ArrowLeftIcon size={18} />
      返回
    </button>
  );

  const scannedSection = scanned.length > 0 && (
    <section className="mb-6">
      <h2 className="mb-1 text-base font-medium">已收藏的 {label}</h2>
      <ul className="divide-y divide-line border-y border-line">
        {scanned.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <CarThumb src={item.thumb} series={item.series} number={item.tomicaNumber} code={item.code} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              {item.variantName && <p className="mt-0.5 text-[13px] text-muted">{item.variantName}</p>}
            </div>
            <CopyEditor item={item} onAdd={() => {}} />
          </li>
        ))}
      </ul>
    </section>
  );

  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">{backButton}</div>;
  }

  if (!car) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
        {backButton}
        {scannedSection || (
          <div className="flex flex-col items-center py-12 text-center">
            <CarIcon size={110} strokeWidth={1} className="text-muted/60" />
            <p className="mt-3">圖鑑中沒有 {label} 的資料</p>
          </div>
        )}
      </div>
    );
  }

  const toggleWishlist = async () => {
    if (isWishlisted) {
      await db.wishlist.where('variantId').equals(car.id).delete();
    } else {
      await db.wishlist.add({
        tomicaNumber: car.number,
        variantId: car.id,
        addedAt: new Date(),
      });
    }
  };

  const tabLabel = (car.retired && car.series === 'regular' ? genLabel(car) : undefined) ?? car.code ?? String(car.number);
  const totalQty = car.variants.reduce((n, v) => {
    const it = itemByVariant.get(v.id);
    return n + (it ? itemQty(it) : 0);
  }, 0);
  const seriesName = car.series === 'regular' ? '常規系列' : `Tomica ${seriesLabel(car.series)}`;
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: car.series === 'dream' ? '主題' : car.series === 'disney' ? '角色' : '製造商', v: car.manufacturer },
    { k: '系列', v: `${seriesName}${genLabel(car) ? `（${genLabel(car)}）` : ''}` },
  ];
  if (car.period) {
    rows.push({
      k: '販售期間',
      v: (
        <>
          {car.period}
          {car.retired && <span className="ml-2 text-[13px] text-muted">（已停售）</span>}
        </>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
      {backButton}

      {scannedSection}

      <Collapsible
        collapsed={scanned.length > 0}
        summary={
          <>
            <WarningIcon size={16} className="mr-1.5 inline -mt-0.5" />
            編號已輪替：官網目前的 {label} 是另一台車「{car.name_ja}」，跟你收藏的不同。
            <span className="ml-1 underline">查看</span>
          </>
        }
      >
        <article>
          {/* Hero stage with the box number tab */}
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <CarThumb
              src={car.image ?? foundImage}
              series={car.series}
              number={car.number}
              code={tabLabel}
              size="hero"
              hideTag
            />
            <div className="absolute left-0 top-0 z-[3]">
              <NumberTab series={car.series} label={tabLabel} large />
            </div>
            <button
              onClick={toggleWishlist}
              aria-pressed={isWishlisted}
              aria-label="想要清單"
              className={`press absolute right-2 top-2 z-[3] flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm ${
                isWishlisted ? 'text-[#e50012]' : 'text-[#6a707a]'
              }`}
            >
              <HeartIcon size={22} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            {ownsThisCar && (
              <div className="absolute bottom-3 right-3 z-[3]">
                <OwnedStamp qty={totalQty} animate={justAdded} />
              </div>
            )}
          </div>

          <header className="mt-4">
            {car.retired && (
              <span className="mr-1.5 rounded bg-[color-mix(in_srgb,var(--line)_80%,transparent)] px-1.5 py-0.5 align-middle text-xs text-muted">
                舊款
              </span>
            )}
            <h1 className="inline text-2xl font-medium leading-snug">{car.name_ja}</h1>
            {car.name_en && <p className="mt-0.5 text-sm text-muted">{car.name_en}</p>}
          </header>

          {!car.image && (
            <div className="mt-4">
              <ThumbFinder car={car} hasImage={!!foundImage} />
            </div>
          )}

          <dl className="tnum mt-4 divide-y divide-line border-y border-line text-[15px]">
            {rows.map((r) => (
              <div key={r.k} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="shrink-0 text-sm text-muted">{r.k}</dt>
                <dd className="text-right">{r.v}</dd>
              </div>
            ))}
          </dl>
          {car.note && <p className="mt-2 text-[13px] text-muted">{car.note}</p>}

          <section className="mt-8">
            <h2 className="mb-1 text-base font-medium">版本一覽（{car.variants.length}）</h2>
            <ul className="divide-y divide-line border-y border-line">
              {car.variants.map((variant) => {
                const owned = itemByVariant.get(variant.id);
                const meta = [variant.color, variant.release_year].filter(Boolean);
                return (
                  <li
                    key={variant.id}
                    className={`flex flex-wrap items-center justify-between gap-x-3 py-3 pl-3 ${
                      owned ? 'border-l-[3px] border-l-[#e50012]' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-medium">{variant.name}</p>
                        {variant.is_first_edition && (
                          <span className="rounded bg-[#ffc400] px-1.5 py-0.5 text-xs font-medium text-[#24272c]">
                            初回
                          </span>
                        )}
                      </div>
                      {meta.length > 0 && (
                        <p className="tnum mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
                          {meta.map((m, i) => (
                            <span key={i}>{m}</span>
                          ))}
                        </p>
                      )}
                    </div>
                    {owned && (
                      <span className="flex items-center gap-1 text-sm font-medium text-brand-text">
                        <CheckIcon size={14} />
                        已收藏
                      </span>
                    )}
                    <CopyEditor
                      item={owned}
                      onAdd={() => {
                        setJustAdded(true);
                        return addCopy(car, variant.id);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </Collapsible>

      {generations.length > 1 && (
        <section className="mb-4 mt-8">
          <h2 className="mb-1 text-base font-medium">歷代 {label}（{generations.length}）</h2>
          <p className="mb-2 text-[13px] text-muted">
            同一個編號以前出過的車，由新到舊。資料來源：
            {series === 'premium'
              ? 'トミカの森 プレミアム館'
              : series === 'disney'
                ? 'タカラトミー ディズニーモータース公式'
                : series === 'asia'
                  ? 'Takara Tomy Asia 官網'
                  : 'ピクシブ百科事典、こつめBLOG'}
            。
          </p>
          <ul className="divide-y divide-line border-y border-line">
            {generations.map((g) => {
              const owned = ownedCarIds.has(g.id) || (g.id === car.id && ownsThisCar);
              return (
                <li key={g.id}>
                  <Link
                    href={`/catalog/${g.id}`}
                    aria-current={g.id === car.id ? 'page' : undefined}
                    className={`press flex min-h-14 items-center gap-3 py-2 pl-3 ${
                      g.id === car.id
                        ? 'border-l-[3px] border-l-ink'
                        : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <span className="tnum w-14 shrink-0 text-sm font-medium text-muted">
                      {genLabel(g) ?? g.code ?? `No.${number}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{g.name_ja}</p>
                      <p className="tnum text-[13px] text-muted">
                        {g.retired ? g.period || '已停售' : `現行${g.period ? `　${g.period}` : ''}`}
                      </p>
                    </div>
                    {owned && (
                      <span className="flex shrink-0 items-center gap-1 text-sm text-brand-text">
                        <CheckIcon size={14} />
                        已收藏
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Collapsible({
  collapsed,
  summary,
  children,
}: {
  collapsed: boolean;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <details className="group">
      <summary className="mb-3 min-h-11 cursor-pointer list-none rounded-[10px] bg-[#ffc400]/25 p-3 text-sm text-ink">
        {summary}
      </summary>
      {children}
    </details>
  );
}
