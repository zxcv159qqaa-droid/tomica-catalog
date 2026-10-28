import type { ReactNode, SVGProps } from 'react';

// Inline line-icon set: 24px grid, 1.75 stroke, round caps. Decorative by default.
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Base({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const GarageIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5 12 4l9 6.5V20H3z" />
    <path d="M7 20v-6h10v6" />
    <path d="M7 16.5h10" />
  </Base>
);

export const ScanIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <circle cx="12" cy="12" r="3.25" />
  </Base>
);

export const BookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z" />
    <path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3" />
    <path d="M9 8h6" />
  </Base>
);

export const BuildingIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V8l6-3v16" />
    <path d="M10 21V11l10 3v7" />
    <path d="M2.5 21h19" />
    <path d="M7 11v.01M7 15v.01M14 17v.01M17 18v.01" />
  </Base>
);

export const ChartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={2.5}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);

export const HeartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
  </Base>
);

// Side-view car outline, used for empty states and image placeholders
export const CarIcon = (p: IconProps) => (
  <Base viewBox="0 0 64 32" {...p}>
    <path d="M5 22v-4.5c0-1.3.9-2.4 2.2-2.7l8.3-1.9 6.4-5.2c.7-.6 1.6-.9 2.5-.9h12.6c1 0 2 .4 2.7 1.1l5.2 5.1 7.3 1.4c1.3.3 2.3 1.4 2.3 2.8V22c0 .6-.4 1-1 1h-3.2M8 23H5.8c-.5 0-.8-.3-.8-.8" />
    <path d="M20 12.5h10.5V16H15.8M34.5 12.5h5.2l3.6 3.5H34.5z" />
    <path d="M22 23h20" />
    <circle cx="16" cy="23.5" r="4.5" />
    <circle cx="48" cy="23.5" r="4.5" />
    <circle cx="16" cy="23.5" r="1.4" />
    <circle cx="48" cy="23.5" r="1.4" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 0 0-14-4.5L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.5l2-2.5M20 20v-5h-5" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const MinusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

export const ImageIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3" />
  </Base>
);

export const WarningIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.2v.01" />
  </Base>
);

export const BackspaceIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 5h10a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H9l-6-7z" />
    <path d="m12.5 9.5 5 5M17.5 9.5l-5 5" />
  </Base>
);

export const CloudIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5 4.25 4.25 0 0 1 17.5 18z" />
  </Base>
);

export const DownloadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </Base>
);

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Base>
);

export const FlashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 3 5 13.5h6L10 21l9-11h-6.5z" />
  </Base>
);

export const BarcodeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6v12M7 6v12M11 6v12M14 6v12M17 6v12M20 6v12" />
  </Base>
);
