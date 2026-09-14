'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { api } from '@/lib/utils/fetcher'
import type { TreasurySnapshot } from '@/lib/treasury'
import type { RevenueSummary } from '@/lib/revenue/summary'
import type { HealthReport } from '@/lib/health'
import type { RegistryStatus } from '@/lib/models/registry'
import type { TokenSnapshot } from '@/lib/token/market'
import { Badge, toneForState } from '@/components/ui/badge'
import { formatMetric } from '@/components/dashboard/metric-format'
import { cn, formatCredits, formatUsd, relativeTime } from '@/lib/utils/format'
import { formatUsdCompact } from '@/components/landing/TokenSection'

/**
 * PROTOCOL ACTIVITY → FEES → COMPUTE TREASURY → GPU CAPACITY → COMPUTE JOBS → REVENUE
 * Each node is clickable and reveals: metric, data source, last updated, status.
 * All values come from the live APIs; missing sources render as awaiting.
 */
interface NodeView {
  id: string
  label: string
  metric: string | null
  source: string
  updatedAt: string | null
  status: 'live' | 'awaiting' | 'error' | 'not_configured'
  detail: string
}

export function ProtocolFlow({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const treasury = useQuery({ queryKey: ['treasury'], queryFn: () => api<TreasurySnapshot>('/api/treasury'), staleTime: 60_000 })
  const revenue = useQuery({ queryKey: ['revenue', 30], queryFn: () => api<RevenueSummary>('/api/revenue/summary?days=30'), staleTime: 60_000 })
  const health = useQuery({ queryKey: ['health'], queryFn: () => api<HealthReport>('/api/health'), staleTime: 30_000 })
  const registry = useQuery({ queryKey: ['models', 'status'], queryFn: () => api<RegistryStatus>('/api/models/status'), staleTime: 60_000 })
  const token = useQuery({ queryKey: ['token'], queryFn: () => api<TokenSnapshot>('/api/token'), staleTime: 60_000 })
  const [open, setOpen] = React.useState<string | null>(null)

  const metric = (id: string) => treasury.data?.metrics.find((m) => m.id === id)
  const fees = metric('protocol_fees')
  const alloc = metric('compute_allocation')
  const gpu = metric('gpu_capacity')
  const provider = health.data?.components.find((c) => c.id === 'provider')
  const tokenMarket = token.data?.market ?? null
  const tokenActivity = token.data?.activity ?? null
  const online = registry.data?.models.filter((m) => m.endpointStatus === 'online').length ?? 0

  const nodes: NodeView[] = [
    {
      id: 'activity',
      label: 'Protocol Activity',
      metric: tokenMarket ? `${formatUsdCompact(tokenMarket.volume24hUsd) ?? '—'} · 24h` : health.data?.blockNumber ? `block ${Number(health.data.blockNumber).toLocaleString('en-US')}` : null,
      source: tokenMarket ? `${tokenMarket.pool.dex} pool` : 'Chain RPC',
      updatedAt: tokenMarket?.fetchedAt ?? health.data?.checkedAt ?? null,
      status: tokenMarket ? 'live' : health.data?.components[0].state === 'ok' ? 'live' : health.data?.components[0].state === 'not_configured' ? 'not_configured' : 'error',
      detail: tokenMarket
        ? `Live ${tokenMarket.pool.name} pool: ${tokenMarket.buys24h ?? 0} buys and ${tokenMarket.sells24h ?? 0} sells in 24 h${tokenActivity ? `, ${tokenActivity.transfers} transfers across ${tokenActivity.uniqueAddresses} addresses in the last ${tokenActivity.blocks.toLocaleString('en-US')} blocks` : ''}. Swap fees accrue to liquidity providers; protocol fees reach the treasury once its contract is deployed.`
        : 'Chain head observed through the configured RPC. Trading volume appears once the token has an indexed pool.',
    },
    { id: 'fees', label: 'Fees', metric: fees ? formatMetric(fees) : null, source: fees?.source === 'contract' ? 'Treasury contract' : 'Treasury contract (not configured)', updatedAt: fees?.updatedAt ?? null, status: fees?.status ?? 'awaiting', detail: tokenMarket ? 'totalProtocolFees() on the treasury contract. Trading is live, but fees only become protocol revenue once the treasury contract is deployed and receives them.' : 'totalProtocolFees() on the treasury contract.' },
    { id: 'treasury', label: 'Compute Treasury', metric: alloc ? `${formatMetric(alloc)} allocation` : null, source: alloc?.source === 'contract' ? 'Treasury contract' : 'Protocol configuration', updatedAt: alloc?.updatedAt ?? null, status: alloc?.status ?? 'awaiting', detail: 'Share of protocol fees routed to compute. Configurable by admin wallets until the contract enforces it.' },
    { id: 'gpu', label: 'GPU Capacity', metric: gpu?.value ? formatMetric(gpu) : provider?.state === 'ok' ? `${online} model(s) online` : null, source: gpu?.value ? 'Admin records' : provider ? 'Provider health check' : 'Provider', updatedAt: gpu?.updatedAt ?? health.data?.checkedAt ?? null, status: gpu?.value ? 'live' : provider?.state === 'ok' ? 'live' : provider?.state === 'not_configured' ? 'not_configured' : 'error', detail: provider?.detail ?? 'GPU capacity is reported by the provider adapter or recorded by admins with tx hashes.' },
    { id: 'jobs', label: 'Compute Jobs', metric: revenue.data?.available ? `${revenue.data.totals.totalJobs.toLocaleString('en-US')} jobs · ${formatCredits(revenue.data.totals.creditsConsumed, 2)} cr` : null, source: 'Database (30 d)', updatedAt: revenue.data?.generatedAt ?? null, status: revenue.data?.available ? 'live' : 'not_configured', detail: revenue.data?.reason ?? 'Completed inference jobs and credits consumed over the last 30 days.' },
    { id: 'revenue', label: 'Revenue', metric: revenue.data?.available ? formatUsd(revenue.data.totals.computeRevenueMicroUsd) : null, source: 'Metered usage (30 d)', updatedAt: revenue.data?.generatedAt ?? null, status: revenue.data?.available ? (revenue.data.totals.externalJobs > 0 ? 'live' : 'awaiting') : 'not_configured', detail: 'External API usage metered at list price. On-chain settlement is not configured.' },
  ]
  const current = nodes.find((n) => n.id === open)
  const loading = treasury.isLoading || health.isLoading

  return (
    <div className={cn('card p-5 sm:p-6', className)}>
      <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {nodes.map((n, i) => (
          <li key={n.id} className="flex flex-1 items-center lg:min-w-0">
            <button
              onClick={() => setOpen(open === n.id ? null : n.id)}
              aria-expanded={open === n.id}
              className={cn('group flex w-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors', open === n.id ? 'border-magenta bg-magenta/5' : 'hover:border-magenta/50')}
              style={{ borderColor: open === n.id ? undefined : 'var(--border)' }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className={cn('status-dot', loading ? 'bg-muted animate-pulse-dot' : n.status === 'live' ? 'bg-emerald-500' : n.status === 'error' ? 'bg-red-500' : 'bg-amber-500')} />
              </div>
              <span className="text-[13px] font-semibold leading-tight">{n.label}</span>
              <span className="min-h-[16px] truncate font-mono text-[11px] text-muted">{loading ? '…' : n.metric ?? 'awaiting data'}</span>
            </button>
            {i < nodes.length - 1 && (
              <svg className="mx-1 hidden h-3 w-6 shrink-0 text-magenta lg:block" viewBox="0 0 24 12" fill="none" aria-hidden>
                <path d="M0 6h18" stroke="currentColor" strokeDasharray="3 3" className={reduce ? undefined : 'animate-dash-flow'} />
                <path d="M18 2l4 4-4 4" stroke="currentColor" />
              </svg>
            )}
          </li>
        ))}
      </ol>
      {current && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-4" style={{ borderColor: 'var(--border-strong)' }}>
          <div>
            <div className="eyebrow">Metric</div>
            <div className="mt-1 text-lg font-semibold">{current.metric ?? <span className="font-mono text-[12px] uppercase tracking-wider text-muted">Awaiting live network data</span>}</div>
          </div>
          <div>
            <div className="eyebrow">Data source</div>
            <div className="mt-1 text-sm">{current.source}</div>
          </div>
          <div>
            <div className="eyebrow">Last updated</div>
            <div className="mt-1 text-sm">{current.updatedAt ? relativeTime(current.updatedAt) : '—'}</div>
          </div>
          <div>
            <div className="eyebrow">Status</div>
            <div className="mt-1">
              <Badge tone={toneForState(current.status)} dot>
                {current.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted sm:col-span-4">{current.detail}</p>
        </motion.div>
      )}
    </div>
  )
}
