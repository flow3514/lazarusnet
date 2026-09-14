import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { THEME_INIT_SCRIPT } from '@/components/providers/ThemeProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { site } from '@/config/site'
import { PUBLIC_ENV } from '@/lib/utils/public-env'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const appUrl = PUBLIC_ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:10200'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: site.title, template: '%s — Lazarus Net' },
  description: site.description,
  applicationName: site.name,
  openGraph: { title: site.ogHeadline, description: site.description, siteName: site.name, type: 'website', url: appUrl, images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: site.ogHeadline }] },
  twitter: { card: 'summary_large_image', site: site.xHandle, creator: site.xHandle, title: site.ogHeadline, description: site.description, images: ['/brand/og.png'] },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
    { media: '(prefers-color-scheme: light)', color: '#F7F4F6' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
