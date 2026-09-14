import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ApiKeys } from '@/components/account/ApiKeys'
import { CURL_EXAMPLE } from '@/components/landing/DeveloperApi'

export const metadata: Metadata = { title: 'Developers', description: 'Developer API for Lazarus Net compute.' }

const RESPONSE_EXAMPLE = `{
  "id": "cm…",
  "model": "llama-3.1-8b-instruct",
  "output": "…",
  "usage": { "input_tokens": 21, "output_tokens": 180, "credits_used": "20100000" },
  "status": "completed",
  "latency_ms": 842,
  "created_at": "2026-09-13T10:00:00.000Z"
}`

export default function DevelopersPage() {
  return (
    <>
      <PageHeader eyebrow="Developers" title="Developer API" lead="Authenticate with an API key generated from your wallet account. Usage is charged to your compute account and metered as external revenue." />
      <div className="wrap grid gap-8 py-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <h2 className="text-[15px] font-semibold">API keys</h2>
          <ApiKeys />
        </div>
        <div className="space-y-6">
          <h2 className="text-[15px] font-semibold">Reference</h2>
          <div className="card p-5">
            <div className="eyebrow mb-2">Endpoint</div>
            <code className="font-mono text-sm">POST /api/v1/inference</code>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              {[
                ['Authorization', 'Bearer lz_live_…'],
                ['model', 'registry id (see /models)'],
                ['prompt', 'string, ≤ 32k chars'],
                ['system', 'optional string'],
                ['temperature', '0–2, default 0.7'],
                ['maxTokens', '1–4096, default 512'],
                ['idempotencyKey', 'optional, 8–120 chars'],
                ['Rate limit', '60/min per key, 30/min per IP → 429'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b py-1.5" style={{ borderColor: 'var(--border)' }}>
                  <dt className="font-mono text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <div className="eyebrow mb-2">Request</div>
            <pre className="code">{CURL_EXAMPLE}</pre>
          </div>
          <div>
            <div className="eyebrow mb-2">Response</div>
            <pre className="code">{RESPONSE_EXAMPLE}</pre>
          </div>
          <div>
            <div className="eyebrow mb-2">Errors</div>
            <pre className="code">{`401 UNAUTHORIZED         invalid or revoked key
402 INSUFFICIENT_CREDITS  reserve more than available
409 MODEL_UNAVAILABLE     disabled or in maintenance
424 PROVIDER_NOT_CONFIGURED
429 RATE_LIMITED          Retry-After header set
502 PROVIDER_ERROR        upstream failure, reservation released`}</pre>
          </div>
        </div>
      </div>
    </>
  )
}
