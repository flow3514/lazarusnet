import type { ReactNode } from 'react'
import { Badge, toneForState } from '@/components/ui/badge'
import { Awaiting } from '@/components/dashboard/StateBlock'
import { cn, relativeTime } from '@/lib/utils/format'

export interface MetricCardProps {
  label: string
  /** Rendered value; pass null/undefined to show the awaiting state. */
  value?: ReactNode | null
  awaitingLabel?: string
  source?: string
  status?: string
  updatedAt?: string | null
  note?: string
  className?: string
}

export function MetricCard({ label, value, awaitingLabel, source, status, updatedAt, note, className }: MetricCardProps) {
  const hasValue = value !== null && value !== undefined
  return (
    <div className={cn('card relative overflow-hidden p-5', className)}>
      <span className="tri-accent absolute -right-1 top-4 h-3 w-2 bg-magenta/70" aria-hidden />
      <div className="eyebrow">{label}</div>
      <div className="mt-3 min-h-[36px] text-[26px] font-semibold leading-none tracking-[-0.02em]">{hasValue ? value : <Awaiting label={awaitingLabel} />}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status && (
          <Badge tone={toneForState(status)} dot>
            {status.replace('_', ' ')}
          </Badge>
        )}
        {source && <Badge>{source}</Badge>}
        {updatedAt && <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{relativeTime(updatedAt)}</span>}
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-muted">{note}</p>}
    </div>
  )
}
