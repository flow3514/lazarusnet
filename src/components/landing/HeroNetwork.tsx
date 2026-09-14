'use client'
import * as React from 'react'
import { LOGO_FACES } from '@/config/logo-geometry'
import { useTheme } from '@/components/providers/ThemeProvider'

/**
 * Ambient hero visualisation (Canvas 2D, no WebGL).
 *
 * Boot sequence (first ~4 s): the core mark assembles face by face, then the
 * six loop nodes come online one after another — each with an expanding ring —
 * while the edge to the next node draws itself. After boot the steady state
 * runs: slow orbit wobble, pulses travelling the loop, drifting logo fragments
 * that gently avoid the cursor, low-opacity particles. Pauses when hidden or
 * offscreen; renders one static (fully booted) frame under reduced motion.
 */
const LOOP = ['TRADES', 'TREASURY', 'GPU', 'MODELS', 'USERS', 'REVENUE'] as const
const SUB = ['protocol fees', 'compute treasury', 'gpu capacity', 'open models', 'compute usage', 'recycled revenue'] as const
const BOOT_START = 0.5
const BOOT_STEP = 0.55
const BOOT_END = BOOT_START + BOOT_STEP * LOOP.length + 0.6

interface Node {
  label: string
  sub: string
  bx: number
  by: number
  x: number
  y: number
  phase: number
  bootAt: number
}
interface Frag {
  face: number
  x: number
  y: number
  vx: number
  vy: number
  s: number
  r: number
  vr: number
  a: number
}
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  a: number
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3)

