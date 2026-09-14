'use client'
import { useState, type ReactNode } from 'react'
import { createConfig, http, WagmiProvider, type Config } from 'wagmi'
import { mainnet } from 'viem/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import type { Chain } from 'viem'
import { getChain } from '@/lib/blockchain/chain'
import { PUBLIC_ENV, publicChain } from '@/lib/utils/public-env'

/**
 * wagmi + viem wallet layer. The chain comes from NEXT_PUBLIC_CHAIN_ID /
 * NEXT_PUBLIC_RPC_URL; when those are blank wagmi is still mounted (so the
 * Connect button renders a "chain not configured" state) using a placeholder
 * chain list that is never used for reads.
 */
const WC_PROJECT_ID = PUBLIC_ENV.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

export function walletConnectEnabled(): boolean {
  return WC_PROJECT_ID.length > 0
}

export function chainConfigured(): boolean {
  return publicChain.configured
}

function buildConfig(): Config {
  const chain = getChain()
  const chains = (chain ? [chain] : [mainnet]) as unknown as readonly [Chain, ...Chain[]]
  const connectors = [
    injected({ shimDisconnect: true }),
    ...(WC_PROJECT_ID
      ? [
          walletConnect({
            projectId: WC_PROJECT_ID,
            showQrModal: true,
            metadata: { name: 'Lazarus Net', description: 'Compute belongs to the people.', url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:10200', icons: ['/brand/icon-192.png'] },
          }),
        ]
      : []),
  ]
  const transports = Object.fromEntries(chains.map((c) => [c.id, http(c.rpcUrls.default.http[0])]))
  return createConfig({ chains, connectors, transports, ssr: true, multiInjectedProviderDiscovery: true })
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [config] = useState(() => buildConfig())
  return <WagmiProvider config={config}>{children}</WagmiProvider>
}
