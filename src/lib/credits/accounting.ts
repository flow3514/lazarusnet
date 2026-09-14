import 'server-only'
import type { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db/prisma'
import { AppError } from '@/lib/utils/errors'
import { readTokenBalance, tokenConfigured } from '@/lib/blockchain/token'
import { getProtocolSettings } from '@/lib/admin/config'
import { epochKey, nextEpochStart, nextTier, resolveTier } from '@/lib/credits/tiers'
import { CREDIT_SCALE, parseUnits } from '@/lib/utils/format'
import type { HolderTier } from '@/config/tokenomics'

type Tx = Prisma.TransactionClient | PrismaClient

/**
 * Compute-credit accounting.
 *
 *  balance   — spendable µcredits (never negative)
 *  reserved  — µcredits held by in-flight jobs
 *  available — balance − reserved
 *
 * Every mutation locks the account row (SELECT … FOR UPDATE) inside a
 * transaction so two concurrent jobs cannot both spend the same credit.
 */
export interface LockedAccount {
  id: string
  balance: bigint
  reserved: bigint
}

export async function lockAccount(tx: Tx, accountId: string): Promise<LockedAccount> {
  const rows = await tx.$queryRaw<{ id: string; balance: bigint; reserved: bigint }[]>`SELECT id, balance, reserved FROM "ComputeAccount" WHERE id = ${accountId} FOR UPDATE`
  if (rows.length === 0) throw new AppError('NOT_FOUND', 'Compute account not found.')
  return { id: rows[0].id, balance: BigInt(rows[0].balance), reserved: BigInt(rows[0].reserved) }
}

export async function getOrCreateAccount(userId: string, tx: Tx = db()) {
  const existing = await tx.computeAccount.findUnique({ where: { userId } })
  if (existing) return existing
  return tx.computeAccount.create({ data: { userId } })
}

/** Holds `amount` µcredits. Throws INSUFFICIENT_CREDITS when available < amount. */
export async function reserveCredits(tx: Tx, accountId: string, amount: bigint): Promise<void> {
  if (amount < 0n) throw new AppError('VALIDATION', 'Reservation must be non-negative.')
  const acct = await lockAccount(tx, accountId)
  const available = acct.balance - acct.reserved
  if (available < amount) {
    throw new AppError('INSUFFICIENT_CREDITS', `Insufficient compute credits: need ${Number(amount) / 1e6} but ${Number(available) / 1e6} available.`)
  }
  await tx.computeAccount.update({ where: { id: accountId }, data: { reserved: { increment: amount } } })
}

/** Releases a hold without charging (failed job). */
export async function releaseReservation(tx: Tx, accountId: string, amount: bigint): Promise<void> {
  const acct = await lockAccount(tx, accountId)
  const dec = amount > acct.reserved ? acct.reserved : amount
  await tx.computeAccount.update({ where: { id: accountId }, data: { reserved: { decrement: dec } } })
}

/**
 * Converts a hold into a charge. Charges min(actual, balance) so the balance
 * can never go negative, releases the whole reservation, and writes one
 * compute_usage ledger entry. Returns what was actually charged.
 */
export async function finalizeUsage(tx: Tx, accountId: string, jobId: string, reserved: bigint, actual: bigint, note?: string): Promise<bigint> {
  const acct = await lockAccount(tx, accountId)
  const releaseAmt = reserved > acct.reserved ? acct.reserved : reserved
  const charge = actual > acct.balance ? acct.balance : actual < 0n ? 0n : actual
  const balanceAfter = acct.balance - charge
  await tx.computeAccount.update({
    where: { id: accountId },
    data: { balance: balanceAfter, reserved: { decrement: releaseAmt }, lifetimeUsed: { increment: charge } },
  })
  await tx.computeCreditLedger.create({ data: { accountId, type: 'compute_usage', amount: -charge, balanceAfter, jobId, note } })
  return charge
}

/** Credits back a previously charged amount (admin refund). */
export async function refundCredits(tx: Tx, accountId: string, amount: bigint, jobId: string | null, actor: string, note?: string): Promise<void> {
  const acct = await lockAccount(tx, accountId)
  const balanceAfter = acct.balance + amount
  await tx.computeAccount.update({ where: { id: accountId }, data: { balance: balanceAfter } })
  await tx.computeCreditLedger.create({ data: { accountId, type: 'refund', amount, balanceAfter, jobId, actor, note } })
}

export async function manualAdjustment(tx: Tx, accountId: string, amount: bigint, actor: string, note: string, type: 'manual_adjustment' | 'protocol_reward' = 'manual_adjustment'): Promise<void> {
  const acct = await lockAccount(tx, accountId)
  const balanceAfter = acct.balance + amount
  if (balanceAfter < 0n) throw new AppError('VALIDATION', 'Adjustment would make the balance negative.')
  await tx.computeAccount.update({ where: { id: accountId }, data: { balance: balanceAfter } })
  await tx.computeCreditLedger.create({ data: { accountId, type, amount, balanceAfter, actor, note } })
}

export interface AccountSummary {
  accountId: string
  balance: string
  reserved: string
  available: string
  lifetimeUsed: string
  epoch: { unit: string; key: string; nextResetAt: string }
  tier: { current: HolderTier | null; next: HolderTier | null; tiers: HolderTier[]; allocatedThisEpoch: boolean }
  token:
    | { configured: false; reason: 'chain' | 'token' }
    | { configured: true; ok: true; raw: string; formatted: string; symbol: string; decimals: number; blockNumber: string; readAt: string }
    | { configured: true; ok: false; error: string }
}

/**
 * Reads the live token balance, resolves the tier and — once per epoch —
 * credits the tier allocation. Idempotent: the (accountId, epochKey, type)
 * unique index makes a duplicate allocation impossible even under races.
 */
export async function syncAccount(userId: string, address: string): Promise<AccountSummary> {
  const settings = await getProtocolSettings()
  const account = await getOrCreateAccount(userId)
  const key = epochKey(settings.epochUnit)
  const nextResetAt = nextEpochStart(settings.epochUnit).toISOString()

  let token: AccountSummary['token'] = { configured: false, reason: 'token' }
  let tier: HolderTier | null = null
  let next: HolderTier | null = null

  if (await tokenConfigured()) {
    const res = await readTokenBalance(address)
    if (!res.configured) token = { configured: false, reason: res.reason }
    else if (!res.ok) token = { configured: true, ok: false, error: res.error }
    else {
      const { raw, meta } = res
      tier = resolveTier(raw, meta.decimals, settings.holderTiers)
      next = nextTier(raw, meta.decimals, settings.holderTiers)
      const whole = raw / 10n ** BigInt(meta.decimals)
      const frac = (raw % 10n ** BigInt(meta.decimals)).toString().padStart(meta.decimals, '0').slice(0, 2)
      token = { configured: true, ok: true, raw: raw.toString(), formatted: `${whole.toLocaleString('en-US')}.${frac}`, symbol: meta.symbol, decimals: meta.decimals, blockNumber: res.blockNumber.toString(), readAt: new Date().toISOString() }
      await db().computeAccount.update({ where: { id: account.id }, data: { lastTokenBalance: raw.toString(), lastBalanceAt: new Date(), lastTierId: tier?.id ?? null } })
    }
  }

  let allocatedThisEpoch = account.lastEpochKey === key
  if (tier && account.lastEpochKey !== key) {
    const amount = parseUnits(tier.creditsPerEpoch, 6) // credits → µcredits
    try {
      await db().$transaction(async (tx) => {
        const locked = await lockAccount(tx, account.id)
        const balanceAfter = locked.balance + amount
        await tx.computeCreditLedger.create({ data: { accountId: account.id, type: 'epoch_allocation', amount, balanceAfter, epochKey: key, note: `${tier!.name} tier allocation for ${key}` } })
        await tx.computeAccount.update({ where: { id: account.id }, data: { balance: balanceAfter, lastEpochKey: key, lastTierId: tier!.id } })
      })
      allocatedThisEpoch = true
    } catch (e) {
      // Unique violation = another request already allocated this epoch. Anything else is real.
      const msg = e instanceof Error ? e.message : String(e)
      if (!/P2002|Unique constraint/i.test(msg)) throw e
      allocatedThisEpoch = true
    }
  }

  const fresh = await db().computeAccount.findUniqueOrThrow({ where: { id: account.id } })
  return {
    accountId: fresh.id,
    balance: fresh.balance.toString(),
    reserved: fresh.reserved.toString(),
    available: (fresh.balance - fresh.reserved).toString(),
    lifetimeUsed: fresh.lifetimeUsed.toString(),
    epoch: { unit: settings.epochUnit, key, nextResetAt },
    tier: { current: tier, next, tiers: settings.holderTiers, allocatedThisEpoch },
    token,
  }
}

export { CREDIT_SCALE }
