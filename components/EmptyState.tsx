import type { ReactNode } from 'react';
import { CarIcon } from '@/components/icons';

// Car outline plus a one-line message and optional actions
export default function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <CarIcon size={120} strokeWidth={1} className="text-muted/60" />
      <div className="mt-1 h-px w-28 bg-line" aria-hidden="true" />
      <p className="mt-4 text-base font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
