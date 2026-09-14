import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/format'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-300 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        primary: 'bg-magenta text-white hover:bg-magenta-bright shadow-[0_0_0_1px_rgba(217,41,137,0.35)]',
        secondary: 'border bg-surface text-ink hover:bg-surface-2 [border-color:var(--border-strong)]',
        ghost: 'text-ink/80 hover:bg-ink/5 hover:text-ink',
        outline: 'border border-magenta/50 text-ink hover:bg-magenta/10',
        danger: 'border border-red-500/40 text-red-500 hover:bg-red-500/10',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

export { buttonVariants }
