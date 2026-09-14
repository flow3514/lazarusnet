import 'server-only'
import { randomBytes } from 'node:crypto'
import { getAddress, isAddress, verifyMessage } from 'viem'
import { db } from '@/lib/db/prisma'
import { env } from '@/lib/utils/env'
import { AppError } from '@/lib/utils/errors'

/**
 * Wallet sign-in: challenge → signature → verification (EIP-191 personal_sign,
 * SIWE-style statement). The wallet only ever signs a readable message and is
 * never asked for a transaction. The nonce is single-use and expires.
 */
const NONCE_TTL_MS = 10 * 60 * 1000

export function normalizeAddress(address: string): `0x${string}` {
  if (!isAddress(address, { strict: false })) throw new AppError('VALIDATION', 'Invalid EVM address.')
  return getAddress(address)
}

export function buildSignInMessage(opts: { address: string; nonce: string; issuedAt: string; domain: string; chainId: number }): string {
  return [
    `${opts.domain} wants you to sign in with your Ethereum account:`,
    opts.address,
    '',
    'Sign in to Lazarus Net. This signature proves you control this address. It cannot move funds.',
    '',
    `URI: ${env.appUrl}`,
    'Version: 1',
    `Chain ID: ${opts.chainId || 0}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
    `Expiration Time: ${new Date(Date.parse(opts.issuedAt) + NONCE_TTL_MS).toISOString()}`,
  ].join('\n')
}

export async function issueNonce(rawAddress: string): Promise<{ message: string; nonce: string; address: `0x${string}` }> {
  const address = normalizeAddress(rawAddress)
  const nonce = randomBytes(16).toString('hex')
  const issuedAt = new Date().toISOString()
  const prisma = db()
  await prisma.walletNonce.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { address }] } })
  await prisma.walletNonce.create({ data: { nonce, address, expiresAt: new Date(Date.now() + NONCE_TTL_MS) } })
  const domain = new URL(env.appUrl).host
  return { message: buildSignInMessage({ address, nonce, issuedAt, domain, chainId: env.chain.id }), nonce, address }
}

/** Verifies a signed challenge and consumes the nonce. Returns the checksummed address. */
export async function verifyWalletSignature(opts: { address: string; message: string; signature: string }): Promise<`0x${string}`> {
  const address = normalizeAddress(opts.address)
  const nonce = /^Nonce: (.+)$/m.exec(opts.message)?.[1]?.trim()
  if (!nonce) throw new AppError('UNAUTHORIZED', 'Challenge message is missing its nonce.')
  const prisma = db()
  const row = await prisma.walletNonce.findUnique({ where: { nonce } })
  if (!row || row.address !== address) throw new AppError('UNAUTHORIZED', 'Unknown or mismatched challenge.')
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.walletNonce.delete({ where: { nonce } }).catch(() => undefined)
    throw new AppError('UNAUTHORIZED', 'Challenge expired. Request a new one.')
  }
  const issuedAt = /^Issued At: (.+)$/m.exec(opts.message)?.[1]?.trim() ?? ''
  const expected = buildSignInMessage({ address, nonce, issuedAt, domain: new URL(env.appUrl).host, chainId: env.chain.id })
  if (expected !== opts.message) throw new AppError('UNAUTHORIZED', 'Signed message does not match the issued challenge.')
  const valid = await verifyMessage({ address, message: opts.message, signature: opts.signature as `0x${string}` }).catch(() => false)
  await prisma.walletNonce.delete({ where: { nonce } }).catch(() => undefined)
  if (!valid) throw new AppError('UNAUTHORIZED', 'Signature verification failed.')
  return address
}

/** Finds or creates the User + Wallet rows for a verified address. */
export async function upsertWalletUser(address: `0x${string}`): Promise<{ userId: string }> {
  const prisma = db()
  const existing = await prisma.wallet.findUnique({ where: { address } })
  if (existing) {
    await prisma.wallet.update({ where: { address }, data: { lastSeenAt: new Date() } })
    return { userId: existing.userId }
  }
  const user = await prisma.user.create({ data: { wallets: { create: { address, chainId: env.chain.id } }, computeAccount: { create: {} } } })
  return { userId: user.id }
}
