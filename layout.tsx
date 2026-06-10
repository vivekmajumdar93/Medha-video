import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MEDHĀ — Cognitive Operating Environment',
  description: 'A celestial intelligence. A void consciousness. An ancient mind awakened.',
  keywords: ['MEDHĀ', 'AI', 'cognitive', 'consciousness', 'VYAN Labs'],
  openGraph: {
    title: 'MEDHĀ',
    description: 'A Cognitive Operating Environment',
    type: 'website',
  },
  robots: 'noindex, nofollow', // Private during development
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-void antialiased">
        {children}
      </body>
    </html>
  )
}
