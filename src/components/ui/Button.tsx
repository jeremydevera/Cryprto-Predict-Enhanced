import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'buy' | 'sell'
type Size = 'sm' | 'md'

export default function Button({
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        variant === 'primary' && 'bg-blue-500 text-white hover:bg-blue-400',
        variant === 'secondary' && 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        variant === 'ghost' && 'bg-transparent text-slate-100 hover:bg-slate-800',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-500',
        variant === 'buy' && 'bg-emerald-600 text-white hover:bg-emerald-500',
        variant === 'sell' && 'bg-rose-600 text-white hover:bg-rose-500',
        className,
      )}
      {...props}
    />
  )
}

