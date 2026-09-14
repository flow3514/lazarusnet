'use client'
import * as React from 'react'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import artifact from '@/config/treasury-artifact.json'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StateBlock } from '@/components/dashboard/StateBlock'
import { ConnectWallet } from '@/components/wallet/ConnectWallet'
import { useSession } from '@/lib/auth/use-session'
import { api } from '@/lib/utils/fetcher'
import { publicChain } from '@/lib/utils/public-env'
import { shortAddress } from '@/lib/utils/format'

type Abi = typeof artifact.abi

/**
 * One-click deployment of LazarusTreasury with the connected wallet. The
 * private key never leaves MetaMask; this page only builds the creation
 * transaction (compiled artifact + constructor args) and reads the result
 * back from the chain. An admin wallet can activate the address on the site
 * immediately; the CLI command below publishes it to Vercel env as well.
 */
export function DeployTreasury() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { session } = useSession()
  const [owner, setOwner] = React.useState('')
  const [bps, setBps] = React.useState(2000)
  const [result, setResult] = React.useState<{ address: `0x${string}`; txHash: `0x${string}`; block: string; allocation: string; owner: string } | null>(null)
  const [activated, setActivated] = React.useState(false)

  React.useEffect(() => {
    if (address && !owner) setOwner(address)
  }, [address, owner])

  const wrongChain = publicChain.configured && isConnected && chainId !== publicChain.id

  const deploy = useMutation({
    mutationFn: async () => {
      if (!walletClient || !publicClient || !address) throw new Error('Connect a wallet first.')
      if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) throw new Error('Owner must be an EVM address.')
      const hash = await walletClient.deployContract({ abi: artifact.abi as Abi, bytecode: artifact.bytecode as `0x${string}`, args: [owner as `0x${string}`, BigInt(bps)], account: address, chain: walletClient.chain })
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })
      if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Deployment transaction reverted.')
      const [allocation, onchainOwner] = await Promise.all([
        publicClient.readContract({ address: receipt.contractAddress, abi: artifact.abi as Abi, functionName: 'computeAllocationBps' }) as Promise<bigint>,
        publicClient.readContract({ address: receipt.contractAddress, abi: artifact.abi as Abi, functionName: 'owner' }) as Promise<string>,
      ])
      return { address: receipt.contractAddress, txHash: hash, block: receipt.blockNumber.toString(), allocation: allocation.toString(), owner: onchainOwner }
    },
    onSuccess: (r) => {
      setResult(r)
      toast.success(`LazarusTreasury deployed at ${shortAddress(r.address)}`)
    },
    onError: (e: Error) => toast.error(e.message.split('\n')[0]),
  })

  const activate = useMutation({
    mutationFn: () => api('/api/admin/config', { method: 'PUT', json: { treasuryContract: result!.address } }),
    onSuccess: () => {
      setActivated(true)
      toast.success('Treasury contract activated on the site')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const explorer = publicChain.explorerUrl

  if (!publicChain.configured) return <StateBlock state="not_configured" message="Chain not configured. Set NEXT_PUBLIC_CHAIN_ID and NEXT_PUBLIC_RPC_URL before deploying." />

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[15px] font-semibold">Deploy LazarusTreasury</div>
          <Badge>{publicChain.name} · {publicChain.id}</Badge>
        </div>
        <div className="space-y-4">
          <Field label="Owner (protocol admin / multisig)" hint="Can change the allocation, pay providers and withdraw. Defaults to the connected wallet.">
            <Input value={owner} onChange={(e) => setOwner(e.target.value.trim())} placeholder="0x…" className="font-mono text-xs" />
          </Field>
          <Field label="Initial compute allocation (bps)" hint={`${(bps / 100).toFixed(2)}% of every fee is earmarked for compute.`}>
            <Input type="number" min={0} max={10000} value={bps} onChange={(e) => setBps(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))} />
          </Field>
          <div className="rounded-lg border p-3 text-xs text-muted" style={{ borderColor: 'var(--border)' }}>
            <div className="eyebrow mb-1">Artifact</div>
            {artifact.compiler} · optimizer {artifact.optimizer.runs} runs · evm {artifact.evmVersion} · {(artifact.bytecode.length - 2) / 2} bytes · source sha256 {artifact.sourceSha256.slice(0, 12)}…
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs text-muted">Your wallet signs one creation transaction and pays the gas. Nothing is stored by the site until you activate the address.</p>
          {!isConnected ? (
            <ConnectWallet />
          ) : wrongChain ? (
            <Button variant="outline" onClick={() => switchChainAsync({ chainId: publicChain.id }).catch(() => undefined)}>
              Switch to {publicChain.name}
            </Button>
          ) : (
            <Button onClick={() => deploy.mutate()} disabled={deploy.isPending || !walletClient}>
              <Rocket size={15} /> {deploy.isPending ? 'Confirm in wallet…' : 'Deploy with wallet'}
            </Button>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-4 text-[15px] font-semibold">Result</div>
        {!result && !deploy.isPending && <StateBlock state="empty" message="The deployed address, transaction and on-chain read-back appear here." />}
        {deploy.isPending && <StateBlock state="loading" rows={4} />}
        {result && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={16} /> Deployed and verified on-chain
            </div>
            <dl className="grid gap-2 text-xs">
              {[
                ['Contract', result.address],
                ['Transaction', result.txHash],
                ['Block', result.block],
                ['Owner (read back)', result.owner],
                ['Allocation (read back)', `${Number(result.allocation) / 100}%`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-0.5 break-all font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            {explorer && (
              <a href={`${explorer}/address/${result.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-magenta-bright">
                View on explorer <ExternalLink size={12} />
              </a>
            )}
            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <div className="eyebrow mb-2">Activate</div>
              {session.isAdmin ? (
                <Button onClick={() => activate.mutate()} disabled={activate.isPending || activated} size="sm">
                  {activated ? 'Activated on this site' : 'Activate on this site now'}
                </Button>
              ) : (
                <p className="text-xs text-muted">Sign in with an admin wallet to activate without a redeploy, or publish from the CLI:</p>
              )}
              <pre className="code mt-3">{`npm run treasury:ca -- ${result.address}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
