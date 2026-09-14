'use client'
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api } from '@/lib/utils/fetcher'
import type { ApiKeyDTO } from '@/lib/apikeys/service'
import { formatDate, relativeTime } from '@/lib/utils/format'

export function ApiKeys() {
  const qc = useQueryClient()
  const { session, loading } = useSession()
  const [name, setName] = React.useState('')
  const [secret, setSecret] = React.useState<string | null>(null)
  const keys = useQuery({ queryKey: ['keys'], queryFn: () => api<{ keys: ApiKeyDTO[] }>('/api/keys'), enabled: session.authenticated })

  const create = useMutation({
    mutationFn: () => api<{ key: ApiKeyDTO; secret: string }>('/api/keys', { method: 'POST', json: { name: name.trim() || 'default' } }),
    onSuccess: ({ secret }) => {
      setSecret(secret)
      setName('')
      qc.invalidateQueries({ queryKey: ['keys'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Key revoked')
      qc.invalidateQueries({ queryKey: ['keys'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (loading) return <StateBlock state="loading" rows={3} />
  if (!session.authenticated)
    return (
      <div className="card flex flex-col items-start gap-4 p-6">
        <StateBlock state="offline" message="Sign in with your wallet to create API keys. Keys are bound to your compute account." className="w-full border-0 p-0" />
        <ConnectWallet />
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-3 text-[15px] font-semibold">Create a key</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. research-bot)" maxLength={60} />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <KeyRound size={15} /> Generate
          </Button>
        </div>
        {secret && (
          <div className="mt-4 rounded-lg border border-magenta/50 bg-magenta/5 p-4">
            <div className="eyebrow mb-2 text-magenta-bright">Copy your key now — it is shown once</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-bg-2 px-3 py-2 font-mono text-xs">{secret}</code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(secret).then(() => toast.success('Copied'))
                }}
              >
                <Copy size={13} /> Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">Only a SHA-256 hash is stored. If you lose it, revoke and create a new one.</p>
          </div>
        )}
      </div>

      {keys.isLoading && <StateBlock state="loading" rows={3} />}
      {keys.isError && <StateBlock state="error" message="Keys could not be loaded." />}
      {keys.data && keys.data.keys.length === 0 && <StateBlock state="empty" message="No API keys yet." />}
      {keys.data && keys.data.keys.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[640px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.data.keys.map((k) => (
                <tr key={k.id}>
                  <td className="font-medium">{k.name}</td>
                  <td className="font-mono text-xs">{k.keyPrefix}…</td>
                  <td className="text-xs text-muted">{formatDate(k.createdAt)}</td>
                  <td className="text-xs text-muted">{k.lastUsedAt ? relativeTime(k.lastUsedAt) : 'never'}</td>
                  <td>{k.revokedAt ? <Badge tone="down">revoked</Badge> : <Badge tone="ok" dot>active</Badge>}</td>
                  <td className="text-right">
                    {!k.revokedAt && (
                      <Button variant="danger" size="sm" onClick={() => revoke.mutate(k.id)} disabled={revoke.isPending}>
                        <Trash2 size={13} /> Revoke
                      </Button>
                    )}
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
