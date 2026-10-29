import { CATALOG_SERIES, seriesLabel } from '@/lib/tomica-data';
import { seriesStyle } from '@/lib/theme';

// Segmented options for every catalog series (coloured dot + accent active style)
export const SERIES_OPTIONS = CATALOG_SERIES.map((s) => ({
  key: s as string,
  activeClass: seriesStyle(s).pillActive + ' shadow-sm',
  label: (
    <>
      <span className={`h-2 w-2 rounded-full ${seriesStyle(s).dot}`} aria-hidden="true" />
      {seriesLabel(s)}
    </>
  ),
}));
