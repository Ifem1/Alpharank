import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';
import { Navbar } from '@/components/Navbar';
import { NetworkChecker } from '@/components/NetworkChecker';
import { ThemeProvider } from '@/components/ThemeProvider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#e6bef7',
};

export const metadata: Metadata = {
  title: {
    default: 'AlphaRank — On-Chain Crypto Intelligence',
    template: '%s — AlphaRank',
  },
  description:
    'Crypto project rankings powered by GenLayer Intelligent Contracts. Submit, lock evidence, let AI evaluate, build verifiable on-chain reputation.',
  keywords: ['crypto', 'rankings', 'GenLayer', 'blockchain', 'AI', 'DeFi', 'evaluation', 'research'],
  authors: [{ name: 'AlphaRank' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://alpharank.app',
    siteName: 'AlphaRank',
    title: 'AlphaRank — On-Chain Crypto Intelligence',
    description: 'Crypto project rankings powered by GenLayer Intelligent Contracts.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AlphaRank — On-Chain Crypto Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlphaRank — On-Chain Crypto Intelligence',
    description: 'Crypto project rankings powered by GenLayer Intelligent Contracts.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <Providers>
          <ThemeProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <NetworkChecker />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer
      className="mt-auto py-8 px-4"
      style={{ borderTop: '1px solid var(--nav-border)' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black"
            style={{ background: 'linear-gradient(135deg,#a855f7,#e6bef7)', color: '#fff' }}
          >
            α
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--muted-2)' }}>
            AlphaRank
          </span>
          <span className="text-xs" style={{ color: 'var(--muted-2)' }}>
            · Powered by GenLayer
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--muted-2)' }}>
          <a href="/rankings"    className="transition-colors hover:opacity-80">Rankings</a>
          <a href="/leaderboard" className="transition-colors hover:opacity-80">Leaderboard</a>
          <a href="/analytics"   className="transition-colors hover:opacity-80">Analytics</a>
          <a href="/treasury"    className="transition-colors hover:opacity-80">Treasury</a>
        </div>
      </div>
    </footer>
  );
}
