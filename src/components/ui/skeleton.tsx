import { cn } from '@/lib/utils/format'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink/[0.06]', className)} aria-hidden />
}
