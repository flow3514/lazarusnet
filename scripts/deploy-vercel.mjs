#!/usr/bin/env node
/**
 * Deploy Lazarus Net to Vercel (scope flow3515) with production env from .env.neon.
 *   node scripts/deploy-vercel.mjs            link (if needed) → set env → deploy --prod
 *   node scripts/deploy-vercel.mjs --env-only  only (re)set the env vars
 *   node scripts/deploy-vercel.mjs --deploy-only
 *
 * Env values are written to a temp file and piped on stdin through cmd.exe —
 * the only method that stores them intact on this Windows machine (PowerShell
 * pipes add a BOM, Node stdin.write stores empty strings).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SCOPE = 'flow3515'
const PROJECT = 'lazarusnet'
const ENV_FILE = '.env.neon'
const KEYS = ['DATABASE_URL', 'AUTH_SECRET', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_CHAIN_ID', 'NEXT_PUBLIC_CHAIN_NAME', 'NEXT_PUBLIC_RPC_URL', 'NEXT_PUBLIC_EXPLORER_URL', 'NEXT_PUBLIC_TOKEN_CONTRACT', 'NEXT_PUBLIC_TREASURY_CONTRACT', 'GPU_PROVIDER', 'GPU_PROVIDER_ENDPOINT', 'GPU_PROVIDER_API_KEY', 'ADMIN_WALLETS']
const args = process.argv.slice(2)
const envOnly = args.includes('--env-only')
const deployOnly = args.includes('--deploy-only')

function vercel(a, opts = {}) {
  const r = spawnSync('vercel', a, { encoding: 'utf8', shell: true, ...opts })
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') }
}

function loadEnv() {
  if (!existsSync(ENV_FILE)) throw new Error(`${ENV_FILE} not found`)
  const vars = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (m && !line.trim().startsWith('#')) vars[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
  return vars
}

if (!existsSync('.vercel/project.json')) {
  console.log('• linking project', PROJECT)
  const r = vercel(['link', '--yes', '--scope', SCOPE, '--project', PROJECT])
  console.log(r.out.trim().split('\n').slice(-2).join('\n'))
  if (r.code !== 0) process.exit(r.code)
}

if (!deployOnly) {
  const vars = loadEnv()
  const dir = join(tmpdir(), 'lazarusnet-env')
  mkdirSync(dir, { recursive: true })
  for (const k of KEYS) {
    if (!vars[k]) {
      console.log(`• ${k}: not set in ${ENV_FILE}, skipped`)
      continue
    }
    vercel(['env', 'rm', k, 'production', '--yes', '--scope', SCOPE])
    // Forward slashes: cmd.exe accepts them in redirects and nothing re-escapes them.
    const f = join(dir, `${k}.txt`).replace(/\\/g, '/')
    writeFileSync(f, `${vars[k]}\n`, { encoding: 'utf8' })
    const r = spawnSync(`vercel env add ${k} production --scope ${SCOPE} < ${f}`, { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    const line = (r.stdout + r.stderr).split('\n').find((l) => /Added|Error|trailing newline/.test(l)) ?? '(no output)'
    console.log(`• ${k}:`, line.trim())
  }
  rmSync(dir, { recursive: true, force: true })
}

if (!envOnly) {
  console.log('• deploying to production…')
  const d = vercel(['deploy', '--prod', '--yes', '--scope', SCOPE])
  const url = d.out.match(/https:\/\/[^\s]+\.vercel\.app/g)?.pop()
  console.log(d.out.trim().split('\n').slice(-3).join('\n'))
  if (d.code !== 0) process.exit(d.code)
  console.log('✓ deployed', url ?? '')
}
