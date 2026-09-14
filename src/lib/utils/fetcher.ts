/** Browser-side JSON fetch that turns API error envelopes into thrown errors. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly detail?: string
  constructor(code: string, message: string, status: number, detail?: string) {
    super(message)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export async function api<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json: body, ...rest } = init ?? {}
  const res = await fetch(input, {
    ...rest,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(rest.headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : rest.body,
    credentials: 'same-origin',
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; detail?: string } } | null)?.error
    throw new ApiError(err?.code ?? 'HTTP_ERROR', err?.message ?? `Request failed (${res.status})`, res.status, err?.detail)
  }
  return data as T
}
