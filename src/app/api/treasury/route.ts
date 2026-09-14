import { clientIp, handler, json } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { getTreasurySnapshot } from '@/lib/treasury'

export const runtime = 'nodejs'

/** GET /api/treasury — contract reads + recorded treasury events. */
export const GET = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  return json(await getTreasurySnapshot())
})
