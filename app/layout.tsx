import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Archivo, Geist_Mono } from 'next/font/google';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PersistStorage from '@/components/PersistStorage';
import SyncManager from '@/components/SyncManager';
import './globals.css';

// Display + body Latin face; the wdth axis gives the condensed numerals/wordmark
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tomica 圖鑑',
  description: 'Tomica 小汽車收藏管理 — 拍照辨識、防止重複購買',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tomica 圖鑑',
  },
};

export const viewport: Viewport = {
  themeColor: '#e50012',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <main className="flex-1 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <Suspense>
          <BottomNav />
        </Suspense>
        <PersistStorage />
        <SyncManager />
      </body>
    </html>
  );
}
