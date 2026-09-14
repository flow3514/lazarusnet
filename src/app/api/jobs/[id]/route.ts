import { handler, json } from '@/lib/security/api'
import { requireSession } from '@/lib/auth/session'
import { getJob } from '@/lib/jobs/service'
import { withDb } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'

export const runtime = 'nodejs'

/** GET /api/jobs/:id — owner only. */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession()
  const { id } = await ctx.params
  const job = await withDb(() => getJob(id, session.address))
  if (!job) throw new AppError('NOT_FOUND', 'Job not found.')
  return json({ job })
})
