import { useCallback, useRef, useState } from 'react'
import { type ScanSettings } from '@/utils/signalScan'
import { simulatePaperBacktest, type BacktestOptions } from '@/hooks/useBacktestRunner'

export type ProfileRunInput = {
  /** Unique key for this run (e.g. `${editorKey}:${profileId}`) */
  runId: string
  strategy: string
  profileName: string
  baseSettings: ScanSettings
}

export type ProfileRunResult = Awaited<ReturnType<typeof simulatePaperBacktest>>

export type ProfileRunRow = {
  runId: string
  strategy: string
  profileName: string
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
  result?: ProfileRunResult
  error?: string
}

/**
 * Runs N backtest profiles in parallel — one simulatePaperBacktest per profile.
 * Each profile gets its own merged-timeline portfolio run (the scanner-matching engine),
 * tracked independently so the UI can show one result card per profile.
 */
export function useProfileBacktestRunner() {
  const [running, setRunning] = useState(false)
  const [rows, setRows] = useState<ProfileRunRow[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRunning(false)
  }, [])

  const run = useCallback(async (params: {
    inputs: ProfileRunInput[]
    symbols: string[]
    timeframe: string
    options?: BacktestOptions
  }) => {
    const { inputs, symbols, timeframe, options } = params
    if (inputs.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    setRunning(true)
    setRows(inputs.map(i => ({
      runId: i.runId, strategy: i.strategy, profileName: i.profileName,
      status: 'queued', progress: 0,
    })))

    const patch = (runId: string, p: Partial<ProfileRunRow>) =>
      setRows(prev => prev.map(r => (r.runId === runId ? { ...r, ...p } : r)))

    const runOne = async (input: ProfileRunInput) => {
      patch(input.runId, { status: 'running' })
      try {
        const result = await simulatePaperBacktest({
          symbols,
          timeframe,
          baseSettings: input.baseSettings,
          options,
          signal,
          onProgress: (pct) => patch(input.runId, { progress: pct }),
        })
        patch(input.runId, { status: 'done', progress: 100, result })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          patch(input.runId, { status: 'error', error: 'Stopped' })
        } else {
          patch(input.runId, { status: 'error', error: e instanceof Error ? e.message : 'Backtest error' })
        }
      }
    }

    // Bounded concurrency. Each profile backtests every symbol (often hundreds), so launching
    // all of them at once fires thousands of simultaneous fetches + heavy sims → the page chokes
    // and runs die. A small worker pool keeps it responsive, and because runs are staggered the
    // candle cache warms after the first profile so later profiles reuse its fetched candles.
    const POOL = 2
    let next = 0
    const worker = async () => {
      while (next < inputs.length && !signal.aborted) {
        const mine = inputs[next++]
        await runOne(mine)
      }
    }
    await Promise.all(Array.from({ length: Math.min(POOL, inputs.length) }, () => worker()))

    setRunning(false)
    abortRef.current = null
  }, [])

  return { run, stop, running, rows }
}
