/**
 * Holder compute-credit configuration.
 *
 * Everything here is a DEFAULT. Admin wallets can override tiers, the epoch
 * unit and the treasury allocation at runtime (stored in ProtocolConfig), and
 * the UI always labels these values as protocol-configurable. Nothing in this
 * file is an economic promise: allocations are subject to capacity.
 *
 * Units: `minBalance` and `creditsPerEpoch` are decimal strings in whole
 * tokens / whole credits. 1 credit = 1,000,000 µcredits in the ledger.
 */
export interface HolderTier {
  id: string
  name: string
  /** Minimum token balance (whole tokens) to qualify. */
  minBalance: string
  /** Credits granted once per epoch while the tier holds. */
  creditsPerEpoch: string
  description: string
}

export const holderTiers: HolderTier[] = [
  { id: 'node', name: 'Node', minBalance: '1000', creditsPerEpoch: '200', description: 'Entry allocation for verified holders.' },
  { id: 'cluster', name: 'Cluster', minBalance: '10000', creditsPerEpoch: '2500', description: 'Expanded allocation for larger positions.' },
  { id: 'core', name: 'Core', minBalance: '100000', creditsPerEpoch: '30000', description: 'Highest allocation, priority access when capacity is constrained.' },
]

export type EpochUnit = 'day' | 'week' | 'month'

export const creditEpoch: { unit: EpochUnit } = { unit: 'month' }

/** Default share of protocol fees routed to the Compute Treasury (basis points). */
export const treasuryAllocationBps = 2000

/** Fallback credit price for a model that has no explicit price (µcredits per million tokens). */
export const defaultCreditsPerMillionTokens = 1_000_000n * 100n // 100 credits / M tokens

/** Credits are metered against tokens; a reservation covers the prompt estimate plus max_tokens. */
export const reservationSafetyBps = 11_000 // reserve 110% of the estimate

export const tokenomicsDisclaimer = 'Compute allocations are protocol-configurable and subject to capacity.'
