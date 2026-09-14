'use client'
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Section } from '@/components/landing/Section'
import { Item, Stagger } from '@/components/landing/motion'
import { cn } from '@/lib/utils/format'

const STEPS = [
  { n: '01', title: 'Trade', body: 'Protocol activity produces fees.' },
  { n: '02', title: 'Allocate', body: 'A governance-configured percentage flows into the Compute Treasury.' },
  { n: '03', title: 'Acquire Compute', body: 'Treasury capital funds GPU capacity from integrated providers.' },
  { n: '04', title: 'Run Models', body: 'Open-source models run on the network.' },
  { n: '05', title: 'Recycle Revenue', body: 'Paid compute usage generates revenue back into the ecosystem.' },
]
const STEP_MS = 2400

function Arrow({ active }: { active: boolean }) {
  return (
    <svg className={cn('hidden h-4 w-10 shrink-0 transition-colors duration-500 lg:block', active ? 'text-magenta-bright' : 'text-magenta/50')} viewBox="0 0 40 16" fill="none" aria-hidden>
      <path d="M0 8h32" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="animate-dash-flow" style={{ animationDuration: active ? '0.8s' : '3s' }} />
      <path d="M32 3l6 5-6 5" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * "From fees to compute." The loop is alive: one step is active at a time and
 * the highlight walks around the loop every 2.4 s, with the arrow after the
 * active step speeding up. Hovering a step pins it; reduced motion freezes it.
 */
export function EconomicLoop() {
  const reduce = useReducedMotion()
  const [active, setActive] = React.useState(0)
  const [pinned, setPinned] = React.useState<number | null>(null)
  const [inView, setInView] = React.useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    if (reduce || !inView || pinned !== null) return
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS)
    return () => clearInterval(id)
  }, [reduce, inView, pinned])

  const current = pinned ?? active

  return (
    <Section id="loop" eyebrow="Economic loop" title="From fees to compute." lead="A single loop: trading funds infrastructure, infrastructure runs open models, usage returns value to the protocol.">
      <div ref={ref}>
        <Stagger className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-2">
          {STEPS.map((s, i) => {
            const on = current === i
            return (
              <Item key={s.n} className="flex flex-1 items-center gap-2">
                <div
                  onMouseEnter={() => setPinned(i)}
                  onMouseLeave={() => setPinned(null)}
                  className={cn('card relative flex h-full w-full flex-col overflow-hidden p-5 transition-[border-color,transform,box-shadow] duration-500', on ? '-translate-y-0.5 shadow-pop [border-color:rgba(217,41,137,0.55)]' : '')}
                >
                  {on && !reduce && (
                    <motion.span key={`${i}-${pinned}`} className="absolute inset-x-0 bottom-0 h-px origin-left bg-magenta-bright" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: pinned !== null ? 0.4 : STEP_MS / 1000, ease: 'linear' }} aria-hidden />
                  )}
                  <span className={cn('tri-accent absolute right-3 top-3 h-2.5 w-2 transition-colors duration-500', on ? 'bg-magenta-bright' : 'bg-magenta/40')} aria-hidden />
                  <div className={cn('font-mono text-[11px] tracking-[0.18em] transition-colors duration-500', on ? 'text-magenta-bright' : 'text-muted')}>{s.n}</div>
                  <div className="mt-3 text-[17px] font-semibold tracking-[-0.01em]">{s.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
                {i < STEPS.length - 1 && <Arrow active={on} />}
              </Item>
            )
          })}
        </Stagger>
        <div className="mt-6 flex items-center gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setPinned(pinned === i ? null : i)} className={cn('h-1 rounded-full transition-all duration-500', current === i ? 'w-8 bg-magenta' : 'w-3 bg-ink/15 hover:bg-ink/30')} tabIndex={-1} />
          ))}
          <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{STEPS[current].title}</span>
        </div>
      </div>
    </Section>
  )
}
