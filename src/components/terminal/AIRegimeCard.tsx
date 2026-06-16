import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTradingStore, type RegimeScores } from '@/stores/tradingStore'
import { Activity, Target, BrainCircuit } from 'lucide-react'
import { cn } from '@/lib/utils'

const REGIME_COLORS: Record<string, string> = {
  Trending: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
  Ranging: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
  Choppy: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
  Breakout: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
  Exhaustion: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
}

const REGIME_LABELS: Record<string, string> = {
  Trending: 'text-emerald-400',
  Ranging: 'text-blue-400',
  Choppy: 'text-amber-400',
  Breakout: 'text-purple-400',
  Exhaustion: 'text-rose-400',
}

export default function AIRegimeCard() {
  const regime = useTradingStore((s) => s.regime)
  const scores = useTradingStore((s) => s.regimeScores)

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <CardHeader className="bg-[#161B22]/40 px-4 py-2.5 border-b border-slate-800/50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[12px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit className="h-4.5 w-4.5 text-emerald-400" />
          AI Regime Analysis
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full animate-pulse", REGIME_COLORS[regime]?.split(' ')[0] || 'bg-slate-500')} />
          <span className="text-[11px] font-bold text-slate-500 uppercase">Live</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-5">
        {/* Current State Highlight */}
        <div className="rounded-lg bg-slate-900/40 border border-slate-800/50 p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-16 w-16" />
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Market State</span>
            <span className={cn("text-[12px] font-black uppercase tracking-tighter px-2 py-1 rounded border border-current/20", REGIME_LABELS[regime])}>
              {regime}
            </span>
          </div>
          <div className="text-[12px] text-slate-300 leading-relaxed pr-8 font-medium">
            System detects <span className={cn("font-bold underline decoration-2 underline-offset-4", REGIME_LABELS[regime])}>{regime.toLowerCase()}</span> bias. 
            {regime === 'Trending' && ' High probability for trend-following entries.'}
            {regime === 'Ranging' && ' Mean-reversion strategies are prioritized.'}
            {regime === 'Choppy' && ' Low conviction area. Reduce position sizes.'}
            {regime === 'Breakout' && ' Monitoring for volatility expansion.'}
            {regime === 'Exhaustion' && ' Potential reversal imminent. Tighten SL.'}
          </div>
        </div>

        {/* Probability Bars */}
        <div className="space-y-4">
          {(Object.entries(scores) as [keyof RegimeScores, number][]).map(([name, score]) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tighter">
                <span className={cn("transition-colors", regime === name ? REGIME_LABELS[name] : "text-slate-500")}>
                  {name}
                </span>
                <span className={cn("font-mono", regime === name ? "text-slate-100" : "text-slate-400")}>
                  {score}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800/30">
                <div
                  className={cn(
                    "h-full transition-all duration-700 ease-out rounded-full relative",
                    REGIME_COLORS[name],
                    regime !== name && "opacity-40"
                  )}
                  style={{ width: `${score}%` }}
                >
                  {regime === name && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* History Chart Placeholder (Matching Windows App) */}
        <div className="mt-3 border-t border-slate-800/50 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Regime History</span>
            <span className="text-[10px] text-slate-600 font-mono italic">Last 50 candles</span>
          </div>
          <div className="h-20 rounded-lg border border-slate-800/50 bg-slate-950/50 flex flex-col items-center justify-center relative group">
             <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
             </div>
             <Activity className="h-6 w-6 text-slate-800 mb-1 group-hover:text-slate-700 transition-colors" />
             <span className="text-[10px] text-slate-700 uppercase font-black tracking-widest">History visualization active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
