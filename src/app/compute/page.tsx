import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ComputeConsole } from '@/components/compute/ComputeConsole'

export const metadata: Metadata = { title: 'Compute Console', description: 'Run inference on open models through Lazarus Net.' }

export default function ComputePage() {
  return (
    <>
      <PageHeader eyebrow="Compute" title="Compute Console" lead="Pick an open model, set your parameters and run inference. Credits are reserved before the call and settled from real token usage." />
      <div className="wrap py-8">
        <ComputeConsole />
      </div>
    </>
  )
}
