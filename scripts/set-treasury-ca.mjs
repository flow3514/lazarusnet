#!/usr/bin/env node
/**
 * Publish (or clear) the LazarusTreasury contract address.
 *
 *   npm run treasury:ca -- 0xTreasuryAddress          # Robinhood Chain (4663)
 *   npm run treasury:ca -- --clear                    # back to "Awaiting treasury contract integration"
 *   add --local-only to skip Vercel
 *
 * Verifies the address really is a LazarusTreasury (bytecode present, the
 * deployed bytecode matches this repo's compiled artifact, and the three views
 * answer) before writing NEXT_PUBLIC_TREASURY_CONTRACT to .env.local, .env.neon
 * and Vercel production, then redeploys and checks /api/treasury.
 */
import { readFileSync } from 'node:fs'
import { rpc, ethCall, upsertEnv, vercelEnvSet, redeploy, appUrl, CHAIN_NAME } from './lib/publish.mjs'

const args = process.argv.slice(2)
const clear = args.includes('--clear')
const localOnly = args.includes('--local-only')
const chainId = 4663
const address = args.find((a) => /^0x[0-9a-fA-F]{40}$/.test(a))
const KEY = 'NEXT_PUBLIC_TREASURY_CONTRACT'

if (!clear && !address) {
  console.error('usage: npm run treasury:ca -- 0x… | --clear [--local-only]')
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
  const artifact = JSON.parse(readFileSync('src/config/treasury-artifact.json', 'utf8'))
  const same = code.toLowerCase() === artifact.deployedBytecode.toLowerCase()
  console.log(same ? '✓ bytecode matches the compiled LazarusTreasury artifact' : '! bytecode differs from this repo\'s artifact (different compiler settings or a different contract)')
  // selectors: totalProtocolFees() 0x..., computeAllocationBps(), totalComputeSpend(), owner()
  const { keccak256, toHex } = await import('viem')
  const sel = (sig) => keccak256(toHex(sig)).slice(0, 10)
  let fees, bps, spend, owner
  try {
    ;[fees, bps, spend, owner] = await Promise.all([
      ethCall(chainId, address, sel('totalProtocolFees()')).then((h) => BigInt(h)),
      ethCall(chainId, address, sel('computeAllocationBps()')).then((h) => BigInt(h)),
      ethCall(chainId, address, sel('totalComputeSpend()')).then((h) => BigInt(h)),
      ethCall(chainId, address, sel('owner()')).then((h) => '0x' + h.slice(-40)),
    ])
  } catch (e) {
    console.error('✕ the contract does not answer the LazarusTreasury views:', e.message)
    process.exit(1)
  }
  if (!same) {
    console.error('✕ refusing to publish a contract whose bytecode does not match — recompile or deploy from /deploy')
    process.exit(1)
  }
  console.log(`✓ owner ${owner} · allocation ${Number(bps) / 100}% · fees ${Number(fees) / 1e18} ETH · spend ${Number(spend) / 1e18} ETH`)
  upsertEnv('.env.local', { [KEY]: address })
  upsertEnv('.env.neon', { [KEY]: address })
  console.log('• wrote .env.local and .env.neon')
  if (!localOnly) vercelEnvSet(KEY, address)
}

if (!localOnly) {
  redeploy()
  const t = await fetch(`${appUrl()}/api/treasury`, { cache: 'no-store' }).then((r) => r.json()).catch((e) => ({ error: String(e) }))
  console.log('• /api/treasury →', t.contract ? `configured=${t.contract.configured} ${t.contract.address ?? ''}` : t.error)
}
