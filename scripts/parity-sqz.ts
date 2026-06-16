/**
 * Cross-engine parity test for the "Squeeze Momentum" (TTM) strategy.
 *
 * Feeds IDENTICAL synthetic candles to BOTH signal evaluators and asserts they produce the
 * SAME signal (direction, entry, sl, tp1):
 *   - LIVE:     evaluateSignal             (api/utils/signalEval.ts)
 *   - BACKTEST: evaluateSignalFromCandles  (src/utils/signalScan.ts)
 *
 * The candle generator builds a low-volatility consolidation (Bollinger Bands contract inside
 * the Keltner Channel → "squeeze on") followed by a sharp expansion (the squeeze "fires"), so
 * the strategy actually produces signals to compare.
 *
 * Run: npx tsx scripts/parity-sqz.ts
 */
import { evaluateSignal, type BgScanParams } from '../api/utils/signalEval.js'
import { buildIndicatorCache, evaluateSignalFromCandles, type ScanSettings } from '../src/utils/signalScan.js'
import type { OhlcvBar } from '../src/utils/ohlcv.js'

// Tight range for ~70% of the series (squeeze on), then a sharp directional expansion.
function makeSqueezeThenExpand(n: number, dir: 1 | -1, tfSec = 300): OhlcvBar[] {
  const bars: OhlcvBar[] = []
  let price = 100
  const t0 = 1_700_000_000
  const breakAt = Math.floor(n * 0.7)
  for (let i = 0; i < n; i++) {
    const open = price
    const consolidating = i < breakAt
    // Consolidation: tiny drift + tiny range. Expansion: strong drift + wide range.
    const drift = consolidating ? Math.sin(i / 3) * 0.06 : dir * 1.4
    const close = open + drift
    const wick = consolidating ? 0.08 : 0.9
    const high = Math.max(open, close) + wick
    const low = Math.min(open, close) - wick
    const volume = 1000 + (consolidating ? 0 : 2500) + (i % 5) * 30
    bars.push({ time: t0 + i * tfSec, open, high, low, close, volume })
    price = close
  }
  return bars
}

const STRATEGY = 'Squeeze Momentum'
const TF = '5m'

// Fixed % SL/TP ON so SL/TP are deterministic off entry. All optional gates OFF to isolate the
// core squeeze+momentum signal (HTF/ADX/volume add votes but shouldn't change parity).
const shared = {
  strategy: STRATEGY,
  timeframe: TF,
  minQuality: 0,
  minConfluence: 0,
  isConfluence: false,
  nearEntryOnly: false,
  nearEntryPct: 100,
  enabledStrategies: [STRATEGY],
  filterFixedPctSlTp: true,
  fixedSlPct: 1.5,
  fixedTpPct: 3.0,
  sqzBbLen: 20,
  sqzBbStd: 2.0,
  sqzKcLen: 20,
  sqzKcMult: 1.5,
  sqzMomLen: 20,
  sqzRequireRelease: true,
  sqzMinSqueezeBars: 2,
  sqzRequireMomRising: true,
  sqzUseHtfAlign: false,
  sqzUseAdx: false,
  sqzUseVolume: false,
  sqzUseManualSlTp: false,
}

function buildLiveParams(): BgScanParams {
  return { ...(shared as unknown as BgScanParams) }
}
function buildBtSettings(): ScanSettings {
  return {
    ...(shared as unknown as ScanSettings),
    selectedStrategy: STRATEGY,
    entryModel: 'breakout_close',
    lastSignalTimeSec: null,
    lastSignalDirection: null,
    lastCandleTimeSec: 0,
  }
}

function approxEq(a: number, b: number, tol = 1e-6) {
  if (a === 0 && b === 0) return true
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9) < tol
}

function compareAt(candles: OhlcvBar[], label: string): string[] {
  const fails: string[] = []
  const cache = buildIndicatorCache(candles)
  let compared = 0, signalsFired = 0
  for (let lastIdx = 60; lastIdx < candles.length; lastIdx++) {
    const sub = candles.slice(0, lastIdx + 1)
    const live = evaluateSignal(sub, buildLiveParams())
    const bt = evaluateSignalFromCandles({ candles, settings: buildBtSettings(), symbol: 'TESTUSDT', cache, lastIdx })
    compared++
    if (!!live || !!bt) signalsFired++
    if (!!live !== !!bt) { fails.push(`[${label}@${lastIdx}] presence: live=${!!live} bt=${!!bt}`); continue }
    if (live && bt) {
      if (live.direction !== bt.direction) fails.push(`[${label}@${lastIdx}] dir: ${live.direction} vs ${bt.direction}`)
      if (!approxEq(live.entry, bt.entry)) fails.push(`[${label}@${lastIdx}] entry: ${live.entry} vs ${bt.entry}`)
      if (!approxEq(live.sl, bt.sl))       fails.push(`[${label}@${lastIdx}] sl: ${live.sl} vs ${bt.sl}`)
      if (!approxEq(live.tp1, bt.tp1))     fails.push(`[${label}@${lastIdx}] tp1: ${live.tp1} vs ${bt.tp1}`)
    }
  }
  console.log(`  ${label}: compared ${compared} states, ${signalsFired} produced signals, ${fails.length} mismatches`)
  return fails
}

function main() {
  console.log(`[parity-sqz] strategy="${STRATEGY}" tf=${TF} — cross-engine signal parity\n`)

  const scenarios: [string, OhlcvBar[]][] = [
    ['squeeze→up',   makeSqueezeThenExpand(120, 1)],
    ['squeeze→down', makeSqueezeThenExpand(120, -1)],
    ['choppy',       Array.from({ length: 120 }, (_, i) => { const t0 = 1_700_000_000, p = 100 + Math.sin(i / 2) * 5; return { time: t0 + i * 300, open: p, close: p + Math.cos(i) * 0.5, high: p + 1, low: p - 1, volume: 1000 + (i % 7) * 100 } }) ],
  ]

  let allFails: string[] = []
  let totalSignals = 0
  for (const [label, candles] of scenarios) {
    const fails = compareAt(candles, label)
    allFails = allFails.concat(fails)
  }
  void totalSignals

  console.log('')
  if (allFails.length === 0) {
    console.log('✅ PARITY PASS — Squeeze Momentum live and backtest engines produced identical signals.')
    process.exit(0)
  } else {
    console.log(`❌ PARITY FAIL — ${allFails.length} divergence(s):`)
    for (const f of allFails.slice(0, 30)) console.log('   - ' + f)
    process.exit(1)
  }
}

main()
