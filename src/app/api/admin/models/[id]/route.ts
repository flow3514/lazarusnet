import { z } from 'zod'
import { handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireAdmin } from '@/lib/auth/admin'
import { updateModelAdmin } from '@/lib/models/registry'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
  holderAccess: z.boolean().optional(),
  creditsPerMillionTokens: z.string().regex(/^\d+$/).optional(),
})

/** PATCH /api/admin/models/:id — enable/disable, maintenance, holder access, credit cost. */
export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  enforceRateLimits([[RATE_LIMITS.adminWallet, admin.address]])
  const { id } = await ctx.params
  const patch = await parseBody(req, patchSchema)
  const model = await withDb(() => updateModelAdmin(id, patch))
  return json({ model })
})
