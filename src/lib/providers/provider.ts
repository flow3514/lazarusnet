/**
 * Provider contract. Every GPU / inference backend implements this interface
 * so the rest of the system (credits, jobs, registry, health) never depends
 * on a vendor. Methods return `null` for data a provider genuinely cannot
 * report — the UI then shows "Awaiting live network data" rather than a
 * fabricated number.
 */
export interface ProviderModel {
  id: string
  /** Owner / publisher when the provider reports it. */
  ownedBy?: string
  contextLength?: number
}

export interface ProviderCapacity {
  /** Reported by the provider, when it exposes capacity at all. */
  gpus?: number
  gpuType?: string
  queueDepth?: number
  utilization?: number
  reportedAt: string
}

export interface InferenceRequest {
  model: string
  prompt: string
  temperature: number
  maxTokens: number
  /** Optional system prompt. */
  system?: string
  /** Idempotency / trace id forwarded to the provider when supported. */
  requestId?: string
  signal?: AbortSignal
}

export interface InferenceResult {
  text: string
  tokensInput: number
  tokensOutput: number
  /** true when the token counts came from the provider rather than an estimate. */
  usageReported: boolean
  providerJobId?: string
  finishReason?: string
  latencyMs: number
  /** Provider-reported cost in µUSD when returned in the response. */
  costMicroUsd?: bigint
  raw?: unknown
}

export type ProviderJobStatus = { status: 'queued' | 'running' | 'completed' | 'failed' | 'unknown'; detail?: string }

export interface ProviderUsageSummary {
  from: string
  to: string
  tokensInput: number
  tokensOutput: number
  requests: number
}

export interface ProviderBilling {
  from: string
  to: string
  amountMicroUsd: bigint
  currency: 'USD'
  source: string
}

export interface ProviderHealth {
  ok: boolean
  latencyMs?: number
  modelCount?: number
  error?: string
}

export interface InferenceProvider {
  readonly id: string
  readonly label: string
  /** True when the environment gives this provider everything it needs. */
  readonly configured: boolean
  /** Mock/dev providers set this so they can never run in production. */
  readonly developmentOnly: boolean
  /** Human-readable, secret-free description of where requests go. */
  describeEndpoint(): string
  getAvailableModels(): Promise<ProviderModel[]>
  getCapacity(): Promise<ProviderCapacity | null>
  runInference(req: InferenceRequest): Promise<InferenceResult>
  getJobStatus(providerJobId: string): Promise<ProviderJobStatus>
  getUsage(range: { from: Date; to: Date }): Promise<ProviderUsageSummary | null>
  getBilling(range: { from: Date; to: Date }): Promise<ProviderBilling | null>
  health(): Promise<ProviderHealth>
}

/** Rough token estimate used only for reservations; final accounting prefers provider-reported usage. */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // ~4 characters per token for English/code; words-based floor keeps CJK text from under-counting.
  const byChars = Math.ceil(text.length / 4)
  const byWords = Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
  return Math.max(byChars, byWords, 1)
}

export async function fetchWithTimeout(input: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 60_000, signal, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new Error(`Provider request timed out after ${timeoutMs} ms`)), timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason))
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
