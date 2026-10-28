import { CheckIcon, HeartIcon } from '@/components/icons';

const SERIES_MARK: Record<string, string> = {
  premium: 'Premium',
  dream: 'Dream',
  unlimited: 'Unlimited',
  disney: 'Disney',
  asia: 'Asia',
};

// Split a box label into the tab's small marks and its big numeral:
// regular 120 -> "No." + 120; Premium 50 -> "Premium" + 50; DM-EX06 -> "Disney / DM" + EX06
export function tabParts(series: string | undefined, label: string) {
  const s = series || 'regular';
  const m = /^([A-Za-z]+)-(\w+)$/.exec(label);
  const prefix = m ? m[1].toUpperCase() : '';
  const value = m ? m[2] : label;
  const mark = s === 'regular' ? 'No.' : (SERIES_MARK[s] ?? s);
  return { marks: [mark, prefix].filter(Boolean), value };
}

// Red box tab: tiny series marks beside a huge condensed italic numeral. The app's one loud element.
export function NumberTab({
  series,
  label,
  large = false,
}: {
  series?: string;
  label: string;
  large?: boolean;
}) {
  const { marks, value } = tabParts(series, label);
  return (
    <span
      className={`num-tab ${large ? 'num-tab-lg' : ''}`}
      data-len={Math.min(value.length, 6)}
      title={label}
    >
      <span className="tab-marks" aria-hidden="true">
        {marks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </span>
      <b>{value}</b>
      <span className="sr-only">{`${marks.join(' ')} ${value}`}</span>
    </span>
  );
}

export function OwnedStamp({ qty = 0, animate = false }: { qty?: number; animate?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/95 py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-[#24272c] shadow-sm ${
        animate ? 'stamp-in' : ''
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e50012] text-white">
        <CheckIcon size={12} />
      </span>
      已收藏{qty > 1 ? ` ×${qty}` : ''}
    </span>
  );
}

export function WishStamp() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ffc400] px-2 py-0.5 text-[11px] font-semibold text-[#24272c] shadow-sm">
      <HeartIcon size={12} />
      想要
    </span>
  );
}
