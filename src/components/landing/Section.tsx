import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/format'
import { Reveal } from '@/components/landing/motion'

export function Section({ id, eyebrow, title, lead, children, className, align = 'left' }: { id?: string; eyebrow?: string; title?: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string; align?: 'left' | 'center' }) {
  return (
    <section id={id} className={cn('py-20 sm:py-28', className)}>
      <div className="wrap">
        {(eyebrow || title || lead) && (
          <div className={cn('mb-12 max-w-2xl', align === 'center' && 'mx-auto text-center')}>
            {eyebrow && (
              <Reveal blur={false} y={6}>
                <div className={cn('eyebrow mb-4 flex items-center gap-2', align === 'center' && 'justify-center')}>
                  <span className="tri-accent inline-block h-2 w-1.5 bg-magenta" aria-hidden />
                  {eyebrow}
                </div>
              </Reveal>
            )}
            {title && (
              <Reveal delay={0.08} y={18}>
                <h2 className="h-section">{title}</h2>
              </Reveal>
            )}
            {lead && (
              <Reveal delay={0.18} y={12}>
                <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">{lead}</p>
              </Reveal>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
