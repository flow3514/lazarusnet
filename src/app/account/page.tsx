import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { AccountPanel } from '@/components/account/AccountPanel'

export const metadata: Metadata = { title: 'Account', description: 'Your wallet, token balance, tier and compute credits on Lazarus Net.' }

export default function AccountPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Wallet & Compute Credits" lead="Live token balance read with balanceOf(address), your current tier, credit balance and ledger. Reading the account credits the epoch allocation when one is due." />
      <div className="wrap py-8">
        <AccountPanel />
      </div>
    </>
  )
}
