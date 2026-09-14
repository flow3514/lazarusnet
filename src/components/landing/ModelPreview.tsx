'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { Item, Stagger } from '@/components/landing/motion'
import { Badge, toneForState } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { api } from '@/lib/utils/fetcher'
import type { RegistryStatus } from '@/lib/models/registry'
import { formatUsd, formatInt } from '@/lib/utils/format'

export function ModelPreview() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['models', 'status'], queryFn: () => api<RegistryStatus>('/api/models/status'), staleTime: 60_000 })
  const models = (data?.models ?? []).slice(0, 6)
  return (
    <Section id="models" eyebrow="Model registry" title="Open models, health-checked." lead="Each card is a registry row; its status is what the configured provider answered on the last check — never a static claim.">
      {isLoading && <StateBlock state="loading" rows={4} />}
      {isError && <StateBlock state="error" message="The registry could not be loaded." />}
      {data && (
        <>
          {!data.provider.configured && <StateBlock state="not_configured" className="mb-6" message="Compute provider not configured. Model availability will appear once GPU_PROVIDER and GPU_PROVIDER_ENDPOINT are set." />}
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <Item key={m.id}>
                <div className="card h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold tracking-[-0.01em]">{m.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {m.publisher} · {m.type}
                      </div>
                    </div>
                    <Badge tone={toneForState(m.endpointStatus)} dot>
                      {m.endpointStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-muted">Context</dt>
                    <dd className="text-right font-mono">{formatInt(m.contextLength)}</dd>
                    <dt className="text-muted">List price / M tok</dt>
                    <dd className="text-right font-mono">{formatUsd(m.pricePerMillionTokens)}</dd>
                    <dt className="text-muted">Holder access</dt>
                    <dd className="text-right font-mono">{m.holderAccess ? 'credits' : 'no'}</dd>
                  </dl>
                </div>
              </Item>
            ))}
          </Stagger>
          <div className="mt-8">
            <Link href="/models">
              <Button variant="secondary">
                Full registry <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </>
      )}
    </Section>
  )
}
