'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge, toneForState } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { Dialog } from '@/components/ui/dialog'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api } from '@/lib/utils/fetcher'
import type { JobView } from '@/lib/jobs/service'
import { formatCredits, formatDate, formatInt } from '@/lib/utils/format'

export function JobsTable() {
  const { session, loading } = useSession()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['jobs', session.address], queryFn: () => api<{ jobs: JobView[] }>('/api/jobs'), enabled: session.authenticated, refetchInterval: 20_000 })
  const [openId, setOpenId] = React.useState<string | null>(null)
  const detail = useQuery({ queryKey: ['job', openId], queryFn: () => api<{ job: JobView }>(`/api/jobs/${openId}`), enabled: !!openId })

  if (loading) return <StateBlock state="loading" rows={4} />
  if (!session.authenticated)
    return (
      <div className="card flex flex-col items-start gap-4 p-6">
        <StateBlock state="offline" message="Connect and sign in with your wallet to see your compute jobs." className="w-full border-0 p-0" />
        <ConnectWallet />
      </div>
    )
  if (isLoading) return <StateBlock state="loading" rows={6} />
  if (isError) return <StateBlock state="error" message={error instanceof Error ? error.message : 'Jobs could not be loaded.'} />
  const jobs = data?.jobs ?? []
  if (jobs.length === 0) return <StateBlock state="empty" message="No jobs yet. Run inference from the Compute Console or the developer API." />

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Model</th>
              <th>Origin</th>
              <th>Status</th>
              <th>Time</th>
              <th>Credits</th>
              <th>Token usage</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="cursor-pointer hover:bg-ink/[0.03]" onClick={() => setOpenId(j.id)}>
                <td className="font-mono text-xs">{j.id.slice(0, 14)}</td>
                <td>{j.model}</td>
                <td>
                  <Badge>{j.origin === 'api_key' ? 'API' : 'wallet'}</Badge>
                </td>
                <td>
                  <Badge tone={toneForState(j.status)} dot>
                    {j.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap text-muted">{formatDate(j.createdAt)}</td>
                <td className="font-mono">{formatCredits(j.creditsUsed)}</td>
                <td className="font-mono">
                  {formatInt(j.tokensInput)} in · {formatInt(j.tokensOutput)} out
                </td>
                <td className="font-mono">{j.latencyMs !== null ? `${j.latencyMs} ms` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!openId} onClose={() => setOpenId(null)} title="Job detail" className="max-w-2xl">
        {detail.isLoading && <StateBlock state="loading" rows={4} />}
        {detail.data && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              {[
                ['Job', detail.data.job.id],
                ['Model', detail.data.job.model],
                ['Provider', detail.data.job.provider],
                ['Status', detail.data.job.status],
                ['Reserved', `${formatCredits(detail.data.job.creditsReserved)} cr`],
                ['Charged', `${formatCredits(detail.data.job.creditsUsed)} cr`],
                ['Prompt hash', detail.data.job.promptHash.slice(0, 16) + '…'],
                ['Provider job', detail.data.job.providerJobId ?? '—'],
                ['Completed', detail.data.job.completedAt ? formatDate(detail.data.job.completedAt) : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-0.5 break-all font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            {detail.data.job.errorMessage && <StateBlock state="error" message={detail.data.job.errorMessage} />}
            {detail.data.job.output ? <pre className="code max-h-[320px] whitespace-pre-wrap">{detail.data.job.output}</pre> : <p className="text-xs text-muted">Output is not stored for API-key jobs.</p>}
          </div>
        )}
      </Dialog>
    </>
  )
}
