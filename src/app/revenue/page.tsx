import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { RevenueDashboard } from '@/components/dashboard/RevenueDashboard'

export const metadata: Metadata = { title: 'Revenue', description: 'Compute revenue, usage and holder subsidy on Lazarus Net, derived from real job records.' }

export default function RevenuePage() {
  return (
    <>
      <PageHeader eyebrow="Revenue" title="Revenue Dashboard" lead="Compute revenue derived from job usage records. External usage is metered at list price; holder usage is recorded as subsidy cost. Nothing is projected." />
      <div className="wrap py-8">
        <RevenueDashboard />
      </div>
    </>
  )
}
