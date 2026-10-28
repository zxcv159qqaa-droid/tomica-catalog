import type { ComponentType } from 'react';
import {
  GarageIcon,
  ScanIcon,
  BookIcon,
  BuildingIcon,
  ChartIcon,
  SettingsIcon,
  type IconProps,
} from '@/components/icons';

export interface NavItem {
  href: string;
  label: string;
  short: string;
  Icon: ComponentType<IconProps>;
}

export const navItems: NavItem[] = [
  { href: '/', label: '我的車庫', short: '車庫', Icon: GarageIcon },
  { href: '/scan', label: '拍照掃描', short: '掃描', Icon: ScanIcon },
  { href: '/catalog', label: '完整圖鑑', short: '圖鑑', Icon: BookIcon },
  { href: '/world', label: '建物圖鑑', short: '建物', Icon: BuildingIcon },
  { href: '/stats', label: '統計與百格牆', short: '統計', Icon: ChartIcon },
  { href: '/settings', label: '設定', short: '設定', Icon: SettingsIcon },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
