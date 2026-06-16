import { useTradingStore } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'

export default function MarketSummaryBar() {
  const metrics = useTradingStore((s) => s.metrics)
  const price = useTradingStore((s) => s.price)
  const priceChange = useTradingStore((s) => s.priceChange)
  const symbol = useTradingStore((s) => s.symbol)
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)

  const items = [
    { label: 'PRICE', value: `$${formatPrice(price)}`, color: priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: '24H CHANGE', value: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`, color: priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'MKT CAP', value: metrics.mktCap || '—', color: 'text-slate-400' },
    { label: '24H VOL', value: metrics.vol24h || '—', color: 'text-blue-400' },
    { label: '7D HIGH', value: metrics.high7d ? `$${formatPrice(metrics.high7d)}` : '—', color: 'text-emerald-400' },
    { label: '7D LOW', value: metrics.low7d ? `$${formatPrice(metrics.low7d)}` : '—', color: 'text-rose-400' },
    { label: 'SIGNAL', value: metrics.overallScore || 'NEUTRAL', color: metrics.overallScore === 'BULLISH' ? 'text-emerald-400' : metrics.overallScore === 'BEARISH' ? 'text-rose-400' : 'text-amber-500' },
    { label: 'STRATEGY', value: selectedStrategy || '—', color: 'text-blue-400' },
    { label: 'UPDATED', value: metrics.lastUpdate || '00:00:00', color: 'text-slate-200' },
  ]

  return (
    <div className="flex items-center gap-14 px-8 py-3.5 bg-[#121214] border-b border-slate-800 shadow-xl overflow-x-auto no-scrollbar">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col min-w-fit">
          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tighter mb-1.5">{item.label}</span>
          <span className={cn("text-base font-black font-mono tracking-tight whitespace-nowrap", item.color)}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
