/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata, Viewport } from 'next';
import { DM_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { SEO_CONSTANTS } from '@gecko-advisor/shared/seo';
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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || SEO_CONSTANTS.BASE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SEO_CONSTANTS.SITE_NAME} - Free Privacy Scanner`,
    template: `%s | ${SEO_CONSTANTS.SITE_NAME}`,
  },
  description: SEO_CONSTANTS.DEFAULT_DESCRIPTION,
  keywords: ['privacy', 'security', 'tracker', 'cookie', 'scanner', 'GDPR', 'website analysis'],
  authors: [{ name: SEO_CONSTANTS.SITE_NAME }],
  creator: SEO_CONSTANTS.SITE_NAME,
  publisher: SEO_CONSTANTS.SITE_NAME,
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
    siteName: SEO_CONSTANTS.SITE_NAME,
    title: `${SEO_CONSTANTS.SITE_NAME} - Free Privacy Scanner`,
    description: SEO_CONSTANTS.DEFAULT_DESCRIPTION,
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
    title: `${SEO_CONSTANTS.SITE_NAME} - Free Privacy Scanner`,
    description: SEO_CONSTANTS.DEFAULT_DESCRIPTION,
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
