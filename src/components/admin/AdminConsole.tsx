'use client'
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Badge, toneForState } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api, ApiError } from '@/lib/utils/fetcher'
import type { ProtocolSettings } from '@/lib/admin/config'
import type { ModelView } from '@/lib/models/registry'
import type { ConfigStatus } from '@/lib/utils/env'
import type { HolderTier } from '@/config/tokenomics'
import { formatCredits } from '@/lib/utils/format'

interface AdminData {
  settings: ProtocolSettings
  models: ModelView[]
  provider: { id: string; label: string; configured: boolean; developmentMode: boolean; endpoint: string }
  config: ConfigStatus[]
}

export function AdminConsole() {
  const qc = useQueryClient()
  const { session, loading } = useSession()
  const q = useQuery({ queryKey: ['admin'], queryFn: () => api<AdminData>('/api/admin/config'), enabled: session.authenticated, retry: false })
  const [tiers, setTiers] = React.useState<HolderTier[] | null>(null)
  const [epochUnit, setEpochUnit] = React.useState<'day' | 'week' | 'month'>('month')
  const [bps, setBps] = React.useState(2000)
  const [provider, setProvider] = React.useState('')
  const [tokenContract, setTokenContract] = React.useState('')
  const [treasuryContract, setTreasuryContract] = React.useState('')

  React.useEffect(() => {
    if (q.data && !tiers) {
      setTiers(q.data.settings.holderTiers)
      setEpochUnit(q.data.settings.epochUnit)
      setBps(q.data.settings.treasuryAllocationBps)
      setProvider(q.data.settings.preferredProvider)
      setTokenContract(q.data.settings.tokenContract)
      setTreasuryContract(q.data.settings.treasuryContract)
    }
  }, [q.data, tiers])

  const save = useMutation({
    mutationFn: () => api('/api/admin/config', { method: 'PUT', json: { holderTiers: tiers, epochUnit, treasuryAllocationBps: bps, preferredProvider: provider, tokenContract: tokenContract.trim(), treasuryContract: treasuryContract.trim() } }),
    onSuccess: () => {
      toast.success('Protocol configuration saved')
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const patchModel = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api(`/api/admin/models/${id}`, { method: 'PATCH', json: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['models'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [credit, setCredit] = React.useState({ address: '', credits: '', type: 'manual_adjustment', note: '' })
  const adjust = useMutation({
    mutationFn: () => api('/api/admin/credits', { method: 'POST', json: credit }),
    onSuccess: () => {
      toast.success('Ledger entry recorded')
      setCredit({ address: '', credits: '', type: 'manual_adjustment', note: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [rec, setRec] = React.useState({ type: 'fee_inflow', amountUsd: '', capacityUnits: '', txHash: '', note: '' })
  const record = useMutation({
    mutationFn: () => api('/api/admin/treasury', { method: 'POST', json: { ...rec, capacityUnits: rec.capacityUnits ? Number(rec.capacityUnits) : undefined, txHash: rec.txHash || undefined } }),
    onSuccess: () => {
      toast.success('Treasury event recorded')
      setRec({ type: 'fee_inflow', amountUsd: '', capacityUnits: '', txHash: '', note: '' })
      qc.invalidateQueries({ queryKey: ['treasury'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (loading) return <StateBlock state="loading" rows={3} />
  if (!session.authenticated)
    return (
      <div className="card flex flex-col items-start gap-4 p-6">
        <StateBlock state="offline" message="Sign in with an admin wallet." className="w-full border-0 p-0" />
        <ConnectWallet />
      </div>
    )
  if (q.isLoading) return <StateBlock state="loading" rows={6} />
  if (q.isError) {
    const err = q.error as ApiError
    return <StateBlock state={err.status === 403 ? 'offline' : 'error'} message={err.status === 403 ? 'This wallet is not on the ADMIN_WALLETS allowlist.' : err.message} />
  }
  const data = q.data!

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Deployment configuration</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.config.map((c) => (
            <div key={c.id} className="card flex items-start justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-medium">{c.label}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted">{c.envKey}</div>
                <p className="mt-1 text-xs text-muted">{c.purpose}</p>
              </div>
              <Badge tone={c.configured ? 'ok' : c.required ? 'down' : 'warn'} dot>
                {c.configured ? 'set' : 'unset'}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Protocol settings</h2>
          <span className="text-xs text-muted">
            {data.settings.source === 'database' ? `Stored overrides · updated ${data.settings.updatedAt ? new Date(data.settings.updatedAt).toLocaleString() : ''}` : 'Defaults from config/tokenomics.ts'}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Credit epoch">
            <Select value={epochUnit} onChange={(e) => setEpochUnit(e.target.value as 'day' | 'week' | 'month')}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </Select>
          </Field>
          <Field label="Treasury allocation (bps)" hint={`${(bps / 100).toFixed(2)}% of protocol fees`}>
            <Input type="number" min={0} max={10000} value={bps} onChange={(e) => setBps(Number(e.target.value))} />
          </Field>
          <Field label="Preferred provider" hint={`Active adapter: ${data.provider.id} (set by GPU_PROVIDER)`}>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">— follow GPU_PROVIDER —</option>
              <option value="openai-compatible">openai-compatible</option>
              <option value="ollama">ollama</option>
              <option value="mock">mock (development)</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Token contract (ERC-20)" hint="Used for balanceOf tiers. NEXT_PUBLIC_TOKEN_CONTRACT env overrides this when set.">
            <Input value={tokenContract} onChange={(e) => setTokenContract(e.target.value)} placeholder="0x… (blank = not configured)" className="font-mono text-xs" />
          </Field>
          <Field label="Treasury contract (LazarusTreasury)" hint="Deploy one at /deploy. NEXT_PUBLIC_TREASURY_CONTRACT env overrides this when set.">
            <Input value={treasuryContract} onChange={(e) => setTreasuryContract(e.target.value)} placeholder="0x… (blank = awaiting)" className="font-mono text-xs" />
          </Field>
        </div>
        <div className="mt-6">
          <div className="eyebrow mb-2">Holder tiers</div>
          <div className="space-y-2">
            {(tiers ?? []).map((t, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto]">
                <Input value={t.id} onChange={(e) => setTiers(tiers!.map((x, k) => (k === i ? { ...x, id: e.target.value } : x)))} placeholder="id" />
                <Input value={t.name} onChange={(e) => setTiers(tiers!.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                <Input value={t.minBalance} onChange={(e) => setTiers(tiers!.map((x, k) => (k === i ? { ...x, minBalance: e.target.value } : x)))} placeholder="Min balance" />
                <Input value={t.creditsPerEpoch} onChange={(e) => setTiers(tiers!.map((x, k) => (k === i ? { ...x, creditsPerEpoch: e.target.value } : x)))} placeholder="Credits / epoch" />
                <Input value={t.description} onChange={(e) => setTiers(tiers!.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} placeholder="Description" />
                <Button variant="ghost" size="sm" onClick={() => setTiers(tiers!.filter((_, k) => k !== i))}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => setTiers([...(tiers ?? []), { id: `tier-${(tiers?.length ?? 0) + 1}`, name: 'New tier', minBalance: '0', creditsPerEpoch: '0', description: '' }])}>
            Add tier
          </Button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save size={15} /> Save settings
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Models</h2>
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Model</th>
                <th>Endpoint status</th>
                <th>Enabled</th>
                <th>Holder access</th>
                <th>Maintenance</th>
                <th>Credits / M tokens</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[11px] text-muted">{m.id}</div>
                  </td>
                  <td>
                    <Badge tone={toneForState(m.endpointStatus)} dot>
                      {m.endpointStatus.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <input type="checkbox" checked={m.enabled} onChange={(e) => patchModel.mutate({ id: m.id, patch: { enabled: e.target.checked } })} className="accent-[#D92989]" aria-label={`Enable ${m.name}`} />
                  </td>
                  <td>
                    <input type="checkbox" checked={m.holderAccess} onChange={(e) => patchModel.mutate({ id: m.id, patch: { holderAccess: e.target.checked } })} className="accent-[#D92989]" aria-label={`Holder access ${m.name}`} />
                  </td>
                  <td>
                    <input type="checkbox" checked={m.status === 'MAINTENANCE'} onChange={(e) => patchModel.mutate({ id: m.id, patch: { status: e.target.checked ? 'MAINTENANCE' : 'OFFLINE' } })} className="accent-[#D92989]" aria-label={`Maintenance ${m.name}`} />
                  </td>
                  <td>
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const v = (new FormData(e.currentTarget).get('credits') as string) || '0'
                        patchModel.mutate({ id: m.id, patch: { creditsPerMillionTokens: String(Math.round(Number(v) * 1_000_000)) } })
                      }}
                    >
                      <Input name="credits" defaultValue={formatCredits(m.creditsPerMillionTokens, 0).replace(/,/g, '')} className="h-8 w-28" />
                      <Button type="submit" size="sm" variant="secondary">
                        Set
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Manual credit entry</h2>
          <div className="space-y-3">
            <Field label="Wallet address">
              <Input value={credit.address} onChange={(e) => setCredit({ ...credit, address: e.target.value })} placeholder="0x…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Credits (signed)">
                <Input value={credit.credits} onChange={(e) => setCredit({ ...credit, credits: e.target.value })} placeholder="100 or -25" />
              </Field>
              <Field label="Type">
                <Select value={credit.type} onChange={(e) => setCredit({ ...credit, type: e.target.value })}>
                  <option value="manual_adjustment">manual_adjustment</option>
                  <option value="protocol_reward">protocol_reward</option>
                  <option value="refund">refund</option>
                </Select>
              </Field>
            </div>
            <Field label="Note">
              <Input value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} placeholder="Reason (stored in the ledger)" />
            </Field>
            <Button onClick={() => adjust.mutate()} disabled={adjust.isPending}>
              Record entry
            </Button>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Record treasury event</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={rec.type} onChange={(e) => setRec({ ...rec, type: e.target.value })}>
                  <option value="fee_inflow">fee_inflow</option>
                  <option value="compute_allocation">compute_allocation</option>
                  <option value="compute_spend">compute_spend</option>
                  <option value="gpu_capacity_purchase">gpu_capacity_purchase</option>
                </Select>
              </Field>
              <Field label="Amount (USD)">
                <Input value={rec.amountUsd} onChange={(e) => setRec({ ...rec, amountUsd: e.target.value })} placeholder="1250.00" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GPU-hours (optional)">
                <Input value={rec.capacityUnits} onChange={(e) => setRec({ ...rec, capacityUnits: e.target.value })} placeholder="40" />
              </Field>
              <Field label="Tx hash (optional)">
                <Input value={rec.txHash} onChange={(e) => setRec({ ...rec, txHash: e.target.value })} placeholder="0x…" />
              </Field>
            </div>
            <Field label="Note">
              <Input value={rec.note} onChange={(e) => setRec({ ...rec, note: e.target.value })} placeholder="What happened" />
            </Field>
            <Button onClick={() => record.mutate()} disabled={record.isPending}>
              Record event
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
