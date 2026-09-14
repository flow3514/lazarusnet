import { z } from 'zod'
import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { upsertWalletUser, verifyWalletSignature } from '@/lib/auth/wallet-auth'
import { setSession } from '@/lib/auth/session'
import { isAdminAddress } from '@/lib/auth/admin'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** POST /api/auth/verify { address, message, signature } → secure session cookie */
export const POST = handler(async (req: Request) => {
  enforceRateLimits([[RATE_LIMITS.authIp, clientIp(req)]])
  const body = await parseBody(req, z.object({ address: z.string(), message: z.string().max(2000), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) }))
  const address = await withDb(() => verifyWalletSignature(body))
  const { userId } = await withDb(() => upsertWalletUser(address))
  const session = await setSession(address, userId)
  return json({ address: session.address, userId, isAdmin: isAdminAddress(address), expiresAt: new Date(session.exp).toISOString() })
})