export function HeroNetwork({ className }: { className?: string }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null)
  const { theme } = useTheme()

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Colours come from the live CSS tokens so a theme change re-inks the canvas.
    let inkRgb: [number, number, number] = [255, 255, 255]
    let isDark = true
    const readTheme = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().split(/\s+/).map(Number)
      if (v.length === 3 && v.every((n) => Number.isFinite(n))) inkRgb = [v[0], v[1], v[2]]
      isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    }
    readTheme()
    const ink = (a: number) => `rgba(${inkRgb[0]},${inkRgb[1]},${inkRgb[2]},${a})`
    const mag = (a: number) => `rgba(217,41,137,${a})`
    const bright = (a: number) => `rgba(241,60,166,${a})`

    let w = 0, h = 0, dpr = 1
    let nodes: Node[] = []
    let frags: Frag[] = []
    let parts: Particle[] = []
    let raf = 0
    let running = true
    let visible = true
    const t0 = performance.now()
    let paused = 0 // accumulated time while hidden so the boot never replays
    let hiddenAt = 0
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999, inside: false }
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

    const layout = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = rect.width
      h = rect.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cx = w / 2, cy = h / 2
      const rx = Math.min(w * 0.38, 300), ry = Math.min(h * 0.36, 230)
      seed = 7
      nodes = LOOP.map((label, i) => {
        const ang = -Math.PI / 2 + (i / LOOP.length) * Math.PI * 2
        return { label, sub: SUB[i], bx: cx + Math.cos(ang) * rx, by: cy + Math.sin(ang) * ry, x: 0, y: 0, phase: rnd() * Math.PI * 2, bootAt: BOOT_START + i * BOOT_STEP }
      })
      const nFrag = w < 640 ? 14 : 26
      frags = Array.from({ length: nFrag }, () => ({ face: Math.floor(rnd() * LOGO_FACES.length), x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 6, s: 10 + rnd() * 22, r: rnd() * Math.PI * 2, vr: (rnd() - 0.5) * 0.15, a: 0.18 + rnd() * 0.3 }))
      parts = Array.from({ length: w < 640 ? 30 : 70 }, () => ({ x: rnd() * w, y: rnd() * h, vx: (rnd() - 0.5) * 3, vy: -2 - rnd() * 4, a: 0.08 + rnd() * 0.2 }))
    }

    const drawFace = (f: Frag, ox: number, oy: number, alpha: number) => {
      const face = LOGO_FACES[f.face]
      ctx.save()
      ctx.translate(f.x + ox, f.y + oy)
      ctx.rotate(f.r)
      ctx.beginPath()
      face.points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px * f.s, py * f.s) : ctx.lineTo(px * f.s, py * f.s)))
      ctx.closePath()
      const [r, g, b] = hexToRgb(face.color)
      ctx.fillStyle = `rgba(${r},${g},${b},${f.a * alpha})`
      ctx.fill()
      ctx.restore()
    }

    const drawDiamond = (x: number, y: number, s: number) => {
      ctx.beginPath()
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s, y)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s, y)
      ctx.closePath()
    }

    const frame = (now: number) => {
      const t = reduce ? BOOT_END + 1 : (now - t0 - paused) / 1000
      const dt = reduce ? 0 : 1 / 60
      const booted = t >= BOOT_END
      const bootAlpha = easeOut(t / 0.8)
      mouse.x += (mouse.tx - mouse.x) * 0.04
      mouse.y += (mouse.ty - mouse.y) * 0.04
      ctx.clearRect(0, 0, w, h)

      // cursor spotlight
      if (mouse.inside && !reduce) {
        const g = ctx.createRadialGradient(mouse.px, mouse.py, 0, mouse.px, mouse.py, 220)
        g.addColorStop(0, mag(isDark ? 0.09 : 0.07))
        g.addColorStop(1, mag(0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      // particles (slow upward drift)
      for (const p of parts) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        ctx.fillStyle = ink(p.a * 0.5 * bootAlpha)
        ctx.fillRect(p.x, p.y, 1, 1)
      }

      // fragments drift and gently avoid the cursor
      for (const f of frags) {
        if (mouse.inside) {
          const dx = f.x - mouse.px, dy = f.y - mouse.py
          const d2 = dx * dx + dy * dy
          if (d2 < 120 * 120 && d2 > 1) {
            const d = Math.sqrt(d2)
            const push = (1 - d / 120) * 22 * dt
            f.x += (dx / d) * push
            f.y += (dy / d) * push
          }
        }
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.r += f.vr * dt
        if (f.x < -40) f.x = w + 40
        if (f.x > w + 40) f.x = -40
        if (f.y < -40) f.y = h + 40
        if (f.y > h + 40) f.y = -40
        drawFace(f, mouse.x * 6, mouse.y * 6, bootAlpha)
      }

      // node positions (slow orbit wobble)
      for (const n of nodes) {
        n.x = n.bx + Math.cos(t * 0.25 + n.phase) * 6 + mouse.x * 12
        n.y = n.by + Math.sin(t * 0.2 + n.phase) * 5 + mouse.y * 12
      }

      const cx = w / 2 + mouse.x * 8, cy = h / 2 + mouse.y * 8

      // loop edges — each draws itself once its source node is online
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i], b = nodes[(i + 1) % nodes.length]
        const prog = easeOut((t - a.bootAt) / BOOT_STEP)
        if (prog <= 0) continue
        const ex = a.x + (b.x - a.x) * prog, ey = a.y + (b.y - a.y) * prog
        ctx.strokeStyle = ink(0.12)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        if (prog < 1) {
          // bright drawing head
          ctx.fillStyle = bright(0.9)
          ctx.beginPath()
          ctx.arc(ex, ey, 2, 0, Math.PI * 2)
          ctx.fill()
        }
        // travelling pulse in steady state, 12 s per lap, staggered per edge
        if (booted) {
          const lap = 12
          const u = (((t - BOOT_END) / lap) * nodes.length - i + nodes.length * 4) % nodes.length
          if (u >= 0 && u < 1) {
            const px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u
            const g = ctx.createRadialGradient(px, py, 0, px, py, 26)
            g.addColorStop(0, mag(0.55))
            g.addColorStop(1, mag(0))
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(px, py, 26, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = mag(0.95)
            ctx.beginPath()
            ctx.arc(px, py, 2.2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      // spokes to the core (faint), fade in with each node
      for (const n of nodes) {
        const on = easeOut((t - n.bootAt) / 0.6)
        if (on <= 0) continue
        ctx.strokeStyle = ink(0.05 * on)
        ctx.beginPath()
        ctx.moveTo(n.x, n.y)
        ctx.lineTo(cx, cy)
        ctx.stroke()
      }

      // core mark: faces assemble during the first 0.6 s, then a slow dashed halo
      const coreS = Math.min(w, h) * 0.075
      ctx.save()
      ctx.translate(cx, cy)
      const haloOn = easeOut((t - BOOT_START) / 0.8)
      if (haloOn > 0) {
        ctx.strokeStyle = mag(0.35 * haloOn)
        ctx.lineWidth = 1
        ctx.setLineDash([2, 6])
        ctx.lineDashOffset = -t * 6
        ctx.beginPath()
        ctx.arc(0, 0, coreS * 1.9 * (0.8 + 0.2 * haloOn), 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      LOGO_FACES.forEach((face, i) => {
        const fi = easeOut((t - i * 0.05) / 0.35)
        if (fi <= 0) return
        const sc = coreS * (0.7 + 0.3 * fi)
        ctx.globalAlpha = fi
        ctx.beginPath()
        face.points.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px * sc, py * sc) : ctx.lineTo(px * sc, py * sc)))
        ctx.closePath()
        ctx.fillStyle = face.color
        ctx.fill()
      })
      ctx.globalAlpha = 1
      ctx.restore()
      if (haloOn > 0) {
        ctx.font = '500 9.5px var(--font-mono), ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = ink(0.55 * haloOn)
        ctx.fillText('LAZARUS CORE', cx, cy + coreS * 1.9 + 16)
      }

      // nodes — dim until online, expanding ring on activation
      for (const n of nodes) {
        const since = t - n.bootAt
        const on = easeOut(since / 0.5)
        const s = 7
        if (since > 0 && since < 0.9) {
          const k = since / 0.9
          ctx.strokeStyle = bright(0.6 * (1 - k))
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(n.x, n.y, 6 + k * 44, 0, Math.PI * 2)
          ctx.stroke()
        }
        drawDiamond(n.x, n.y, s)
        ctx.fillStyle = isDark ? '#0a0a0a' : '#ffffff'
        ctx.fill()
        ctx.strokeStyle = on > 0 ? mag(0.35 + 0.55 * on) : ink(0.18)
        ctx.lineWidth = 1.2
        ctx.stroke()
        if (on > 0) {
          ctx.fillStyle = mag(0.9 * on)
          ctx.beginPath()
          ctx.arc(n.x, n.y, 1.8 + Math.sin(t * 1.4 + n.phase) * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.font = '600 10.5px var(--font-mono), ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = ink(0.25 + 0.67 * on)
        ctx.fillText(n.label, n.x, n.y - 16)
        ctx.font = '400 9.5px var(--font-mono), ui-monospace, monospace'
        ctx.fillStyle = ink(0.45 * on)
        ctx.fillText(on > 0 ? n.sub : 'offline', n.x, n.y + 24)
      }

      // boot readout
      if (!booted && !reduce) {
        const online = nodes.filter((n) => t >= n.bootAt).length
        ctx.font = '500 9.5px var(--font-mono), ui-monospace, monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = ink(0.5)
        ctx.fillText(`BRINGING NETWORK ONLINE · ${online}/${nodes.length}`, 12, h - 12)
      }

      if (!reduce && running && visible) raf = requestAnimationFrame(frame)
    }

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      mouse.px = e.clientX - r.left
      mouse.py = e.clientY - r.top
      mouse.inside = mouse.px >= 0 && mouse.py >= 0 && mouse.px <= r.width && mouse.py <= r.height
    }
    const onLeave = () => {
      mouse.inside = false
    }
    const resume = () => {
      if (hiddenAt) {
        paused += performance.now() - hiddenAt
        hiddenAt = 0
      }
      raf = requestAnimationFrame(frame)
    }
    const onVis = () => {
      running = !document.hidden
      if (!running) hiddenAt = performance.now()
      else if (visible && !reduce) resume()
    }
    const mo = new MutationObserver(() => {
      readTheme()
      if (reduce) frame(performance.now())
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const io = new IntersectionObserver(([en]) => {
      const was = visible
      visible = en.isIntersecting
      if (!visible) hiddenAt = performance.now()
      else if (!was && running && !reduce) resume()
    })
    io.observe(canvas)
    const ro = new ResizeObserver(() => {
      layout()
      if (reduce) frame(performance.now())
    })
    ro.observe(canvas)
    layout()
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [theme])

  return <canvas ref={ref} className={className} aria-hidden />
}
