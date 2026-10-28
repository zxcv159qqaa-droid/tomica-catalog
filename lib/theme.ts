// Series accents shared by badges, filter pills and card headers.
// Muted, road-and-showroom tones; `accent` is the raw colour for bars and ticks.
export interface SeriesStyle {
  dot: string;
  pillActive: string;
  accent: string;
}

const SERIES_STYLES: Record<string, SeriesStyle> = {
  regular: {
    dot: 'bg-[#e50012]',
    pillActive: 'bg-[#24272c] text-white dark:bg-[#eef0f3] dark:text-[#14161a]',
    accent: '#e50012',
  },
  premium: {
    dot: 'bg-[#b8902f]',
    pillActive: 'bg-[#1b1d22] text-[#e3c46b]',
    accent: '#b8902f',
  },
  unlimited: {
    dot: 'bg-[#6a707a]',
    pillActive: 'bg-[#4b5159] text-white',
    accent: '#6a707a',
  },
  dream: {
    dot: 'bg-[#5b63b7]',
    pillActive: 'bg-[#4a52a3] text-white',
    accent: '#5b63b7',
  },
  asia: {
    dot: 'bg-[#2a8a73]',
    pillActive: 'bg-[#1f7560] text-white',
    accent: '#2a8a73',
  },
  disney: {
    dot: 'bg-[#3a86b8]',
    pillActive: 'bg-[#2c73a3] text-white',
    accent: '#3a86b8',
  },
};

const FALLBACK: SeriesStyle = {
  dot: 'bg-[#2a8a73]',
  pillActive: 'bg-[#1f7560] text-white',
  accent: '#2a8a73',
};

export function seriesStyle(series?: string): SeriesStyle {
  return SERIES_STYLES[series || 'regular'] || FALLBACK;
}
