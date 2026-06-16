/**
 * Cross-engine parity test (runnable, no network, no MEXC account needed).
 *
 * Feeds IDENTICAL synthetic candles to BOTH signal evaluators:
 *   - LIVE:     evaluateSignal        (api/utils/signalEval.ts)  — used by the bg scanner
 *   - BACKTEST: evaluateSignalFromCandles (src/utils/signalScan.ts) — used by the backtest
 *
 * Asserts they produce the SAME signal (direction, entry, sl, tp1). If they diverge, the
 * backtest cannot match live regardless of PnL math — this catches that at the source.
 *
 * Run: npx tsx scripts/parity-test.ts
 */
import { evaluateSignal, type BgScanParams } from '../api/utils/signalEval.js'
import { buildIndicatorCache, evaluateSignalFromCandles, type ScanSettings } from '../src/utils/signalScan.js'
import type { OhlcvBar } from '../src/utils/ohlcv.js'

// ── Deterministic candle generator ──────────────────────────────────────────
// A steady uptrend with rising volume — designed to trigger a Supertrend long flip.
function makeUptrend(n: number, tfSec = 300): OhlcvBar[] {
  const bars: OhlcvBar[] = []
  let price = 100
  const t0 = 1_700_000_000 // fixed epoch for determinism
  for (let i = 0; i < n; i++) {
    const open = price
    // Phase 1 (first 60%): DOWNtrend so Supertrend is bearish.
    // Phase 2 (last 40%): sharp UPtrend to force a bullish flip with real ATR range.
    const phase2 = i >= Math.floor(n * 0.6)
    const drift = phase2 ? 1.5 : -0.8
    const close = open + drift
    const high = Math.max(open, close) + (phase2 ? 0.8 : 0.3)
    const low = Math.min(open, close) - (phase2 ? 0.3 : 0.8)
    const volume = 1000 + (phase2 ? 2000 : 0) + (i % 5) * 50
    bars.push({ time: t0 + i * tfSec, open, high, low, close, volume })
    price = close
  }
  return bars
}

// ── Shared config → both param shapes ───────────────────────────────────────
const STRATEGY = 'Supertrend + RelVol'
const TF = '5m'

// Minimal Supertrend config, fixed % SL/TP ON so SL/TP are deterministic off entry.
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
  stAtrPeriod: 10,
  stAtrMult: 3,
  stRequireFlip: false,  // trend (not just flip) so a steady uptrend at the last bar qualifies
  stUseRelVol: false,   // disable extra gates to isolate the core signal
  stUseHTFAlign: false,
  stUseAdx: false,
  stUseManualSlTp: false,
}

// Fill every other filter to false/default so both engines see the same (permissive) gates.
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

// ── Run ──────────────────────────────────────────────────────────────────────
function approxEq(a: number, b: number, tol = 1e-6) {
  if (a === 0 && b === 0) return true
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9) < tol
}

// Slice the same candle series at many end-points → many independent signal evaluations.
// Each lastIdx is a distinct market state; if ANY diverges between engines, we catch it.
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
  console.log(`[parity-test] strategy="${STRATEGY}" tf=${TF} — cross-engine signal parity\n`)

  const scenarios: [string, OhlcvBar[]][] = [
    ['uptrend',   makeUptrend(120)],
    ['downtrend', makeUptrend(120).map(b => ({ ...b, open: 300 - b.open, close: 300 - b.close, high: 300 - b.low, low: 300 - b.high }))],
    ['choppy',    Array.from({ length: 120 }, (_, i) => { const t0 = 1_700_000_000, p = 100 + Math.sin(i / 2) * 5; return { time: t0 + i * 300, open: p, close: p + Math.cos(i) * 0.5, high: p + 1, low: p - 1, volume: 1000 + (i % 7) * 100 } }) ],
  ]

  let allFails: string[] = []
  for (const [label, candles] of scenarios) allFails = allFails.concat(compareAt(candles, label))

  console.log('')
  if (allFails.length === 0) {
    console.log('✅ PARITY PASS — live and backtest engines produced identical signals across all states.')
    process.exit(0)
  } else {
    console.log(`❌ PARITY FAIL — ${allFails.length} divergence(s):`)
    for (const f of allFails.slice(0, 30)) console.log('   - ' + f)
    process.exit(1)
  }
}

main()
