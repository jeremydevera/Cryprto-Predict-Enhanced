import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useTradingStore } from '@/stores/tradingStore'
import { Maximize2, RotateCcw } from 'lucide-react'
import { 
  generateSampleOhlcv, 
  type OhlcvBar,
  type Timeframe
} from '@/utils/ohlcv'
import { useMemo, useState, useEffect } from 'react'
import { useMarketAnalysis } from '@/hooks/useMarketAnalysis'
import TradingViewAdvancedChart from '@/components/terminal/TradingViewAdvancedChart'
import { cn } from '@/lib/utils'

export default function ChartCard() {
  const symbol = useTradingStore((s) => s.symbol)
  const timeframe = useTradingStore((s) => s.timeframe)
  const setTimeframe = useTradingStore((s) => s.setTimeframe)
  const exchange = useTradingStore((s) => s.exchange)
  const setPrice = useTradingStore((s) => s.setPrice)
  const chartResetNonce = useTradingStore((s) => s.chartResetNonce)
  const resetChart = useTradingStore((s) => s.resetChart)

  const [realtimeCandles, setRealtimeCandles] = useState<OhlcvBar[]>([])

  const tf = (['1m', '5m', '15m', '1h', '4h', '1d'] as const).includes(timeframe as any)
    ? (timeframe as Timeframe)
    : '15m'

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/prices/ohlcv?symbol=${symbol}&interval=${tf}`)
        const json: unknown = await response.json()

        const obj = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
        const success = obj?.success === true
        const data = obj?.data

        if (success && Array.isArray(data)) {
          const normalized: OhlcvBar[] = data
            .map((row: unknown) => {
              const r = (row ?? {}) as Record<string, unknown>
              return {
                time: Number(r.time),
                open: Number(r.open),
                high: Number(r.high),
                low: Number(r.low),
                close: Number(r.close),
                volume: Number(r.volume),
              }
            })
            .filter(
              (b) =>
                Number.isFinite(b.time) &&
                Number.isFinite(b.open) &&
                Number.isFinite(b.high) &&
                Number.isFinite(b.low) &&
                Number.isFinite(b.close) &&
                Number.isFinite(b.volume),
            )
            .sort((a, b) => a.time - b.time)
          setRealtimeCandles(normalized)
        }
      } catch (err) {
        console.error('Failed to fetch history:', err)
      }
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 30000) // update every 30s
    return () => clearInterval(interval)
  }, [symbol, tf])

  useEffect(() => {
    const pollPrice = async () => {
      try {
        const response = await fetch(`/api/prices/ticker?symbol=${symbol}`)
        const json = await response.json()
        if (json.success) {
          const newPrice = Number(json.data?.price)
          const vol24h = json.data?.vol24h
          const mktCap = json.data?.mktCap
          setPrice(newPrice, 0, { vol24h, mktCap })
        }
      } catch (err) {
        console.error('Failed to poll price:', err)
      }
    }

    pollPrice()
    const interval = setInterval(pollPrice, 2000) // 2s real-time updates
    return () => clearInterval(interval)
  }, [symbol, setPrice])

  const sample = useMemo(() => {
    return realtimeCandles.length > 0 ? realtimeCandles : generateSampleOhlcv({ symbol, timeframe: tf })
  }, [symbol, tf, realtimeCandles])

  useMarketAnalysis(sample)
  
  return (
    <Card className="h-[680px]">
      <CardHeader className="flex flex-col gap-3 py-2 px-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-sm font-bold text-slate-200">
              {symbol} <span className="text-slate-500 font-normal">· {tf}</span>
            </CardTitle>
            
            <div className="flex items-center bg-slate-900 rounded-md p-0.5">
              {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium rounded transition-colors",
                    tf === t ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={resetChart}
              aria-label="Reset chart"
              title="Reset chart"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(680px-52px)] p-0 relative overflow-hidden">
        <div className="h-full bg-slate-950">
          <TradingViewAdvancedChart
            key={chartResetNonce}
            symbol={symbol}
            exchange={exchange}
            timeframe={tf}
            theme="dark"
          />
        </div>
      </CardContent>
    </Card>
  )
}
