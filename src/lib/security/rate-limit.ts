import 'server-only'
import { AppError } from '@/lib/utils/errors'

/**
 * Sliding-window rate limiter keyed by wallet, IP or API key. In-memory per
 * server instance — adequate for a single Node process; swap the store for
 * Redis/Postgres when running several instances. The response contract is
 * always HTTP 429 + Retry-After.
 */
interface Bucket {
  hits: number[]
}

const store = new Map<string, Bucket>()
let lastSweep = Date.now()

export interface RateLimitRule {
  /** Distinct label, e.g. "inference:wallet". */
  scope: string
  limit: number
  windowMs: number
}

export const RATE_LIMITS = {
  inferenceWallet: { scope: 'inference:wallet', limit: 12, windowMs: 60_000 },
  inferenceIp: { scope: 'inference:ip', limit: 30, windowMs: 60_000 },
  inferenceApiKey: { scope: 'inference:apikey', limit: 60, windowMs: 60_000 },
  authIp: { scope: 'auth:ip', limit: 15, windowMs: 60_000 },
  readIp: { scope: 'read:ip', limit: 240, windowMs: 60_000 },
  adminWallet: { scope: 'admin:wallet', limit: 30, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of store) {
    if (b.hits.length === 0 || b.hits[b.hits.length - 1] < now - 10 * 60_000) store.delete(k)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export function checkRateLimit(rule: RateLimitRule, id: string): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const key = `${rule.scope}:${id}`
  const bucket = store.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => t > now - rule.windowMs)
  if (bucket.hits.length >= rule.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.hits[0] + rule.windowMs - now) / 1000))
    store.set(key, bucket)
    return { allowed: false, remaining: 0, retryAfterSec }
  }
  bucket.hits.push(now)
  store.set(key, bucket)
  return { allowed: true, remaining: rule.limit - bucket.hits.length, retryAfterSec: 0 }
}

/** Throws RATE_LIMITED (→ 429) when any of the given (rule, id) pairs is exhausted. */
export function enforceRateLimits(pairs: [RateLimitRule, string][]): void {
  for (const [rule, id] of pairs) {
    if (!id) continue
    const r = checkRateLimit(rule, id)
    if (!r.allowed) {
      const err = new AppError('RATE_LIMITED', `Too many requests. Retry in ${r.retryAfterSec}s.`, `${rule.scope}`)
      ;(err as AppError & { retryAfterSec?: number }).retryAfterSec = r.retryAfterSec
      throw err
    }
  }
}
