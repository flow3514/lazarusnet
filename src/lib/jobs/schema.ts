import { z } from 'zod'

export const inferenceInputSchema = z.object({
  model: z.string().min(1).max(120),
  prompt: z.string().min(1).max(32_000),
  system: z.string().max(4_000).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(4096).default(512),
  idempotencyKey: z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/).optional(),
})
export type InferenceInput = z.infer<typeof inferenceInputSchema>
