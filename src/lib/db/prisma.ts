import 'server-only'
import { PrismaClient } from '@prisma/client'
import { env, hasDatabase } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'

const globalForPrisma = globalThis as unknown as { __lazarusPrisma?: PrismaClient }

export { hasDatabase }

export function db(): PrismaClient {
  if (!hasDatabase()) {
    throw new AppError('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not set. Configure PostgreSQL to use the application.')
  }
  if (!globalForPrisma.__lazarusPrisma) {
    globalForPrisma.__lazarusPrisma = new PrismaClient({
      log: env.isProduction ? ['error'] : ['warn', 'error'],
      transactionOptions: { timeout: 30_000, maxWait: 10_000 },
    })
  }
  return globalForPrisma.__lazarusPrisma
}

/** Wraps a Prisma call so connection failures surface as typed, readable errors. */
export async function withDb<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db())
  } catch (err) {
    if (err instanceof AppError) throw err
    const msg = err instanceof Error ? err.message : String(err)
    if (/ECONNREFUSED|ENOTFOUND|Can't reach database|P1001|P1002|P1017|Connection terminated/i.test(msg)) {
      throw new AppError('DATABASE_ERROR', 'The database is unreachable.', msg.slice(0, 500))
    }
    if (/does not exist|P2021|P2022/i.test(msg)) {
      throw new AppError('DATABASE_ERROR', 'The database schema is missing. Run `npm run db:push`.', msg.slice(0, 500))
    }
    if (/42P05|prepared statement/i.test(msg)) {
      throw new AppError('DATABASE_ERROR', 'The connection goes through a pooler that rejects named prepared statements. Append `pgbouncer=true` to DATABASE_URL.', msg.slice(0, 500))
    }
    throw err
  }
}

/** True when the database answers a trivial query. Never throws. */
export async function pingDatabase(timeoutMs = 4000): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL not configured' }
  const t0 = Date.now()
  try {
    await Promise.race([
      db().$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }
  }
}
