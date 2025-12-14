/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata, Viewport } from 'next';
import { DM_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://geckoadvisor.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Gecko Advisor - Free Privacy Scanner',
    template: '%s | Gecko Advisor',
  },
  description:
    'Analyze any website for trackers, cookies, and security issues. Free privacy scoring with detailed reports.',
  keywords: ['privacy', 'security', 'tracker', 'cookie', 'scanner', 'GDPR', 'website analysis'],
  authors: [{ name: 'Gecko Advisor' }],
  creator: 'Gecko Advisor',
  publisher: 'Gecko Advisor',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Gecko Advisor',
    title: 'Gecko Advisor - Free Privacy Scanner',
    description: 'Analyze any website for trackers, cookies, and security issues.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Gecko Advisor Privacy Scanner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gecko Advisor - Free Privacy Scanner',
    description: 'Analyze any website for trackers, cookies, and security issues.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-light-bg antialiased font-sans">{children}</body>
    </html>
  );
}
