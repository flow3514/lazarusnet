import { handler, json } from '@/lib/security/api'
import { listModels } from '@/lib/models/registry'
import { providerSummary } from '@/lib/providers'

export const runtime = 'nodejs'

/** GET /api/models — catalogue with last known status (no live probe). */
export const GET = handler(async () => {
  const models = await listModels()
  return json({ provider: providerSummary(), models })
})
