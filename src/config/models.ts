/**
 * Open-weight model catalogue. This is the *registry seed*: names, publishers,
 * architecture and pricing policy. Availability is NEVER declared here — it is
 * discovered at runtime by /api/models/status against the configured provider.
 *
 * Lazarus Net does not own or claim any of these models; each belongs to the
 * publisher listed and is used under its own licence.
 */
export type ModelCategory = 'General reasoning' | 'Code' | 'Research' | 'Embedding' | 'Vision'

export interface ModelSeed {
  id: string
  name: string
  /** Publisher of the open weights. */
  publisher: string
  type: ModelCategory
  architecture: string
  contextLength: number
  /** Network list price for external usage, µUSD per million tokens. */
  pricePerMillionTokens: bigint
  /** Holder cost, µcredits per million tokens. */
  creditsPerMillionTokens: bigint
  holderAccess: boolean
  /** Provider-side identifier (OpenAI-compatible endpoints usually use the HF repo id). */
  endpointModel: string
  /** Other ids the same weights are served under (Groq, Together, OpenRouter, Fireworks, Ollama…). */
  aliases: string[]
  requirements: string
  license: string
}

const usd = (dollars: number) => BigInt(Math.round(dollars * 1_000_000))
const cr = (credits: number) => BigInt(Math.round(credits * 1_000_000))

export const modelSeeds: ModelSeed[] = [
  { id: 'llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', publisher: 'Meta', type: 'General reasoning', architecture: 'Dense transformer, 70B', contextLength: 131072, pricePerMillionTokens: usd(0.9), creditsPerMillionTokens: cr(90), holderAccess: true, endpointModel: 'meta-llama/Llama-3.3-70B-Instruct', aliases: ['llama-3.3-70b-versatile','meta-llama/Llama-3.3-70B-Instruct-Turbo','meta-llama/llama-3.3-70b-instruct','accounts/fireworks/models/llama-v3p3-70b-instruct','llama3.3:70b'], requirements: '2× 80 GB (bf16) or 1× 80 GB (int4)', license: 'Llama 3.3 Community License' },
  { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', publisher: 'Meta', type: 'General reasoning', architecture: 'Dense transformer, 8B', contextLength: 131072, pricePerMillionTokens: usd(0.18), creditsPerMillionTokens: cr(18), holderAccess: true, endpointModel: 'meta-llama/Llama-3.1-8B-Instruct', aliases: ['llama-3.1-8b-instant','meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo','meta-llama/llama-3.1-8b-instruct','accounts/fireworks/models/llama-v3p1-8b-instruct','llama3.1:8b','llama3.1'], requirements: '1× 24 GB', license: 'Llama 3.1 Community License' },
  { id: 'qwen2.5-72b-instruct', name: 'Qwen2.5 72B Instruct', publisher: 'Alibaba Qwen', type: 'General reasoning', architecture: 'Dense transformer, 72B', contextLength: 131072, pricePerMillionTokens: usd(0.9), creditsPerMillionTokens: cr(90), holderAccess: true, endpointModel: 'Qwen/Qwen2.5-72B-Instruct', aliases: ['Qwen/Qwen2.5-72B-Instruct-Turbo','qwen/qwen-2.5-72b-instruct','accounts/fireworks/models/qwen2p5-72b-instruct','qwen2.5:72b'], requirements: '2× 80 GB (bf16)', license: 'Qwen License' },
  { id: 'qwen2.5-coder-32b', name: 'Qwen2.5 Coder 32B', publisher: 'Alibaba Qwen', type: 'Code', architecture: 'Dense transformer, 32B', contextLength: 131072, pricePerMillionTokens: usd(0.8), creditsPerMillionTokens: cr(80), holderAccess: true, endpointModel: 'Qwen/Qwen2.5-Coder-32B-Instruct', aliases: ['qwen-2.5-coder-32b','Qwen/Qwen2.5-Coder-32B-Instruct','qwen/qwen-2.5-coder-32b-instruct','accounts/fireworks/models/qwen2p5-coder-32b-instruct','qwen2.5-coder:32b'], requirements: '1× 80 GB (bf16)', license: 'Apache 2.0' },
  { id: 'deepseek-r1-distill-70b', name: 'DeepSeek R1 Distill Llama 70B', publisher: 'DeepSeek', type: 'Research', architecture: 'Reasoning distillation, 70B', contextLength: 131072, pricePerMillionTokens: usd(0.9), creditsPerMillionTokens: cr(90), holderAccess: true, endpointModel: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B', aliases: ['deepseek-r1-distill-llama-70b','deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free','deepseek/deepseek-r1-distill-llama-70b','accounts/fireworks/models/deepseek-r1-distill-llama-70b','deepseek-r1:70b'], requirements: '2× 80 GB (bf16)', license: 'MIT' },
  { id: 'mistral-small-24b', name: 'Mistral Small 3 24B', publisher: 'Mistral AI', type: 'General reasoning', architecture: 'Dense transformer, 24B', contextLength: 32768, pricePerMillionTokens: usd(0.3), creditsPerMillionTokens: cr(30), holderAccess: true, endpointModel: 'mistralai/Mistral-Small-24B-Instruct-2501', aliases: ['mistralai/Mistral-Small-24B-Instruct-2501','mistralai/mistral-small-24b-instruct-2501','mistral-small:24b','mistral-small'], requirements: '1× 48 GB', license: 'Apache 2.0' },
  { id: 'gemma-3-27b', name: 'Gemma 3 27B', publisher: 'Google', type: 'Vision', architecture: 'Multimodal transformer, 27B', contextLength: 131072, pricePerMillionTokens: usd(0.4), creditsPerMillionTokens: cr(40), holderAccess: true, endpointModel: 'google/gemma-3-27b-it', aliases: ['google/gemma-3-27b-it','gemma-3-27b-it','gemma3:27b'], requirements: '1× 80 GB', license: 'Gemma Terms of Use' },
  { id: 'nomic-embed-text-v1.5', name: 'Nomic Embed Text v1.5', publisher: 'Nomic AI', type: 'Embedding', architecture: 'BERT-style encoder, 137M', contextLength: 8192, pricePerMillionTokens: usd(0.02), creditsPerMillionTokens: cr(2), holderAccess: true, endpointModel: 'nomic-ai/nomic-embed-text-v1.5', aliases: ['nomic-ai/nomic-embed-text-v1.5','nomic-embed-text'], requirements: 'CPU or any GPU', license: 'Apache 2.0' },
]

export const modelCategories: { id: ModelCategory; blurb: string }[] = [
  { id: 'General reasoning', blurb: 'Instruction-tuned chat and reasoning models for everyday inference.' },
  { id: 'Code', blurb: 'Completion and repair models tuned on source code.' },
  { id: 'Research', blurb: 'Long-form reasoning distillations for analysis and experimentation.' },
  { id: 'Embedding', blurb: 'Dense vector encoders for retrieval and clustering.' },
  { id: 'Vision', blurb: 'Multimodal models that read images alongside text.' },
]
