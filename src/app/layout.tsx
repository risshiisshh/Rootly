import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/features/auth/AuthContext'
import { FloatingNav } from '@/components/layout/FloatingNav'
import { Providers } from './providers'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Rootly — AI Carbon Footprint Coach',
    template: '%s | Rootly',
  },
  description:
    'Rootly is an AI-powered sustainability coach that helps you understand, track, and reduce your carbon footprint with precision intelligence.',
  keywords: ['carbon footprint', 'sustainability', 'AI coach', 'climate', 'emissions tracking'],
  authors: [{ name: 'Rootly Intelligence' }],
  creator: 'Rootly',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rootly.app',
    siteName: 'Rootly',
    title: 'Rootly — AI Carbon Footprint Coach',
    description: 'Precision sustainability intelligence powered by AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#121412',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect to fonts and icon hosts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols Outlined icon font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} ${hanken.variable} antialiased bg-background text-on-surface`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <Providers>
          <AuthProvider>
            <FloatingNav />
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
