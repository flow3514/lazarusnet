'use client'
import * as React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { Typed, Words } from '@/components/landing/motion'

const HeroNetwork = dynamic(() => import('@/components/landing/HeroNetwork').then((m) => m.HeroNetwork), { ssr: false })

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const reduce = useReducedMotion()
  const ref = React.useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // Light parallax: copy drifts up a little faster than the visual as the hero scrolls away.
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60])
  const vizY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -24])
  const fadeOut = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0.15])
  const fade = (delay: number) => ({ initial: reduce ? false : { opacity: 0, y: 16, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.8, ease, delay } })

  return (
    <section ref={ref} className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_70%_at_70%_40%,#000,transparent)]" aria-hidden />
      <motion.div className="magenta-glow absolute right-[-10%] top-[-10%] h-[620px] w-[820px]" initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 0.6, scale: 1 }} transition={{ duration: 2.4, ease }} aria-hidden />
      <div className="wrap relative grid min-h-[calc(100vh-64px)] items-center gap-10 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-20">
        <motion.div style={{ y: copyY, opacity: fadeOut }} className="max-w-xl">
          <motion.div {...fade(0)} className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted" style={{ borderColor: 'var(--border-strong)' }}>
            <span className="status-dot bg-magenta animate-pulse-dot" />
            Community-owned compute
          </motion.div>
          <h1 className="h-display">
            <Words text="Compute belongs to the people." accent="the people" delay={0.15} step={0.09} />
          </h1>
          <motion.p {...fade(0.7)} className="mt-6 text-lg leading-relaxed text-ink/80 sm:text-xl">
            Lazarus Net turns protocol activity into GPU infrastructure for open models.
          </motion.p>
          <motion.p {...fade(0.82)} className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Trading fees fund compute. Holders access it. External usage creates new revenue.
          </motion.p>
          <motion.div {...fade(0.95)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/compute">
              <Button size="lg" className="group w-full sm:w-auto">
                Launch Compute <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="#network">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Explore Network
              </Button>
            </Link>
          </motion.div>
          <div className="mt-9 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            <Typed text={site.chainLabel} delay={1.2} />
          </div>
        </motion.div>
        <motion.div
          style={{ y: vizY }}
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease, delay: 0.2 }}
          className="relative h-[360px] sm:h-[460px] lg:h-[600px]"
          aria-label="Lazarus compute network: trades, protocol fees, compute treasury, GPU capacity, open models, compute usage, revenue"
        >
          <HeroNetwork className="absolute inset-0 h-full w-full" />
        </motion.div>
      </div>
      <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 1 }} className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex" aria-hidden>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Scroll</span>
        <span className="relative h-8 w-px overflow-hidden bg-ink/10">
          <motion.span className="absolute left-0 top-0 h-3 w-px bg-magenta" animate={reduce ? undefined : { y: [-12, 32] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
        </span>
      </motion.div>
    </section>
  )
}
