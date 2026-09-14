#!/usr/bin/env node
/**
 * Publish (or clear) the Lazarus token contract address used for holder tiers.
 *
 *   npm run token:ca -- 0xTokenAddress                # Robinhood Chain (4663)
 *   npm run token:ca -- --clear                       # back to "Token contract not configured"
 *   add --local-only to skip Vercel
 *
 * Verifies the address is a readable ERC-20 on chain (bytecode + name/symbol/
 * decimals/totalSupply) before writing NEXT_PUBLIC_TOKEN_CONTRACT to
 * .env.local, .env.neon and Vercel production, then redeploys.
 */
import { rpc, ethCall, decodeString, upsertEnv, vercelEnvSet, redeploy, appUrl, CHAIN_NAME } from './lib/publish.mjs'

const args = process.argv.slice(2)
const clear = args.includes('--clear')
const localOnly = args.includes('--local-only')
const chainId = 4663
const address = args.find((a) => /^0x[0-9a-fA-F]{40}$/.test(a))
const KEY = 'NEXT_PUBLIC_TOKEN_CONTRACT'

if (!clear && !address) {
  console.error('usage: npm run token:ca -- 0x… | --clear [--local-only]')
  process.exit(1)
}

if (clear) {
  upsertEnv('.env.local', { [KEY]: null })
  upsertEnv('.env.neon', { [KEY]: null })
  console.log(`• cleared ${KEY} locally`)
  if (!localOnly) vercelEnvSet(KEY, null)
} else {
  console.log(`• verifying ${address} on ${CHAIN_NAME[chainId]} (${chainId})…`)
  const code = await rpc(chainId, 'eth_getCode', [address, 'latest'])
  if (!code || code === '0x') {
    console.error('✕ no contract bytecode at that address — refusing to publish')
    process.exit(1)
  }
  const sel = { name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567', totalSupply: '0x18160ddd' }
  let name, symbol, decimals, supply
  try {
    ;[name, symbol, decimals, supply] = await Promise.all([
      ethCall(chainId, address, sel.name).then(decodeString),
      ethCall(chainId, address, sel.symbol).then(decodeString),
      ethCall(chainId, address, sel.decimals).then((h) => Number(BigInt(h))),
      ethCall(chainId, address, sel.totalSupply).then((h) => BigInt(h)),
    ])
  } catch (e) {
    console.error('✕ not a readable ERC-20:', e.message)
    process.exit(1)
  }
  console.log(`✓ ${name} (${symbol}) · ${decimals} decimals · supply ${(Number(supply) / 10 ** decimals).toLocaleString('en-US')}`)
  upsertEnv('.env.local', { [KEY]: address })
  upsertEnv('.env.neon', { [KEY]: address })
  console.log('• wrote .env.local and .env.neon')
  if (!localOnly) vercelEnvSet(KEY, address)
}

if (!localOnly) {
  redeploy()
  const h = await fetch(`${appUrl()}/api/health`, { cache: 'no-store' }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
  const token = h.config?.find((c) => c.id === 'token')
  console.log('• /api/health token →', token ? (token.configured ? 'configured' : 'not configured') : h.error)
}
