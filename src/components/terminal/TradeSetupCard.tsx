import { Card, CardContent } from '@/components/ui/Card'
import { useTradingStore } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'

export default function TradeSetupCard() {
  const tradeSetup = useTradingStore((s) => s.tradeSetup)

  const formatPct = (val: number) => {
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`
  }

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <div className="grid grid-cols-2 border-b border-slate-800/50">
        {/* Entry Price */}
        <div className="p-4 border-r border-slate-800/50 bg-blue-500/5">
          <div className="text-[12px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Entry Price</div>
          <div className="text-xl font-black text-cyan-400 font-mono whitespace-nowrap">
            {tradeSetup ? `$${formatPrice(tradeSetup.entry)}` : '—'}
          </div>
        </div>
        
        {/* Stop Loss */}
        <div className="p-4 bg-rose-500/5">
          <div className="text-[12px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Stop Loss</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-xl font-black text-rose-500 font-mono whitespace-nowrap">
              {tradeSetup ? `$${formatPrice(tradeSetup.sl)}` : '—'}
            </div>
            {tradeSetup && (
              <div className="text-[11px] font-black text-rose-500/80 font-mono">
                ({formatPct(tradeSetup.slPct)})
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2">
        {/* Take Profit 1 */}
        <div className="p-4 border-r border-slate-800/50 bg-emerald-500/5">
          <div className="text-[12px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Take Profit 1</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-xl font-black text-emerald-500 font-mono whitespace-nowrap">
              {tradeSetup ? `$${formatPrice(tradeSetup.tp1)}` : '—'}
            </div>
            {tradeSetup && (
              <div className="text-[11px] font-black text-emerald-500/80 font-mono">
                ({formatPct(tradeSetup.tp1Pct)})
              </div>
            )}
          </div>
        </div>

        {/* Take Profit 2 */}
        <div className="p-4 bg-amber-500/5">
          <div className="text-[12px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Take Profit 2</div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-xl font-black text-amber-500 font-mono whitespace-nowrap">
              {tradeSetup ? `$${formatPrice(tradeSetup.tp2)}` : '—'}
            </div>
            {tradeSetup && (
              <div className="text-[11px] font-black text-amber-500/80 font-mono">
                ({formatPct(tradeSetup.tp2Pct)})
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
