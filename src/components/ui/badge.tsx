import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/format'

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em]', {
  variants: {
    tone: {
      neutral: 'text-muted [border-color:var(--border-strong)]',
      magenta: 'border-magenta/40 bg-magenta/10 text-magenta-bright',
      ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
      warn: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
      down: 'border-red-500/40 bg-red-500/10 text-red-500',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="status-dot bg-current" />}
      {children}
    </span>
  )
}

export type StatusTone = NonNullable<BadgeProps['tone']>

export function toneForState(state: string): StatusTone {
  const s = state.toLowerCase()
  if (['ok', 'online', 'live', 'completed', 'ready'].includes(s)) return 'ok'
  if (['degraded', 'maintenance', 'queued', 'running', 'awaiting', 'unknown', 'not_configured', 'not configured'].includes(s)) return 'warn'
  if (['down', 'offline', 'failed', 'error'].includes(s)) return 'down'
  return 'neutral'
}
