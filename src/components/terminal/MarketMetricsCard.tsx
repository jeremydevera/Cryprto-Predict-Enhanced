import { Card, CardContent } from '@/components/ui/Card'
import { useTradingStore } from '@/stores/tradingStore'
import { Star, Download, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'

export default function MarketMetricsCard() {
  const symbol = useTradingStore((s) => s.symbol)
  const metrics = useTradingStore((s) => s.metrics)
  const zones = useTradingStore((s) => s.zones)
  const regime = useTradingStore((s) => s.regime)

  const MetricItem = ({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) => (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className={cn("font-bold font-mono", valueColor || "text-slate-200")}>{value}</span>
    </div>
  )

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      {/* MARKET METRICS */}
      <div className="bg-[#161B22]/40 px-4 py-2 border-b border-slate-800/50">
        <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Market Metrics</h3>
      </div>
      <CardContent className="p-4 space-y-0.5">
        <MetricItem label="Coin" value={symbol.replace('USDT', '')} valueColor="text-cyan-400" />
        <MetricItem label="RSI (14)" value={metrics.rsi?.toFixed(1) ?? '—'} valueColor="text-amber-500" />
        <MetricItem label="EMA 20" value={metrics.ema20 ? `$${formatPrice(metrics.ema20)}` : '—'} valueColor="text-rose-400" />
        <MetricItem label="EMA 50" value={metrics.ema50 ? `$${formatPrice(metrics.ema50)}` : '—'} valueColor="text-rose-400" />
        <MetricItem label="EMA 200" value={metrics.ema200 ? `$${formatPrice(metrics.ema200)}` : '—'} valueColor="text-rose-400" />
        <MetricItem label="MACD" value={metrics.macd} valueColor="text-emerald-400" />
        <MetricItem label="Direction" value={metrics.direction} valueColor="text-amber-500" />
        <MetricItem label="Volatility" value={metrics.volatility} valueColor="text-cyan-400" />
        <MetricItem label="Momentum" value={metrics.momentum} valueColor="text-rose-400" />
        <div className="flex items-center justify-between py-1.5 text-[13px]">
          <span className="text-slate-400 font-medium">ADX (14)</span>
          <span className="font-bold font-mono text-amber-500">
            {metrics.adx} <span className="text-[11px] text-amber-600">▶{metrics.adxLabel}</span>
          </span>
        </div>
        <MetricItem label="Regime" value={regime} valueColor="text-amber-500" />
        <MetricItem label="HTF Bias" value={metrics.htfBias} valueColor="text-amber-500" />
        <MetricItem label="Candle" value={metrics.candle} valueColor="text-slate-400" />
        <div className="flex items-center justify-between py-1.5 text-[13px]">
          <span className="text-slate-400 font-medium">Signal Quality</span>
          <div className="flex items-center gap-1.5 text-rose-500">
            <span className="font-bold font-mono mr-1">{metrics.signalQuality}/8</span>
            {Array.from({ length: 8 }).map((_, i) => (
              <Star key={i} className={cn("h-3 w-3", i < metrics.signalQuality ? "fill-current" : "opacity-30")} />
            ))}
          </div>
        </div>
      </CardContent>

      {/* OVERALL SCORE */}
      <div className="bg-[#161B22]/40 px-4 py-2 border-y border-slate-800/50">
        <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Overall Score</h3>
      </div>
      <div className="h-32 flex flex-col items-center justify-center relative py-6">
        {/* Simplified Gauge */}
        <div className="relative w-28 h-14 overflow-hidden">
          <div className="absolute top-0 left-0 w-28 h-28 rounded-full border-[7px] border-slate-800 border-b-transparent rotate-45" />
          {/* Gauge needle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-14 bg-white origin-bottom transition-transform duration-1000 rotate-0" />
          <div className="absolute bottom-0 left-0 w-full flex justify-between px-1">
            <div className="h-2.5 w-1 bg-rose-500 rounded-sm -rotate-12" />
            <div className="h-2.5 w-1 bg-emerald-500 rounded-sm rotate-12" />
          </div>
        </div>
        <div className="mt-3 text-[12px] font-black text-amber-500 uppercase tracking-tighter">Neutral</div>
      </div>

      {/* ZONES (S&D Strategy) */}
      <div className="bg-[#161B22]/40 px-4 py-2 border-y border-slate-800/50">
        <h3 className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">Zones (S&D Strategy)</h3>
      </div>
      <div className="p-1">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-cyan-400 border-b border-slate-800/50">
              <th className="font-bold py-2 px-3 text-left">Zone</th>
              <th className="font-bold py-2 px-3 text-right">Price</th>
              <th className="font-bold py-2 px-3 text-right">Dist%</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr key={zone.name} className="hover:bg-slate-900/30 transition-colors">
                <td className={cn("py-2 px-3 font-bold", zone.color === 'supply' ? "text-rose-400" : "text-emerald-400")}>
                  {zone.name}
                </td>
                <td className={cn("py-2 px-3 text-right font-mono font-bold", zone.color === 'supply' ? "text-rose-400" : "text-emerald-400")}>
                  ${formatPrice(zone.price)}
                </td>
                <td className={cn("py-2 px-3 text-right font-mono font-black", zone.color === 'supply' ? "text-rose-400" : "text-emerald-400")}>
                  {zone.dist > 0 ? `+${zone.dist}%` : `${zone.dist}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="p-4 space-y-3 bg-[#0B0E14]">
        <div className="bg-[#161B22]/60 rounded p-2 flex items-center justify-center gap-2 border border-slate-800/50">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
             Not financial advice. DYOR.
          </span>
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-[#161B22] hover:bg-slate-800 text-slate-300 py-2.5 rounded border border-slate-800/50 text-[13px] font-bold transition-all">
          <Download className="h-4 w-4 text-cyan-500" />
          Export Report
        </button>
      </div>
    </Card>
  )
}
