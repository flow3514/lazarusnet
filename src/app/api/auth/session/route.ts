import { handler, json } from '@/lib/security/api'
import { clearSession, getSession } from '@/lib/auth/session'
import { isAdminAddress } from '@/lib/auth/admin'

export const runtime = 'nodejs'

/** GET /api/auth/session → { authenticated, address?, isAdmin } */
export const GET = handler(async () => {
  const s = await getSession()
  if (!s) return json({ authenticated: false })
  return json({ authenticated: true, address: s.address, userId: s.userId, isAdmin: isAdminAddress(s.address), expiresAt: new Date(s.exp).toISOString() })
})

/** DELETE /api/auth/session → sign out */
export const DELETE = handler(async () => {
  await clearSession()
  return json({ ok: true })
})
