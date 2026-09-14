import { handler, json } from '@/lib/security/api'
import { requireSession } from '@/lib/auth/session'
import { revokeApiKey } from '@/lib/apikeys/service'
import { withDb } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** DELETE /api/keys/:id — revoke (soft; the hash stays so old keys can never be re-created). */
export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession()
  const { id } = await ctx.params
  const key = await withDb(() => revokeApiKey(session.userId, id))
  return json({ key })
})
