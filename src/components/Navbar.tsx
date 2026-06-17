'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WalletConnectButton } from './WalletConnectButton';
import { NotificationsPanel } from './NotificationsPanel';
import { useTheme } from './ThemeProvider';
import { cn } from '@/utils';

const NAV_LINKS = [
  { href: '/rankings',    label: 'Rankings' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/submit',      label: 'Submit' },
  { href: '/compare',     label: 'Compare' },
  { href: '/analytics',   label: 'Analytics' },
  { href: '/dashboard',   label: 'Dashboard' },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onClose}
          style={
            pathname === link.href
              ? { color: 'var(--brand)', background: 'var(--brand-bg)', boxShadow: 'inset 0 0 0 1px var(--brand-border)' }
              : { color: 'var(--muted)' }
          }
          className={cn(
            'px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 block md:inline-block hover:opacity-90'
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
      style={{
        border: '1px solid var(--nav-border)',
        background: 'var(--brand-bg)',
        color: 'var(--brand)',
      }}
    >
      {theme === 'dark' ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* ── Logo ─────────────────────────────────────── */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{
                  background: 'linear-gradient(135deg,#a855f7,#e6bef7)',
                  boxShadow: '0 0 12px rgba(230,190,247,0.3)',
                  color: '#fff',
                }}
              >
                α
              </div>
              <span className="text-base font-bold tracking-tight transition-colors" style={{ color: 'var(--foreground)' }}>
                Alpha<span style={{ color: 'var(--brand)' }}>Rank</span>
              </span>
              <span
                className="hidden sm:block text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--muted)',
                  border: '1px solid var(--nav-border)',
                  background: 'var(--brand-bg)',
                  letterSpacing: '0.05em',
                }}
              >
                GenLayer
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              <Suspense fallback={<div className="h-9 w-64" />}>
                <NavLinks />
              </Suspense>
            </div>
          </div>

          {/* ── Right side ───────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <Suspense fallback={null}>
              <NotificationsPanel />
            </Suspense>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Wallet button — desktop */}
            <div className="hidden sm:block">
              <Suspense fallback={<div className="w-32 h-9 rounded-lg bg-[#160f29] animate-pulse" />}>
                <WalletConnectButton />
              </Suspense>
            </div>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all"
              style={{
                background: mobileOpen ? 'rgba(230,190,247,0.12)' : 'transparent',
                border: '1px solid rgba(230,190,247,0.12)',
              }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <span
                className="block h-0.5 w-5 rounded-full transition-all duration-200"
                style={{
                  background: '#e6bef7',
                  transform: mobileOpen ? 'translateY(4px) rotate(45deg)' : 'none',
                }}
              />
              <span
                className="block h-0.5 w-5 rounded-full transition-all duration-200"
                style={{
                  background: '#e6bef7',
                  opacity: mobileOpen ? 0 : 1,
                }}
              />
              <span
                className="block h-0.5 w-5 rounded-full transition-all duration-200"
                style={{
                  background: '#e6bef7',
                  transform: mobileOpen ? 'translateY(-4px) rotate(-45deg)' : 'none',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden px-4 pb-5 pt-2 space-y-1"
          style={{ borderTop: '1px solid var(--nav-border)', background: 'var(--nav-bg)' }}
        >
          <Suspense fallback={null}>
            <NavLinks onClose={() => setMobileOpen(false)} />
          </Suspense>
          <div className="pt-3">
            <Suspense fallback={null}>
              <WalletConnectButton />
            </Suspense>
          </div>
        </div>
      )}
    </nav>
  );
}
