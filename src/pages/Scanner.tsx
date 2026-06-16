import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STRATEGIES, useTradingStore } from '@/stores/tradingStore'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '@/utils/format'

type TF = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

const dirVariant = (d: 'buy' | 'sell') => (d === 'buy' ? 'buy' : 'sell')

export default function Scanner() {
  const navigate = useNavigate()
  const exchange = useTradingStore((s) => s.exchange)
  const setExchange = useTradingStore((s) => s.setExchange)
  const enabledStrategies = useTradingStore((s) => s.enabledStrategies)
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const scannerTimeframes = useTradingStore((s) => s.scannerTimeframes)
  const scannerNearEntryOnly = useTradingStore((s) => s.scannerNearEntryOnly)
  const scannerNearEntryPct = useTradingStore((s) => s.scannerNearEntryPct)
  const scannerContinuousScan = useTradingStore((s) => s.scannerContinuousScan)
  const scannerStopOnFirstSignal = useTradingStore((s) => s.scannerStopOnFirstSignal)
  const scannerIntervalSec = useTradingStore((s) => s.scannerIntervalSec)
  const scannerStrategy = useTradingStore((s) => s.scannerStrategy)
  const setScannerSettings = useTradingStore((s) => s.setScannerSettings)

  const setSymbol = useTradingStore((s) => s.setSymbol)
  const setTimeframe = useTradingStore((s) => s.setTimeframe)
  const startScanner = useTradingStore((s) => s.startScanner)
  const stopScanner = useTradingStore((s) => s.stopScanner)
  const scannerRunning = useTradingStore((s) => s.scannerRunning)
  const scannerProgress = useTradingStore((s) => s.scannerProgress)
  const scannerResults = useTradingStore((s) => s.scannerResults)

  const [symbols, setSymbols] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const resp = await fetch(`/api/prices/symbols?exchange=${exchange}`)
        const json = await resp.json()
        if (cancelled) return
        if (json?.success && Array.isArray(json.data)) setSymbols(json.data as string[])
      } catch {
        if (!cancelled) setSymbols([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [exchange])

  const toggleTF = (tf: TF) => {
    const current = (scannerTimeframes as TF[]).filter((t) => ['1m', '5m', '15m', '1h', '4h', '1d'].includes(t))
    const next = current.includes(tf) ? current.filter((x) => x !== tf) : [...current, tf]
    setScannerSettings({ scannerTimeframes: next })
  }

  const start = async () => {
    if (scannerRunning) return
    startScanner()
  }

  const stop = () => {
    stopScanner()
  }

  const sorted = useMemo(() => {
    return [...scannerResults].sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality
      if (b.confluence !== a.confluence) return b.confluence - a.confluence
      return a.symbol.localeCompare(b.symbol)
    })
  }, [scannerResults])

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-slate-100">Scanner</div>
            <div className="text-xs text-slate-500">Scans symbols using your Filters settings.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-9 border-slate-800" onClick={stop} disabled={!scannerRunning}>
              Stop
            </Button>
            <Button className="h-9 px-4 font-bold" onClick={start} disabled={scannerRunning || symbols.length === 0}>
              Start Scan
            </Button>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Controls</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-500">Exchange:</div>
              {(['binance', 'bybit'] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchange(ex)}
                  className={cn(
                    'rounded border px-2 py-1 text-xs font-bold',
                    exchange === ex ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-300',
                  )}
                >
                  {ex.toUpperCase()}
                </button>
              ))}
              {exchange === 'bybit' && (
                <div className="text-xs text-amber-400">
                  OHLCV source may not match Bybit symbols yet.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-500">Strategy:</div>
              <select
                value={scannerStrategy}
                onChange={(e) => setScannerSettings({ scannerStrategy: e.target.value })}
                className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200"
              >
                <option value="AUTO">AUTO (Regime)</option>
                {STRATEGIES.filter((s) => enabledStrategies.includes(s)).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                {scannerStrategy === 'AUTO' ? 'Uses auto-pick among enabled strategies.' : 'Forces this strategy during scan.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-500">Timeframes:</div>
              {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => toggleTF(tf)}
                  className={cn(
                    'rounded border px-2 py-1 text-xs font-bold',
                    scannerTimeframes.includes(tf) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300',
                  )}
                >
                  {tf}
                </button>
              ))}
              <div className="text-xs text-slate-500 ml-auto">
                {scannerProgress.total > 0 ? `${scannerProgress.done}/${scannerProgress.total}` : `${symbols.length} symbols`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-500">Near entry:</div>
              <button
                onClick={() => setScannerSettings({ scannerNearEntryOnly: !scannerNearEntryOnly })}
                className={cn(
                  'rounded border px-2 py-1 text-xs font-bold',
                  scannerNearEntryOnly ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-300',
                )}
              >
                {scannerNearEntryOnly ? 'ON' : 'OFF'}
              </button>
              <div className="text-xs text-slate-500">Max %:</div>
              <input
                type="number"
                min={0.05}
                max={5}
                step={0.05}
                value={scannerNearEntryPct}
                onChange={(e) => setScannerSettings({ scannerNearEntryPct: Number(e.target.value) })}
                className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200"
              />
              <div className="text-xs text-slate-500 ml-auto">
                Results: {scannerResults.length}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-slate-500">Continuous:</div>
              <button
                onClick={() => setScannerSettings({ scannerContinuousScan: !scannerContinuousScan })}
                className={cn(
                  'rounded border px-2 py-1 text-xs font-bold',
                  scannerContinuousScan ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-300',
                )}
              >
                {scannerContinuousScan ? 'ON' : 'OFF'}
              </button>
              <div className="text-xs text-slate-500">Every (sec):</div>
              <input
                type="number"
                min={5}
                max={3600}
                step={5}
                value={scannerIntervalSec}
                onChange={(e) => setScannerSettings({ scannerIntervalSec: Number(e.target.value) })}
                className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200"
              />
              <div className="text-xs text-slate-500">Stop on signal:</div>
              <button
                onClick={() => setScannerSettings({ scannerStopOnFirstSignal: !scannerStopOnFirstSignal })}
                className={cn(
                  'rounded border px-2 py-1 text-xs font-bold',
                  scannerStopOnFirstSignal ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-300',
                )}
              >
                {scannerStopOnFirstSignal ? 'ON' : 'OFF'}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Results</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {sorted.length === 0 ? (
              <div className="text-sm text-slate-500">No signals found yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-800">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">TF</th>
                      <th className="px-3 py-2 text-left">Signal</th>
                      <th className="px-3 py-2 text-left">Q</th>
                      <th className="px-3 py-2 text-left">C</th>
                      <th className="px-3 py-2 text-left">Near</th>
                      <th className="px-3 py-2 text-left">Entry</th>
                      <th className="px-3 py-2 text-left">SL</th>
                      <th className="px-3 py-2 text-left">TP1</th>
                      <th className="px-3 py-2 text-left">TP2</th>
                      <th className="px-3 py-2 text-left">Strategy</th>
                      <th className="px-3 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sorted.slice(0, 100).map((r) => (
                      <tr key={`${r.symbol}-${r.timeframe}-${r.strategy}`} className="text-slate-100">
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">{new Date(r.detectedAt).toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.symbol}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.timeframe}</td>
                        <td className="px-3 py-2">
                          <Badge variant={dirVariant(r.direction)} className="text-[10px] font-black px-2 py-0.5">
                            {r.direction.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.quality}/8</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.confluence}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          <span className={r.entryDistancePct <= scannerNearEntryPct ? 'text-emerald-400' : 'text-slate-400'}>
                            {r.entryDistancePct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.entry)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.sl)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.tp1)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{formatPrice(r.tp2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-300">{r.strategy}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="secondary"
                            className="h-7 border-slate-800 px-2 text-xs"
                            onClick={() => {
                              setSymbol(r.symbol)
                              setTimeframe(r.timeframe)
                              navigate('/terminal')
                            }}
                          >
                            Use
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
