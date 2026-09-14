'use client'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search } from 'lucide-react'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge, toneForState } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { api } from '@/lib/utils/fetcher'
import type { RegistryStatus } from '@/lib/models/registry'
import { formatCredits, formatInt, formatUsd, relativeTime } from '@/lib/utils/format'

export function ModelRegistryTable() {
  const [q, setQ] = React.useState('')
  const [type, setType] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['models', 'status'], queryFn: () => api<RegistryStatus>('/api/models/status'), staleTime: 60_000 })

  const rows = (data?.models ?? []).filter((m) => {
    if (type !== 'all' && m.type !== type) return false
    if (status !== 'all' && m.endpointStatus !== status) return false
    const s = q.trim().toLowerCase()
    return !s || [m.name, m.publisher, m.architecture, m.id, m.endpointModel].some((v) => v.toLowerCase().includes(s))
  })
  const types = Array.from(new Set((data?.models ?? []).map((m) => m.type)))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models, publishers, architectures…" className="pl-9" aria-label="Search models" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-48" aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Maintenance</option>
          <option value="not_configured">Not configured</option>
        </Select>
        <Button variant="secondary" onClick={() => api('/api/models/status?force=1').then(() => refetch())} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'animate-spin-slow' : ''} /> Re-check
        </Button>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone={data.provider.configured ? 'ok' : 'warn'} dot>
            {data.provider.configured ? `Provider: ${data.provider.label}` : 'Compute provider not configured'}
          </Badge>
          {data.provider.developmentMode && <Badge tone="warn">Development mode</Badge>}
          {data.checkedAt ? <span>Last health check {relativeTime(data.checkedAt)}</span> : <span>No health check has run yet.</span>}
          {data.error && <span className="text-red-500">{data.error}</span>}
        </div>
      )}

      {isLoading && <StateBlock state="loading" rows={6} />}
      {isError && <StateBlock state="error" message="The registry could not be loaded." />}
      {data && rows.length === 0 && <StateBlock state="empty" message="No models match the current filters." />}
      {data && rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[980px]">
            <thead>
              <tr>
                <th>Model</th>
                <th>Type</th>
                <th>Publisher</th>
                <th>Status</th>
                <th>Context</th>
                <th>Architecture</th>
                <th>Price / M</th>
                <th>Holder access</th>
                <th>Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[11px] text-muted">{m.id}</div>
                  </td>
                  <td className="text-muted">{m.type}</td>
                  <td>{m.publisher}</td>
                  <td>
                    <Badge tone={toneForState(m.status === 'MAINTENANCE' ? 'maintenance' : m.endpointStatus)} dot>
                      {m.status === 'MAINTENANCE' ? 'MAINTENANCE' : m.endpointStatus === 'online' ? 'ONLINE' : m.endpointStatus === 'offline' ? 'OFFLINE' : m.endpointStatus.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="font-mono">{formatInt(m.contextLength)}</td>
                  <td className="text-muted">{m.architecture}</td>
                  <td className="font-mono">
                    {formatUsd(m.pricePerMillionTokens)}
                    <div className="text-[11px] text-muted">{formatCredits(m.creditsPerMillionTokens, 0)} cr</div>
                  </td>
                  <td>{m.holderAccess ? <Badge tone="magenta">credits</Badge> : <Badge>external only</Badge>}</td>
                  <td>
                    <div className="font-mono text-[11px]">{m.endpointModel}</div>
                    <div className="text-[11px] text-muted">{m.lastCheckedAt ? `checked ${relativeTime(m.lastCheckedAt)}` : 'never checked'}{m.lastError && m.endpointStatus === 'offline' ? ` · ${m.lastError}` : ''}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
