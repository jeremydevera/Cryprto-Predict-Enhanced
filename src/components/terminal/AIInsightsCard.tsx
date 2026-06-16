import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTradingStore } from '@/stores/tradingStore'
import { BrainCircuit, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AIInsightsCard() {
  const insights = useTradingStore((s) => s.insights)
  const symbol = useTradingStore((s) => s.symbol)
  const timeframe = useTradingStore((s) => s.timeframe)

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <CardHeader className="bg-[#161B22]/40 px-4 py-2.5 border-b border-slate-800/50">
        <CardTitle className="flex items-center justify-between gap-3 text-[12px] font-bold text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <BrainCircuit className="h-4.5 w-4.5 text-purple-400" />
            AI Analysis Insights
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500 normal-case tracking-normal">
            {symbol} · {timeframe}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {insights.map((ins) => (
            <div key={ins.label} className="rounded-lg border border-slate-800 bg-[#0d1117] p-3.5 transition-all hover:border-slate-700">
              <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-tighter">{ins.label}</div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-mono font-black text-slate-200">{ins.value}</span>
                {ins.status === 'bullish' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : ins.status === 'bearish' ? (
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                ) : (
                  <Minus className="h-4 w-4 text-slate-500" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-purple-500/5 p-3.5 text-[12px] text-purple-300/70 border border-purple-500/10 italic leading-relaxed">
          Signals are derived from multi-timeframe indicator confluence and volume profile analysis.
        </div>
      </CardContent>
    </Card>
  )
}
