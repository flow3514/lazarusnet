/**
 * Shared helpers for the publish scripts (set-treasury-ca / set-token-ca):
 * JSON-RPC with a DNS-over-HTTPS + curl --resolve fallback (this ISP hijacks
 * robinhood.com), .env upserts, Vercel env writes via file-on-stdin, redeploy.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync, execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const SCOPE = 'flow3515'
export const RPC = { 4663: 'https://rpc.mainnet.chain.robinhood.com', 1: 'https://ethereum-rpc.publicnode.com', 8453: 'https://base-rpc.publicnode.com', 42161: 'https://arbitrum-one-rpc.publicnode.com' }
export const CHAIN_NAME = { 4663: 'Robinhood Chain', 1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum One' }

async function doh(host) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${host}&type=A`, { headers: { accept: 'application/dns-json' } })
  const j = await r.json()
  return j.Answer?.find((a) => a.type === 1)?.data ?? null
}

export async function rpc(chainId, method, params) {
  const url = RPC[chainId]
  if (!url) throw new Error(`unsupported chain ${chainId}`)
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(12_000) })
    const j = await r.json()
    if (j.error) throw new Error(j.error.message)
    return j.result
  } catch (e) {
    const host = new URL(url).host
    const ip = await doh(host).catch(() => null)
    if (!ip) throw e
    const out = execFileSync('curl', ['-s', '--max-time', '20', '--resolve', `${host}:443:${ip}`, '-H', 'content-type: application/json', '-d', body, url], { encoding: 'utf8' })
    const j = JSON.parse(out)
    if (j.error) throw new Error(j.error.message)
    return j.result
  }
}

export const ethCall = (chainId, to, data) => rpc(chainId, 'eth_call', [{ to, data }, 'latest'])

export function decodeString(hex) {
  const b = Buffer.from(hex.slice(2), 'hex')
  if (b.length < 64) return b.toString('utf8').replace(/\0+$/, '')
  const len = Number(BigInt('0x' + b.subarray(32, 64).toString('hex')))
  return b.subarray(64, 64 + len).toString('utf8')
}

export function upsertEnv(file, pairs) {
  let s = existsSync(file) ? readFileSync(file, 'utf8') : ''
  for (const [k, v] of Object.entries(pairs)) {
    const line = v === null ? null : `${k}=${v}`
    const re = new RegExp(`^${k}=.*$`, 'm')
    if (re.test(s)) s = s.replace(re, line ?? `${k}=`)
    else if (line) s += (s.endsWith('\n') || s === '' ? '' : '\n') + line + '\n'
  }
  writeFileSync(file, s)
}

export function vercelEnvSet(k, v) {
  spawnSync(`vercel env rm ${k} production --yes --scope ${SCOPE}`, { shell: true, stdio: 'ignore' })
  if (v === null || v === '') return console.log(`• vercel ${k}: removed`)
  const dir = join(tmpdir(), 'lazarusnet-env')
  mkdirSync(dir, { recursive: true })
  const f = join(dir, `${k}.txt`).replace(/\\/g, '/')
  writeFileSync(f, `${v}\n`)
  const r = spawnSync(`vercel env add ${k} production --scope ${SCOPE} < ${f}`, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  rmSync(dir, { recursive: true, force: true })
  console.log(`• vercel ${k}:`, ((r.stdout + r.stderr).split('\n').find((l) => /Added|rror/.test(l)) ?? '(no output)').trim())
}

export function redeploy() {
  console.log('• redeploying…')
  const d = spawnSync(`vercel deploy --prod --yes --scope ${SCOPE}`, { encoding: 'utf8', shell: true })
  const alias = (d.stdout + d.stderr).match(/Aliased\s+(https:\/\/\S+)/)?.[1]
  console.log(d.status === 0 ? `✓ deployed ${alias ?? ''}` : (d.stdout + d.stderr).trim().split('\n').slice(-5).join('\n'))
  return alias ?? null
}

export function appUrl() {
  const m = /^NEXT_PUBLIC_APP_URL=(.*)$/m.exec(existsSync('.env.neon') ? readFileSync('.env.neon', 'utf8') : '')
  return (m?.[1] ?? '').trim() || 'https://lazarusnet.vercel.app'
}
