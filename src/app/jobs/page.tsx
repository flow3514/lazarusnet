import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { JobsTable } from '@/components/jobs/JobsTable'

export const metadata: Metadata = { title: 'Jobs', description: 'Your compute jobs on Lazarus Net.' }

export default function JobsPage() {
  return (
    <>
      <PageHeader eyebrow="Jobs" title="Compute Jobs" lead="Every inference call is a job with a status, credit charge and token usage. Only the signed-in wallet can see its own jobs." />
      <div className="wrap py-8">
        <JobsTable />
      </div>
    </>
  )
}
