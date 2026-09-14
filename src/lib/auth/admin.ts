import 'server-only'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'
import { requireSession, type Session } from '@/lib/auth/session'

export function isAdminAddress(address: string): boolean {
  return env.adminWallets.includes(address.toLowerCase())
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession()
  if (!isAdminAddress(s.address)) throw new AppError('FORBIDDEN', 'This wallet is not on the admin allowlist.')
  return s
}
