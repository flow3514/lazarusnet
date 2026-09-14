import 'server-only'
import { getAddress, parseAbi } from 'viem'
import { publicClient } from '@/lib/blockchain/client'
import { db, hasDatabase } from '@/lib/db/prisma'
import { getProtocolSettings, resolveContracts, type ContractSource } from '@/lib/admin/config'
import { publicChain } from '@/lib/utils/public-env'

/**
 * Compute Treasury data adapters.
 *
 *  - `contract`  reads the LazarusTreasury contract when NEXT_PUBLIC_TREASURY_CONTRACT is set
 *  - `database`  reads TreasuryRecord rows an admin recorded (each with a tx hash)
 *
 * A metric with no source is returned as `awaiting` — the UI shows
 * "Awaiting treasury contract integration." rather than a number.
 */
export type MetricStatus = 'live' | 'awaiting' | 'error'
export type MetricUnit = 'micro_usd' | 'wei' | 'bps' | 'units' | 'raw'

export interface TreasuryMetric {
  id: string
  label: string
  value: string | null
  unit: MetricUnit
  source: 'contract' | 'database' | 'config' | 'none'
  status: MetricStatus
  updatedAt: string | null
  note?: string
}

export interface TreasurySnapshot {
  contract: { configured: boolean; address: string | null; source: ContractSource; chainId: number; explorerUrl: string | null }
  allocationBps: { value: number; source: 'contract' | 'config' }
  metrics: TreasuryMetric[]
  records: TreasuryRecordView[]
  generatedAt: string
}

export interface TreasuryRecordView {
  id: string
  type: string
  amountMicroUsd: string
  capacityUnits: number | null
  txHash: string | null
  blockNumber: string | null
  note: string | null
  createdAt: string
}

/**
 * Minimal interface the treasury contract is expected to expose. Any contract
 * implementing these three views can be wired in; missing functions surface as
 * per-metric errors, never as zeros.
 */
export const treasuryAbi = parseAbi([
  'function totalProtocolFees() view returns (uint256)',
  'function computeAllocationBps() view returns (uint256)',
  'function totalComputeSpend() view returns (uint256)',
  'function computeBudget() view returns (uint256)',
  'function owner() view returns (address)',
])

async function contractAddress(): Promise<`0x${string}` | null> {
  const { treasury } = await resolveContracts()
  return treasury ? getAddress(treasury) : null
}

async function readView(fn: 'totalProtocolFees' | 'computeAllocationBps' | 'totalComputeSpend' | 'computeBudget'): Promise<{ value: bigint } | { error: string }> {
  const client = publicClient()
  const address = await contractAddress()
  if (!client || !address) return { error: 'not configured' }
  try {
    const value = await client.readContract({ address, abi: treasuryAbi, functionName: fn })
    return { value }
  } catch (e) {
    return { error: (e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160) }
  }
}

export async function getProtocolFees(): Promise<TreasuryMetric> {
  const base = { id: 'protocol_fees', label: 'Protocol Fees', unit: 'wei' as MetricUnit }
  if (!(await contractAddress())) return { ...base, value: null, source: 'none', status: 'awaiting', updatedAt: null }
  const r = await readView('totalProtocolFees')
  if ('error' in r) return { ...base, value: null, source: 'contract', status: 'error', updatedAt: null, note: r.error }
  return { ...base, value: r.value.toString(), source: 'contract', status: 'live', updatedAt: new Date().toISOString() }
}

export async function getComputeAllocation(): Promise<TreasuryMetric> {
  const base = { id: 'compute_allocation', label: 'Compute Allocation', unit: 'bps' as MetricUnit }
  if (await contractAddress()) {
    const r = await readView('computeAllocationBps')
    if ('value' in r) return { ...base, value: r.value.toString(), source: 'contract', status: 'live', updatedAt: new Date().toISOString() }
    const settings = await getProtocolSettings()
    return { ...base, value: String(settings.treasuryAllocationBps), source: 'config', status: 'live', updatedAt: settings.updatedAt, note: `Contract read failed (${r.error}); showing protocol configuration.` }
  }
  const settings = await getProtocolSettings()
  return { ...base, value: String(settings.treasuryAllocationBps), source: 'config', status: 'live', updatedAt: settings.updatedAt, note: 'Governance-configured percentage. On-chain enforcement awaits the treasury contract.' }
}

