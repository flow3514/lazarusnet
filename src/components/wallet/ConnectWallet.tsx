'use client'
import * as React from 'react'
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { ChevronDown, LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useSession } from '@/lib/auth/use-session'
import { publicChain } from '@/lib/utils/public-env'
import { shortAddress, cn } from '@/lib/utils/format'
import Link from 'next/link'

/**
 * Connect → (switch chain) → Sign in. The signature is a readable SIWE-style
 * message over a server nonce; it never moves funds.
 */
export function ConnectWallet({ className }: { className?: string }) {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { connectors, connectAsync, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { session, signIn, signOut, signingIn, error } = useSession()
  const [open, setOpen] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const [connectError, setConnectError] = React.useState<string | null>(null)

  const wrongChain = publicChain.configured && isConnected && chainId !== publicChain.id

  if (!isConnected || !address) {
    return (
      <>
        <Button className={className} onClick={() => setOpen(true)}>
          <Wallet size={15} /> Connect Wallet
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Connect a wallet">
          {!publicChain.configured && (
            <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">Chain not configured. Set NEXT_PUBLIC_CHAIN_ID and NEXT_PUBLIC_RPC_URL to enable balance reads and holder credits. You can still connect to sign in.</p>
          )}
          <div className="space-y-2">
            {connectors.map((c) => (
              <button
                key={c.uid}
                disabled={isPending}
                onClick={async () => {
                  setConnectError(null)
                  try {
                    await connectAsync({ connector: c })
                    setOpen(false)
                  } catch (e) {
                    setConnectError(e instanceof Error ? e.message.split('\n')[0] : 'Connection failed.')
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg border bg-bg-2 px-4 py-3 text-left text-sm transition-colors hover:border-magenta/50"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                <span className="font-medium">{c.name}</span>
                <span className="eyebrow">{c.type === 'injected' ? 'Browser' : c.type}</span>
              </button>
            ))}
            {connectors.length === 0 && <p className="text-sm text-muted">No wallet detected. Install MetaMask or configure WalletConnect (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID).</p>}
          </div>
          {connectError && <p className="mt-3 text-xs text-red-500">{connectError}</p>}
          <p className="mt-4 text-xs text-muted">MetaMask and other EIP-6963 wallets are discovered automatically. WalletConnect appears when a project id is configured.</p>
        </Dialog>
      </>
    )
  }

  if (wrongChain) {
    return (
      <Button variant="outline" className={className} onClick={() => switchChainAsync({ chainId: publicChain.id }).catch(() => undefined)}>
        Switch to {publicChain.name}
      </Button>
    )
  }

  if (!session.authenticated) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button onClick={signIn} disabled={signingIn} title={error ?? undefined}>
          <ShieldCheck size={15} /> {signingIn ? 'Check wallet…' : 'Sign in'}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => disconnect()} aria-label="Disconnect">
          <LogOut size={15} />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <Button variant="secondary" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
        <span className="status-dot bg-emerald-500" />
        <span className="font-mono text-[12.5px]">{shortAddress(address)}</span>
        <ChevronDown size={14} className="text-muted" />
      </Button>
      {menu && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 animate-fade-in rounded-xl border bg-surface p-1.5 shadow-pop" style={{ borderColor: 'var(--border-strong)' }} onMouseLeave={() => setMenu(false)}>
          <div className="px-3 py-2 text-xs text-muted">
            Signed in via {connector?.name ?? 'wallet'}
            {session.isAdmin && <span className="ml-2 rounded border border-magenta/40 px-1 font-mono text-[10px] uppercase text-magenta-bright">admin</span>}
          </div>
          {[
            ['/account', 'Account'],
            ['/jobs', 'Jobs'],
            ['/developers', 'API keys'],
            ...(session.isAdmin ? [['/admin', 'Admin']] : []),
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
              {label}
            </Link>
          ))}
          <button
            onClick={async () => {
              await signOut()
              disconnect()
              setMenu(false)
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-ink/5 hover:text-ink"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
