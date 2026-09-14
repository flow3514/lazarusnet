'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/utils/fetcher'
import type { HealthReport } from '@/lib/health'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/format'

const DOT: Record<HealthReport['overall'], string> = {
  ONLINE: 'bg-emerald-500',
  DEGRADED: 'bg-amber-500',
  OFFLINE: 'bg-red-500',
  NOT_CONFIGURED: 'bg-muted',
}
const COMP: Record<string, string> = { ok: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-red-500', not_configured: 'bg-muted' }

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => api<HealthReport>('/api/health'), refetchInterval: 60_000, staleTime: 30_000 })
}

/** Navbar status pill. Everything shown comes from /api/health probes. */
export function NetworkStatus({ compact }: { compact?: boolean }) {
  const { data, isLoading, isError } = useHealth()
  const overall = data?.overall ?? (isError ? 'OFFLINE' : 'NOT_CONFIGURED')
  const label = data?.label ?? 'NETWORK'
  const text = isLoading ? 'CHECKING' : overall.replace('_', ' ')
  return (
    <Tooltip
      content={
        <div className="space-y-2">
          <div className="eyebrow">Health · {data ? new Date(data.checkedAt).toLocaleTimeString() : '—'}</div>
          {(data?.components ?? [
            { id: 'rpc', label: 'RPC', state: 'not_configured' },
            { id: 'provider', label: 'Provider', state: 'not_configured' },
            { id: 'database', label: 'Database', state: 'not_configured' },
            { id: 'inference', label: 'Inference API', state: 'not_configured' },
          ]).map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className={cn('status-dot', COMP[c.state] ?? 'bg-muted')} />
                {c.label}
              </span>
              <span className="text-right font-mono text-[10.5px] uppercase tracking-wider text-muted">{c.state.replace('_', ' ')}</span>
            </div>
          ))}
          {data?.developmentMode && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-amber-500">Development mode</div>}
        </div>
      }
    >
      <span className={cn('inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-mono text-[11px] tracking-[0.14em]', compact && 'px-2')} style={{ borderColor: 'var(--border)' }} aria-live="polite">
        {!compact && <span className="text-muted">{label}</span>}
        <span className={cn('status-dot', DOT[overall], overall === 'ONLINE' && 'animate-pulse-dot')} />
        <span>{text}</span>
      </span>
    </Tooltip>
  )
}
