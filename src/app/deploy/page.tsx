import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { DeployTreasury } from '@/components/deploy/DeployTreasury'

export const metadata: Metadata = { title: 'Deploy Treasury', robots: { index: false, follow: false } }

export default function DeployPage() {
  return (
    <>
      <PageHeader eyebrow="Deploy" title="Compute Treasury contract" lead="Deploy LazarusTreasury to Robinhood Chain from your own wallet. Fees sent to it are counted on-chain, the compute allocation is enforced, and every figure on the Treasury page is read straight from the contract." />
      <div className="wrap py-8">
        <DeployTreasury />
        <div className="mt-8 grid gap-4 text-sm text-muted md:grid-cols-3">
          <div className="card p-4">
            <div className="eyebrow mb-2">Fee inflow</div>
            Send ETH to the contract (plain transfer or <code className="kbd">depositFees(memo)</code>). <code className="kbd">totalProtocolFees()</code> increases; nothing else is needed.
          </div>
          <div className="card p-4">
            <div className="eyebrow mb-2">Compute spend</div>
            The owner pays GPU providers with <code className="kbd">payProvider(to, amount, memo)</code>, capped by <code className="kbd">computeBudget()</code> = fees × allocation − spend.
          </div>
          <div className="card p-4">
            <div className="eyebrow mb-2">Governance</div>
            <code className="kbd">setComputeAllocationBps()</code>, two-step ownership transfer, and <code className="kbd">withdraw()</code> for the non-compute share. Source: <code className="kbd">contracts/LazarusTreasury.sol</code>.
          </div>
        </div>
      </div>
    </>
  )
}
