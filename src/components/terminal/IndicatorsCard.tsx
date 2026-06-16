import { Card, CardContent } from '@/components/ui/Card'
import { useTradingStore } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'

export default function IndicatorsCard() {
  const table = useTradingStore((s) => s.indicatorTable)

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      {/* INDICATORS HEADER */}
      <div className="bg-[#161B22]/40 px-4 py-2 border-b border-slate-800/50">
        <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Indicator Status</h3>
      </div>
      
      <CardContent className="p-0">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-slate-800/50">
              <th className="py-2.5 px-4 text-left font-bold text-cyan-400">Indicator</th>
              <th className="py-2.5 px-4 text-center font-bold text-cyan-400">Value</th>
              <th className="py-2.5 px-4 text-right font-bold text-cyan-400">Signal</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.name} className="hover:bg-slate-900/30 transition-colors border-b border-slate-800/20 last:border-0">
                <td className={cn(
                  "py-2 px-4 font-bold",
                  row.color === 'buy' ? "text-emerald-400" : row.color === 'sell' ? "text-rose-400" : "text-amber-500"
                )}>
                  {row.name}
                </td>
                <td className={cn(
                  "py-2 px-4 text-center font-mono font-black",
                  row.color === 'buy' ? "text-emerald-400" : row.color === 'sell' ? "text-rose-400" : "text-amber-500"
                )}>
                  {row.value}
                </td>
                <td className={cn(
                  "py-2 px-4 text-right font-black uppercase",
                  row.color === 'buy' ? "text-emerald-400" : row.color === 'sell' ? "text-rose-400" : "text-amber-500"
                )}>
                  {row.signal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PRICE ALERT */}
        <div className="bg-[#161B22]/40 px-4 py-2 border-y border-slate-800/50">
          <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Price Alert System</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-slate-400">Alert $</span>
            <input 
              type="text" 
              placeholder="0.00"
              className="flex-1 h-9 bg-[#0B0E14] border border-slate-800 rounded px-3 text-[13px] font-mono font-bold text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button className="h-9 px-5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-black rounded-md transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
              SET
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
