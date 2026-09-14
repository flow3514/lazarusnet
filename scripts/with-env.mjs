#!/usr/bin/env node
// Loads .env then .env.local (later wins) and execs the given command.
// Usage: node scripts/with-env.mjs prisma db push
import { readFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
for (const f of ['.env', '.env.local']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!m || line.trim().startsWith('#')) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
}
const [cmd, ...args] = process.argv.slice(2)
const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
child.on('close', (code) => process.exit(code ?? 1))
