import type { Metadata, Viewport } from 'next';
import { Fraunces, Work_Sans } from 'next/font/google';
import './globals.css';
import PWAInstaller from '@/components/PWAInstaller';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Œko — L'œil du patron | SaaS de gestion boutiques, bars & snacks au Cameroun",
  description: "Solution SaaS de gestion 100% adaptée au Cameroun : boutiques de vêtements, bars/lounges et snack-bars. Ventes au comptoir, gestion de stock, crédits clients et mode 100% hors-ligne.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Œko',
  },
};

export const viewport: Viewport = {
  themeColor: '#1B4332',
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
    <html lang="fr" className={`${fraunces.variable} ${workSans.variable}`}>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#FBF7EF] text-[#1B4332] font-sans antialiased selection:bg-[#E8A33D] selection:text-[#0F291E]">
        <PWAInstaller />
        {children}
      </body>
    </html>
  );
}
