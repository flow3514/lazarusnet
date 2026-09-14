import 'server-only'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'
import { estimateTokens, fetchWithTimeout, type InferenceProvider, type InferenceRequest, type InferenceResult, type ProviderBilling, type ProviderCapacity, type ProviderHealth, type ProviderJobStatus, type ProviderModel, type ProviderUsageSummary } from '@/lib/providers/provider'

/**
 * Provider B — an Ollama server (self-hosted GPU node). Configure with
 *   GPU_PROVIDER=ollama
 *   GPU_PROVIDER_ENDPOINT=http://gpu-host:11434
 * Ollama reports real prompt/completion token counts in its response.
 */
export class OllamaProvider implements InferenceProvider {
  readonly id = 'ollama'
  readonly label = 'Ollama node'
  readonly developmentOnly = false

  get configured(): boolean {
    return env.gpu.provider === 'ollama' && env.gpu.endpoint.length > 0
  }

  describeEndpoint(): string {
    try {
      const u = new URL(env.gpu.endpoint)
      return `${u.protocol}//${u.host}`
    } catch {
      return 'invalid GPU_PROVIDER_ENDPOINT'
    }
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' }
    if (env.gpu.apiKey) h.authorization = `Bearer ${env.gpu.apiKey}`
    return h
  }

  private assertConfigured() {
    if (!this.configured) throw new AppError('PROVIDER_NOT_CONFIGURED', 'Compute provider not configured.')
  }

  async getAvailableModels(): Promise<ProviderModel[]> {
    this.assertConfigured()
    const res = await fetchWithTimeout(`${env.gpu.endpoint}/api/tags`, { headers: this.headers(), timeoutMs: 10_000 })
    if (!res.ok) throw new AppError('PROVIDER_ERROR', `Ollama /api/tags answered ${res.status}.`)
    const body = (await res.json()) as { models?: { name: string; details?: { family?: string } }[] }
    return (body.models ?? []).map((m) => ({ id: m.name, ownedBy: m.details?.family }))
  }

  /** Ollama exposes loaded models via /api/ps, not GPU inventory. Report what it tells us. */
  async getCapacity(): Promise<ProviderCapacity | null> {
    if (!this.configured) return null
    try {
      const res = await fetchWithTimeout(`${env.gpu.endpoint}/api/ps`, { headers: this.headers(), timeoutMs: 8_000 })
      if (!res.ok) return null
      const body = (await res.json()) as { models?: unknown[] }
      return { queueDepth: undefined, gpus: undefined, utilization: undefined, reportedAt: new Date().toISOString(), gpuType: `${(body.models ?? []).length} model(s) loaded` }
    } catch {
      return null
    }
  }

  async runInference(req: InferenceRequest): Promise<InferenceResult> {
    this.assertConfigured()
    const t0 = Date.now()
    const messages = [...(req.system ? [{ role: 'system', content: req.system }] : []), { role: 'user', content: req.prompt }]
    const res = await fetchWithTimeout(`${env.gpu.endpoint}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: req.model, messages, stream: false, options: { temperature: req.temperature, num_predict: req.maxTokens } }),
      timeoutMs: 180_000,
      signal: req.signal,
    })
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      throw new AppError('PROVIDER_ERROR', `Ollama answered ${res.status}.`, text)
    }
    const body = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number; done_reason?: string }
    const text = body.message?.content ?? ''
    const usageReported = typeof body.prompt_eval_count === 'number' && typeof body.eval_count === 'number'
    return {
      text,
      tokensInput: usageReported ? body.prompt_eval_count! : estimateTokens(req.prompt),
      tokensOutput: usageReported ? body.eval_count! : estimateTokens(text),
      usageReported,
      finishReason: body.done_reason,
      latencyMs: Date.now() - t0,
    }
  }

  async getJobStatus(): Promise<ProviderJobStatus> {
    return { status: 'unknown', detail: 'Synchronous provider: completion status is final at response time.' }
  }

  async getUsage(): Promise<ProviderUsageSummary | null> {
    return null
  }

  async getBilling(): Promise<ProviderBilling | null> {
    return null
  }

  async health(): Promise<ProviderHealth> {
    if (!this.configured) return { ok: false, error: 'Compute provider not configured' }
    const t0 = Date.now()
    try {
      const models = await this.getAvailableModels()
      return { ok: true, latencyMs: Date.now() - t0, modelCount: models.length }
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - t0, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) }
    }
  }
}
