'use client'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

/** Enter-on-scroll wrapper with a soft blur-to-sharp settle. Respects prefers-reduced-motion. */
export function Reveal({ children, delay = 0, className, y = 14, as = 'div', blur = true }: { children: ReactNode; delay?: number; className?: string; y?: number; as?: 'div' | 'section' | 'li'; blur?: boolean }) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y, filter: blur ? 'blur(6px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </Comp>
  )
}

/** Splits text into words that rise in one after another. */
export function Words({ text, className, delay = 0, step = 0.06, accent }: { text: string; className?: string; delay?: number; step?: number; accent?: string }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => {
        const isAccent = accent ? accent.split(' ').includes(w.replace(/[.,]/g, '')) : false
        return (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              aria-hidden
              className={isAccent ? 'inline-block text-magenta-bright' : 'inline-block'}
              initial={reduce ? false : { y: '110%', opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * step }}
            >
              {w}
            </motion.span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}

export const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
export const staggerChild: Variants = { hidden: { opacity: 0, y: 12, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } } }

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div variants={reduce ? undefined : staggerParent} initial={reduce ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-60px' }} className={className}>
      {children}
    </motion.div>
  )
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div variants={reduce ? undefined : staggerChild} className={className}>
      {children}
    </motion.div>
  )
}

/** Typewriter for short mono status lines. */
export function Typed({ text, className, delay = 0, speed = 28 }: { text: string; className?: string; delay?: number; speed?: number }) {
  const reduce = useReducedMotion()
  const chars = text.split('')
  return (
    <span className={className} aria-label={text}>
      {chars.map((c, i) => (
        <motion.span key={i} aria-hidden initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.01, delay: delay + (i * speed) / 1000 }}>
          {c}
        </motion.span>
      ))}
      {!reduce && <motion.span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-magenta" initial={{ opacity: 1 }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: 6, delay: delay + (chars.length * speed) / 1000 }} />}
    </span>
  )
}
