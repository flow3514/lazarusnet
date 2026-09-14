'use client'
import { useHealth } from '@/components/layout/NetworkStatus'
import { cn } from '@/lib/utils/format'

const DOT: Record<string, string> = { ok: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-red-500', not_configured: 'bg-muted' }

/** Live Network Status Strip — four real probes, refreshed every minute. */
export function StatusStrip() {
  const { data, isLoading } = useHealth()
  const items = data?.components ?? [
    { id: 'rpc', label: 'RPC', state: 'not_configured' },
    { id: 'provider', label: 'Provider', state: 'not_configured' },
    { id: 'database', label: 'Database', state: 'not_configured' },
    { id: 'inference', label: 'Inference API', state: 'not_configured' },
  ]
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="wrap grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0 [&>*]:border-[color:var(--border)]">
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-4 first:pl-0 last:pr-0">
            <div>
              <div className="eyebrow">{c.label}</div>
              <div className="mt-1 font-mono text-[12.5px] uppercase tracking-[0.12em]">{isLoading ? 'checking' : c.state.replace('_', ' ')}</div>
            </div>
            <span className={cn('status-dot', isLoading ? 'bg-muted animate-pulse-dot' : DOT[c.state], !isLoading && c.state === 'ok' && 'dot-live text-emerald-500')} />
          </div>
        ))}
      </div>
      {data?.developmentMode && (
        <div className="wrap pb-3">
          <span className="inline-flex rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-500">Development mode — mock provider, no real GPU</span>
        </div>
      )}
    </div>
  )
}
