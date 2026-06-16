import { useCallback, useRef, useState } from 'react'
import { type ScanSettings } from '@/utils/signalScan'
import {
  simulateBacktest,
  type BacktestOptions,
  type BacktestSummary,
} from '@/hooks/useBacktestRunner'

type MultiSymbolRow = {
  symbol: string
  summary: BacktestSummary
  candleCount: number
  period: { from: number; to: number }
  error?: string
}

type MultiSymbolResult = {
  rows: MultiSymbolRow[]
  total: number
  done: number
}

const EMPTY_SUMMARY: BacktestSummary = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  liquidations: 0,
  winrate: 0,
  totalR: 0,
  avgR: 0,
  startingCapital: 0,
  endingCapital: 0,
  netPnl: 0,
  grossPnl: 0,
  totalFees: 0,
  returnPct: 0,
  tradeAmount: 0,
  leverage: 0,
  marginMode: 'isolated',
  feeRatePct: 0,
  maxOpenPositions: 0,
  maxDrawdown: 0,
  maxFloatingDrawdown: 0,
  maxDrawdownUsd: 0,
  maxFloatingDrawdownUsd: 0,
  maxMfeBeforeLoss: 0,
  maxMaeBeforeWin: 0,
  profitFactor: 0,
}

export function useMultiBacktestRunner() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [result, setResult] = useState<MultiSymbolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRunning(false)
  }, [])

  const runAll = useCallback(async (params: {
    symbols: string[]
    timeframe: string
    baseSettings: ScanSettings
    options?: BacktestOptions
    concurrency?: number
  }) => {
    const list = (params.symbols ?? []).filter((s) => typeof s === 'string' && s.trim().length > 0)
    const total = list.length
    setRunning(true)
    setProgress({ done: 0, total })
    setResult({ rows: [], total, done: 0 })
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    try {
      const rows: MultiSymbolRow[] = []
      let done = 0
      let idx = 0
      const defaultWorkers = Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 1))
      const workers = Math.max(1, Math.min(16, params.concurrency ?? defaultWorkers))

      // Throttle UI updates — a sort + setState per completion stalls the main thread when many
      // symbols finish in quick succession. Coalesce to one update per animation frame.
      let pendingFlush = false
      const flush = () => {
        pendingFlush = false
        setProgress({ done, total })
        setResult({
          rows: rows.slice().sort((a, b) =>
            (b.summary.winrate - a.summary.winrate) || (b.summary.totalR - a.summary.totalR),
          ),
          total,
          done,
        })
      }
      const scheduleFlush = () => {
        if (pendingFlush) return
        pendingFlush = true
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush)
        else setTimeout(flush, 16)
      }

      const worker = async () => {
        while (true) {
          if (signal.aborted) return
          const myIdx = idx
          idx++
          if (myIdx >= total) return
          const symbol = list[myIdx]
          try {
            const r = await simulateBacktest({
              symbol,
              timeframe: params.timeframe,
              baseSettings: params.baseSettings,
              options: params.options,
              signal,
            })
            rows.push({ symbol, summary: r.summary, candleCount: r.candleCount, period: r.period })
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Backtest error'
            rows.push({
              symbol,
              summary: { ...EMPTY_SUMMARY },
              candleCount: 0,
              period: { from: 0, to: 0 },
              error: msg,
            })
          } finally {
            done++
            scheduleFlush()
          }
        }
      }

      await Promise.all(Array.from({ length: workers }, () => worker()))
      // Final synchronous flush — guarantees the last result is delivered even if a frame is pending
      pendingFlush = false
      setProgress({ done, total })
      setResult({
        rows: rows.slice().sort((a, b) =>
          (b.summary.winrate - a.summary.winrate) || (b.summary.totalR - a.summary.totalR),
        ),
        total,
        done,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }, [])

  return { runAll, stop, running, progress, result, error }
}
