/**
 * Offline 3-day backtest for the "Squeeze Momentum" strategy over REAL candles.
 *
 * Mirrors simulateBacktest (single-symbol path) exactly:
 *   - signal at bar i → fill at candles[i+1].open
 *   - SL/TP taken from the signal as-is (ATR risk model)
 *   - exit via resolveExit (pessimistic same-bar), win = NET pnl > 0
 *   - fee 0.02% round-trip, leverage 1 (no liquidation), 1 USDT notional
 *   - HTF = 1h EMA filter, same as live
 *
 * Candles come from Binance's public data mirror (data-api.binance.vision, spot) since the
 * sandbox is rate-limited on fapi. Spot 5m ≈ futures 5m closely enough for a winrate read.
 *
 * Run: npx tsx scripts/sqz-backtest.ts
 */
import { buildIndicatorCache, evaluateSignalFromCandles, type ScanSettings } from '../src/utils/signalScan.js'
import { resolveExit, grossPnl as pureGrossPnl, roundTripFee as pureFee } from '../src/utils/tradeExec.js'
import type { OhlcvBar } from '../src/utils/ohlcv.js'

const BASE = 'https://data-api.binance.vision'
const TF_SEC = 300
const FEE_PCT = 0.02
const TRADE_NOTIONAL = 1
const PESSIMISTIC = true

const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','SUIUSDT','NEARUSDT']

async function klines(symbol: string, interval: string, total: number): Promise<OhlcvBar[]> {
  const out: any[] = []
  let endTime: number | undefined
  while (out.length < total) {
    const limit = Math.min(1000, total - out.length)
    const url = `${BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${symbol} ${interval} ${r.status}`)
    const rows = await r.json() as any[]
    if (!rows.length) break
    out.unshift(...rows)
    endTime = rows[0][0] - 1
    if (rows.length < limit) break
  }
  const seen = new Set<number>()
  return out
    .filter(k => !seen.has(k[0]) && seen.add(k[0]))
    .map(k => ({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }))
}

function buildSettings(overrides: Partial<ScanSettings> = {}): ScanSettings {
  // Mirrors DEFAULT_SQZ_FILTERS (the live/backtest defaults for Squeeze Momentum).
  return {
    selectedStrategy: 'Squeeze Momentum',
    enabledStrategies: ['Squeeze Momentum'],
    timeframe: '5m',
    entryModel: 'breakout_close',
    isConfluence: true,
    minConfluence: 2,
    minQuality: 5,
    filterFixedPctSlTp: false,
    fixedSlPct: 1.0,
    fixedTpPct: 2.0,
    nearEntryOnly: false,
    nearEntryPct: 100,
    filterCooldown: true,
    cooldownBars: 4,
    sqzBbLen: 20, sqzBbStd: 2.0, sqzKcLen: 20, sqzKcMult: 1.5, sqzMomLen: 20,
    sqzRequireRelease: true, sqzMinSqueezeBars: 2, sqzRequireMomRising: true,
    sqzUseHtfAlign: true, sqzHtfEmaLen: 200,
    sqzUseAdx: false, sqzAdxMin: 18,
    sqzUseVolume: true, sqzVolLen: 20, sqzMinVolumeRatio: 1.2,
    sqzSlAtrMult: 1.5, sqzTp1AtrMult: 3.0, sqzTp2AtrMult: 5.0,
    sqzUseManualSlTp: false, sqzManualSlPct: 1.5, sqzManualTp1Pct: 3.0, sqzManualTp2Pct: 5.0,
    lastSignalTimeSec: null, lastSignalDirection: null, lastCandleTimeSec: 0,
    ...overrides,
  } as unknown as ScanSettings
}

type Trade = { symbol: string; dir: 'buy' | 'sell'; entry: number; exit: number; reason: string; pnl: number; r: number }

