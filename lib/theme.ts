// Series accents shared by badges, filter pills and card headers
export interface SeriesStyle {
  dot: string;
  badge: string;
  pillActive: string;
}

const SERIES_STYLES: Record<string, SeriesStyle> = {
  regular: {
    dot: 'bg-red-600',
    badge: 'bg-red-600 text-white',
    pillActive: 'bg-red-600 text-white',
  },
  premium: {
    dot: 'bg-amber-500',
    badge: 'bg-slate-900 text-amber-300 border border-amber-400',
    pillActive: 'bg-slate-900 text-amber-300',
  },
  unlimited: {
    dot: 'bg-slate-500',
    badge: 'bg-slate-600 text-white',
    pillActive: 'bg-slate-700 text-white',
  },
  dream: {
    dot: 'bg-indigo-600',
    badge: 'bg-gradient-to-br from-blue-600 to-violet-600 text-white',
    pillActive: 'bg-indigo-600 text-white',
  },
};

const FALLBACK: SeriesStyle = {
  dot: 'bg-emerald-600',
  badge: 'bg-emerald-600 text-white',
  pillActive: 'bg-emerald-600 text-white',
};

export function seriesStyle(series?: string): SeriesStyle {
  return SERIES_STYLES[series || 'regular'] || FALLBACK;
}
