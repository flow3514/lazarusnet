import { clientIp, handler, json } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { checkModelStatuses } from '@/lib/models/registry'

export const runtime = 'nodejs'

/** GET /api/models/status[?force=1] — probes the configured provider and persists ONLINE/OFFLINE. */
export const GET = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  const force = new URL(req.url).searchParams.get('force') === '1'
  const status = await checkModelStatuses(force)
  return json(status)
})