function backtestSymbol(symbol: string, candles: OhlcvBar[], htf: OhlcvBar[], settings: ScanSettings): Trade[] {
  const cache = buildIndicatorCache(candles, htf.length > 0 ? htf : undefined)
  const hasHtf = htf.length > 0
  const trades: Trade[] = []
  let active: null | { dir: 'buy' | 'sell'; entry: number; sl: number; tp1: number } = null
  let lastSignalTimeSec: number | null = null
  let lastSignalDirection: 'buy' | 'sell' | null = null
  let htfLastIdx = -1

  for (let i = 55; i < candles.length; i++) {
    const c = candles[i]

    if (active) {
      const ex = resolveExit({ direction: active.dir, sl: active.sl, tp1: active.tp1, liqPrice: 0, candle: { high: c.high, low: c.low }, pessimisticSameBar: PESSIMISTIC })
      if (ex.closed) {
        const gross = pureGrossPnl(active.dir, active.entry, ex.exitPrice, TRADE_NOTIONAL)
        const pnl = gross - pureFee(TRADE_NOTIONAL, FEE_PCT)
        const risk = Math.max(Math.abs(active.entry - active.sl), 1e-8)
        const r = active.dir === 'buy' ? (ex.exitPrice - active.entry) / risk : (active.entry - ex.exitPrice) / risk
        trades.push({ symbol, dir: active.dir, entry: active.entry, exit: ex.exitPrice, reason: ex.reason, pnl, r })
        active = null
      }
      if (active) continue   // maxOpenPositions = 1
    }

    if (hasHtf) while (htfLastIdx + 1 < htf.length && htf[htfLastIdx + 1].time <= c.time) htfLastIdx++

    const sig = evaluateSignalFromCandles({
      candles,
      settings: { ...settings, lastSignalTimeSec, lastSignalDirection, lastCandleTimeSec: c.time, timeframe: '5m' },
      symbol,
      htfCandles: hasHtf ? htf : undefined,
      cache,
      lastIdx: i,
      htfLastIdx: hasHtf ? htfLastIdx : undefined,
    })
    if (sig) {
      const next = candles[i + 1]
      const fill = next ? next.open : sig.entry
      if (sig.direction === 'buy'  && (fill <= sig.sl || fill >= sig.tp1)) continue
      if (sig.direction === 'sell' && (fill >= sig.sl || fill <= sig.tp1)) continue
      active = { dir: sig.direction, entry: fill, sl: sig.sl, tp1: sig.tp1 }
      lastSignalTimeSec = next ? next.time : c.time
      lastSignalDirection = sig.direction
    }
  }
  return trades
}

function report(label: string, all: Trade[]) {
  const closed = all
  const wins = closed.filter(t => t.pnl > 0)
  const wr = closed.length ? (wins.length / closed.length) * 100 : 0
  const net = closed.reduce((s, t) => s + t.pnl, 0)
  const totalR = closed.reduce((s, t) => s + t.r, 0)
  const avgR = closed.length ? totalR / closed.length : 0
  const tps = closed.filter(t => t.reason === 'tp').length
  const sls = closed.filter(t => t.reason === 'sl').length
  console.log(`\n=== ${label} ===`)
  console.log(`trades=${closed.length}  winrate=${wr.toFixed(1)}%  net=$${net.toFixed(4)} (per $1 notional)  avgR=${avgR.toFixed(2)}  tp=${tps} sl=${sls}`)
}

async function main() {
  console.log('Fetching candles (5m ×1500, 1h ×400) from data-api.binance.vision …')
  const data: Record<string, { c: OhlcvBar[]; h: OhlcvBar[] }> = {}
  for (const s of SYMBOLS) {
    try {
      const [c, h] = await Promise.all([klines(s, '5m', 1500), klines(s, '1h', 400)])
      data[s] = { c, h }
      process.stdout.write(`  ${s}: ${c.length} 5m, ${h.length} 1h\n`)
    } catch (e) {
      console.log(`  ${s}: FAILED ${(e as Error).message}`)
    }
  }
  const syms = Object.keys(data)
  const days = syms.length ? ((data[syms[0]].c.length * TF_SEC) / 86400).toFixed(1) : '0'
  console.log(`\nWindow ≈ ${days} days of 5m candles (last ~200 bars are EMA warmup).`)

  const variants: [string, Partial<ScanSettings>][] = [
    ['DEFAULTS (1.5/3.0 ATR)', {}],
    ['SL 2.0 / TP 3.0', { sqzSlAtrMult: 2.0 }],
    ['SL 2.0 / TP 3.5', { sqzSlAtrMult: 2.0, sqzTp1AtrMult: 3.5 }],
    ['SL 2.0 / TP 4.0', { sqzSlAtrMult: 2.0, sqzTp1AtrMult: 4.0 }],
    ['SL 2.0 / TP 3.0 + ADX≥18', { sqzSlAtrMult: 2.0, sqzUseAdx: true, sqzAdxMin: 18 }],
    ['SL 2.0 / TP 3.0 + ADX≥22', { sqzSlAtrMult: 2.0, sqzUseAdx: true, sqzAdxMin: 22 }],
    ['SL 2.0 / TP 3.0 + minSqueeze 4', { sqzSlAtrMult: 2.0, sqzMinSqueezeBars: 4 }],
    ['SL 2.0 / TP 3.0 + minSqueeze 6', { sqzSlAtrMult: 2.0, sqzMinSqueezeBars: 6 }],
    ['SL 2.5 / TP 3.0', { sqzSlAtrMult: 2.5 }],
  ]

  for (const [label, ov] of variants) {
    const settings = buildSettings(ov)
    let all: Trade[] = []
    for (const s of syms) all = all.concat(backtestSymbol(s, data[s].c, data[s].h, settings))
    report(label, all)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
