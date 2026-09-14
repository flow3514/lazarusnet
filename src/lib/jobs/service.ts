import 'server-only'
import { createHash } from 'node:crypto'
import type { ComputeJob, JobOrigin } from '@prisma/client'
import { db } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'
import { getProvider } from '@/lib/providers'
import { estimateTokens } from '@/lib/providers/provider'
import { getRunnableModel } from '@/lib/models/registry'
import { finalizeUsage, getOrCreateAccount, releaseReservation, reserveCredits } from '@/lib/credits/accounting'
import { reservationSafetyBps } from '@/config/tokenomics'

/**
 * Inference job pipeline. Every call:
 *   1. verifies the caller (session or API key — done by the route)
 *   2. loads the model and the caller's compute account
 *   3. reserves an estimated credit amount under a row lock
 *   4. executes inference through the provider adapter
 *   5. converts real usage into a charge, writes the ledger, usage & revenue rows
 *   6. on failure releases the reservation and marks the job failed
 * Idempotency: (walletAddress, idempotencyKey) is unique — a retry returns the original job.
 */
export interface RunJobInput {
  userId: string
  walletAddress: `0x${string}`
  origin: JobOrigin
  apiKeyId?: string
  model: string
  prompt: string
  system?: string
  temperature: number
  maxTokens: number
  idempotencyKey?: string
}

export interface JobView {
  id: string
  walletAddress: string
  origin: JobOrigin
  provider: string
  model: string
  promptHash: string
  tokensInput: number
  tokensOutput: number
  creditsReserved: string
  creditsUsed: string
  status: ComputeJob['status']
  providerJobId: string | null
  errorMessage: string | null
  output: string | null
  latencyMs: number | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export function toJobView(j: ComputeJob, includeOutput = true): JobView {
  return {
    id: j.id,
    walletAddress: j.walletAddress,
    origin: j.origin,
    provider: j.provider,
    model: j.model,
    promptHash: j.promptHash,
    tokensInput: j.tokensInput,
    tokensOutput: j.tokensOutput,
    creditsReserved: j.creditsReserved.toString(),
    creditsUsed: j.creditsUsed.toString(),
    status: j.status,
    providerJobId: j.providerJobId,
    errorMessage: j.errorMessage,
    output: includeOutput ? j.output : null,
    latencyMs: j.latencyMs,
    createdAt: j.createdAt.toISOString(),
    startedAt: j.startedAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
  }
}

const MILLION = 1_000_000n
const OUTPUT_CAP = 16_000

export function creditsForTokens(tokens: number, creditsPerMillion: bigint): bigint {
  return (BigInt(Math.max(0, Math.ceil(tokens))) * creditsPerMillion + MILLION - 1n) / MILLION
}

export function usdForTokens(tokens: number, microUsdPerMillion: bigint): bigint {
  return (BigInt(Math.max(0, Math.ceil(tokens))) * microUsdPerMillion + MILLION - 1n) / MILLION
}

export async function runInferenceJob(input: RunJobInput): Promise<JobView> {
  const provider = getProvider()
  if (!provider) throw new AppError('PROVIDER_NOT_CONFIGURED', 'Compute provider not configured.')
  const prisma = db()

  if (input.idempotencyKey) {
    const prior = await prisma.computeJob.findUnique({ where: { walletAddress_idempotencyKey: { walletAddress: input.walletAddress, idempotencyKey: input.idempotencyKey } } })
    if (prior) return toJobView(prior)
  }

  const model = await getRunnableModel(input.model, input.origin === 'wallet')
  const creditsPerMillion = BigInt(model.creditsPerMillionTokens)
  const promptTokens = estimateTokens(input.prompt) + estimateTokens(input.system ?? '')
  const estimateTokensTotal = promptTokens + input.maxTokens
  const reservation = (creditsForTokens(estimateTokensTotal, creditsPerMillion) * BigInt(reservationSafetyBps)) / 10_000n
  const promptHash = createHash('sha256').update(input.prompt).digest('hex')

  const account = await getOrCreateAccount(input.userId)

  // 3. reserve + create the job atomically.
  const job = await prisma.$transaction(async (tx) => {
    await reserveCredits(tx, account.id, reservation)
    return tx.computeJob.create({
      data: {
        userId: input.userId,
        walletAddress: input.walletAddress,
        origin: input.origin,
        apiKeyId: input.apiKeyId,
        provider: provider.id,
        model: model.id,
        promptHash,
        idempotencyKey: input.idempotencyKey,
        creditsReserved: reservation,
        status: 'running',
        startedAt: new Date(),
      },
    })
  })

  // 4. execute.
  try {
    const result = await provider.runInference({ model: model.endpointModel || model.id, prompt: input.prompt, system: input.system, temperature: input.temperature, maxTokens: input.maxTokens, requestId: job.id })
    const totalTokens = result.tokensInput + result.tokensOutput
    const actual = creditsForTokens(totalTokens, creditsPerMillion)
    const listPrice = usdForTokens(totalTokens, BigInt(model.pricePerMillionTokens))

    // 5. finalize.
    const finished = await prisma.$transaction(async (tx) => {
      const charged = await finalizeUsage(tx, account.id, job.id, reservation, actual, `${model.name}: ${totalTokens} tokens${result.usageReported ? '' : ' (estimated)'}`)
      const updated = await tx.computeJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          tokensInput: result.tokensInput,
          tokensOutput: result.tokensOutput,
          creditsUsed: charged,
          providerJobId: result.providerJobId,
          output: input.origin === 'wallet' ? result.text.slice(0, OUTPUT_CAP) : null,
          latencyMs: result.latencyMs,
          completedAt: new Date(),
        },
      })
      await tx.providerUsage.create({ data: { provider: provider.id, model: model.id, jobId: job.id, tokensInput: result.tokensInput, tokensOutput: result.tokensOutput, costMicroUsd: result.costMicroUsd, latencyMs: result.latencyMs } })
      // Revenue accounting: external (API-key) usage is metered at the model's list price;
      // holder usage is recorded as subsidy cost at the same list price. Settlement is not implied.
      await tx.revenueRecord.create({
        data: {
          source: input.origin === 'api_key' ? 'external_api' : 'holder_subsidy',
          jobId: job.id,
          amountMicroUsd: listPrice,
          note: `${totalTokens} tokens × ${model.id} list price${provider.developmentOnly ? ' [development mode]' : ''}`,
        },
      })
      return updated
    })
    return { ...toJobView(finished), output: result.text.slice(0, OUTPUT_CAP) }
  } catch (e) {
    const message = e instanceof AppError ? `${e.message}${e.detail ? ` ${e.detail}` : ''}` : e instanceof Error ? e.message : String(e)
    const failed = await prisma.$transaction(async (tx) => {
      await releaseReservation(tx, account.id, reservation)
      return tx.computeJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: message.slice(0, 500), completedAt: new Date() } })
    })
    if (e instanceof AppError) throw e
    return toJobView(failed)
  }
}

export async function getJob(id: string, walletAddress?: string): Promise<JobView | null> {
  const j = await db().computeJob.findUnique({ where: { id } })
  if (!j) return null
  if (walletAddress && j.walletAddress !== walletAddress) return null
  return toJobView(j)
}

export async function listJobs(walletAddress: string, limit = 50): Promise<JobView[]> {
  const rows = await db().computeJob.findMany({ where: { walletAddress }, orderBy: { createdAt: 'desc' }, take: Math.min(200, limit) })
  return rows.map((j) => toJobView(j, false))
}
