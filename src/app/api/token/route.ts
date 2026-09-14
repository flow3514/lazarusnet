import { clientIp, handler, json } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { getTokenSnapshot } from '@/lib/token/market'

export const runtime = 'nodejs'

/** GET /api/token[?force=1] — live $LAZARUS contract, on-chain activity and pool market data. */
export const GET = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  const force = new URL(req.url).searchParams.get('force') === '1'
  return json(await getTokenSnapshot(force))
})
