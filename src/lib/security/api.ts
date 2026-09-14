import 'server-only'
import { NextResponse } from 'next/server'
import type { z, ZodTypeAny } from 'zod'
import { AppError, errorMessage } from '@/lib/utils/errors'
import { env } from '@/lib/utils/env'

/** BigInt-safe JSON response. */
export function json<T>(data: T, init?: ResponseInit): NextResponse {
  const body = JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
  return new NextResponse(body, { ...init, headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) } })
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    const headers: Record<string, string> = {}
    const retry = (e as AppError & { retryAfterSec?: number }).retryAfterSec
    if (e.code === 'RATE_LIMITED' && retry) headers['retry-after'] = String(retry)
    return json({ error: { code: e.code, message: e.message, detail: env.isProduction ? undefined : e.detail } }, { status: e.status, headers })
  }
  const msg = errorMessage(e)
  console.error('[api] unhandled', msg)
  return json({ error: { code: 'INTERNAL', message: env.isProduction ? 'Internal error.' : msg } }, { status: 500 })
}

/** Wraps a route handler so thrown AppErrors become typed JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<NextResponse>): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await fn(...args)
    } catch (e) {
      return errorResponse(e)
    }
  }
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new AppError('VALIDATION', 'Body must be JSON.')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '))
  return parsed.data as z.output<S>
}

export function clientIp(req: Request): string {
  const h = req.headers
  const xf = h.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? 'local'
}
