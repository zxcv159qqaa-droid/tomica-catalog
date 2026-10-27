export const navItems = [
  { href: '/', label: '我的車庫', short: '車庫', icon: '🏠' },
  { href: '/scan', label: '拍照掃描', short: '掃描', icon: '📷' },
  { href: '/catalog', label: '完整圖鑑', short: '圖鑑', icon: '📖' },
  { href: '/stats', label: '統計與百格牆', short: '統計', icon: '📊' },
  { href: '/settings', label: '設定', short: '設定', icon: '⚙️' },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
