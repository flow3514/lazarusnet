/**
 * Browser-safe environment. Next.js only inlines *literal* accesses of
 * process.env.NEXT_PUBLIC_*, so every public key is listed here explicitly.
 * Never add a secret to this file.
 */
export const PUBLIC_ENV = {
  NEXT_PUBLIC_APP_URL: (process.env.NEXT_PUBLIC_APP_URL ?? '').trim(),
  NEXT_PUBLIC_CHAIN_ID: (process.env.NEXT_PUBLIC_CHAIN_ID ?? '').trim(),
  NEXT_PUBLIC_CHAIN_NAME: (process.env.NEXT_PUBLIC_CHAIN_NAME ?? '').trim(),
  NEXT_PUBLIC_RPC_URL: (process.env.NEXT_PUBLIC_RPC_URL ?? '').trim(),
  NEXT_PUBLIC_EXPLORER_URL: (process.env.NEXT_PUBLIC_EXPLORER_URL ?? '').trim(),
  NEXT_PUBLIC_TOKEN_CONTRACT: (process.env.NEXT_PUBLIC_TOKEN_CONTRACT ?? '').trim(),
  NEXT_PUBLIC_TREASURY_CONTRACT: (process.env.NEXT_PUBLIC_TREASURY_CONTRACT ?? '').trim(),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '').trim(),
} as const

export const isAddressLike = (v: string): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v)

export const publicChain = {
  id: Number(PUBLIC_ENV.NEXT_PUBLIC_CHAIN_ID || 0),
  name: PUBLIC_ENV.NEXT_PUBLIC_CHAIN_NAME || 'Robinhood Chain',
  rpcUrl: PUBLIC_ENV.NEXT_PUBLIC_RPC_URL,
  explorerUrl: PUBLIC_ENV.NEXT_PUBLIC_EXPLORER_URL.replace(/\/+$/, ''),
  tokenContract: isAddressLike(PUBLIC_ENV.NEXT_PUBLIC_TOKEN_CONTRACT) ? PUBLIC_ENV.NEXT_PUBLIC_TOKEN_CONTRACT : '',
  treasuryContract: isAddressLike(PUBLIC_ENV.NEXT_PUBLIC_TREASURY_CONTRACT) ? PUBLIC_ENV.NEXT_PUBLIC_TREASURY_CONTRACT : '',
  get configured() {
    return this.id > 0 && this.rpcUrl.length > 0
  },
}
