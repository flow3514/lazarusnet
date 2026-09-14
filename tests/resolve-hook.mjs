import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC = new URL('../src/', import.meta.url)

function withExt(url) {
  const base = fileURLToPath(url)
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const p = base + ext
    if (existsSync(p) && !p.endsWith('/') && ext !== '' ? true : ext === '' && /\.[cm]?[jt]sx?$/.test(p) && existsSync(p)) return pathToFileURL(p).href
  }
  return null
}

const EMPTY = new URL('./empty.mjs', import.meta.url).href

export async function resolve(specifier, context, next) {
  // Next-only marker modules are no-ops under plain Node (seed scripts, tests).
  if (specifier === 'server-only' || specifier === 'client-only') return { url: EMPTY, shortCircuit: true }
  if (specifier.startsWith('@/')) {
    const hit = withExt(new URL(specifier.slice(2), SRC))
    if (hit) return next(hit, context)
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const hit = withExt(new URL(specifier, context.parentURL))
    if (hit) return next(hit, context)
  }
  return next(specifier, context)
}
