import { useState, useCallback, useRef } from 'react'
import { buildIndicatorCache, evaluateSignalFromCandles, type ScanSettings } from '@/utils/signalScan'
import { resolveExit, resolvePhasedExit, grossPnl as pureGrossPnl, roundTripFee as pureFee, isolatedLiqPrice, crossLiqPrice } from '@/utils/tradeExec'
import type { OhlcvBar } from '@/utils/ohlcv'

export type BacktestTrade = {
  id: number
  symbol?: string
  openTime: number
  closeTime: number
  direction: 'buy' | 'sell'
  entry: number
  sl: number
  tp1: number
  tp2: number
  liqPrice: number
  exitPrice: number
  result: 'win' | 'loss' | 'open'
  closeReason: 'tp' | 'sl' | 'liquidated' | 'open'
  r: number
  marginUsed: number
  positionSize: number
  leverage: number
  grossPnl: number
  fees: number
  pnl: number
  equityAfter: number
  mfeR: number
  maeR: number
  signals: string
  strategy: string
  quality: number
  confluence: number
}

export type BacktestSummary = {
  totalTrades: number
  wins: number
  losses: number
  liquidations: number
  winrate: number
  totalR: number
  avgR: number
  startingCapital: number
  endingCapital: number
  netPnl: number
  grossPnl: number
  totalFees: number
  returnPct: number
  tradeAmount: number
  leverage: number
  marginMode: 'isolated' | 'cross'
  feeRatePct: number
  maxOpenPositions: number
  maxDrawdown: number
  maxFloatingDrawdown: number
  maxDrawdownUsd: number
  maxFloatingDrawdownUsd: number
  maxMfeBeforeLoss: number
  maxMaeBeforeWin: number
  profitFactor: number
}

export type BacktestResult = {
  trades: BacktestTrade[]
  summary: BacktestSummary
  candleCount: number
  period: { from: number; to: number }
}

export type BacktestOptions = {
  /** When SL+TP both touch in same bar, book as loss (industry pessimistic standard) */
  pessimisticSameBar?: boolean
  /** Max candles to fetch (default 5000) */
  candleLimit?: number
  /** Starting account capital used to convert R results into currency P/L */
  startingCapital?: number
  /** Fixed USDT position size used for each new signal */
  tradeAmount?: number
  /** Futures leverage multiplier applied to the margin used per signal */
  leverage?: number
  /** Isolated: each trade has its own margin. Cross: full account balance backs all trades */
  marginMode?: 'isolated' | 'cross'
  /** Trading fee percent charged per side on notional position size */
  feeRatePct?: number
  /** Maximum concurrent open positions in this backtest simulation */
  maxOpenPositions?: number
  /** Market-order slippage % applied adversely to entry AND exit fills (live ≈ 0.01–0.1% on liquid pairs). 0 = ideal fills. */
  slippagePct?: number
  /** Live parity (paper engine): halt NEW entries for the rest of a UTC day once capital drops this % below the day's start — mirrors mexcTrader dailyLossLimitPct. 0 = off. */
  dailyLossLimitPct?: number
  /** Live parity (paper engine): stop ALL new entries for the rest of the run once capital ≤ this USDT floor — mirrors mexcTrader lossThreshold kill switch. 0 = off. */
  lossThresholdUSDT?: number
  /** Exit model: 'tp1' = 100% out at TP1 (matches live MEXC bracket). 'runner' = partial at TP1, stop → breakeven, runner targets TP2. */
  exitMode?: 'tp1' | 'runner'
  /** Runner mode: share of the position left to run to TP2 after the TP1 partial (0.05–0.95). */
  runnerFraction?: number
  /** Candle data source. 'mexc' matches live MEXC fill prices exactly. Default 'binance'. */
  source?: string
  /** Time-range replay: only count trades ENTERED at/after this unix-seconds timestamp. */
  windowStart?: number
  /** Time-range replay: stop OPENING new trades after this unix-seconds timestamp (open trades still resolve). */
  windowEnd?: number
  /**
   * Parity mode: only OPEN trades whose entry falls inside one of these [startSec, endSec] buckets.
   * Used to restrict the backtest to the periods the live scanner was actually active, so a
   * continuously-evaluating backtest is compared apples-to-apples against intermittent live trading.
   */
  activeWindows?: [number, number][]
}

const DEFAULT_OPTS: Required<BacktestOptions> = {
  pessimisticSameBar: true,
  candleLimit:      600,
  startingCapital:  27,
  tradeAmount:      1,
  leverage:         1,
  marginMode:       'cross',
  feeRatePct:       0.02,
  maxOpenPositions: 1,
  slippagePct:      0,
  dailyLossLimitPct: 0,
  lossThresholdUSDT: 0,
  exitMode:         'tp1',
  runnerFraction:   0.5,
  source:           'binance',
  windowStart:      0,
  windowEnd:        0,
  activeWindows:    [],
}

// Standard maintenance margin rate used by most exchanges (Binance/Bybit tier 1)
const MAINTENANCE_RATE = 0.005

// Bg scanner dedup: same symbol+tf+strategy+direction won't re-fire within this window.
// Mirrors backgroundScanner.ts SIGNAL_COOLDOWN_MS (4 hours).
const SIGNAL_COOLDOWN_SEC = 4 * 60 * 60

const TF_SECONDS: Record<string, number> = {
  '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
  '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600, '8h': 28800,
  '12h': 43200, '1d': 86400, '3d': 259200, '1w': 604800,
}

const HTF_FOR: Record<string, string> = {
  '1m': '15m', '5m': '1h', '15m': '1h', '1h': '4h', '4h': '1d',
}

// ── IndexedDB cache for OHLCV fetches ──────────────────────────────────────
// Same (symbol, interval, limit) requested many times during a multi-symbol run or
// repeated runs — hitting the API every time is wasteful. Cache with a 5-minute TTL
// so live data stays fresh but redundant fetches inside a run are eliminated.
const OHLCV_DB_NAME = 'cryptopredict-ohlcv-cache'
const OHLCV_STORE = 'candles'
const OHLCV_TTL_MS = 5 * 60 * 1000

let _dbPromise: Promise<IDBDatabase | null> | null = null
function openOhlcvDb(): Promise<IDBDatabase | null> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const req = indexedDB.open(OHLCV_DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(OHLCV_STORE)) db.createObjectStore(OHLCV_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return _dbPromise
}

function ohlcvCacheKey(symbol: string, interval: string, limit: number) {
  return `${symbol}|${interval}|${limit}`
}

