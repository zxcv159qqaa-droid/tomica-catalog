import { seriesStyle } from '@/lib/theme';
import { seriesLabel } from '@/lib/tomica-data';

export interface SeriesSegment {
  series: string;
  total: number;
  have: number;
}

// Progress split by series: each segment is as wide as its series, filled in the series accent.
// A non-zero count always shows at least 4px so small collections stay visible.
export default function SeriesBar({
  segments,
  label,
  height = 12,
  legend = true,
  animate = false,
}: {
  segments: SeriesSegment[];
  label: string;
  height?: number;
  legend?: boolean;
  animate?: boolean;
}) {
  return (
    <div>
      <div className="flex gap-[3px]" style={{ height }} role="img" aria-label={label}>
        {segments.map((g) => (
          <div
            key={g.series}
            className="overflow-hidden rounded-[3px] bg-line"
            style={{ flex: `${g.total} 1 0` }}
          >
            <div
              className={`${animate ? 'grow-x ' : ''}h-full`}
              style={{
                width: g.have > 0 ? `max(4px, ${(g.have / g.total) * 100}%)` : 0,
                background: seriesStyle(g.series).accent,
              }}
            />
          </div>
        ))}
      </div>
      <div className="ruler mt-1" aria-hidden="true" />
      {legend && (
        <ul className="tnum mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
          {segments.map((g) => (
            <li key={g.series} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${seriesStyle(g.series).dot}`} aria-hidden="true" />
              {seriesLabel(g.series)} {g.have}/{g.total}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
