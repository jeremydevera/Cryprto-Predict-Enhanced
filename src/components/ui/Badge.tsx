import { cn } from '@/lib/utils'

type Variant = 'neutral' | 'buy' | 'sell' | 'info' | 'danger'

export default function Badge({
  variant = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        variant === 'neutral' && 'bg-slate-800 text-slate-200',
        variant === 'buy' && 'bg-emerald-600/20 text-emerald-400',
        variant === 'sell' && 'bg-rose-600/20 text-rose-400',
        variant === 'info' && 'bg-blue-500/20 text-blue-200',
        variant === 'danger' && 'bg-rose-600 text-white',
        className,
      )}
      {...props}
    />
  )
}

