'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { LOGO_FACES } from '@/config/logo-geometry'
import { cn } from '@/lib/utils/format'

/**
 * The Lazarus mark assembling itself: each traced face flies in from a
 * scattered position and settles into place when scrolled into view.
 * Deterministic offsets (from the face index) keep SSR and client identical.
 */
export function AssembleMark({ size = 120, className, once = true, delay = 0 }: { size?: number; className?: string; once?: boolean; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <svg width={size} height={size} viewBox="-1.02 -1.02 2.04 2.04" className={cn('overflow-visible', className)} role="img" aria-label="Lazarus Net">
      {LOGO_FACES.map((f, i) => {
        const ang = (i / LOGO_FACES.length) * Math.PI * 2 + 0.7
        const dist = 0.9 + (i % 3) * 0.35
        const cx = f.points.reduce((a, p) => a + p[0], 0) / f.points.length
        const cy = f.points.reduce((a, p) => a + p[1], 0) / f.points.length
        return (
          <motion.polygon
            key={i}
            points={f.points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={f.color}
            style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px` }}
            initial={reduce ? false : { opacity: 0, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, rotate: (i % 2 ? 1 : -1) * (25 + i * 6), scale: 0.6 }}
            whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
            viewport={{ once, margin: '-80px' }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.06 }}
          />
        )
      })}
    </svg>
  )
}
