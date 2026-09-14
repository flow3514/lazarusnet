import 'server-only'
import { env } from '@/lib/utils/env'
import type { InferenceProvider } from '@/lib/providers/provider'
import { OpenAICompatibleProvider } from '@/lib/providers/openai-compatible'
import { OllamaProvider } from '@/lib/providers/ollama'
import { MockProvider } from '@/lib/providers/mock'

/**
 * Provider registry. The active provider is chosen by GPU_PROVIDER; adding a
 * vendor means adding one adapter file and one line here.
 */
const registry: Record<string, () => InferenceProvider> = {
  'openai-compatible': () => new OpenAICompatibleProvider(),
  ollama: () => new OllamaProvider(),
  mock: () => new MockProvider(),
}

let active: InferenceProvider | null | undefined

/** The configured provider, or null when none is configured (or the mock is requested in production). */
export function getProvider(): InferenceProvider | null {
  if (active !== undefined) return active
  const factory = env.gpu.provider ? registry[env.gpu.provider] : undefined
  const p = factory ? factory() : null
  active = p && p.configured ? p : null
  return active
}

export function providerConfigured(): boolean {
  return getProvider() !== null
}

export function isDevelopmentProvider(): boolean {
  return getProvider()?.developmentOnly === true
}

/** Secret-free description for status panels. */
export function providerSummary(): { id: string; label: string; configured: boolean; developmentMode: boolean; endpoint: string } {
  const p = getProvider()
  if (!p) return { id: env.gpu.provider || 'none', label: 'Not configured', configured: false, developmentMode: false, endpoint: '' }
  return { id: p.id, label: p.label, configured: true, developmentMode: p.developmentOnly, endpoint: p.describeEndpoint() }
}
