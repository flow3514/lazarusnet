import { test } from 'node:test'
import assert from 'node:assert/strict'
import { epochKey, nextEpochStart, nextTier, resolveTier } from '../src/lib/credits/tiers'
import { formatCredits, formatUsd, parseUnits } from '../src/lib/utils/format'
import { checkRateLimit } from '../src/lib/security/rate-limit'

const tiers = [
  { id: 'node', name: 'Node', minBalance: '1000', creditsPerEpoch: '200', description: '' },
  { id: 'cluster', name: 'Cluster', minBalance: '10000', creditsPerEpoch: '2500', description: '' },
  { id: 'core', name: 'Core', minBalance: '100000', creditsPerEpoch: '30000', description: '' },
]

test('resolveTier picks the highest satisfied tier and nextTier the next threshold', () => {
  assert.equal(resolveTier(parseUnits('999', 18), 18, tiers), null)
  assert.equal(resolveTier(parseUnits('1000', 18), 18, tiers)?.id, 'node')
  assert.equal(resolveTier(parseUnits('55000', 18), 18, tiers)?.id, 'cluster')
  assert.equal(resolveTier(parseUnits('100000', 18), 18, tiers)?.id, 'core')
  assert.equal(nextTier(parseUnits('55000', 18), 18, tiers)?.id, 'core')
  assert.equal(nextTier(parseUnits('1000000', 18), 18, tiers), null)
})

test('epoch keys are stable and reset at the right boundary', () => {
  const at = new Date(Date.UTC(2026, 8, 13, 12))
  assert.equal(epochKey('month', at), '2026-09')
  assert.equal(epochKey('day', at), '2026-09-13')
  assert.equal(epochKey('week', at), '2026-W37')
  assert.equal(nextEpochStart('month', at).toISOString(), '2026-10-01T00:00:00.000Z')
  assert.equal(nextEpochStart('day', at).toISOString(), '2026-09-14T00:00:00.000Z')
  assert.equal(nextEpochStart('week', at).toISOString(), '2026-09-14T00:00:00.000Z')
})

test('formatters render micro units without floating point drift', () => {
  assert.equal(formatCredits(1_234_560_000n), '1,234.56')
  assert.equal(formatCredits(-5_000_000n, 0), '-5')
  assert.equal(formatUsd(1_000_500n, 4), '$1.0005')
  assert.equal(parseUnits('12.5', 6), 12_500_000n)
})

test('rate limiter allows up to the limit then returns a retry-after', () => {
  const rule = { scope: 'test', limit: 3, windowMs: 60_000 }
  const id = `id-${Date.now()}`
  assert.equal(checkRateLimit(rule, id).allowed, true)
  assert.equal(checkRateLimit(rule, id).allowed, true)
  assert.equal(checkRateLimit(rule, id).remaining, 0)
  const blocked = checkRateLimit(rule, id)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSec >= 1)
})
