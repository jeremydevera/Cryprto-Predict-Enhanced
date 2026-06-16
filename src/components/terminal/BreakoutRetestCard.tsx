import { Card, CardContent } from '@/components/ui/Card'
import { useTradingStore } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, Zap, Target, Shield } from 'lucide-react'

export default function BreakoutRetestCard() {
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const price = useTradingStore((s) => s.price)
  const metrics = useTradingStore((s) => s.metrics)
  const signals = useTradingStore((s) => s.signals)
  const tradeSetup = useTradingStore((s) => s.tradeSetup)

  const isActive = selectedStrategy === 'Breakout Retest'

  if (!isActive) {
    return (
      <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden opacity-60">
        <div className="bg-[#161B22]/40 px-4 py-2 border-b border-slate-800/50">
          <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Breakout Retest
          </h3>
        </div>
        <CardContent className="p-4">
          <div className="text-center text-slate-600 text-[12px] py-4">
            Select "Breakout Retest" strategy to activate
          </div>
        </CardContent>
      </Card>
    )
  }

  const primary = signals[0]
  const direction = primary?.direction === 'buy' || primary?.direction === 'sell' ? primary.direction : null
  const isBull = direction === 'buy'
  const hasSignal = Boolean(direction && tradeSetup)

  const entry = tradeSetup?.entry ?? null
  const sl = tradeSetup?.sl ?? null
  const tp1 = tradeSetup?.tp1 ?? null
  const tp2 = tradeSetup?.tp2 ?? null

  const risk = entry != null && sl != null ? Math.abs(entry - sl) : null
  const rr1 = risk && tp1 != null && entry != null ? Math.abs(tp1 - entry) / risk : null
  const rr2 = risk && tp2 != null && entry != null ? Math.abs(tp2 - entry) / risk : null
  const entryDistancePct = entry && price ? (Math.abs(price - entry) / entry) * 100 : null

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <div className="bg-[#161B22]/40 px-4 py-2 border-b border-slate-800/50 flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Breakout Retest
        </h3>
        <div className="flex items-center gap-2">
          {direction && (
            <span
              className={cn(
                'text-[10px] font-black px-2 py-0.5 rounded uppercase',
                isBull ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
              )}
            >
              {isBull ? 'LONG' : 'SHORT'}
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-500">
            {primary ? `Q:${primary.quality} | C:${primary.confluence}` : 'No signal'}
          </span>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="p-4">
          {!hasSignal ? (
            <div className="text-center text-slate-500 text-[12px] py-6">
              No Breakout Retest signal yet
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-cyan-400" />
                    Entry
                  </div>
                  <div className="text-[14px] font-black font-mono text-cyan-400">
                    ${entry?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Shield className="h-3 w-3 text-rose-400" />
                    Stop Loss
                  </div>
                  <div className="text-[14px] font-black font-mono text-rose-400">
                    ${sl?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3 text-emerald-400" />
                    TP1 / TP2
                  </div>
                  <div className="text-[14px] font-black font-mono text-emerald-400">
                    ${tp1?.toLocaleString()}
                    <span className="text-[10px] text-slate-500 ml-1">/</span>
                    <span className="text-[12px] text-emerald-500 ml-1">
                      ${tp2?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={cn('p-2 rounded bg-slate-900/30 border border-slate-800/50', isBull ? 'text-emerald-400' : 'text-rose-400')}>
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Side</div>
                  <div className="text-[12px] font-black font-mono">{isBull ? 'LONG' : 'SHORT'}</div>
                </div>
                <div className="p-2 rounded bg-slate-900/30 border border-slate-800/50 text-cyan-400">
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">R:R</div>
                  <div className="text-[12px] font-black font-mono">
                    {rr1 != null && rr2 != null ? `1:${rr1.toFixed(2)} / 1:${rr2.toFixed(2)}` : '—'}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/30 border border-slate-800/50 text-slate-300">
                  <div className="text-[9px] font-bold text-slate-600 uppercase mb-0.5">Distance</div>
                  <div className="text-[12px] font-black font-mono">
                    {entryDistancePct != null ? `${entryDistancePct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              </div>

              {primary?.notes && (
                <div className="mt-3 text-[10px] text-slate-500">
                  {primary.notes}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-800/30 px-3 py-2 bg-[#161B22]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {direction ? (
                isBull ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-400" />
              ) : (
                <Activity className="h-4 w-4 text-slate-500" />
              )}
              <span className="text-[11px] font-bold text-slate-400">
                {direction ? (isBull ? 'Bullish Breakout Retest' : 'Bearish Breakout Retest') : 'Waiting for signal'}
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              HTF: {metrics.htfBias}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
