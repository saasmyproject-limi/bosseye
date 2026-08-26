import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'TAKAM BAR - SaaS Snack Chic Yaoundé',
  description: 'Logiciel ultra-simple de gestion de snack/bar avec caisse rapide et photos des employés',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TAKAM BAR',
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6B00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-brand-black text-white min-h-screen pb-24 antialiased selection:bg-brand-orange selection:text-white">
        {children}
        <Navigation />
      </body>
    </html>
  );
}
