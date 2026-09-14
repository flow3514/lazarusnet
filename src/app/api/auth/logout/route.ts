import { handler, json } from '@/lib/security/api'
import { clearSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export const POST = handler(async () => {
  await clearSession()
  return json({ ok: true })
})
