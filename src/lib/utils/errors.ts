export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATABASE_ERROR'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_ERROR'
  | 'CHAIN_NOT_CONFIGURED'
  | 'TOKEN_NOT_CONFIGURED'
  | 'INSUFFICIENT_CREDITS'
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL'

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  DATABASE_NOT_CONFIGURED: 503,
  DATABASE_ERROR: 503,
  PROVIDER_NOT_CONFIGURED: 424,
  PROVIDER_ERROR: 502,
  CHAIN_NOT_CONFIGURED: 424,
  TOKEN_NOT_CONFIGURED: 424,
  INSUFFICIENT_CREDITS: 402,
  MODEL_UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly detail?: string
  constructor(code: AppErrorCode, message: string, detail?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.detail = detail
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
