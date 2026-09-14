'use client'
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Badge, toneForState } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api, ApiError } from '@/lib/utils/fetcher'
import type { RegistryStatus } from '@/lib/models/registry'
import type { JobView } from '@/lib/jobs/service'
import type { AccountSummary } from '@/lib/credits/accounting'
import { formatCredits, formatInt, formatUsd } from '@/lib/utils/format'

interface AccountResponse {
  account: AccountSummary
}

/**
 * Compute Console. Calls POST /api/inference; the response is a real job
 * record. When no provider is configured the console says so and the Run
 * button is disabled — nothing is simulated in production.
 */
export function ComputeConsole() {
  const qc = useQueryClient()
  const { session, loading } = useSession()
  const registry = useQuery({ queryKey: ['models', 'status'], queryFn: () => api<RegistryStatus>('/api/models/status'), staleTime: 60_000 })
  const account = useQuery({ queryKey: ['account'], queryFn: () => api<AccountResponse>('/api/account'), enabled: session.authenticated, staleTime: 15_000 })

  const models = React.useMemo(() => (registry.data?.models ?? []).filter((m) => m.enabled && m.holderAccess), [registry.data])
  const [model, setModel] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [system, setSystem] = React.useState('')
  const [temperature, setTemperature] = React.useState(0.7)
  const [maxTokens, setMaxTokens] = React.useState(512)
  const [job, setJob] = React.useState<JobView | null>(null)

  React.useEffect(() => {
    if (!model && models.length) setModel(models.find((m) => m.endpointStatus === 'online')?.id ?? models[0].id)
  }, [models, model])

  const selected = models.find((m) => m.id === model)
  const providerReady = registry.data?.provider.configured === true
  const estimateCredits = selected ? (BigInt(Math.ceil(prompt.length / 4) + maxTokens) * BigInt(selected.creditsPerMillionTokens) * 11n) / 10n / 1_000_000n : 0n

  const run = useMutation({
    mutationFn: () => api<{ job: JobView }>('/api/inference', { method: 'POST', json: { model, prompt, system: system || undefined, temperature, maxTokens, idempotencyKey: `console-${crypto.randomUUID()}` } }),
    onSuccess: ({ job }) => {
      setJob(job)
      qc.invalidateQueries({ queryKey: ['account'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
      if (job.status === 'completed') toast.success(`Job ${job.id.slice(0, 8)} completed · ${formatCredits(job.creditsUsed)} credits`)
      else toast.error(job.errorMessage ?? 'Job failed')
    },
    onError: (e: unknown) => {
      const err = e instanceof ApiError ? e : null
      toast.error(err?.message ?? 'Request failed')
      if (err?.status === 502) qc.invalidateQueries({ queryKey: ['account'] })
    },
  })

  const canRun = session.authenticated && providerReady && !!selected && prompt.trim().length > 0 && !run.isPending && selected.endpointStatus !== 'offline'

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="text-[15px] font-semibold">Run inference</div>
          <div className="flex items-center gap-2">
            <Badge tone={registry.data?.provider.developmentMode ? 'warn' : providerReady ? 'ok' : 'warn'} dot>
              {registry.isLoading ? 'checking' : providerReady ? registry.data!.provider.label : 'Provider not configured'}
            </Badge>
          </div>
        </div>

        {!registry.isLoading && !providerReady && <StateBlock state="not_configured" className="mb-5" message="Compute provider not configured. Set GPU_PROVIDER and GPU_PROVIDER_ENDPOINT (server-side) to enable inference. No output is simulated." />}

        <div className="space-y-4">
          <Field label="Model" hint={selected ? `${selected.publisher} · ${selected.architecture} · ${formatInt(selected.contextLength)} ctx · ${formatCredits(selected.creditsPerMillionTokens, 0)} credits / M tokens · list ${formatUsd(selected.pricePerMillionTokens)} / M` : undefined}>
            <Select value={model} onChange={(e) => setModel(e.target.value)} disabled={models.length === 0}>
              {models.length === 0 && <option>No models</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.endpointStatus.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="System prompt (optional)">
            <Input value={system} onChange={(e) => setSystem(e.target.value)} placeholder="You are a concise assistant." maxLength={4000} />
          </Field>
          <Field label="Prompt">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the network something…" maxLength={32000} rows={7} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Temperature · ${temperature.toFixed(2)}`}>
              <input type="range" min={0} max={2} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-[#D92989]" aria-label="Temperature" />
            </Field>
            <Field label="Max tokens">
              <Input type="number" min={1} max={4096} value={maxTokens} onChange={(e) => setMaxTokens(Math.max(1, Math.min(4096, Number(e.target.value) || 1)))} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs text-muted">
            {session.authenticated ? (
              <>
                Reserve ≈ <span className="font-mono text-ink">{formatCredits(estimateCredits)}</span> credits · available{' '}
                <span className="font-mono text-ink">{account.data ? formatCredits(account.data.account.available) : '…'}</span>
              </>
            ) : loading ? (
              'Checking session…'
            ) : (
              'Sign in with your wallet to run jobs against your compute credits.'
            )}
          </div>
          {session.authenticated ? (
            <Button onClick={() => run.mutate()} disabled={!canRun}>
              {run.isPending ? <RefreshCw size={15} className="animate-spin-slow" /> : <Play size={15} />}
              {run.isPending ? 'Running…' : 'Run Inference'}
            </Button>
          ) : (
            <ConnectWallet />
          )}
        </div>
      </div>

      <div className="card flex min-h-[420px] flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[15px] font-semibold">Output</div>
          {job && (
            <Badge tone={toneForState(job.status)} dot>
              {job.status}
            </Badge>
          )}
        </div>
        {!job && !run.isPending && <StateBlock state="empty" message="Run a job to see the model output, token usage and credits charged here." />}
        {run.isPending && <StateBlock state="loading" rows={5} />}
        {job && (
          <>
            {job.status === 'failed' ? (
              <StateBlock state="error" message={job.errorMessage ?? 'The provider returned an error. Your reservation was released.'} />
            ) : (
              <pre className="code max-h-[440px] flex-1 whitespace-pre-wrap">{job.output}</pre>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
              <dt className="text-muted">Job</dt>
              <dd className="font-mono">{job.id.slice(0, 12)}</dd>
              <dt className="text-muted">Tokens</dt>
              <dd className="font-mono">
                {job.tokensInput} in · {job.tokensOutput} out
              </dd>
              <dt className="text-muted">Credits</dt>
              <dd className="font-mono">{formatCredits(job.creditsUsed)}</dd>
              <dt className="text-muted">Latency</dt>
              <dd className="font-mono">{job.latencyMs ?? '—'} ms</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  )
}
