import { useCallback, useRef, useState } from 'react'
import { type ScanSettings } from '@/utils/signalScan'
import { simulatePaperBacktest, type BacktestOptions } from '@/hooks/useBacktestRunner'
import { computeParityDiff } from '@/utils/parityDiff'

// One live closed trade from MEXC (subset of fetchClosedPnl rows).
type LiveTrade = {
  symbol: string
  side: string          // 'Long' | 'Short'
  realizedPnl: number
  openTime: number      // unix seconds
  closeTime: number     // unix seconds
}

export type ParityResult = {
  ok: boolean
  message?: string
  window: { start: number; end: number }      // unix seconds, derived from live trades
  live: {
    count: number
    totalPnl: number
    symbols: string[]
    bySymbol: Record<string, { trades: number; pnl: number }>
  }
  backtest: {
    count: number
    totalPnl: number
    bySymbol: Record<string, { trades: number }>
  }
  // Per-symbol comparison (live vs backtest trade counts over the same window).
  rows: { symbol: string; liveTrades: number; btTrades: number; livePnl: number; match: boolean }[]
  // Headline verdict
  tradeCountMatchPct: number   // how close backtest trade count is to live (0..100)
  symbolsMatched: number       // symbols where live & backtest both traded
  symbolsLiveOnly: number      // symbols live traded but backtest didn't (missed signals)
  symbolsBtOnly: number        // symbols backtest traded but live didn't (phantom signals)
}

/**
 * Empirically validates backtest vs live: pulls the user's real MEXC closed trades, derives the
 * time window they span, runs the backtest over that exact window + the same symbols, and diffs.
 * This is the real "are they the same?" test — no manual comparison needed.
 */
export function useParityCheck() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ParityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRunning(false)
  }, [])

  const run = useCallback(async (params: {
    timeframe: string
    baseSettings: ScanSettings
    options?: BacktestOptions
    maxTrades?: number
  }) => {
    setRunning(true); setProgress(0); setResult(null); setError(null)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      // 1. Pull real live closed trades from MEXC.
      const r = await fetch(`/api/mexc-trader/closed-pnl?maxTrades=${params.maxTrades ?? 200}`)
      const j = await r.json()
      if (!j.success) { setError(j.error ?? 'Failed to fetch live closed trades'); setRunning(false); return }
      // MEXC returns open/close time in MILLISECONDS; backtest candle time is in SECONDS.
      // Normalize to seconds so the window and per-trade times line up with candle timestamps.
      const toSec = (n: number) => (n > 1e12 ? Math.floor(n / 1000) : n)
      const liveTrades: LiveTrade[] = (j.data?.trades ?? [])
        .filter((t: LiveTrade) => t.closeTime > 0 && t.openTime > 0)
        .map((t: LiveTrade) => ({ ...t, openTime: toSec(t.openTime), closeTime: toSec(t.closeTime) }))
      if (liveTrades.length === 0) {
        setError('No live closed trades found on MEXC to compare against.')
        setRunning(false); return
      }

      // 2. Derive the window the live trades span (from earliest open to latest close).
      const start = Math.min(...liveTrades.map(t => t.openTime))
      const end   = Math.max(...liveTrades.map(t => t.closeTime))

      // 3. Run the backtest over the SAME window + SAME symbols (MEXC candles for exact parity).
      const liveSymbols = Array.from(new Set(liveTrades.map(t => t.symbol)))
      const btResult = await simulatePaperBacktest({
        symbols: liveSymbols,
        timeframe: params.timeframe,
        baseSettings: params.baseSettings,
        options: {
          ...params.options,
          source: 'mexc',
          windowStart: start,
          windowEnd: end,
          // Live always exits 100% at TP1 — a runner-mode page setting would make the
          // live-vs-backtest diff apples-to-oranges.
          exitMode: 'tp1',
        },
        signal: controller.signal,
        onProgress: setProgress,
      })

      // 4. Diff via the pure, unit-tested function (scripts/parity-diff-test.ts).
      const d = computeParityDiff(liveTrades, btResult.symbolBreakdown, btResult.summary.totalTrades)

      setResult({
        ok: true,
        window: d.window,
        live: { count: d.live.count, totalPnl: d.live.totalPnl, symbols: d.live.symbols, bySymbol: d.live.bySymbol },
        backtest: { count: d.backtest.count, totalPnl: btResult.summary.netPnl, bySymbol: d.backtest.bySymbol },
        rows: d.rows,
        tradeCountMatchPct: d.tradeCountMatchPct,
        symbolsMatched: d.symbolsMatched,
        symbolsLiveOnly: d.symbolsLiveOnly,
        symbolsBtOnly: d.symbolsBtOnly,
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(e instanceof Error ? e.message : 'Parity check failed')
      }
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }, [])

  return { run, stop, running, progress, result, error }
}
