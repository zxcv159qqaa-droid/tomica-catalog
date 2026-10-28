'use client';

import type { ReactNode } from 'react';

export interface SegmentedOption<K extends string> {
  key: K;
  label: ReactNode;
  // Optional active-state classes (e.g. series accent); defaults to ink
  activeClass?: string;
}

const INK_ACTIVE = 'bg-ink text-paper shadow-sm';

// Quiet segmented control that sits directly on the page
export default function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
  scroll = false,
  fill = false,
}: {
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label?: string;
  scroll?: boolean;
  fill?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`segmented ${scroll ? 'no-scrollbar segmented-scroll overflow-x-auto pr-6' : ''} ${fill ? 'flex w-full' : ''}`}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`press flex h-11 items-center justify-center gap-1.5 ${fill ? 'min-w-0 flex-1 px-2' : 'shrink-0 px-4'} whitespace-nowrap rounded-[8px] text-sm transition-colors ${
              active
                ? `${o.activeClass ?? INK_ACTIVE} font-medium`
                : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
