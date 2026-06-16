import { useState, useCallback, useRef, useEffect } from 'react'
import { evaluateSignalFromCandles, type ScanSettings } from '@/utils/signalScan'
import type { OhlcvBar } from '@/utils/ohlcv'
import type { BacktestTrade } from './useBacktestRunner'

const STORAGE_KEY = 'fwd_test_trades_v1'

export type ForwardTestState = {
  trades: BacktestTrade[]
  activeTrade: BacktestTrade | null
  lastSignalTimeSec: number | null
  lastSignalDirection: 'buy' | 'sell' | null
  startedAt: number
  pollCount: number
  // Open time (sec) of the closed bar whose signal last opened a trade. The evaluator's
  // input is frozen for the whole forming bar, so without this one signal bar would
  // deterministically refire an identical trade on every poll after an intrabar close.
  lastEntryBarSec?: number
}

export type ForwardTestSummary = {
  totalTrades: number
  wins: number
  losses: number
  winrate: number
  totalR: number
  avgR: number
  openTrades: number
}

function loadState(): ForwardTestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ForwardTestState
  } catch { /* ignore */ }
  return { trades: [], activeTrade: null, lastSignalTimeSec: null, lastSignalDirection: null, startedAt: Date.now(), pollCount: 0 }
}

function saveState(s: ForwardTestState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

const HTF_FOR: Record<string, string> = {
  '1m': '15m', '5m': '1h', '15m': '1h', '1h': '4h', '4h': '1d',
}

async function fetchLatestCandles(symbol: string, interval: string, limit = 100): Promise<OhlcvBar[]> {
  const res = await fetch(`/api/prices/ohlcv?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const json = await res.json()
  if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid API response')
  return json.data.map((r: Record<string, unknown>) => ({
    time:   Number(r.time),
    open:   Number(r.open),
    high:   Number(r.high),
    low:    Number(r.low),
    close:  Number(r.close),
    volume: Number(r.volume),
  }))
}

function computeSummary(state: ForwardTestState): ForwardTestSummary {
  const closed = state.trades.filter((t) => t.result !== 'open')
  const wins   = closed.filter((t) => t.result === 'win')
  const losses = closed.filter((t) => t.result === 'loss')
  const totalR = closed.reduce((s, t) => s + t.r, 0)
  const openTrades = state.trades.filter((t) => t.result === 'open').length + (state.activeTrade ? 1 : 0)
  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winrate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    totalR,
    avgR: closed.length > 0 ? totalR / closed.length : 0,
    openTrades,
  }
}

export function useForwardTestRunner() {
  const [running, setRunning] = useState(false)
  const [state, setState]     = useState<ForwardTestState>(loadState)
  const [error, setError]     = useState<string | null>(null)
  const [lastPoll, setLastPoll] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const paramsRef = useRef<{ symbol: string; timeframe: string; baseSettings: ScanSettings } | null>(null)
  const stateRef  = useRef<ForwardTestState>(state)

  useEffect(() => { stateRef.current = state }, [state])

  const poll = useCallback(async () => {
    const params = paramsRef.current
    if (!params) return
    setLastPoll(Date.now())

    try {
      const htfTf = HTF_FOR[params.timeframe] ?? null
      const [candles, htfCandles] = await Promise.all([
        fetchLatestCandles(params.symbol, params.timeframe, 120),
        htfTf ? fetchLatestCandles(params.symbol, htfTf, 120).catch(() => [] as OhlcvBar[]) : Promise.resolve([] as OhlcvBar[]),
      ])
      if (candles.length < 60) return

      let st = { ...stateRef.current, pollCount: stateRef.current.pollCount + 1 }
      const last = candles[candles.length - 1]
      let tradeId = st.trades.length + (st.activeTrade ? 1 : 0)

      // Check active trade against latest candle
      if (st.activeTrade) {
        const at = st.activeTrade
        const risk = Math.max(Math.abs(at.entry - at.sl), 1e-8)
        const nextMfeR =
          at.direction === 'buy'
            ? Math.max(at.mfeR, (last.high - at.entry) / risk)
            : Math.max(at.mfeR, (at.entry - last.low) / risk)
        const nextMaeR =
          at.direction === 'buy'
            ? Math.max(at.maeR, (at.entry - last.low) / risk)
            : Math.max(at.maeR, (last.high - at.entry) / risk)
        let closed = false
        if (at.direction === 'buy') {
          if (last.low <= at.sl) {
            st = { ...st, trades: [...st.trades, { ...at, result: 'loss', exitPrice: at.sl, closeTime: last.time, r: -1, mfeR: nextMfeR, maeR: nextMaeR }], activeTrade: null, lastSignalTimeSec: at.openTime, lastSignalDirection: at.direction }
            closed = true
          } else if (last.high >= at.tp1) {
            const r = Math.abs(at.tp1 - at.entry) / Math.max(Math.abs(at.entry - at.sl), 1e-8)
            st = { ...st, trades: [...st.trades, { ...at, result: 'win', exitPrice: at.tp1, closeTime: last.time, r: +r, mfeR: nextMfeR, maeR: nextMaeR }], activeTrade: null, lastSignalTimeSec: at.openTime, lastSignalDirection: at.direction }
            closed = true
          }
        } else {
          if (last.high >= at.sl) {
            st = { ...st, trades: [...st.trades, { ...at, result: 'loss', exitPrice: at.sl, closeTime: last.time, r: -1, mfeR: nextMfeR, maeR: nextMaeR }], activeTrade: null, lastSignalTimeSec: at.openTime, lastSignalDirection: at.direction }
            closed = true
          } else if (last.low <= at.tp1) {
            const r = Math.abs(at.entry - at.tp1) / Math.max(Math.abs(at.sl - at.entry), 1e-8)
            st = { ...st, trades: [...st.trades, { ...at, result: 'win', exitPrice: at.tp1, closeTime: last.time, r: +r, mfeR: nextMfeR, maeR: nextMaeR }], activeTrade: null, lastSignalTimeSec: at.openTime, lastSignalDirection: at.direction }
            closed = true
          }
        }
        if (!closed) {
          // Update open trade mark-to-market price
          st = { ...st, activeTrade: { ...at, exitPrice: last.close, mfeR: nextMfeR, maeR: nextMaeR } }
        }
      }

      // Only look for new signal if no active trade
      if (!st.activeTrade) {
        // The evaluator works on the last CLOSED bar — identify it so a single signal bar
        // can't refire a duplicate trade on every poll for the rest of the forming bar.
        const tfNum = Number((params.timeframe.match(/^\d+/) || [1])[0]) || 1
        const tfUnit = params.timeframe.slice(-1)
        const tfMs = tfNum * (tfUnit === 'h' ? 3_600_000 : tfUnit === 'd' ? 86_400_000 : 60_000)
        const closedIdx = Number(last.time) * 1000 + tfMs > Date.now() && candles.length > 1
          ? candles.length - 2 : candles.length - 1
        const signalBarSec = Number(candles[closedIdx]?.time ?? last.time)
        const settings: ScanSettings = {
          ...params.baseSettings,
          lastSignalTimeSec: st.lastSignalTimeSec,
          lastSignalDirection: st.lastSignalDirection,
          lastCandleTimeSec: signalBarSec,
          timeframe: params.timeframe,
        }
        const htfSlice = htfCandles.length > 0 ? htfCandles : undefined
        const signal = (st.lastEntryBarSec ?? 0) === signalBarSec
          ? null
          : evaluateSignalFromCandles({ candles, settings, symbol: params.symbol, htfCandles: htfSlice })
        // Live fills at MARKET — the closed-bar signal price can be up to a bar old. Enter
        // at the current price; skip if it has already gapped through SL or TP1 (the
        // engines' fill-gap rule), consuming the signal bar either way.
        const fill = Number(last.close)
        const gapped = signal
          ? (signal.direction === 'buy'
              ? fill <= signal.sl || fill >= signal.tp1
              : fill >= signal.sl || fill <= signal.tp1)
          : false
        if (signal && gapped) {
          st = { ...st, lastEntryBarSec: signalBarSec }
        }
        if (signal && !gapped && fill > 0) {
          tradeId++
          st = { ...st, lastEntryBarSec: signalBarSec }
          const newTrade: BacktestTrade = {
            id: tradeId,
            openTime:  last.time,
            closeTime: 0,
            direction: signal.direction,
            entry:     fill,
            sl:        signal.sl,
            tp1:       signal.tp1,
            tp2:       signal.tp2,
            liqPrice:  0,
            exitPrice: last.close,
            result:    'open',
            closeReason: 'open',
            r:         0,
            marginUsed: 0,
            positionSize: 0,
            leverage: 1,
            grossPnl: 0,
            fees: 0,
            pnl:       0,
            equityAfter: 0,
            mfeR:      0,
            maeR:      0,
            signals:   signal.notes,
            strategy:  signal.strategy,
            quality:   signal.quality,
            confluence: signal.confluence,
          }
          st = { ...st, activeTrade: newTrade }
        }
      }

      setState(st)
      saveState(st)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Poll error')
    }
  }, [])

  const start = useCallback((params: { symbol: string; timeframe: string; baseSettings: ScanSettings }) => {
    paramsRef.current = params
    setRunning(true)
    poll()
    timerRef.current = setInterval(poll, 60_000)
  }, [poll])

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setRunning(false)
  }, [])

  const clearTrades = useCallback(() => {
    const fresh: ForwardTestState = { trades: [], activeTrade: null, lastSignalTimeSec: null, lastSignalDirection: null, startedAt: Date.now(), pollCount: 0 }
    setState(fresh)
    saveState(fresh)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const summary = computeSummary(state)

  return { start, stop, clearTrades, running, state, summary, error, lastPoll }
}
