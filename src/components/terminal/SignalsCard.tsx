import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useTradingStore } from '@/stores/tradingStore'
import { BellRing } from 'lucide-react'

const dirVariant = (d: 'buy' | 'sell' | 'neutral') => {
  if (d === 'buy') return 'buy' as const
  if (d === 'sell') return 'sell' as const
  return 'neutral' as const
}

export default function SignalsCard() {
  const signals = useTradingStore((s) => s.signals)
  const isConfluence = useTradingStore((s) => s.isConfluence)
  const minConfluence = useTradingStore((s) => s.minConfluence)

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <CardHeader className="bg-[#161B22]/40 px-4 py-2.5 border-b border-slate-800/50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-[13px] font-bold text-slate-300 uppercase tracking-wider">
          <BellRing className="h-4.5 w-4.5 text-cyan-400" />
          Signals List
        </CardTitle>
        <Badge variant="info" className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border-blue-500/20">LIVE FEED</Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {signals.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-800/50 bg-[#0d1117] px-4 py-3 transition-all hover:border-slate-700">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <Badge variant={dirVariant(s.direction)} className="text-[11px] font-black px-2 py-0.5">{s.label}</Badge>
                  <div className="text-[13px] font-bold text-slate-400">Quality: <span className="text-amber-500 font-mono">{s.quality}/8</span></div>
                  <div className="text-[13px] font-bold text-slate-400">
                    Conf: <span className="text-cyan-400 font-mono">{s.confluence}</span>
                    {isConfluence && <span className="text-slate-500 font-mono">/{minConfluence}</span>}
                  </div>
                </div>
                <div className="font-mono text-[12px] font-bold text-slate-500">{s.time}</div>
              </div>
              <div className="text-[13px] font-medium text-slate-300 leading-relaxed border-l-2 border-slate-800 pl-3 italic">
                {s.notes}
              </div>
            </div>
          ))}
          {signals.length === 0 && (
            <div className="py-8 text-center text-slate-600 text-[13px] font-medium italic border-2 border-dashed border-slate-800/30 rounded-xl">
              Waiting for market signal...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
