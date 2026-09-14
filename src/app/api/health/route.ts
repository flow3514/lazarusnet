import { handler, json } from '@/lib/security/api'
import { getHealth } from '@/lib/health'
import { configStatuses } from '@/lib/utils/env'

export const runtime = 'nodejs'

/** GET /api/health[?force=1] — live component probes + configuration booleans (no secrets). */
export const GET = handler(async (req: Request) => {
  const force = new URL(req.url).searchParams.get('force') === '1'
  const health = await getHealth(force)
  return json({ ...health, config: await configStatuses() })
})