async function readOhlcvCache(symbol: string, interval: string, limit: number): Promise<OhlcvBar[] | null> {
  const db = await openOhlcvDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OHLCV_STORE, 'readonly')
      const req = tx.objectStore(OHLCV_STORE).get(ohlcvCacheKey(symbol, interval, limit))
      req.onsuccess = () => {
        const v = req.result as { ts: number; data: OhlcvBar[] } | undefined
        if (!v || typeof v.ts !== 'number' || !Array.isArray(v.data)) return resolve(null)
        if (Date.now() - v.ts > OHLCV_TTL_MS) return resolve(null)
        resolve(v.data)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function writeOhlcvCache(symbol: string, interval: string, limit: number, data: OhlcvBar[]): Promise<void> {
  const db = await openOhlcvDb()
  if (!db) return
  try {
    const tx = db.transaction(OHLCV_STORE, 'readwrite')
    tx.objectStore(OHLCV_STORE).put({ ts: Date.now(), data }, ohlcvCacheKey(symbol, interval, limit))
  } catch {
    /* ignore */
  }
}

export async function fetchCandles(
  symbol: string,
  interval: string,
  limit = 5000,
  signal?: AbortSignal,
  opts?: { source?: string; startTime?: number; endTime?: number },
): Promise<OhlcvBar[]> {
  const ranged = opts?.startTime != null || opts?.endTime != null
  const source = opts?.source

  // Cache is keyed by (symbol, interval, limit) only — never serve it for ranged/alt-source
  // requests, which must be exact and fresh.
  if (!ranged && !source) {
    const cached = await readOhlcvCache(symbol, interval, limit)
    if (cached && cached.length >= 60) return cached
  }

  const qs = new URLSearchParams({ symbol, interval, limit: String(limit) })
  if (source) qs.set('source', source)
  if (opts?.startTime != null) qs.set('startTime', String(Math.floor(opts.startTime)))
  if (opts?.endTime   != null) qs.set('endTime',   String(Math.floor(opts.endTime)))

  const res = await fetch(`/api/prices/ohlcv?${qs.toString()}`, { signal })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const json = await res.json()
  if (!json.success || !Array.isArray(json.data)) throw new Error('Invalid API response')
  const bars: OhlcvBar[] = json.data.map((r: Record<string, unknown>) => ({
    time:   Number(r.time),
    open:   Number(r.open),
    high:   Number(r.high),
    low:    Number(r.low),
    close:  Number(r.close),
    volume: Number(r.volume),
  }))
  // Only cache the plain "latest N" case to avoid polluting the cache with partial ranges.
  if (!ranged && !source) writeOhlcvCache(symbol, interval, limit, bars).catch(() => {})
  return bars
}

/**
 * Pure simulation function — used by both single and multi-symbol backtest runners.
 * Walk-forward: only uses data up to current bar, no look-ahead.
 */
export async function simulateBacktest(params: {
  symbol: string
  timeframe: string
  baseSettings: ScanSettings
  options?: BacktestOptions
  signal?: AbortSignal
  onProgress?: (pct: number) => void
}): Promise<BacktestResult> {
  const opts: Required<BacktestOptions> = { ...DEFAULT_OPTS, ...(params.options ?? {}) }
  const startingCapital =
    Number.isFinite(opts.startingCapital) && opts.startingCapital > 0
      ? opts.startingCapital
      : DEFAULT_OPTS.startingCapital
  const tradeAmount =
    Number.isFinite(opts.tradeAmount) && opts.tradeAmount > 0
      ? opts.tradeAmount
      : DEFAULT_OPTS.tradeAmount
  const leverage =
    Number.isFinite(opts.leverage) && opts.leverage > 0
      ? opts.leverage
      : DEFAULT_OPTS.leverage
  const marginMode: 'isolated' | 'cross' =
    opts.marginMode === 'cross' ? 'cross' : 'isolated'
  const feeRatePct =
    Number.isFinite(opts.feeRatePct) && opts.feeRatePct >= 0
      ? opts.feeRatePct
      : DEFAULT_OPTS.feeRatePct
  const maxOpenPositions =
    Number.isFinite(opts.maxOpenPositions)
      ? Math.max(1, Math.floor(opts.maxOpenPositions))
      : DEFAULT_OPTS.maxOpenPositions
  const slipFrac = Math.max(0, opts.slippagePct) / 100
  const exitMode = opts.exitMode === 'runner' ? 'runner' : 'tp1'
  const runnerFraction = Math.min(0.95, Math.max(0.05, Number(opts.runnerFraction) || 0.5))
  const htfTf = HTF_FOR[params.timeframe] ?? null
  const [candles, htfCandles] = await Promise.all([
    fetchCandles(params.symbol, params.timeframe, opts.candleLimit, params.signal),
    htfTf
      ? fetchCandles(params.symbol, htfTf, opts.candleLimit, params.signal).catch(() => [] as OhlcvBar[])
      : Promise.resolve([] as OhlcvBar[]),
  ])
  if (candles.length < 60) throw new Error('Not enough candle data — try a higher timeframe.')

  const tfSec = TF_SECONDS[params.timeframe] ?? 3600
  const htfTfSec = htfTf ? TF_SECONDS[htfTf] ?? 0 : 0

  // Precompute causal indicators once per symbol — values at index i depend only on data[0..i]
  // so reading by index inside the per-bar loop is identical to recomputing on a slice each call.
  const indicatorCache = buildIndicatorCache(candles, htfCandles.length > 0 ? htfCandles : undefined)
  const hasHtf = htfCandles.length > 0

  type ActiveBacktestTrade = Omit<BacktestTrade, 'result'> & {
    result: 'open'
    // Runner-exit bookkeeping (exitMode 'runner'): partials accumulate here until flat.
    tp1Taken: boolean; bookedGross: number; bookedFees: number; bookedR: number
    bookedFraction: number; weightedExit: number
  }

  const trades: BacktestTrade[] = []
  let activeTrades: ActiveBacktestTrade[] = []
  let tradeId = 0
  let lastSignalTimeSec: number | null = null
  let lastSignalDirection: 'buy' | 'sell' | null = null

  // Floating drawdown: peak-to-current including unrealized R of open trade
  let realizedEquity = 0
  let peakEquity = 0
  let maxFloatingDD = 0
  let capital = startingCapital
  let peakCapital = startingCapital
  let maxFloatingDDUsd = 0

  // Open-position marks scale by the REMAINING fraction — after a runner TP1 partial the
  // realized (1−rf) slice already sits in capital/realizedEquity; marking the full position
  // would double-count it in the floating-drawdown trackers.
  const unrealizedRFor = (trade: ActiveBacktestTrade, close: number) => {
    const rem = 1 - (trade.bookedFraction ?? 0)
    const risk = Math.max(Math.abs(trade.entry - trade.sl), 1e-8)
    return rem * (trade.direction === 'buy'
      ? (close - trade.entry) / risk
      : (trade.entry - close) / risk)
  }

  const pnlFor = (trade: ActiveBacktestTrade, exitPrice: number) =>
    pureGrossPnl(trade.direction, trade.entry, exitPrice, trade.positionSize)

  const feesFor = (trade: Pick<BacktestTrade, 'positionSize'>) =>
    pureFee(trade.positionSize, feeRatePct)

  const netPnlFor = (trade: ActiveBacktestTrade, exitPrice: number) => {
    const rem = 1 - (trade.bookedFraction ?? 0)
    return pureGrossPnl(trade.direction, trade.entry, exitPrice, trade.positionSize * rem)
      - pureFee(trade.positionSize * rem, feeRatePct)
  }

  const recordFloatingDrawdown = (close: number) => {
    const floatingR = activeTrades.reduce((sum, trade) => sum + unrealizedRFor(trade, close), 0)
    const floatingEquity = realizedEquity + floatingR
    if (floatingEquity > peakEquity) peakEquity = floatingEquity
    const ddR = peakEquity - floatingEquity
    if (ddR > maxFloatingDD) maxFloatingDD = ddR

    const floatingCapital = capital + activeTrades.reduce(
      (sum, trade) => sum + netPnlFor(trade, close),
      0,
    )
    if (floatingCapital > peakCapital) peakCapital = floatingCapital
    const ddUsd = peakCapital - floatingCapital
    if (ddUsd > maxFloatingDDUsd) maxFloatingDDUsd = ddUsd
  }

  const closeTrade = (
    trade: ActiveBacktestTrade,
    _result: 'win' | 'loss',   // ignored — win/loss derived from NET pnl below (after fees)
    exitPrice: number,
    closeTime: number,
    r: number,
    mfeR: number,
    maeR: number,
    closeReason: 'tp' | 'sl' | 'liquidated' = 'sl',
  ) => {
    realizedEquity += r
    if (realizedEquity > peakEquity) peakEquity = realizedEquity
    const ddR = peakEquity - realizedEquity
    if (ddR > maxFloatingDD) maxFloatingDD = ddR

    const grossPnl = pnlFor(trade, exitPrice)
    const fees = feesFor(trade)
    const pnl = grossPnl - fees
    const result: 'win' | 'loss' = pnl > 0 ? 'win' : 'loss'
    capital += pnl
    if (capital > peakCapital) peakCapital = capital
    const ddUsd = peakCapital - capital
    if (ddUsd > maxFloatingDDUsd) maxFloatingDDUsd = ddUsd

    trades.push({
      ...trade,
      result,
      exitPrice,
      closeTime,
      r,
      grossPnl,
      fees,
      pnl,
      equityAfter: capital,
      mfeR,
      maeR,
      closeReason,
    })
  }

  // Runner-exit helpers: portions book equity/capital incrementally (live realizes the TP1
  // partial immediately); the trade row is pushed once, when the position is flat.
  const bookRealized = (r: number, pnl: number) => {
    realizedEquity += r
    if (realizedEquity > peakEquity) peakEquity = realizedEquity
    const ddR = peakEquity - realizedEquity
    if (ddR > maxFloatingDD) maxFloatingDD = ddR
    capital += pnl
    if (capital > peakCapital) peakCapital = capital
    const ddUsd = peakCapital - capital
    if (ddUsd > maxFloatingDDUsd) maxFloatingDDUsd = ddUsd
  }
  const bookPortions = (trade: ActiveBacktestTrade, portions: { fraction: number; price: number; reason: string; r: number }[]) => {
    const isBull = trade.direction === 'buy'
    for (const p of portions) {
      const fill = p.reason === 'liquidated' ? p.price
        : isBull ? p.price * (1 - slipFrac) : p.price * (1 + slipFrac)
      const g = pureGrossPnl(trade.direction, trade.entry, fill, trade.positionSize * p.fraction)
      const f = pureFee(trade.positionSize * p.fraction, feeRatePct)
      bookRealized(p.r, g - f)
      trade.bookedGross += g; trade.bookedFees += f; trade.bookedR += p.r
      trade.bookedFraction += p.fraction; trade.weightedExit += fill * p.fraction
    }
  }
  const finalizePhased = (trade: ActiveBacktestTrade, closeTime: number, mfeR: number, maeR: number, lastReason: string) => {
    const closeReason: BacktestTrade['closeReason'] =
      lastReason === 'liquidated' ? 'liquidated' : lastReason === 'sl' || lastReason === 'be' ? 'sl' : 'tp'
    const pnl = trade.bookedGross - trade.bookedFees
    const exitPx = trade.bookedFraction > 0 ? trade.weightedExit / trade.bookedFraction : 0
    trades.push({
      ...trade,
      result: pnl > 0 ? 'win' : 'loss',
      exitPrice: exitPx, closeTime,
      r: trade.bookedR, grossPnl: trade.bookedGross, fees: trade.bookedFees, pnl,
      equityAfter: capital, mfeR, maeR, closeReason,
    })
  }

  // Monotonic HTF pointer — advances forward only as the simulation walks the LTF candles
  let htfLastIdx = -1

  for (let i = 55; i < candles.length; i++) {
    if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const c = candles[i]
    if (params.onProgress) params.onProgress(Math.round((i / (candles.length - 1)) * 100))

    if (activeTrades.length > 0) {
      const stillOpen: ActiveBacktestTrade[] = []

      for (const activeTrade of activeTrades) {
      const { entry, direction, sl, tp1 } = activeTrade
      const risk = Math.max(Math.abs(entry - sl), 1e-8)

      const prevMfeR = activeTrade.mfeR
      const prevMaeR = activeTrade.maeR
      const nextMfeR = direction === 'buy'
        ? Math.max(prevMfeR, (c.high - entry) / risk)
        : Math.max(prevMfeR, (entry - c.low) / risk)
      const nextMaeR = direction === 'buy'
        ? Math.max(prevMaeR, (entry - c.low) / risk)
        : Math.max(prevMaeR, (c.high - entry) / risk)

      const closeTime = c.time + tfSec
      const isBull = direction === 'buy'
      let closed = false

      const { liqPrice } = activeTrade
      const tp1RR  = Math.abs(tp1 - entry) / risk

      if (exitMode === 'runner') {
        // Multi-phase exit: partial at TP1, stop → breakeven, runner targets TP2.
        const ph = resolvePhasedExit({
          direction, entry, sl, tp1, tp2: activeTrade.tp2 ?? 0, liqPrice,
          candle: { high: c.high, low: c.low }, pessimisticSameBar: opts.pessimisticSameBar,
          tp1Taken: activeTrade.tp1Taken, runnerFraction,
          entryBar: c.time === activeTrade.openTime,
        })
        if (ph.portions.length > 0) bookPortions(activeTrade, ph.portions)
        activeTrade.tp1Taken = ph.tp1Taken
        if (ph.portions.length > 0 && ph.remainingFraction <= 0) {
          finalizePhased(activeTrade, closeTime, nextMfeR, nextMaeR, ph.portions[ph.portions.length - 1].reason)
          closed = true
        }
      } else {
      // Exit detection via the single-source-of-truth pure function (unit-tested in scripts/pnl-test.ts).
      const ex = resolveExit({ direction, sl, tp1, liqPrice, candle: { high: c.high, low: c.low }, pessimisticSameBar: opts.pessimisticSameBar })
      if (ex.closed) {
        // Exits slip adversely like live market-triggered SL/TP; liquidation is a seizure
        // at the liq-engine price, not a slippable order. R stays level-based.
        const exitFill = ex.reason === 'liquidated' ? ex.exitPrice
          : isBull ? ex.exitPrice * (1 - slipFrac) : ex.exitPrice * (1 + slipFrac)
        if (ex.reason === 'liquidated') {
          const liqR = isBull ? (liqPrice - entry) / risk : (entry - liqPrice) / risk
          closeTrade(activeTrade, 'loss', exitFill, closeTime, liqR, nextMfeR, nextMaeR, 'liquidated')
        } else if (ex.reason === 'sl') {
          closeTrade(activeTrade, 'loss', exitFill, closeTime, -1, nextMfeR, nextMaeR, 'sl')
        } else {
          closeTrade(activeTrade, 'win', exitFill, closeTime, tp1RR, nextMfeR, nextMaeR, 'tp')
        }
        closed = true
      }
      }

      if (!closed) {
        // Still open — track floating DD using unrealized R
        stillOpen.push({ ...activeTrade, mfeR: nextMfeR, maeR: nextMaeR })
      }
      }

      activeTrades = stillOpen
      recordFloatingDrawdown(c.close)
      if (activeTrades.length >= maxOpenPositions) continue
    }

    // ── Evaluate signal up to current candle (no slicing — uses cache + lastIdx) ───
    const settings: ScanSettings = {
      ...params.baseSettings,
      lastSignalTimeSec,
      lastSignalDirection,
      lastCandleTimeSec: c.time,
      timeframe: params.timeframe,
    }
    if (hasHtf) {
      // Only consume CLOSED HTF bars (open + duration ≤ decision time, i.e. this LTF bar's
      // close). Advancing on open-time leaked the forming HTF bar's final OHLC — up to ~4h
      // of future data — into the HTF gates, inflating backtest results vs live.
      while (htfLastIdx + 1 < htfCandles.length && htfCandles[htfLastIdx + 1].time + htfTfSec <= c.time + tfSec) htfLastIdx++
    }
    const signal = evaluateSignalFromCandles({
      candles,
      settings,
      symbol: params.symbol,
      htfCandles: hasHtf ? htfCandles : undefined,
      cache: indicatorCache,
      lastIdx: i,
      htfLastIdx: hasHtf ? htfLastIdx : undefined,
    })
    if (signal) {
      const nextCandle = candles[i + 1]
      const rawFill = nextCandle ? nextCandle.open : signal.entry
      // Adverse market-order slippage on entry, mirroring the paper engine.
      const fillPrice = signal.direction === 'buy' ? rawFill * (1 + slipFrac) : rawFill * (1 - slipFrac)

      // Use the signal's SL/TP AS-IS — the evaluator already applied manual%/fixed% off
      // signal.entry, exactly as live sends them. Recomputing off fillPrice would break parity.
      const tradeSl = signal.sl
      const tradeTp1 = signal.tp1
      const tradeTp2 = signal.tp2

      // Discard if fill already gapped through SL or past TP1
      if (signal.direction === 'buy'  && fillPrice <= tradeSl)  continue
      if (signal.direction === 'sell' && fillPrice >= tradeSl)  continue
      if (signal.direction === 'buy'  && fillPrice >= tradeTp1) continue
      if (signal.direction === 'sell' && fillPrice <= tradeTp1) continue

      tradeId++
      const openTime = nextCandle ? nextCandle.time : c.time
      // Margin scaled by remaining fraction — a partial close releases its share, like live.
      const activeMargin = activeTrades.reduce((sum, trade) => sum + trade.marginUsed * (1 - (trade.bookedFraction ?? 0)), 0)
      // tradeAmount = notional position value (matches live: positionSizeUSDT is notional).
      // Margin actually posted = notional / leverage.
      const marginUsed = tradeAmount / leverage
      const positionSize = tradeAmount
      if (marginUsed > Math.max(capital - activeMargin, 0)) continue
      const liqPrice = leverage <= 1 ? 0 : (
        marginMode === 'isolated'
          ? isolatedLiqPrice(signal.direction, fillPrice, leverage, MAINTENANCE_RATE)
          : crossLiqPrice(signal.direction, fillPrice, capital, positionSize, MAINTENANCE_RATE)
      )
      activeTrades.push({
        id: tradeId,
        openTime,
        closeTime: 0,
        direction: signal.direction,
        entry:     fillPrice,
        sl:        tradeSl,
        tp1:       tradeTp1,
        tp2:       tradeTp2,
        liqPrice,
        exitPrice: 0,
        result:    'open',
        closeReason: 'open',
        r:         0,
        marginUsed,
        positionSize,
        leverage,
        grossPnl:  0,
        fees:      0,
        pnl:       0,
        equityAfter: capital,
        mfeR:      0,
        maeR:      0,
        signals:   signal.notes,
        strategy:  signal.strategy,
        quality:   signal.quality,
        confluence: signal.confluence,
        tp1Taken: false, bookedGross: 0, bookedFees: 0, bookedR: 0, bookedFraction: 0, weightedExit: 0,
      })
      lastSignalTimeSec = openTime
      lastSignalDirection = signal.direction
    }
  }

  if (activeTrades.length > 0) {
    const last = candles[candles.length - 1]
    for (const activeTrade of activeTrades) {
      // A runner with its TP1 partial booked has REALIZED cash sitting in `capital` — push
      // the realized portion as a closed row so summary netPnl reconciles with capital.
      // The unrealized remainder is discarded, same as a fully-open trade.
      if (activeTrade.bookedFraction > 0) {
        finalizePhased(activeTrade, last.time + tfSec, activeTrade.mfeR, activeTrade.maeR, 'tp1')
        continue
      }
      trades.push({
        ...activeTrade,
        result: 'open',
        exitPrice: last.close,
        closeTime: last.time + tfSec,
        r: 0,
        grossPnl: 0,
        fees: 0,
        pnl: 0,
        equityAfter: capital,
        mfeR: activeTrade.mfeR,
        maeR: activeTrade.maeR,
      })
    }
  }

  // ── Statistics ─────────────────────────────────────────────────────────────
  const closed       = trades.filter((t) => t.result !== 'open')
  // Win/loss by NET pnl (after fees), consistent with closeTrade's classification.
  const wins         = closed.filter((t) => t.pnl > 0)
  const losses       = closed.filter((t) => t.pnl <= 0)
  const liquidations = closed.filter((t) => t.closeReason === 'liquidated').length
  const totalR = closed.reduce((s, t) => s + t.r, 0)
  const netPnl = closed.reduce((s, t) => s + t.pnl, 0)
  const grossPnl = closed.reduce((s, t) => s + t.grossPnl, 0)
  const totalFees = closed.reduce((s, t) => s + t.fees, 0)
  const endingCapital = startingCapital + netPnl
  const returnPct = startingCapital > 0 ? (netPnl / startingCapital) * 100 : 0
  // Profit factor from NET pnl so it's coherent with the net win/loss split.
  const grossWin  = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const maxMfeBeforeLoss = losses.reduce((m, t) => Math.max(m, t.mfeR), 0)
  const maxMaeBeforeWin  = wins.reduce((m, t) => Math.max(m, t.maeR), 0)

  // Realized drawdown from closed trades only (legacy metric)
  let peak = 0, equity = 0, maxDD = 0
  let peakUsd = startingCapital, equityUsd = startingCapital, maxDDUsd = 0
  for (const t of closed) {
    equity += t.r
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) maxDD = dd

    equityUsd += t.pnl
    if (equityUsd > peakUsd) peakUsd = equityUsd
    const ddUsd = peakUsd - equityUsd
    if (ddUsd > maxDDUsd) maxDDUsd = ddUsd
  }

  return {
    trades,
    summary: {
      totalTrades:  closed.length,
      wins:         wins.length,
      losses:       losses.length,
      liquidations,
      winrate:      closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalR,
      avgR:         closed.length > 0 ? totalR / closed.length : 0,
      startingCapital,
      endingCapital,
      netPnl,
      grossPnl,
      totalFees,
      returnPct,
      tradeAmount,
      leverage,
      marginMode,
      feeRatePct,
      maxOpenPositions,
      maxDrawdown:  maxDD,
      maxFloatingDrawdown: maxFloatingDD,
      maxDrawdownUsd: maxDDUsd,
      maxFloatingDrawdownUsd: maxFloatingDDUsd,
      maxMfeBeforeLoss,
      maxMaeBeforeWin,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    },
    candleCount: candles.length,
    period: { from: candles[0].time, to: candles[candles.length - 1].time },
  }
}

