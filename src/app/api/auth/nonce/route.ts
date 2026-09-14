import { z } from 'zod'
import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { issueNonce } from '@/lib/auth/wallet-auth'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** GET /api/auth/nonce?address=0x… or POST { address } → { message, nonce, address } */
async function issue(req: Request, address: string) {
  enforceRateLimits([[RATE_LIMITS.authIp, clientIp(req)]])
  const out = await withDb(() => issueNonce(address))
  return json(out)
}

export const GET = handler(async (req: Request) => {
  const address = new URL(req.url).searchParams.get('address') ?? ''
  return issue(req, address)
})

export const POST = handler(async (req: Request) => {
  const { address } = await parseBody(req, z.object({ address: z.string() }))
  return issue(req, address)
})
