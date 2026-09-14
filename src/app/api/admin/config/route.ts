import { handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireAdmin } from '@/lib/auth/admin'
import { getProtocolSettings, settingsPatchSchema, updateProtocolSettings } from '@/lib/admin/config'
import { listModels } from '@/lib/models/registry'
import { providerSummary } from '@/lib/providers'
import { configStatuses } from '@/lib/utils/env'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** GET /api/admin/config — admin wallets only. */
export const GET = handler(async () => {
  await requireAdmin()
  const [settings, models] = await Promise.all([getProtocolSettings(), listModels()])
  return json({ settings, models, provider: providerSummary(), config: await configStatuses() })
})

/** PUT /api/admin/config { holderTiers?, epochUnit?, treasuryAllocationBps?, preferredProvider? } */
export const PUT = handler(async (req: Request) => {
  const admin = await requireAdmin()
  enforceRateLimits([[RATE_LIMITS.adminWallet, admin.address]])
  const patch = await parseBody(req, settingsPatchSchema)
  const settings = await withDb(() => updateProtocolSettings(patch, admin.address))
  return json({ settings })
})