/**
 * Paper-trade simulation: single shared capital + global maxOpenPositions across all symbols.
 * Walks a merged timeline so signals on different coins compete for the same position slots.
 */
export async function simulatePaperBacktest(params: {
  symbols: string[]
  timeframe: string
  baseSettings: ScanSettings
  options?: BacktestOptions
  signal?: AbortSignal
  onProgress?: (pct: number) => void
}): Promise<BacktestResult & {
  symbolBreakdown: Record<string, { trades: number; wins: number; r: number }>
  diag: { signalsFired: number; opened: number; droppedSlots: number; droppedCapital: number; droppedDedup: number; droppedFillGap: number; droppedDailyLoss: number; droppedRiskStop: number; line: string }
}> {
  const opts: Required<BacktestOptions> = { ...DEFAULT_OPTS, ...(params.options ?? {}) }
  const startingCapital = opts.startingCapital > 0 ? opts.startingCapital : DEFAULT_OPTS.startingCapital
  const tradeAmount     = opts.tradeAmount > 0 ? opts.tradeAmount : DEFAULT_OPTS.tradeAmount
  const leverage        = opts.leverage > 0 ? opts.leverage : DEFAULT_OPTS.leverage
  const marginMode: 'isolated' | 'cross' = opts.marginMode === 'cross' ? 'cross' : 'isolated'
  const feeRatePct      = opts.feeRatePct >= 0 ? opts.feeRatePct : DEFAULT_OPTS.feeRatePct
  const maxOpenPositions = Math.max(1, Math.floor(opts.maxOpenPositions))
  const slipFrac           = Math.max(0, opts.slippagePct) / 100
  const dailyLossLimitPct  = Math.max(0, opts.dailyLossLimitPct)
  const lossThresholdUSDT  = Math.max(0, opts.lossThresholdUSDT)
  const exitMode           = opts.exitMode === 'runner' ? 'runner' : 'tp1'
  const runnerFraction     = Math.min(0.95, Math.max(0.05, Number(opts.runnerFraction) || 0.5))
  const tfSec   = TF_SECONDS[params.timeframe] ?? 3600
  const htfTf   = HTF_FOR[params.timeframe] ?? null
  const htfTfSec = htfTf ? TF_SECONDS[htfTf] ?? 0 : 0

  // Time-range replay config. windowStart/windowEnd in unix seconds; 0 = disabled.
  const source       = opts.source || undefined
  const windowStart  = opts.windowStart > 0 ? opts.windowStart : null
  const windowEnd    = opts.windowEnd   > 0 ? opts.windowEnd   : null
  const activeWindows = Array.isArray(opts.activeWindows) && opts.activeWindows.length > 0 ? opts.activeWindows : null
  const inActiveWindow = (t: number) => !activeWindows || activeWindows.some(([s, e]) => t >= s && t <= e)
  // Indicators need history before the window opens. The slowest gates are EMA200 (200 bars)
  // and the KDE value-area lookback (260 bars); they FAIL CLOSED when underfed, so a short
  // warm-up silently zeroes out every strategy that uses them. 320 covers all of them.
  const WARMUP_BARS  = 320
  const BUFFER_BARS  = 200         // let in-window trades resolve (hit TP/SL) past windowEnd, like live

  // When a window is set, fetch warm-up bars BEFORE it and buffer bars AFTER it.
  const fetchStart = windowStart != null ? windowStart - WARMUP_BARS * tfSec : undefined
  const fetchEnd   = windowEnd   != null ? windowEnd   + BUFFER_BARS * tfSec : undefined
  const fetchOpts  = (source || fetchStart != null || fetchEnd != null)
    ? { source, startTime: fetchStart, endTime: fetchEnd }
    : undefined
  // The HTF series needs its warm-up scaled by HTF bar size. Reusing the base-tf range gives
  // the HTF only ~WARMUP_BARS/4 bars (15m→1h) of pre-window history — its EMA200 gates fail
  // closed and windowed runs return 0 trades for every HTF-gated strategy.
  const htfFetchStart = windowStart != null && htfTfSec > 0 ? windowStart - WARMUP_BARS * htfTfSec : fetchStart
  const htfFetchOpts  = (source || htfFetchStart != null || fetchEnd != null)
    ? { source, startTime: htfFetchStart, endTime: fetchEnd }
    : undefined

  // 1. Fetch candles with BOUNDED concurrency + retry.
  // Firing hundreds of simultaneous requests rate-limits the exchange; failures were silently
  // swallowed (.catch → []) and those symbols vanished from the backtest — a major live-vs-backtest
  // gap (e.g. 156 traded symbols but only 61 loaded). Throttle + retry so every symbol loads.
  const validSymbols = Array.from(new Set(params.symbols.filter(Boolean)))
  const FETCH_CONCURRENCY = 6
  const fetchWithRetry = async (s: string, interval: string, fo?: typeof fetchOpts): Promise<OhlcvBar[]> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const bars = await fetchCandles(s, interval, opts.candleLimit, params.signal, fo)
        if (bars.length > 0) return bars
      } catch { /* retry */ }
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)))   // backoff
    }
    return []
  }
  const mapLimited = async (fn: (s: string) => Promise<OhlcvBar[]>): Promise<OhlcvBar[][]> => {
    const out: OhlcvBar[][] = new Array(validSymbols.length)
    let idx = 0
    const worker = async () => {
      while (idx < validSymbols.length) {
        const my = idx++
        out[my] = await fn(validSymbols[my])
      }
    }
    await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, () => worker()))
    return out
  }
  const candleArrays = await mapLimited(s => fetchWithRetry(s, params.timeframe, fetchOpts))
  const htfArrays = htfTf
    ? await mapLimited(s => fetchWithRetry(s, htfTf, htfFetchOpts))
    : validSymbols.map(() => [] as OhlcvBar[])

  // Yield immediately so React renders running=true before any blocking work
  await new Promise(r => setTimeout(r, 0))
  if (params.onProgress) params.onProgress(0)

  // 2. Build caches in batches with yields so the browser stays responsive
  const validRaw = validSymbols
    .map((symbol, i) => ({ symbol, candles: candleArrays[i], htfCandles: htfArrays[i] }))
    .filter(x => x.candles.length >= 60)

  if (validRaw.length === 0) throw new Error('No symbols had enough candle data.')

  const BATCH = 20
  const symData: Array<{
    symbol: string; candles: OhlcvBar[]; htfCandles: OhlcvBar[]
    cache: ReturnType<typeof buildIndicatorCache>
    timeToIdx: Map<number, number>; htfLastIdx: number
    lastSigTime: number | null; lastSigDir: 'buy' | 'sell' | null
    // Bg-scanner fire dedup: key `${symbol}-${tf}-${strategy}-${direction}` → last fire time (sec)
    fireCooldown: Map<string, number>
  }> = []
  for (let bi = 0; bi < validRaw.length; bi += BATCH) {
    const chunk = validRaw.slice(bi, bi + BATCH)
    for (const x of chunk) {
      symData.push({
        ...x,
        cache:       buildIndicatorCache(x.candles, x.htfCandles.length > 0 ? x.htfCandles : undefined),
        timeToIdx:   new Map<number, number>(x.candles.map((c, idx) => [c.time, idx])),
        htfLastIdx:  -1,
        lastSigTime: null,
        lastSigDir:  null,
        fireCooldown: new Map<string, number>(),
      })
    }
    // Yield between batches so React can update the "building..." progress
    if (params.onProgress) params.onProgress(Math.round((bi / validRaw.length) * 30))
    await new Promise(r => setTimeout(r, 0))
  }

  // 3. Build sorted union of all timestamps.
  // Non-windowed: blanket-skip the first 55 warm-up bars per symbol (legacy behavior).
  // Windowed: keep ALL fetched bars — warm-up is the pre-window slice and entries are gated by
  // windowStart below; post-window buffer bars are needed so in-window trades can resolve.
  const allTimes = windowStart != null
    ? Array.from(new Set(symData.flatMap(x => x.candles.map(c => c.time)))).sort((a, b) => a - b)
    : Array.from(new Set(symData.flatMap(x => x.candles.slice(55).map(c => c.time)))).sort((a, b) => a - b)
  if (params.onProgress) params.onProgress(30)

  // 4. Shared state
  type ActivePaperTrade = Omit<BacktestTrade, 'result' | 'closeReason'> & {
    result: 'open'; closeReason: 'open'
    // Runner-exit bookkeeping (exitMode 'runner'): partials accumulate here until flat.
    tp1Taken: boolean; bookedGross: number; bookedFees: number; bookedR: number
    bookedFraction: number; weightedExit: number
  }

  const trades:       BacktestTrade[]    = []
  let activeTrades:   ActivePaperTrade[] = []
  let tradeId = 0
  let capital = startingCapital
  let peakCapital = startingCapital
  let maxFloatingDDUsd = 0
  let realizedEquity = 0, peakEquity = 0, maxFloatingDD = 0

  const symbolBreakdown: Record<string, { trades: number; wins: number; r: number }> = {}
  for (const { symbol } of symData) symbolBreakdown[symbol] = { trades: 0, wins: 0, r: 0 }

  const pnlFor = (trade: ActivePaperTrade, exitPrice: number) =>
    pureGrossPnl(trade.direction, trade.entry, exitPrice, trade.positionSize)
  const feesFor = (trade: { positionSize: number }) => pureFee(trade.positionSize, feeRatePct)

  const closeTrade = (
    trade: ActivePaperTrade,
    _result: 'win' | 'loss',   // ignored — win/loss is derived from NET pnl below (after fees)
    exitPrice: number,
    closeTime: number,
    r: number,
    mfeR: number,
    maeR: number,
    closeReason: 'tp' | 'sl' | 'liquidated',
  ) => {
    realizedEquity += r
    if (realizedEquity > peakEquity) peakEquity = realizedEquity
    const ddR = peakEquity - realizedEquity
    if (ddR > maxFloatingDD) maxFloatingDD = ddR

    const grossPnl = pnlFor(trade, exitPrice)
    const fees     = feesFor(trade)
    const pnl      = grossPnl - fees
    // A "win" means we actually MADE money after fees — not merely that TP was touched.
    const result: 'win' | 'loss' = pnl > 0 ? 'win' : 'loss'
    capital += pnl
    if (capital > peakCapital) peakCapital = capital
    const ddUsd = peakCapital - capital
    if (ddUsd > maxFloatingDDUsd) maxFloatingDDUsd = ddUsd

    const sym = trade.symbol ?? ''
    if (symbolBreakdown[sym]) {
      symbolBreakdown[sym].trades++
      symbolBreakdown[sym].r += r
      if (result === 'win') symbolBreakdown[sym].wins++
    }

    trades.push({ ...trade, result, exitPrice, closeTime, r, grossPnl, fees, pnl, equityAfter: capital, mfeR, maeR, closeReason })
  }

  // Runner-exit helpers — portions book equity/capital incrementally (live realizes the TP1
  // partial immediately); the trade row is pushed once, when the position is flat.
  const bookRealizedP = (r: number, pnl: number) => {
    realizedEquity += r
    if (realizedEquity > peakEquity) peakEquity = realizedEquity
    const ddR = peakEquity - realizedEquity
    if (ddR > maxFloatingDD) maxFloatingDD = ddR
    capital += pnl
    if (capital > peakCapital) peakCapital = capital
    const ddUsd = peakCapital - capital
    if (ddUsd > maxFloatingDDUsd) maxFloatingDDUsd = ddUsd
  }
  const bookPortionsP = (trade: ActivePaperTrade, portions: { fraction: number; price: number; reason: string; r: number }[]) => {
    const isBull = trade.direction === 'buy'
    for (const p of portions) {
      const fill = p.reason === 'liquidated' ? p.price
        : isBull ? p.price * (1 - slipFrac) : p.price * (1 + slipFrac)
      const g = pureGrossPnl(trade.direction, trade.entry, fill, trade.positionSize * p.fraction)
      const f = pureFee(trade.positionSize * p.fraction, feeRatePct)
      bookRealizedP(p.r, g - f)
      trade.bookedGross += g; trade.bookedFees += f; trade.bookedR += p.r
      trade.bookedFraction += p.fraction; trade.weightedExit += fill * p.fraction
    }
  }
  const finalizePhasedP = (trade: ActivePaperTrade, closeTime: number, mfeR: number, maeR: number, lastReason: string) => {
    const closeReason: BacktestTrade['closeReason'] =
      lastReason === 'liquidated' ? 'liquidated' : lastReason === 'sl' || lastReason === 'be' ? 'sl' : 'tp'
    const pnl = trade.bookedGross - trade.bookedFees
    const result: 'win' | 'loss' = pnl > 0 ? 'win' : 'loss'
    const exitPx = trade.bookedFraction > 0 ? trade.weightedExit / trade.bookedFraction : 0
    const sym = trade.symbol ?? ''
    if (symbolBreakdown[sym]) {
      symbolBreakdown[sym].trades++
      symbolBreakdown[sym].r += trade.bookedR
      if (result === 'win') symbolBreakdown[sym].wins++
    }
    trades.push({
      ...trade, result, exitPrice: exitPx, closeTime,
      r: trade.bookedR, grossPnl: trade.bookedGross, fees: trade.bookedFees, pnl,
      equityAfter: capital, mfeR, maeR, closeReason,
    })
  }

  // 5. Walk through time
  // Instrumentation: count where signals go, to diagnose backtest-vs-live trade-count gaps.
  const diag = {
    signalsFired:    0,  // evaluateSignalFromCandles returned a signal
    droppedSlots:    0,  // skipped because maxOpenPositions full (bar-level break)
    droppedCapital:  0,  // skipped because insufficient available margin / bankrupt
    droppedDedup:    0,  // skipped: already an open trade on this symbol
    droppedFillGap:  0,  // skipped: next-candle open already through SL/TP
    droppedDailyLoss: 0, // skipped: daily-loss breaker halted this UTC day
    droppedRiskStop:  0, // skipped: lossThreshold kill switch tripped (rest of run)
    opened:          0,  // actually entered
  }
  // LIVE PARITY — risk controls, mirrors mexcTrader.placeOrderInner. Live measures equity
  // including unrealized PnL; realized capital is the closest causal proxy available here.
  let dayKey = -1
  let dayStartCapital = startingCapital
  let dayHalted = false
  let killSwitched = false
  let lastYield = Date.now()
  for (let ti = 0; ti < allTimes.length; ti++) {
    if (params.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    // Progress: 30–99% for the main loop
    if (params.onProgress) params.onProgress(30 + Math.round((ti / allTimes.length) * 69))
    // Yield every ~16ms so React can flush progress and keep UI responsive
    if (Date.now() - lastYield > 16) {
      await new Promise(r => setTimeout(r, 0))
      lastYield = Date.now()
    }
    const t = allTimes[ti]

    // Roll the daily-loss baseline at the START of the timestamp — before this bar's exits —
    // like live's near-midnight equity snapshot. Rolling after exits absorbed the first
    // bar's P&L into the baseline and made the breaker unsatisfiable on 1d bars.
    const dk = Math.floor(t / 86_400)
    if (dk !== dayKey) { dayKey = dk; dayStartCapital = capital; dayHalted = false }

    // a. Process exits on all open trades at this timestamp
    const stillOpen: ActivePaperTrade[] = []
    for (const trade of activeTrades) {
      const sym   = symData.find(x => x.symbol === trade.symbol)
      const cidx  = sym?.timeToIdx.get(t)
      if (!sym || cidx === undefined) { stillOpen.push(trade); continue }
      const c = sym.candles[cidx]

      const { entry, sl, tp1, liqPrice, direction } = trade
      const risk      = Math.max(Math.abs(entry - sl), 1e-8)
      const isBull    = direction === 'buy'
      const closeTime = t + tfSec
      const prevMfeR  = trade.mfeR
      const prevMaeR  = trade.maeR
      const newMfeR   = isBull ? Math.max(prevMfeR, (c.high - entry) / risk) : Math.max(prevMfeR, (entry - c.low) / risk)
      const newMaeR   = isBull ? Math.max(prevMaeR, (entry - c.low) / risk) : Math.max(prevMaeR, (c.high - entry) / risk)

      const tp1RR  = Math.abs(tp1 - entry) / risk
      let closed = false

      if (exitMode === 'runner') {
        // Multi-phase exit: partial at TP1, stop → breakeven, runner targets TP2.
        const ph = resolvePhasedExit({
          direction, entry, sl, tp1, tp2: trade.tp2 ?? 0, liqPrice,
          candle: { high: c.high, low: c.low }, pessimisticSameBar: opts.pessimisticSameBar,
          tp1Taken: trade.tp1Taken, runnerFraction,
          entryBar: c.time === trade.openTime,
        })
        if (ph.portions.length > 0) bookPortionsP(trade, ph.portions)
        trade.tp1Taken = ph.tp1Taken
        if (ph.portions.length > 0 && ph.remainingFraction <= 0) {
          finalizePhasedP(trade, closeTime, newMfeR, newMaeR, ph.portions[ph.portions.length - 1].reason)
          closed = true
        }
      } else {
      // Exit detection via the single-source-of-truth pure function (unit-tested in scripts/pnl-test.ts).
      const ex = resolveExit({ direction, sl, tp1, liqPrice, candle: { high: c.high, low: c.low }, pessimisticSameBar: opts.pessimisticSameBar })
      if (ex.closed) {
        // MEXC SL/TP triggers fire market orders — exits slip adversely too. Liquidation is
        // an exchange seizure at the liq-engine price, not a slippable order; slipping it can
        // book losses beyond posted margin. R stays level-based; P&L uses the slipped fill.
        const exitFill = ex.reason === 'liquidated' ? ex.exitPrice
          : isBull ? ex.exitPrice * (1 - slipFrac) : ex.exitPrice * (1 + slipFrac)
        if (ex.reason === 'liquidated') {
          const liqR = isBull ? (liqPrice - entry) / risk : (entry - liqPrice) / risk
          closeTrade(trade, 'loss', exitFill, closeTime, liqR, newMfeR, newMaeR, 'liquidated')
        } else if (ex.reason === 'sl') {
          closeTrade(trade, 'loss', exitFill, closeTime, -1, newMfeR, newMaeR, 'sl')
        } else {
          closeTrade(trade, 'win', exitFill, closeTime, tp1RR, newMfeR, newMaeR, 'tp')
        }
        closed = true
      }
      }

      if (!closed) stillOpen.push({ ...trade, mfeR: newMfeR, maeR: newMaeR })
    }
    activeTrades = stillOpen

    // Latch the daily halt against post-exit capital (baseline was snapshotted pre-exit above).
    if (dailyLossLimitPct > 0 && !dayHalted && capital <= dayStartCapital * (1 - dailyLossLimitPct / 100)) dayHalted = true

    // Windowed replay: exits already processed above (so in-window trades resolve using
    // post-window buffer bars). Only OPEN new trades while t is inside [windowStart, windowEnd].
    if (windowStart != null && t < windowStart) continue
    if (windowEnd   != null && t > windowEnd)   continue
    // Parity mode: only open trades during periods the live scanner was actually active.
    if (!inActiveWindow(t)) continue

    // b. Evaluate signals.
    // Match the bg scanner exactly: it has NO capital/slot gate and NO per-symbol-open block.
    // Its only fire-dedup is a per (symbol+tf+strategy+direction) cooldown, applied AFTER a
    // signal is detected (see backgroundScanner.ts). So we count every signal the scanner would
    // have fired, regardless of how many positions are notionally open.
    for (const sym of symData) {
      const cidx = sym.timeToIdx.get(t)
      if (cidx === undefined || cidx < 55) continue

      // Advance HTF pointer — CLOSED HTF bars only (open + duration ≤ this bar's close),
      // matching the single-symbol engine; open-time advance leaked future HTF data.
      if (sym.htfCandles.length > 0) {
        while (sym.htfLastIdx + 1 < sym.htfCandles.length && sym.htfCandles[sym.htfLastIdx + 1].time + htfTfSec <= t + tfSec) sym.htfLastIdx++
      }

      const settings: ScanSettings = {
        ...params.baseSettings,
        lastSignalTimeSec:  sym.lastSigTime,
        lastSignalDirection: sym.lastSigDir,
        lastCandleTimeSec:  t,
        timeframe:          params.timeframe,
      }

      const signal = evaluateSignalFromCandles({
        candles:    sym.candles,
        settings,
        symbol:     sym.symbol,
        htfCandles: sym.htfCandles.length > 0 ? sym.htfCandles : undefined,
        cache:      sym.cache,
        lastIdx:    cidx,
        htfLastIdx: sym.htfCandles.length > 0 ? sym.htfLastIdx : undefined,
      })
      if (!signal) continue
      diag.signalsFired++

      // SCANNER LAYER — 4h cooldown runs FIRST and arms on every detection. Live arms the
      // cooldown BEFORE calling placeOrder (backgroundScanner.ts), so a signal the trader
      // then rejects (halt/slots/margin) still consumes its 4h window. Keyed by symbol (any
      // direction) deliberately: empirically live trades each symbol ~once per session
      // (116/154 symbols = 1 trade); a directional key let buy→sell→buy alternation slip
      // through, producing 88 symbols with 3+ trades vs live's 8.
      const dedupKey = `${sym.symbol}-${params.timeframe}-${signal.strategy}`
      const lastFire = sym.fireCooldown.get(dedupKey) ?? -Infinity
      if (t - lastFire <= SIGNAL_COOLDOWN_SEC) { diag.droppedDedup++; continue }
      sym.fireCooldown.set(dedupKey, t)

      // TRADER LAYER — gates in placeOrderInner order: daily halt → kill switch → slots →
      // symbol lock → margin. The kill switch latches only at an actual order attempt and
      // only when the daily halt isn't already shielding it (live returns on the halt before
      // ever reading the balance), so a transient equity dip with no signals can't kill the run.
      if (dayHalted) { diag.droppedDailyLoss++; continue }
      if (lossThresholdUSDT > 0 && capital <= lossThresholdUSDT) killSwitched = true
      if (killSwitched) { diag.droppedRiskStop++; continue }

      // Position-slot cap. mexcTrader.placeOrder rejects a signal when
      // livePositionCount >= maxOpenTrades. Live was saturated (peaked at 19/20), rejecting
      // hundreds of signals for lack of slots. The backtest MUST enforce the same cap or it
      // over-fires (was peaking at 39 concurrent, taking signals live had no room for).
      if (activeTrades.length >= maxOpenPositions) { diag.droppedSlots++; continue }

      // Per-symbol open lock. placeOrder skips if the symbol already has an
      // OPEN trade ("Already have open trade for X — skipping").
      if (activeTrades.some(at => at.symbol === sym.symbol)) { diag.droppedDedup++; continue }

      // Margin gate. MEXC rejects an order when available margin
      // (equity − margin already posted) can't cover notional/leverage. Without this the
      // backtest opened unlimited concurrent notional (droppedCapital was never counted).
      const marginUsed   = tradeAmount / leverage
      const positionSize = tradeAmount
      // Margin scaled by remaining fraction — a partial close releases its share, like live.
      const activeMargin = activeTrades.reduce((sum, at) => sum + at.marginUsed * (1 - (at.bookedFraction ?? 0)), 0)
      if (capital <= 0 || marginUsed > Math.max(capital - activeMargin, 0)) { diag.droppedCapital++; continue }

      const nextCandle = sym.candles[cidx + 1]
      const rawFill    = nextCandle ? nextCandle.open : signal.entry
      // Adverse market-order slippage on entry — live entries are market orders fired up to
      // one scan cycle after bar close (noChase off lets price run before the fill).
      const fillPrice  = signal.direction === 'buy' ? rawFill * (1 + slipFrac) : rawFill * (1 - slipFrac)

      // Use the signal's SL/TP AS-IS. The evaluator already applied manual%/fixed% off signal.entry,
      // exactly as live does (mexcTrader sends signal.sl/tp1 unchanged). Do NOT recompute off
      // fillPrice — that would shift the levels vs. what live actually places and break parity.
      const tradeSl  = signal.sl
      const tradeTp1 = signal.tp1
      const tradeTp2 = signal.tp2

      if (signal.direction === 'buy'  && (fillPrice <= tradeSl || fillPrice >= tradeTp1)) { diag.droppedFillGap++; continue }
      if (signal.direction === 'sell' && (fillPrice >= tradeSl || fillPrice <= tradeTp1)) { diag.droppedFillGap++; continue }

      const liqPrice = leverage <= 1 ? 0 : (
        marginMode === 'isolated'
          ? isolatedLiqPrice(signal.direction, fillPrice, leverage, MAINTENANCE_RATE)
          : crossLiqPrice(signal.direction, fillPrice, capital, positionSize, MAINTENANCE_RATE)
      )

      tradeId++
      diag.opened++
      const openTime = nextCandle ? nextCandle.time : t
      sym.lastSigTime = openTime
      sym.lastSigDir  = signal.direction

      activeTrades.push({
        id: tradeId, symbol: sym.symbol, openTime, closeTime: 0,
        direction: signal.direction, entry: fillPrice, sl: tradeSl, tp1: tradeTp1, tp2: tradeTp2,
        liqPrice, exitPrice: 0, result: 'open', closeReason: 'open',
        r: 0, marginUsed, positionSize, leverage, grossPnl: 0, fees: 0, pnl: 0,
        equityAfter: capital, mfeR: 0, maeR: 0,
        signals: signal.notes, strategy: signal.strategy, quality: signal.quality, confluence: signal.confluence,
        tp1Taken: false, bookedGross: 0, bookedFees: 0, bookedR: 0, bookedFraction: 0, weightedExit: 0,
      })
    }
  }

  // 6. Mark remaining open trades. Runners with a booked TP1 partial have REALIZED cash in
  // `capital` — push the realized portion as a closed row so summary netPnl reconciles;
  // the unrealized remainder is discarded like any open trade.
  for (const sym of symData) {
    const last = sym.candles[sym.candles.length - 1]
    for (const trade of activeTrades) {
      if (trade.symbol !== sym.symbol) continue
      if (trade.bookedFraction > 0) {
        finalizePhasedP(trade, last.time + tfSec, trade.mfeR, trade.maeR, 'tp1')
        continue
      }
      trades.push({ ...trade, result: 'open', exitPrice: last.close, closeTime: last.time + tfSec, r: 0, grossPnl: 0, fees: 0, pnl: 0, equityAfter: capital })
    }
  }

  // Diagnostic: where did signals go? Helps explain backtest-vs-live trade-count gaps.
  const diagLine =
    `symbols=${symData.length} bars=${allTimes.length} candlesPerSym≈${symData[0]?.candles.length ?? 0} ` +
    `maxOpenPositions=${maxOpenPositions} capital=${startingCapital} tradeAmount=${tradeAmount} leverage=${leverage} ` +
    `slippage=${opts.slippagePct}% dailyLossLimit=${dailyLossLimitPct}% lossThreshold=${lossThresholdUSDT} ` +
    `| signalsFired=${diag.signalsFired} opened=${diag.opened} ` +
    `dropped: slots=${diag.droppedSlots} capital=${diag.droppedCapital} dedup=${diag.droppedDedup} fillGap=${diag.droppedFillGap} ` +
    `dailyLoss=${diag.droppedDailyLoss} riskStop=${diag.droppedRiskStop}`
  console.warn(`%c[PaperBacktest DIAG] ${diagLine}`, 'background:#7c2d12;color:#fed7aa;padding:2px 4px;border-radius:3px')

  // 7. Summary
  const closed       = trades.filter(t => t.result !== 'open')
  // Win/loss by NET pnl (after fees), consistent with closeTrade's classification.
  const wins         = closed.filter(t => t.pnl > 0)
  const losses       = closed.filter(t => t.pnl <= 0)
  const liquidations = closed.filter(t => t.closeReason === 'liquidated').length
  const totalR       = closed.reduce((s, t) => s + t.r, 0)
  const netPnl       = closed.reduce((s, t) => s + t.pnl, 0)
  const grossPnl     = closed.reduce((s, t) => s + t.grossPnl, 0)
  const totalFees    = closed.reduce((s, t) => s + t.fees, 0)
  const endingCapital = startingCapital + netPnl
  // Profit factor from NET pnl so it's coherent with the net win/loss split.
  const grossWin   = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss  = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const maxMfeBeforeLoss = losses.reduce((m, t) => Math.max(m, t.mfeR), 0)
  const maxMaeBeforeWin  = wins.reduce((m, t) => Math.max(m, t.maeR), 0)
  let peak = 0, equity = 0, maxDD = 0, peakUsd = startingCapital, equityUsd = startingCapital, maxDDUsd = 0
  for (const t of closed) {
    equity += t.r; if (equity > peak) peak = equity
    const dd = peak - equity; if (dd > maxDD) maxDD = dd
    equityUsd += t.pnl; if (equityUsd > peakUsd) peakUsd = equityUsd
    const ddUsd = peakUsd - equityUsd; if (ddUsd > maxDDUsd) maxDDUsd = ddUsd
  }
  // Use reduce — Math.min/max(...millions) overflows the call stack
  let periodFrom = Infinity, periodTo = -Infinity
  for (const { candles } of symData) {
    if (candles.length > 0) {
      if (candles[0].time < periodFrom) periodFrom = candles[0].time
      if (candles[candles.length - 1].time > periodTo) periodTo = candles[candles.length - 1].time
    }
  }
  const period = periodFrom !== Infinity ? { from: periodFrom, to: periodTo } : { from: 0, to: 0 }

  return {
    trades,
    summary: {
      totalTrades: closed.length, wins: wins.length, losses: losses.length, liquidations,
      winrate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalR, avgR: closed.length > 0 ? totalR / closed.length : 0,
      startingCapital, endingCapital, netPnl, grossPnl, totalFees,
      returnPct: startingCapital > 0 ? (netPnl / startingCapital) * 100 : 0,
      tradeAmount, leverage, marginMode, feeRatePct, maxOpenPositions,
      maxDrawdown: maxDD, maxFloatingDrawdown: maxFloatingDD,
      maxDrawdownUsd: maxDDUsd, maxFloatingDrawdownUsd: maxFloatingDDUsd,
      maxMfeBeforeLoss, maxMaeBeforeWin,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    },
    candleCount: allTimes.length,
    period,
    symbolBreakdown,
    diag: { ...diag, line: diagLine },
  }
}

export function usePaperBacktestRunner() {
  const [running,  setRunning]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [result,   setResult]   = useState<Awaited<ReturnType<typeof simulatePaperBacktest>> | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (params: {
    symbols: string[]
    timeframe: string
    baseSettings: ScanSettings
    options?: BacktestOptions
  }) => {
    setRunning(true); setProgress(0); setResult(null); setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const r = await simulatePaperBacktest({ ...params, signal: controller.signal, onProgress: setProgress })
      setResult(r)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false); setProgress(100)
    }
  }, [])

  const stop = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; setRunning(false) }, [])

  return { run, stop, running, progress, result, error }
}

export function useBacktestRunner() {
  const [running, setRunning]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState<BacktestResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const run = useCallback(async (params: {
    symbol: string
    timeframe: string
    baseSettings: ScanSettings
    options?: BacktestOptions
  }) => {
    setRunning(true)
    setProgress(0)
    setResult(null)
    setError(null)
    try {
      const r = await simulateBacktest({
        symbol: params.symbol,
        timeframe: params.timeframe,
        baseSettings: params.baseSettings,
        options: params.options,
        onProgress: setProgress,
      })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
      setProgress(100)
    }
  }, [])

  return { run, running, progress, result, error }
}
