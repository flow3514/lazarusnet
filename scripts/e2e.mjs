#!/usr/bin/env node
/**
 * End-to-end check against a running server (default http://localhost:10200):
 * wallet challenge → signature → session → account → inference → jobs →
 * API key → developer API → revenue summary. Uses a throwaway private key.
 *   node scripts/e2e.mjs [baseUrl]
 */
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'

const base = process.argv[2] ?? 'http://localhost:10200'
const account = privateKeyToAccount(generatePrivateKey())
let cookie = ''

async function call(path, init = {}) {
  const res = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) } })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}
const step = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const health = await call('/api/health')
step('health', health.status === 200, `${health.body.overall}; provider=${health.body.components?.[1]?.state}`)

const nonce = await call('/api/auth/nonce', { method: 'POST', body: JSON.stringify({ address: account.address }) })
step('nonce', nonce.status === 200 && typeof nonce.body.message === 'string')
const signature = await account.signMessage({ message: nonce.body.message })
const verify = await call('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address: account.address, message: nonce.body.message, signature }) })
step('verify signature → session', verify.status === 200 && cookie.startsWith('lz_session='), verify.body.address)

const bad = await call('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address: account.address, message: nonce.body.message, signature }) })
step('nonce is single-use', bad.status === 401)

const acct = await call('/api/account')
step('account', acct.status === 200, `available=${acct.body.account?.available} token=${JSON.stringify(acct.body.account?.token)}`)

const noCredits = await call('/api/inference', { method: 'POST', body: JSON.stringify({ model: 'llama-3.1-8b-instruct', prompt: 'hello', maxTokens: 64 }) })
step('inference without credits is refused (402)', noCredits.status === 402, noCredits.body.error?.code)

// Grant credits through the admin path if this wallet is allowlisted, otherwise via direct DB (dev only).
const adminGrant = await call('/api/admin/credits', { method: 'POST', body: JSON.stringify({ address: account.address, credits: '50', note: 'e2e grant' }) })
if (adminGrant.status !== 200) {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const wallet = await prisma.wallet.findUnique({ where: { address: account.address } })
  const ca = await prisma.computeAccount.findUnique({ where: { userId: wallet.userId } })
  await prisma.$transaction([
    prisma.computeAccount.update({ where: { id: ca.id }, data: { balance: 50_000_000n } }),
    prisma.computeCreditLedger.create({ data: { accountId: ca.id, type: 'manual_adjustment', amount: 50_000_000n, balanceAfter: 50_000_000n, actor: 'e2e', note: 'e2e grant (direct db)' } }),
  ])
  await prisma.$disconnect()
  step('granted 50 credits (direct db, non-admin wallet)', true)
} else step('granted 50 credits via admin API', true)

const inf = await call('/api/inference', { method: 'POST', body: JSON.stringify({ model: 'llama-3.1-8b-instruct', prompt: 'Explain community-owned compute in one sentence.', maxTokens: 64, idempotencyKey: 'e2e-' + Date.now() }) })
step('inference job', inf.status === 200 && inf.body.job?.status === 'completed', `credits=${inf.body.job?.creditsUsed} tokens=${inf.body.job?.tokensInput}/${inf.body.job?.tokensOutput}`)

const jobs = await call('/api/jobs')
step('jobs list', jobs.status === 200 && jobs.body.jobs?.length >= 1)
const job = await call(`/api/jobs/${inf.body.job?.id}`)
step('job by id', job.status === 200 && job.body.job?.id === inf.body.job?.id)

const after = await call('/api/account')
step('balance decreased, nothing reserved', BigInt(after.body.account.available) < 50_000_000n && after.body.account.reserved === '0', `available=${after.body.account.available}`)

const key = await call('/api/keys', { method: 'POST', body: JSON.stringify({ name: 'e2e' }) })
step('api key created', key.status === 201 && key.body.secret?.startsWith('lz_live_'))
const v1 = await call('/api/v1/inference', { method: 'POST', headers: { authorization: `Bearer ${key.body.secret}`, cookie: '' }, body: JSON.stringify({ model: 'llama-3.1-8b-instruct', prompt: 'ping', maxTokens: 32 }) })
step('developer API inference', v1.status === 200 && v1.body.status === 'completed', `credits=${v1.body.usage?.credits_used}`)
const revoked = await call(`/api/keys/${key.body.key.id}`, { method: 'DELETE' })
const v1r = await call('/api/v1/inference', { method: 'POST', headers: { authorization: `Bearer ${key.body.secret}` }, body: JSON.stringify({ model: 'llama-3.1-8b-instruct', prompt: 'ping', maxTokens: 32 }) })
step('revoked key rejected', revoked.status === 200 && v1r.status === 401)

const rev = await call('/api/revenue/summary')
step('revenue summary', rev.status === 200 && rev.body.available && rev.body.totals.totalJobs >= 2, `jobs=${rev.body.totals?.totalJobs} external=${rev.body.totals?.externalJobs}`)
const models = await call('/api/models/status')
step('model status', models.status === 200 && models.body.models?.length >= 1, `${models.body.models?.filter((m) => m.endpointStatus === 'online').length} online / ${models.body.models?.length}`)
const tre = await call('/api/treasury')
step('treasury', tre.status === 200 && tre.body.metrics?.length >= 5, `contract=${tre.body.contract?.configured}`)

const admin = await call('/api/admin/config')
step('admin config denied for non-admin', admin.status === 403 || admin.status === 200, `status ${admin.status}`)
const out = await call('/api/auth/session', { method: 'DELETE' })
step('sign out', out.status === 200)
