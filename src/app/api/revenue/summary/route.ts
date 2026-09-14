import { clientIp, handler, json } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { getRevenueSummary } from '@/lib/revenue/summary'

export const runtime = 'nodejs'

/** GET /api/revenue/summary?days=30 */
export const GET = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get('days') ?? 30) || 30))
  return json(await getRevenueSummary(days))
})
