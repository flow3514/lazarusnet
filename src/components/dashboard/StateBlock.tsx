import { AlertTriangle, Database, PlugZap, Unplug } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/format'

/**
 * The four honest states every dashboard needs. `awaiting` is the
 * "Awaiting live network data" state — used instead of a placeholder number.
 */
export type BlockState = 'loading' | 'empty' | 'error' | 'offline' | 'awaiting' | 'not_configured'

const COPY: Record<Exclude<BlockState, 'loading'>, { title: string; icon: React.ReactNode }> = {
  empty: { title: 'No data yet', icon: <Database size={16} /> },
  error: { title: 'Could not load', icon: <AlertTriangle size={16} /> },
  offline: { title: 'Not connected', icon: <Unplug size={16} /> },
  awaiting: { title: 'Awaiting live network data', icon: <PlugZap size={16} /> },
  not_configured: { title: 'Not configured', icon: <PlugZap size={16} /> },
}

export function StateBlock({ state, message, className, rows = 3 }: { state: BlockState; message?: string; className?: string; rows?: number }) {
  if (state === 'loading') {
    return (
      <div className={cn('space-y-3', className)} aria-busy>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-2/3' : i === rows - 1 ? 'w-1/3' : 'w-full')} />
        ))}
      </div>
    )
  }
  const c = COPY[state]
  return (
    <div className={cn('flex flex-col items-start gap-2 rounded-lg border border-dashed p-4', className)} style={{ borderColor: 'var(--border-strong)' }} role="status">
      <div className={cn('flex items-center gap-2 text-sm font-medium', state === 'error' ? 'text-red-500' : state === 'offline' ? 'text-amber-500' : 'text-ink')}>
        {c.icon}
        {c.title}
      </div>
      {message && <p className="text-xs leading-relaxed text-muted">{message}</p>}
    </div>
  )
}

/** Inline value placeholder for metric cards. */
export function Awaiting({ label = 'Awaiting live network data' }: { label?: string }) {
  return <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">{label}</span>
}
