import 'server-only'
import { db, hasDatabase } from '@/lib/db/prisma'
import { getProvider, providerSummary } from '@/lib/providers'

/**
 * Revenue accounting, derived only from rows that real jobs produced:
 *  - RevenueRecord(external_api)    metered list price of API-key jobs
 *  - RevenueRecord(holder_subsidy)  list-price-equivalent cost of holder jobs
 *  - ProviderUsage.costMicroUsd     provider-reported cost when available
 *  - treasuryMicroUsd               contribution recorded per record (0 until a policy/contract routes it)
 * An empty database yields an empty summary, never a placeholder number.
 */
export interface RevenueSummary {
  available: boolean
  reason?: string
  developmentMode: boolean
  provider: string
  window: { from: string; to: string; days: number }
  totals: {
    computeRevenueMicroUsd: string
    externalJobs: number
    holderJobs: number
    totalJobs: number
    averageRevenuePerJobMicroUsd: string | null
    treasuryContributionMicroUsd: string
    holderSubsidyMicroUsd: string
    providerCostMicroUsd: string | null
    creditsConsumed: string
    tokensTotal: number
  }
  daily: DailyPoint[]
  sources: { id: string; label: string; status: 'live' | 'awaiting'; note: string }[]
  generatedAt: string
}

export interface DailyPoint {
  date: string
  jobs: number
  externalJobs: number
  holderJobs: number
  tokens: number
  revenueMicroUsd: string
  subsidyMicroUsd: string
  creditsConsumed: string
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

export async function getRevenueSummary(days = 30): Promise<RevenueSummary> {
  const to = new Date()
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - (days - 1)))
  const provider = getProvider()
  const base = {
    developmentMode: provider?.developmentOnly === true,
    provider: providerSummary().id,
    window: { from: from.toISOString(), to: to.toISOString(), days },
    generatedAt: new Date().toISOString(),
  }
  const sources = (billing: boolean, contract: boolean): RevenueSummary['sources'] => [
    { id: 'database', label: 'Job usage records', status: 'live', note: 'Every completed job writes usage + a metered revenue record.' },
    { id: 'billing', label: 'Provider billing', status: billing ? 'live' : 'awaiting', note: billing ? 'Provider-reported cost per job.' : 'The configured provider does not report per-request cost.' },
    { id: 'contract', label: 'Settlement contract', status: contract ? 'live' : 'awaiting', note: contract ? 'On-chain revenue routing.' : 'Paid usage is metered at list price; on-chain settlement is not configured.' },
  ]

  if (!hasDatabase()) {
    return { ...base, available: false, reason: 'Database not configured', totals: emptyTotals(), daily: [], sources: sources(false, false) }
  }

  try {
    const prisma = db()
    const [jobs, records, usage] = await Promise.all([
      prisma.computeJob.findMany({ where: { status: 'completed', completedAt: { gte: from } }, select: { origin: true, tokensInput: true, tokensOutput: true, creditsUsed: true, completedAt: true } }),
      prisma.revenueRecord.findMany({ where: { createdAt: { gte: from } }, select: { source: true, amountMicroUsd: true, treasuryMicroUsd: true, createdAt: true } }),
      prisma.providerUsage.aggregate({ where: { createdAt: { gte: from }, costMicroUsd: { not: null } }, _sum: { costMicroUsd: true }, _count: { _all: true } }),
    ])

    const byDay = new Map<string, DailyPoint>()
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 86400000)
      byDay.set(dayKey(d), { date: dayKey(d), jobs: 0, externalJobs: 0, holderJobs: 0, tokens: 0, revenueMicroUsd: '0', subsidyMicroUsd: '0', creditsConsumed: '0' })
    }
    const acc = new Map<string, { revenue: bigint; subsidy: bigint; credits: bigint }>()
    const bump = (k: string) => acc.get(k) ?? (acc.set(k, { revenue: 0n, subsidy: 0n, credits: 0n }), acc.get(k)!)

    let externalJobs = 0, holderJobs = 0, tokensTotal = 0, creditsConsumed = 0n
    for (const j of jobs) {
      const k = dayKey(j.completedAt!)
      const p = byDay.get(k)
      if (p) {
        p.jobs++
        if (j.origin === 'api_key') p.externalJobs++
        else p.holderJobs++
        p.tokens += j.tokensInput + j.tokensOutput
      }
      bump(k).credits += j.creditsUsed
      if (j.origin === 'api_key') externalJobs++
      else holderJobs++
      tokensTotal += j.tokensInput + j.tokensOutput
      creditsConsumed += j.creditsUsed
    }
    let revenue = 0n, subsidy = 0n, treasury = 0n
    for (const r of records) {
      const k = dayKey(r.createdAt)
      if (r.source === 'external_api' || r.source === 'contract') {
        revenue += r.amountMicroUsd
        bump(k).revenue += r.amountMicroUsd
      } else if (r.source === 'holder_subsidy') {
        subsidy += r.amountMicroUsd
        bump(k).subsidy += r.amountMicroUsd
      }
      treasury += r.treasuryMicroUsd
    }
    for (const [k, v] of acc) {
      const p = byDay.get(k)
      if (!p) continue
      p.revenueMicroUsd = v.revenue.toString()
      p.subsidyMicroUsd = v.subsidy.toString()
      p.creditsConsumed = v.credits.toString()
    }
    const providerCost = usage._count._all > 0 && usage._sum.costMicroUsd !== null ? usage._sum.costMicroUsd.toString() : null
    return {
      ...base,
      available: true,
      totals: {
        computeRevenueMicroUsd: revenue.toString(),
        externalJobs,
        holderJobs,
        totalJobs: externalJobs + holderJobs,
        averageRevenuePerJobMicroUsd: externalJobs > 0 ? (revenue / BigInt(externalJobs)).toString() : null,
        treasuryContributionMicroUsd: treasury.toString(),
        holderSubsidyMicroUsd: subsidy.toString(),
        providerCostMicroUsd: providerCost,
        creditsConsumed: creditsConsumed.toString(),
        tokensTotal,
      },
      daily: [...byDay.values()],
      sources: sources(providerCost !== null, records.some((r) => r.source === 'contract')),
    }
  } catch (e) {
    return { ...base, available: false, reason: (e instanceof Error ? e.message : String(e)).slice(0, 200), totals: emptyTotals(), daily: [], sources: sources(false, false) }
  }
}

function emptyTotals(): RevenueSummary['totals'] {
  return { computeRevenueMicroUsd: '0', externalJobs: 0, holderJobs: 0, totalJobs: 0, averageRevenuePerJobMicroUsd: null, treasuryContributionMicroUsd: '0', holderSubsidyMicroUsd: '0', providerCostMicroUsd: null, creditsConsumed: '0', tokensTotal: 0 }
}