export async function getComputeSpend(): Promise<TreasuryMetric> {
  const base = { id: 'compute_spend', label: 'Compute Spend', unit: 'wei' as MetricUnit }
  if (await contractAddress()) {
    const r = await readView('totalComputeSpend')
    if ('value' in r) return { ...base, value: r.value.toString(), source: 'contract', status: 'live', updatedAt: new Date().toISOString() }
    return { ...base, value: null, source: 'contract', status: 'error', updatedAt: null, note: r.error }
  }
  const sum = await sumRecords('compute_spend')
  if (sum) return { ...base, value: sum.total.toString(), unit: 'micro_usd', source: 'database', status: 'live', updatedAt: sum.latest }
  return { ...base, value: null, source: 'none', status: 'awaiting', updatedAt: null }
}

export async function getTreasuryBalance(): Promise<TreasuryMetric> {
  const base = { id: 'treasury_balance', label: 'Available Treasury', unit: 'wei' as MetricUnit }
  const client = publicClient()
  const address = await contractAddress()
  if (!client || !address) return { ...base, value: null, source: 'none', status: 'awaiting', updatedAt: null }
  try {
    const wei = await client.getBalance({ address })
    return { ...base, value: wei.toString(), source: 'contract', status: 'live', updatedAt: new Date().toISOString(), note: 'Native balance of the treasury contract.' }
  } catch (e) {
    return { ...base, value: null, source: 'contract', status: 'error', updatedAt: null, note: (e instanceof Error ? e.message : String(e)).slice(0, 160) }
  }
}

export async function getComputeBudget(): Promise<TreasuryMetric> {
  const base = { id: 'compute_budget', label: 'Compute Budget', unit: 'wei' as MetricUnit }
  if (!(await contractAddress())) return { ...base, value: null, source: 'none', status: 'awaiting', updatedAt: null }
  const r = await readView('computeBudget')
  if ('error' in r) return { ...base, value: null, source: 'contract', status: 'error', updatedAt: null, note: r.error }
  return { ...base, value: r.value.toString(), source: 'contract', status: 'live', updatedAt: new Date().toISOString(), note: 'Fees × allocation − compute spend: what may still be paid to providers.' }
}

export async function getGpuCapacityPurchased(): Promise<TreasuryMetric> {
  const base = { id: 'gpu_capacity', label: 'GPU Capacity Purchased', unit: 'units' as MetricUnit }
  const sum = await sumRecords('gpu_capacity_purchase')
  if (sum) return { ...base, value: String(sum.units), source: 'database', status: 'live', updatedAt: sum.latest, note: 'GPU-hours recorded by protocol admins with transaction references.' }
  return { ...base, value: null, source: 'none', status: 'awaiting', updatedAt: null }
}

async function sumRecords(type: 'compute_spend' | 'gpu_capacity_purchase' | 'fee_inflow' | 'compute_allocation'): Promise<{ total: bigint; units: number; latest: string } | null> {
  if (!hasDatabase()) return null
  try {
    const rows = await db().treasuryRecord.findMany({ where: { type }, orderBy: { createdAt: 'desc' } })
    if (rows.length === 0) return null
    return { total: rows.reduce((a, r) => a + r.amountMicroUsd, 0n), units: rows.reduce((a, r) => a + (r.capacityUnits ?? 0), 0), latest: rows[0].createdAt.toISOString() }
  } catch {
    return null
  }
}

export async function listTreasuryRecords(limit = 25): Promise<TreasuryRecordView[]> {
  if (!hasDatabase()) return []
  try {
    const rows = await db().treasuryRecord.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
    return rows.map((r) => ({ id: r.id, type: r.type, amountMicroUsd: r.amountMicroUsd.toString(), capacityUnits: r.capacityUnits, txHash: r.txHash, blockNumber: r.blockNumber?.toString() ?? null, note: r.note, createdAt: r.createdAt.toISOString() }))
  } catch {
    return []
  }
}

export async function getTreasurySnapshot(): Promise<TreasurySnapshot> {
  const [fees, allocation, spend, balance, budget, gpu, records] = await Promise.all([getProtocolFees(), getComputeAllocation(), getComputeSpend(), getTreasuryBalance(), getComputeBudget(), getGpuCapacityPurchased(), listTreasuryRecords()])
  const address = await contractAddress()
  const { source } = await resolveContracts()
  return {
    contract: { configured: address !== null, address, source: source.treasury, chainId: publicChain.id, explorerUrl: address && publicChain.explorerUrl ? `${publicChain.explorerUrl}/address/${address}` : null },
    allocationBps: { value: Number(allocation.value ?? 0), source: allocation.source === 'contract' ? 'contract' : 'config' },
    metrics: [fees, allocation, spend, balance, budget, gpu],
    records,
    generatedAt: new Date().toISOString(),
  }
}
