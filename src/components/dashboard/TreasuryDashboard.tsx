'use client'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Rocket } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ProtocolFlow } from '@/components/dashboard/ProtocolFlow'
import { Badge } from '@/components/ui/badge'
import { formatMetric } from '@/components/dashboard/metric-format'
import { api } from '@/lib/utils/fetcher'
import type { TreasurySnapshot } from '@/lib/treasury'
import { formatDate, formatUsd, shortAddress } from '@/lib/utils/format'
import { publicChain } from '@/lib/utils/public-env'

export function TreasuryDashboard() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['treasury'], queryFn: () => api<TreasurySnapshot>('/api/treasury'), staleTime: 60_000, refetchInterval: 120_000 })

  if (isLoading) return <StateBlock state="loading" rows={6} />
  if (isError) return <StateBlock state="error" message={error instanceof Error ? error.message : 'The treasury snapshot could not be loaded.'} />
  if (!data) return null

  return (
    <div className="space-y-8">
      {!data.contract.configured ? (
        <div className="space-y-3">
          <StateBlock state="awaiting" message="Awaiting treasury contract integration. Until a LazarusTreasury contract is deployed and published, only admin-recorded events with transaction hashes are shown here — no figure is estimated." />
          <Link href="/deploy">
            <Button variant="secondary" size="sm">
              <Rocket size={14} /> Deploy the treasury contract
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="ok" dot>
            Contract configured
          </Badge>
          <span className="font-mono text-xs">{data.contract.address}</span>
          {data.contract.explorerUrl && (
            <a href={data.contract.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-bright">
              Explorer <ExternalLink size={12} />
            </a>
          )}
          <span className="text-xs text-muted">chain {data.contract.chainId}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {data.metrics.map((m) => (
          <MetricCard key={m.id} label={m.label} value={formatMetric(m)} awaitingLabel={m.status === 'error' ? 'Read failed' : 'Awaiting treasury contract'} status={m.status} source={m.source === 'none' ? undefined : m.source} updatedAt={m.updatedAt} note={m.note} />
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Protocol flow</h2>
        </div>
        <ProtocolFlow />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Recorded treasury events</h2>
          <span className="text-xs text-muted">Admin-recorded, each with a transaction reference</span>
        </div>
        {data.records.length === 0 ? (
          <StateBlock state="empty" message="No treasury events have been recorded. Admin wallets can record fee inflows, allocations, compute spend and GPU capacity purchases with their transaction hashes." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Capacity</th>
                  <th>Transaction</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-muted">{formatDate(r.createdAt)}</td>
                    <td>
                      <Badge>{r.type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="font-mono">{formatUsd(r.amountMicroUsd)}</td>
                    <td className="font-mono">{r.capacityUnits !== null ? `${r.capacityUnits} GPU-h` : '—'}</td>
                    <td className="font-mono text-xs">
                      {r.txHash ? (
                        publicChain.explorerUrl ? (
                          <a href={`${publicChain.explorerUrl}/tx/${r.txHash}`} target="_blank" rel="noreferrer" className="text-magenta-bright">
                            {shortAddress(r.txHash, 6)}
                          </a>
                        ) : (
                          shortAddress(r.txHash, 6)
                        )
                      ) : (
                        <span className="text-muted">no hash</span>
                      )}
                    </td>
                    <td className="text-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
