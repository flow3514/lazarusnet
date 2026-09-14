import Link from 'next/link'
import { LogoMark } from '@/components/brand/Logo'
import { FOOTER_NAV, footerDisclaimer, site } from '@/config/site'

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.9l-5.4-7.06L3.9 22H.64l8.02-9.17L0 2h7.08l4.88 6.45L18.24 2Zm-1.21 18h1.9L7.05 3.9H5.02L17.03 20Z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.05.78 2.12v3.14c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-[15px] font-semibold">{site.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-lg font-medium tracking-[-0.01em]">{site.tagline}</p>
          <p className="mt-6 max-w-md text-xs leading-relaxed text-muted">{footerDisclaimer}</p>
        </div>
        <div>
          <div className="eyebrow mb-4">Navigation</div>
          <ul className="space-y-2.5 text-sm">
            {FOOTER_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Community</div>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href={site.x} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-muted transition-colors hover:text-ink">
                <XIcon /> X · @LazarusNetRH
              </a>
            </li>
            <li>
              <a href={site.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-muted transition-colors hover:text-ink">
                <GitHubIcon /> GitHub
              </a>
            </li>
          </ul>
          <div className="eyebrow mb-3 mt-8">Network</div>
          <p className="text-sm text-muted">{site.chainLabel}</p>
        </div>
      </div>
      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="wrap flex flex-col gap-2 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Lazarus Net</span>
          <span>Experimental infrastructure · Open models · Community-owned compute</span>
        </div>
      </div>
    </footer>
  )
}
