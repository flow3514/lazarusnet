'use client'
import * as React from 'react'
import { cn } from '@/lib/utils/format'

/** Lightweight hover/focus tooltip (no portal, no dependency). */
export function Tooltip({ content, children, className, side = 'bottom' }: { content: React.ReactNode; children: React.ReactNode; className?: string; side?: 'bottom' | 'top' }) {
  const [open, setOpen] = React.useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {open && (
        <span role="tooltip" className={cn('absolute z-50 min-w-[200px] rounded-lg border bg-surface p-3 text-left text-xs text-ink shadow-pop animate-fade-in', side === 'bottom' ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]', 'right-0', className)} style={{ borderColor: 'var(--border-strong)' }}>
          {content}
        </span>
      )}
    </span>
  )
}
