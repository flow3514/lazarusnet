import { defineChain, type Chain } from 'viem'
import { publicChain } from '@/lib/utils/public-env'

/**
 * Client-safe chain definition built purely from NEXT_PUBLIC_* configuration.
 * No RPC URL is invented: when the environment is blank, `getChain()` returns
 * null and every consumer renders its "Not configured" state.
 */
export function getChain(): Chain | null {
  if (!publicChain.configured) return null
  return defineChain({
    id: publicChain.id,
    name: publicChain.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [publicChain.rpcUrl] } },
    blockExplorers: publicChain.explorerUrl ? { default: { name: 'Explorer', url: publicChain.explorerUrl } } : undefined,
  })
}

export function explorerAddressUrl(address: string): string | null {
  return publicChain.explorerUrl ? `${publicChain.explorerUrl}/address/${address}` : null
}

export function explorerTxUrl(hash: string): string | null {
  return publicChain.explorerUrl ? `${publicChain.explorerUrl}/tx/${hash}` : null
}
