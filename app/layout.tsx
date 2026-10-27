import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import PersistStorage from '@/components/PersistStorage';
import SyncManager from '@/components/SyncManager';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
  themeColor: '#e60012',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <main className="flex-1 pb-20 md:pb-8 max-w-7xl mx-auto w-full">
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
