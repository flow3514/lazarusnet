import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { authenticateApiKey } from '@/lib/apikeys/service'
import { inferenceInputSchema } from '@/lib/jobs/schema'
import { runInferenceJob } from '@/lib/jobs/service'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * POST /api/v1/inference — Developer API. Authorization: Bearer <lz_live_…>.
 * Usage is metered as external compute revenue at the model's list price and
 * charged against the key owner's compute account.
 */
export const POST = handler(async (req: Request) => {
  const { apiKey, userId, walletAddress } = await withDb(() => authenticateApiKey(req))
  enforceRateLimits([
    [RATE_LIMITS.inferenceApiKey, apiKey.id],
    [RATE_LIMITS.inferenceIp, clientIp(req)],
  ])
  const input = await parseBody(req, inferenceInputSchema)
  const job = await withDb(() => runInferenceJob({ ...input, userId, walletAddress, origin: 'api_key', apiKeyId: apiKey.id }))
  if (job.status === 'failed') return json({ error: { code: 'PROVIDER_ERROR', message: job.errorMessage }, job: { ...job, output: undefined } }, { status: 502 })
  return json({
    id: job.id,
    model: job.model,
    output: job.output,
    usage: { input_tokens: job.tokensInput, output_tokens: job.tokensOutput, credits_used: job.creditsUsed },
    status: job.status,
    latency_ms: job.latencyMs,
    created_at: job.createdAt,
  })
})
