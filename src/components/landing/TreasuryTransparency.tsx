'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Section } from '@/components/landing/Section'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/utils/fetcher'
import type { TreasurySnapshot } from '@/lib/treasury'
import { formatMetric } from '@/components/dashboard/metric-format'

export function TreasuryTransparency() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['treasury'], queryFn: () => api<TreasurySnapshot>('/api/treasury'), staleTime: 60_000 })
  return (
    <Section id="treasury" eyebrow="Treasury transparency" title="Every fee, accounted for." lead="Treasury figures are read from the treasury contract or from admin-recorded events with transaction hashes. Nothing is estimated.">
      {isLoading && <StateBlock state="loading" rows={4} />}
      {isError && <StateBlock state="error" message="The treasury snapshot could not be loaded." />}
      {data && (
        <>
          {!data.contract.configured && <StateBlock state="awaiting" className="mb-6" message="Awaiting treasury contract integration. Set NEXT_PUBLIC_TREASURY_CONTRACT to read protocol fees, allocation and spend on-chain." />}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.metrics.slice(0, 3).map((m) => (
              <MetricCard key={m.id} label={m.label} value={formatMetric(m)} awaitingLabel={m.status === 'error' ? 'Read failed' : 'Awaiting treasury contract'} status={m.status} source={m.source === 'none' ? undefined : m.source} updatedAt={m.updatedAt} note={m.note} />
            ))}
          </div>
          <div className="mt-8">
            <Link href="/treasury">
              <Button variant="secondary">
                Treasury dashboard <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </>
      )}
    </Section>
  )
}
