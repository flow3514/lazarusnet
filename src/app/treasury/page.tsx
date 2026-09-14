import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { TreasuryDashboard } from '@/components/dashboard/TreasuryDashboard'

export const metadata: Metadata = { title: 'Compute Treasury', description: 'How protocol fees turn into compute on Lazarus Net.' }

export default function TreasuryPage() {
  return (
    <>
      <PageHeader eyebrow="Treasury" title="Compute Treasury" lead="How protocol fees turn into compute. Figures are read from the treasury contract or from admin-recorded events with transaction hashes. Nothing here is estimated." />
      <div className="wrap py-8">
        <TreasuryDashboard />
      </div>
    </>
  )
}
