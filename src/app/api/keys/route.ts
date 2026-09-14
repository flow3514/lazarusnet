import { z } from 'zod'
import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireSession } from '@/lib/auth/session'
import { createApiKey, listApiKeys } from '@/lib/apikeys/service'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

export const GET = handler(async () => {
  const session = await requireSession()
  const keys = await withDb(() => listApiKeys(session.userId))
  return json({ keys })
})

/** POST /api/keys { name } → { key, secret } — `secret` is returned exactly once. */
export const POST = handler(async (req: Request) => {
  const session = await requireSession()
  enforceRateLimits([[RATE_LIMITS.authIp, clientIp(req)]])
  const { name } = await parseBody(req, z.object({ name: z.string().trim().min(1).max(60) }))
  const out = await withDb(() => createApiKey(session.userId, session.address, name))
  return json(out, { status: 201 })
})
