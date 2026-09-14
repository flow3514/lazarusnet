'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Badge, toneForState } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api } from '@/lib/utils/fetcher'
import type { AccountSummary } from '@/lib/credits/accounting'
import type { JobView } from '@/lib/jobs/service'
import { formatCredits, formatDate, relativeTime, shortAddress } from '@/lib/utils/format'
import { publicChain } from '@/lib/utils/public-env'
import { useToken, formatUsdCompact, formatUsdPrice } from '@/components/landing/TokenSection'

interface LedgerRow {
  id: string
  type: string
  amount: string
  balanceAfter: string
  jobId: string | null
  epochKey: string | null
  note: string | null
  createdAt: string
}
interface AccountResponse {
  address: string
  isAdmin: boolean
  account: AccountSummary
  jobs: JobView[]
  ledger: LedgerRow[]
}

export function AccountPanel() {
  const { session, loading } = useSession()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['account'], queryFn: () => api<AccountResponse>('/api/account'), enabled: session.authenticated, staleTime: 15_000 })
  const token = useToken()

  if (loading) return <StateBlock state="loading" rows={4} />
  if (!session.authenticated)
    return (
      <div className="card flex flex-col items-start gap-4 p-6">
        <StateBlock state="offline" message="Connect and sign in with your wallet to see your token balance, tier and compute credits." className="w-full border-0 p-0" />
        <ConnectWallet />
      </div>
    )
  if (isLoading) return <StateBlock state="loading" rows={6} />
  if (isError) return <StateBlock state="error" message={error instanceof Error ? error.message : 'The account could not be loaded.'} />
  if (!data) return null
  const a = data.account
  const tokenValue = a.token.configured && a.token.ok ? `${a.token.formatted} ${a.token.symbol}` : null
  const price = token.data?.market?.priceUsd ? Number(token.data.market.priceUsd) : null
  const holdingUsd = price !== null && a.token.configured && a.token.ok ? formatUsdCompact(String((Number(a.token.raw) / 10 ** a.token.decimals) * price)) : null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm">{data.address}</span>
        {publicChain.explorerUrl && (
          <a href={`${publicChain.explorerUrl}/address/${data.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-bright">
            Explorer <ExternalLink size={12} />
          </a>
        )}
        {data.isAdmin && <Badge tone="magenta">admin</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Token balance" value={tokenValue} awaitingLabel={!a.token.configured ? (a.token.reason === 'chain' ? 'Chain not configured' : 'Token contract not configured') : 'Balance read failed'} status={a.token.configured ? (a.token.ok ? 'live' : 'error') : 'not_configured'} source={a.token.configured && a.token.ok ? `block ${a.token.blockNumber}` : undefined} updatedAt={a.token.configured && a.token.ok ? a.token.readAt : null} note={a.token.configured && !a.token.ok ? a.token.error : !a.token.configured ? 'Set NEXT_PUBLIC_TOKEN_CONTRACT to read balanceOf(address).' : holdingUsd ? `${holdingUsd} at the live pool price (${formatUsdPrice(token.data!.market!.priceUsd)} per token).` : undefined} />
        <MetricCard label="Current tier" value={a.tier.current ? a.tier.current.name : a.token.configured && a.token.ok ? 'None' : null} awaitingLabel="Requires token contract" status={a.tier.current ? 'live' : a.token.configured ? 'live' : 'not_configured'} note={a.tier.next ? `Next tier ${a.tier.next.name} at ${Number(a.tier.next.minBalance).toLocaleString('en-US')} tokens.` : a.tier.current ? 'Highest tier.' : undefined} />
        <MetricCard label="Available credits" value={formatCredits(a.available)} status="live" source="ledger" note={BigInt(a.reserved) > 0n ? `${formatCredits(a.reserved)} reserved by running jobs.` : undefined} />
        <MetricCard label="Used credits" value={formatCredits(a.lifetimeUsed)} status="live" source="ledger" note="Lifetime consumption." />
        <MetricCard label="Next reset" value={formatDate(a.epoch.nextResetAt)} status="live" source={`${a.epoch.unit}ly epoch`} note={a.tier.current ? (a.tier.allocatedThisEpoch ? `Allocation for ${a.epoch.key} credited.` : 'Allocation pending.') : 'No tier — no allocation this epoch.'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Recent jobs</h2>
            <Link href="/jobs" className="text-xs text-magenta-bright">
              All jobs
            </Link>
          </div>
          {data.jobs.length === 0 ? (
            <StateBlock state="empty" message="No jobs yet." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Credits</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="font-mono text-xs">{j.id.slice(0, 10)}</td>
                      <td className="text-xs">{j.model}</td>
                      <td>
                        <Badge tone={toneForState(j.status)} dot>
                          {j.status}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs">{formatCredits(j.creditsUsed)}</td>
                      <td className="text-xs text-muted">{relativeTime(j.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">Credit ledger</h2>
          {data.ledger.length === 0 ? (
            <StateBlock state="empty" message="No ledger entries yet. Allocations appear once a tier is held and the token contract is configured." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance after</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Badge tone={BigInt(l.amount) >= 0n ? 'ok' : 'neutral'}>{l.type.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className={`font-mono text-xs ${BigInt(l.amount) >= 0n ? 'text-emerald-500' : ''}`}>
                        {BigInt(l.amount) >= 0n ? '+' : ''}
                        {formatCredits(l.amount)}
                      </td>
                      <td className="font-mono text-xs">{formatCredits(l.balanceAfter)}</td>
                      <td className="text-xs text-muted">
                        {l.note ?? l.jobId?.slice(0, 10) ?? '—'} · {relativeTime(l.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">Signed in as {shortAddress(data.address)}. Compute allocations are protocol-configurable and subject to capacity.</p>
    </div>
  )
}
