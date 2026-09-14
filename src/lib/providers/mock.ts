import 'server-only'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'
import { estimateTokens, type InferenceProvider, type InferenceRequest, type InferenceResult, type ProviderBilling, type ProviderCapacity, type ProviderHealth, type ProviderJobStatus, type ProviderModel, type ProviderUsageSummary } from '@/lib/providers/provider'
import { modelSeeds } from '@/config/models'

/**
 * DEVELOPMENT MODE ONLY. Exercises the credit engine, job pipeline and UI
 * without a GPU. It refuses to exist in production, every response is
 * prefixed with a "Development mode" banner, and it never reports capacity,
 * usage or billing (all null) so no dashboard can mistake it for real data.
 */
export class MockProvider implements InferenceProvider {
  readonly id = 'mock'
  readonly label = 'Development mode (mock)'
  readonly developmentOnly = true

  get configured(): boolean {
    return env.gpu.provider === 'mock' && !env.isProduction
  }

  describeEndpoint(): string {
    return 'in-process mock — no GPU, no network'
  }

  private assertConfigured() {
    if (env.isProduction) throw new AppError('PROVIDER_NOT_CONFIGURED', 'The mock provider is disabled in production.')
    if (!this.configured) throw new AppError('PROVIDER_NOT_CONFIGURED', 'Compute provider not configured.')
  }

  async getAvailableModels(): Promise<ProviderModel[]> {
    this.assertConfigured()
    // Only a subset is "online" so the registry's OFFLINE path is exercised too.
    return modelSeeds.filter((_, i) => i % 3 !== 2).map((m) => ({ id: m.endpointModel, ownedBy: m.publisher, contextLength: m.contextLength }))
  }

  async getCapacity(): Promise<ProviderCapacity | null> {
    return null
  }

  async runInference(req: InferenceRequest): Promise<InferenceResult> {
    this.assertConfigured()
    const t0 = Date.now()
    await new Promise((r) => setTimeout(r, 400 + Math.min(1200, req.maxTokens)))
    const words = req.prompt.split(/\s+/).filter(Boolean)
    const echo = words.slice(0, 40).join(' ')
    const text = [
      '[Development mode — mock provider. This is not model output.]',
      '',
      `Model requested: ${req.model}`,
      `Temperature: ${req.temperature}, max_tokens: ${req.maxTokens}`,
      `Prompt (${words.length} words): "${echo}${words.length > 40 ? ' …' : ''}"`,
      '',
      'Configure GPU_PROVIDER + GPU_PROVIDER_ENDPOINT to run real inference.',
    ].join('\n')
    const tokensOutput = Math.min(req.maxTokens, estimateTokens(text))
    return { text, tokensInput: estimateTokens(req.prompt) + estimateTokens(req.system ?? ''), tokensOutput, usageReported: false, providerJobId: `mock_${t0.toString(36)}`, finishReason: 'stop', latencyMs: Date.now() - t0 }
  }

  async getJobStatus(): Promise<ProviderJobStatus> {
    return { status: 'completed', detail: 'Development mode' }
  }

  async getUsage(): Promise<ProviderUsageSummary | null> {
    return null
  }

  async getBilling(): Promise<ProviderBilling | null> {
    return null
  }

  async health(): Promise<ProviderHealth> {
    if (!this.configured) return { ok: false, error: env.isProduction ? 'Mock provider is disabled in production' : 'Compute provider not configured' }
    return { ok: true, latencyMs: 0, modelCount: (await this.getAvailableModels()).length }
  }
}
