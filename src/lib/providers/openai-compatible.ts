import 'server-only'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'
import { estimateTokens, fetchWithTimeout, type InferenceProvider, type InferenceRequest, type InferenceResult, type ProviderBilling, type ProviderCapacity, type ProviderHealth, type ProviderJobStatus, type ProviderModel, type ProviderUsageSummary } from '@/lib/providers/provider'

/**
 * Provider A — any OpenAI-compatible inference endpoint (vLLM, TGI, Together,
 * Fireworks, OpenRouter, a self-hosted GPU box). Configure with
 *   GPU_PROVIDER=openai-compatible
 *   GPU_PROVIDER_ENDPOINT=https://host/v1
 *   GPU_PROVIDER_API_KEY=…   (optional for local vLLM)
 * The API key lives on the server only.
 */
export class OpenAICompatibleProvider implements InferenceProvider {
  readonly id = 'openai-compatible'
  readonly label = 'OpenAI-compatible endpoint'
  readonly developmentOnly = false

  get configured(): boolean {
    return env.gpu.provider === 'openai-compatible' && env.gpu.endpoint.length > 0
  }

  describeEndpoint(): string {
    try {
      const u = new URL(env.gpu.endpoint)
      return `${u.protocol}//${u.host}${u.pathname}`
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
    const res = await fetchWithTimeout(`${env.gpu.endpoint}/models`, { headers: this.headers(), timeoutMs: 10_000 })
    if (!res.ok) throw new AppError('PROVIDER_ERROR', `Provider /models answered ${res.status}.`)
    const body = (await res.json()) as { data?: { id: string; owned_by?: string; context_length?: number; max_model_len?: number }[] }
    return (body.data ?? []).map((m) => ({ id: m.id, ownedBy: m.owned_by, contextLength: m.context_length ?? m.max_model_len }))
  }

  /** OpenAI-compatible APIs do not expose GPU capacity; report honestly. */
  async getCapacity(): Promise<ProviderCapacity | null> {
    return null
  }

  async runInference(req: InferenceRequest): Promise<InferenceResult> {
    this.assertConfigured()
    const t0 = Date.now()
    const messages = [...(req.system ? [{ role: 'system', content: req.system }] : []), { role: 'user', content: req.prompt }]
    const res = await fetchWithTimeout(`${env.gpu.endpoint}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: req.model, messages, temperature: req.temperature, max_tokens: req.maxTokens, stream: false, user: req.requestId }),
      timeoutMs: 120_000,
      signal: req.signal,
    })
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      throw new AppError('PROVIDER_ERROR', `Provider answered ${res.status}.`, text)
    }
    const body = (await res.json()) as {
      id?: string
      choices?: { message?: { content?: string }; text?: string; finish_reason?: string }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
    }
    const text = body.choices?.[0]?.message?.content ?? body.choices?.[0]?.text ?? ''
    const usageReported = typeof body.usage?.prompt_tokens === 'number' && typeof body.usage?.completion_tokens === 'number'
    return {
      text,
      tokensInput: usageReported ? body.usage!.prompt_tokens! : estimateTokens(req.prompt) + estimateTokens(req.system ?? ''),
      tokensOutput: usageReported ? body.usage!.completion_tokens! : estimateTokens(text),
      usageReported,
      providerJobId: body.id,
      finishReason: body.choices?.[0]?.finish_reason,
      latencyMs: Date.now() - t0,
      costMicroUsd: typeof body.usage?.cost === 'number' ? BigInt(Math.round(body.usage.cost * 1_000_000)) : undefined,
    }
  }

  /** Chat completions are synchronous; there is no job to poll. */
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
