import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, lead, actions }: { eyebrow: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="wrap flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3 flex items-center gap-2">
            <span className="tri-accent inline-block h-2 w-1.5 bg-magenta" aria-hidden />
            {eyebrow}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{title}</h1>
          {lead && <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{lead}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
