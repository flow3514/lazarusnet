import type { TreasuryMetric } from '@/lib/treasury'
import { formatUsd } from '@/lib/utils/format'

/** Renders a treasury metric for display; null = show the awaiting state. */
export function formatMetric(m: TreasuryMetric): string | null {
  if (m.value === null) return null
  switch (m.unit) {
    case 'micro_usd':
      return formatUsd(m.value)
    case 'bps':
      return `${(Number(m.value) / 100).toFixed(2)}%`
    case 'wei': {
      const wei = BigInt(m.value)
      const eth = Number(wei / 10n ** 12n) / 1e6
      return `${eth.toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`
    }
    case 'units':
      return `${Number(m.value).toLocaleString('en-US')} GPU-h`
    default:
      return BigInt(m.value).toLocaleString('en-US')
  }
}
