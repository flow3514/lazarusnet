import * as React from 'react'
import { cn } from '@/lib/utils/format'

const base = 'w-full rounded-lg border bg-bg-2 px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-magenta/60 focus:outline-none disabled:opacity-50 [border-color:var(--border-strong)]'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-10', className)} {...props} />)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[120px] resize-y py-2.5 leading-relaxed', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'h-10 appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%238A8388' stroke-width='1.5'/></svg>\")" }} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('eyebrow mb-1.5 block', className)} {...props} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
