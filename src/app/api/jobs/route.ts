import { clientIp, handler, json, parseBody } from '@/lib/security/api'
import { enforceRateLimits, RATE_LIMITS } from '@/lib/security/rate-limit'
import { requireSession } from '@/lib/auth/session'
import { inferenceInputSchema } from '@/lib/jobs/schema'
import { listJobs, runInferenceJob } from '@/lib/jobs/service'
import { withDb } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'

export const runtime = 'nodejs'
export const maxDuration = 120

/** GET /api/jobs?wallet=0x… — only the signed-in wallet may list its own jobs. */
export const GET = handler(async (req: Request) => {
  const session = await requireSession()
  enforceRateLimits([[RATE_LIMITS.readIp, clientIp(req)]])
  const url = new URL(req.url)
  const wallet = url.searchParams.get('wallet')
  if (wallet && wallet.toLowerCase() !== session.address.toLowerCase()) throw new AppError('FORBIDDEN', 'You can only list jobs for the signed-in wallet.')
  const limit = Number(url.searchParams.get('limit') ?? 50)
  const jobs = await withDb(() => listJobs(session.address, Number.isFinite(limit) ? limit : 50))
  return json({ wallet: session.address, jobs })
})

/** POST /api/jobs — same pipeline as /api/inference; kept for clients that think in jobs. */
export const POST = handler(async (req: Request) => {
  const session = await requireSession()
  enforceRateLimits([
    [RATE_LIMITS.inferenceWallet, session.address],
    [RATE_LIMITS.inferenceIp, clientIp(req)],
  ])
  const input = await parseBody(req, inferenceInputSchema)
  const job = await withDb(() => runInferenceJob({ ...input, userId: session.userId, walletAddress: session.address, origin: 'wallet' }))
  return json({ job }, { status: job.status === 'failed' ? 502 : 201 })
})
