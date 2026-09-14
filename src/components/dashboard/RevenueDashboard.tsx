'use client'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ProtocolFlow } from '@/components/dashboard/ProtocolFlow'
import { Badge, toneForState } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { api } from '@/lib/utils/fetcher'
import type { RevenueSummary } from '@/lib/revenue/summary'
import { formatCredits, formatInt, formatUsdAuto, plural } from '@/lib/utils/format'

const RevenueCharts = dynamic(() => import('@/components/charts/RevenueCharts').then((m) => m.RevenueCharts), { ssr: false, loading: () => <StateBlock state="loading" rows={4} /> })

export function RevenueDashboard() {
  const [days, setDays] = React.useState(30)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['revenue', days], queryFn: () => api<RevenueSummary>(`/api/revenue/summary?days=${days}`), staleTime: 60_000 })

  if (isLoading) return <StateBlock state="loading" rows={6} />
  if (isError) return <StateBlock state="error" message={error instanceof Error ? error.message : 'The revenue summary could not be loaded.'} />
  if (!data) return null
  const t = data.totals

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {data.sources.map((s) => (
            <Badge key={s.id} tone={toneForState(s.status)} dot title={s.note}>
              {s.label}: {s.status}
            </Badge>
          ))}
          {data.developmentMode && <Badge tone="warn">Development mode — usage from the mock provider</Badge>}
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36" aria-label="Window">
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </Select>
      </div>

      {!data.available && <StateBlock state="not_configured" message={data.reason ?? 'Database not configured.'} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Compute Revenue" value={data.available && t.externalJobs > 0 ? formatUsdAuto(t.computeRevenueMicroUsd) : null} awaitingLabel={data.available ? 'No external usage yet' : undefined} status={data.available ? 'live' : 'not_configured'} source="metered usage" note="External API jobs metered at list price." />
        <MetricCard label="External Usage" value={data.available ? plural(t.externalJobs, 'job') : null} status={data.available ? 'live' : 'not_configured'} source="database" note={`${plural(t.holderJobs, 'holder job')} in the same window.`} />
        <MetricCard label="Average Revenue / Job" value={t.averageRevenuePerJobMicroUsd ? formatUsdAuto(t.averageRevenuePerJobMicroUsd) : null} awaitingLabel={data.available ? 'No external jobs' : undefined} status={data.available ? 'live' : 'not_configured'} source="derived" />
        <MetricCard label="Treasury Contribution" value={data.available && BigInt(t.treasuryContributionMicroUsd) > 0n ? formatUsdAuto(t.treasuryContributionMicroUsd) : null} awaitingLabel="Awaiting settlement contract" status={data.available && BigInt(t.treasuryContributionMicroUsd) > 0n ? 'live' : 'awaiting'} source={BigInt(t.treasuryContributionMicroUsd) > 0n ? 'records' : undefined} note="Routed to the treasury once on-chain settlement is configured." />
        <MetricCard label="Holder Subsidy Cost" value={data.available && t.holderJobs > 0 ? formatUsdAuto(t.holderSubsidyMicroUsd) : null} awaitingLabel={data.available ? 'No holder usage yet' : undefined} status={data.available ? 'live' : 'not_configured'} source="list-price equivalent" note={t.providerCostMicroUsd ? `Provider-reported cost: ${formatUsdAuto(t.providerCostMicroUsd)}` : 'Provider does not report per-request cost.'} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="eyebrow">Credits consumed</div>
          <div className="mt-2 text-2xl font-semibold">{data.available ? formatCredits(t.creditsConsumed, 4) : '—'}</div>
        </div>
        <div className="card p-5">
          <div className="eyebrow">Tokens processed</div>
          <div className="mt-2 text-2xl font-semibold">{data.available ? formatInt(t.tokensTotal) : '—'}</div>
        </div>
        <div className="card p-5">
          <div className="eyebrow">Completed jobs</div>
          <div className="mt-2 text-2xl font-semibold">{data.available ? formatInt(t.totalJobs) : '—'}</div>
        </div>
      </div>

      {data.available && <RevenueCharts daily={data.daily} />}

      <div>
        <h2 className="mb-3 text-[15px] font-semibold">Protocol flow</h2>
        <ProtocolFlow />
      </div>
    </div>
  )
}
