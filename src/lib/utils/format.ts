import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CREDIT_SCALE = 1_000_000n
export const USD_SCALE = 1_000_000n

/** µcredits (bigint or decimal string) → "1,234.56". */
export function formatCredits(micro: bigint | string | number, digits = 2): string {
  const v = typeof micro === 'bigint' ? micro : BigInt(Math.trunc(Number(micro)))
  const neg = v < 0n
  const abs = neg ? -v : v
  const whole = abs / CREDIT_SCALE
  const frac = abs % CREDIT_SCALE
  const fracStr = frac.toString().padStart(6, '0').slice(0, digits)
  const wholeStr = whole.toLocaleString('en-US')
  return `${neg ? '-' : ''}${wholeStr}${digits > 0 ? '.' + fracStr : ''}`
}

/** µUSD → "$12.34". */
export function formatUsd(micro: bigint | string | number, digits = 2): string {
  const v = typeof micro === 'bigint' ? micro : BigInt(Math.trunc(Number(micro)))
  const neg = v < 0n
  const abs = neg ? -v : v
  const whole = abs / USD_SCALE
  const frac = abs % USD_SCALE
  const fracStr = frac.toString().padStart(6, '0').slice(0, digits)
  return `${neg ? '-' : ''}$${whole.toLocaleString('en-US')}${digits > 0 ? '.' + fracStr : ''}`
}

/** µUSD with precision that adapts to tiny amounts (metered usage can be fractions of a cent). */
export function formatUsdAuto(micro: bigint | string | number): string {
  const v = typeof micro === 'bigint' ? micro : BigInt(Math.trunc(Number(micro)))
  const abs = v < 0n ? -v : v
  return formatUsd(v, abs === 0n ? 2 : abs < 10_000n ? 6 : abs < 1_000_000n ? 4 : 2)
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`
}

/** Raw token units → human amount with `decimals`. */
export function formatUnits(raw: bigint | string, decimals: number, digits = 2): string {
  const v = typeof raw === 'bigint' ? raw : BigInt(raw)
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = v % base
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, digits)
  return `${whole.toLocaleString('en-US')}${digits > 0 && decimals > 0 ? '.' + fracStr : ''}`
}

/** Human amount ("1000", "12.5") → raw token units with `decimals`. */
export function parseUnits(amount: string, decimals: number): bigint {
  const [w, f = ''] = amount.trim().split('.')
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(w || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

export function shortAddress(a: string, n = 4): string {
  return a.length > 2 * n + 2 ? `${a.slice(0, n + 2)}…${a.slice(-n)}` : a
}

export function formatInt(n: number | bigint): string {
  return Number(n).toLocaleString('en-US')
}

export function relativeTime(iso: string | Date): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime()
  const d = Date.now() - t
  const s = Math.round(d / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
