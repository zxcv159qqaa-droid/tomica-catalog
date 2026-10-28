'use client';

import { CloseIcon, SearchIcon } from '@/components/icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '搜尋編號、車名、製造商...',
}: SearchBarProps) {
  return (
    <div className="relative">
      <SearchIcon
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="搜尋"
        className="h-11 w-full rounded-[10px] border border-line bg-surface pl-10 pr-11 text-[15px] text-ink placeholder:text-muted focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清除搜尋"
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
