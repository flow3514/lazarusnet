import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { AdminConsole } from '@/components/admin/AdminConsole'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

export default function AdminPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Protocol Configuration" lead="Holder tiers, credit epoch, provider selection, model enable/disable, credit cost per model and treasury allocation. Protected by the ADMIN_WALLETS allowlist and wallet signature sessions." />
      <div className="wrap py-8">
        <AdminConsole />
      </div>
    </>
  )
}
