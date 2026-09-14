#!/usr/bin/env node
// Generates favicon / app icons and the Open Graph image from the vector logo geometry.
// Usage: node scripts/make-brand.mjs
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'

const geom = readFileSync('src/config/logo-geometry.ts', 'utf8')
const faces = JSON.parse(/LOGO_FACES: LogoFace\[\] = (\[.*\])/s.exec(geom)[1])

function markSvg(size, bg = '#050505', pad = 0.08) {
  const c = size / 2, r = (size / 2) * (1 - pad)
  const polys = faces.map((f) => `<polygon points="${f.points.map(([x, y]) => `${(c + x * r).toFixed(2)},${(c + y * r).toFixed(2)}`).join(' ')}" fill="${f.color}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${bg ? `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${bg}"/>` : ''}${polys}</svg>`
}

mkdirSync('public/brand', { recursive: true })
for (const [out, size] of [
  ['src/app/icon.png', 64],
  ['src/app/apple-icon.png', 180],
  ['public/brand/icon-192.png', 192],
  ['public/brand/icon-512.png', 512],
  ['public/brand/logo-512.png', 512],
]) {
  await sharp(Buffer.from(markSvg(size))).png().toFile(out)
  console.log('wrote', out)
}
await sharp(Buffer.from(markSvg(512, ''))).png().toFile('public/brand/mark-transparent.png')

// Open Graph: black field, mark left, headline right, thin magenta divider.
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#050505"/>
  <g transform="translate(90,135)">${markSvg(360, '', 0).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>
  <rect x="520" y="150" width="2" height="330" fill="#D92989" opacity="0.6"/>
  <text x="570" y="270" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#FFFFFF">Compute belongs</text>
  <text x="570" y="338" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="58" font-weight="700" fill="#F13CA6">to the people.</text>
  <text x="570" y="400" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="24" fill="#8A8388">Lazarus Net turns protocol activity into GPU compute for open models.</text>
  <text x="570" y="460" font-family="JetBrains Mono, Consolas, monospace" font-size="16" letter-spacing="4" fill="#8A8388">COMMUNITY-OWNED COMPUTE · ROBINHOOD CHAIN</text>
</svg>`
await sharp(Buffer.from(og)).png().toFile('public/brand/og.png')
console.log('wrote public/brand/og.png')
