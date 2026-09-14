import { LOGO_FACES } from '@/config/logo-geometry'
import { cn } from '@/lib/utils/format'

/**
 * The Lazarus mark, rendered from the exact face geometry traced out of the
 * supplied logo (scripts/make-logo.mjs). Faces keep their sampled colours by
 * default; `mono` renders the whole mark in a single colour for tiny sizes.
 */
export function LogoMark({ size = 28, className, mono, title = 'Lazarus Net' }: { size?: number; className?: string; mono?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="-1.02 -1.02 2.04 2.04" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      {LOGO_FACES.map((f, i) => (
        <polygon key={i} points={f.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={mono ?? f.color} />
      ))}
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={26} />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Lazarus Net</span>
    </span>
  )
}
