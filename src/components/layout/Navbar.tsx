'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Wordmark } from '@/components/brand/Logo'
import { NAV, APP_NAV } from '@/config/site'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { NetworkStatus } from '@/components/layout/NetworkStatus'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { cn } from '@/lib/utils/format'
import { site } from '@/config/site'
import { useSession } from '@/lib/auth/use-session'

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const { session } = useSession()
  React.useEffect(() => setOpen(false), [pathname])

  const links = [...NAV, ...APP_NAV, ...(session.isAdmin ? [{ href: '/admin', label: 'Admin' }] : [])]
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="glass sticky top-0 z-40 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="rounded-md" aria-label="Lazarus Net home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className={cn('rounded-md px-3 py-2 text-[13.5px] transition-colors', active(l.href) ? 'text-ink' : 'text-muted hover:text-ink')}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <a href={site.x} target="_blank" rel="noreferrer" aria-label="Lazarus Net on X" title="@LazarusNetRH" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-5.4-7.06L3.9 22H.64l8.02-9.17L0 2h7.08l4.88 6.45L18.24 2Zm-1.21 18h1.9L7.05 3.9H5.02L17.03 20Z"/></svg>
          </a>
          <NetworkStatus />
          <ThemeToggle />
          <ConnectWallet />
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <NetworkStatus compact />
          <ThemeToggle />
          <button className="rounded-md p-2" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="glass border-t lg:hidden animate-fade-in" style={{ borderColor: 'var(--border)' }}>
          <div className="wrap flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={cn('rounded-md px-3 py-2.5 text-[15px]', active(l.href) ? 'bg-ink/5 text-ink' : 'text-muted')}>
                {l.label}
              </Link>
            ))}
            <a href={site.x} target="_blank" rel="noreferrer" className="rounded-md px-3 py-2.5 text-[15px] text-muted">
              X · @LazarusNetRH
            </a>
            <div className="mt-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <ConnectWallet className="w-full" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
