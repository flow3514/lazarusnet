import type { EpochUnit, HolderTier } from '@/config/tokenomics'
import { parseUnits } from '@/lib/utils/format'

/** Highest tier whose minimum the balance satisfies, or null. Pure — usable on client and server. */
export function resolveTier(rawBalance: bigint, decimals: number, tiers: HolderTier[]): HolderTier | null {
  const sorted = [...tiers].sort((a, b) => (parseUnits(a.minBalance, decimals) < parseUnits(b.minBalance, decimals) ? 1 : -1))
  for (const t of sorted) if (rawBalance >= parseUnits(t.minBalance, decimals)) return t
  return null
}

export function nextTier(rawBalance: bigint, decimals: number, tiers: HolderTier[]): HolderTier | null {
  const sorted = [...tiers].sort((a, b) => (parseUnits(a.minBalance, decimals) < parseUnits(b.minBalance, decimals) ? -1 : 1))
  for (const t of sorted) if (rawBalance < parseUnits(t.minBalance, decimals)) return t
  return null
}

const pad = (n: number) => String(n).padStart(2, '0')

function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return { year: t.getUTCFullYear(), week: Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7) }
}

/** Stable key for the epoch containing `at` (UTC). */
export function epochKey(unit: EpochUnit, at = new Date()): string {
  if (unit === 'day') return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`
  if (unit === 'week') {
    const { year, week } = isoWeek(at)
    return `${year}-W${pad(week)}`
  }
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`
}

/** First instant of the next epoch (UTC). */
export function nextEpochStart(unit: EpochUnit, at = new Date()): Date {
  if (unit === 'day') return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1))
  if (unit === 'week') {
    const day = at.getUTCDay() || 7
    return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + (8 - day)))
  }
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1))
}
