import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useTradingStore } from '@/stores/tradingStore'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const labelToVariant = (label: string) => {
  if (label.includes('BUY')) return 'buy' as const
  if (label.includes('SELL')) return 'sell' as const
  return 'neutral' as const
}

const voteLabel = (v: 'buy' | 'sell' | 'neutral') => {
  if (v === 'buy') return '▲ BUY'
  if (v === 'sell') return '▼ SELL'
  return '—'
}

export default function ConfluenceCard() {
  const label = useTradingStore((s) => s.confluenceLabel)
  const agree = useTradingStore((s) => s.confluenceAgreeText)
  const rows = useTradingStore((s) => s.confluenceRows)
  const enabledStrategies = useTradingStore((s) => s.enabledStrategies)
  const enabledRows = rows.filter((r) => enabledStrategies.includes(r.strategy))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-300" />
          Confluence
        </CardTitle>
        <Badge variant={labelToVariant(label)}>{label}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-300">Strategy / TF / Vote / Perf</div>
          <div className="max-w-[220px] truncate text-right text-xs text-amber-300" title={agree}>
            {agree}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-md border border-slate-800">
          <table className="min-w-[420px] w-full text-sm">
            <thead className="bg-slate-950">
              <tr className="text-xs font-semibold text-cyan-400">
                <th className="px-3 py-2 text-left">Strategy</th>
                <th className="px-3 py-2 text-center">TF</th>
                <th className="px-3 py-2 text-center">Vote</th>
                <th className="px-3 py-2 text-right">Perf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {enabledRows.map((r) => (
                <tr key={r.id} className="text-slate-100">
                  <td className="px-3 py-2">
                    <div className="max-w-[170px] truncate" title={r.strategy}>
                      {r.strategy}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs text-slate-300">{r.tf || '—'}</span>
                  </td>
                  <td className={cn('px-3 py-2 text-center font-semibold', r.vote === 'buy' && 'text-emerald-400', r.vote === 'sell' && 'text-rose-400', r.vote === 'neutral' && 'text-slate-400')}>
                    {voteLabel(r.vote)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono text-xs text-cyan-400" title={r.perfText}>
                      {r.perfText}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Paper weights + chart-learning weights will be wired into this table.
        </div>
      </CardContent>
    </Card>
  )
}
