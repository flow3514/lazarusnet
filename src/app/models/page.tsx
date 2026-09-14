import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { ModelRegistryTable } from '@/components/models/ModelRegistryTable'

export const metadata: Metadata = { title: 'Model Registry', description: 'Open-weight models served through Lazarus Net, health-checked against the configured provider.' }

export default function ModelsPage() {
  return (
    <>
      <PageHeader eyebrow="Models" title="Model Registry" lead="Open-weight models available on the network. Status reflects the last health check against the configured provider; models are never marked online by configuration alone." />
      <div className="wrap py-8">
        <ModelRegistryTable />
      </div>
    </>
  )
}
