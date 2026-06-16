/**
 * EMPIRICAL parity run: fetch the user's REAL MEXC closed trades from the running server,
 * run the actual backtest engine over that exact window + symbols (MEXC candles), and diff.
 * This is the real "does backtest match live" test, executed — not synthetic.
 *
 * Requires the dev server running on localhost:3017.
 * Run: npx tsx scripts/live-parity.ts
 */
import { simulatePaperBacktest } from '../src/hooks/useBacktestRunner.js'
import { computeParityDiff, parityVerdict } from '../src/utils/parityDiff.js'
import type { ScanSettings } from '../src/utils/signalScan.js'

const BASE = 'http://localhost:3017'
const TF = '5m'

// Point the engine's browser `fetch('/api/...')` at the local server.
const realFetch = globalThis.fetch
globalThis.fetch = ((input: any, init?: any) => {
  const url = typeof input === 'string' && input.startsWith('/') ? BASE + input : input
  return realFetch(url, init)
}) as typeof fetch

// Supertrend profile matching the live account settings (leverage 20, etc.).
function buildSettings(): ScanSettings {
  return {
    enabledStrategies: ['Supertrend + RelVol'],
    selectedStrategy: 'Supertrend + RelVol',
    entryModel: 'breakout_close',
    isConfluence: false, minConfluence: 0, minQuality: 0,
    filterFixedPctSlTp: false, fixedSlPct: 1.5, fixedTpPct: 3.0,
    stAtrPeriod: 10, stAtrMult: 3, stRequireFlip: true, stUseRelVol: true, stRelVolLen: 20, stRelVolMin: 1.5,
    nearEntryOnly: false, nearEntryPct: 100,
    lastSignalTimeSec: null, lastSignalDirection: null, lastCandleTimeSec: 0, timeframe: TF,
  } as unknown as ScanSettings
}

async function main() {
  console.log('[live-parity] fetching REAL MEXC closed trades from running server...\n')
  const r = await realFetch(`${BASE}/api/mexc-trader/closed-pnl?maxTrades=200`)
  const j = await r.json()
  if (!j.success) { console.log('ERR:', j.error); process.exit(1) }

  const toSec = (n: number) => (n > 1e12 ? Math.floor(n / 1000) : n)
  const liveTrades = (j.data.trades ?? [])
    .filter((t: any) => t.closeTime > 0 && t.openTime > 0)
    .map((t: any) => ({ symbol: t.symbol, realizedPnl: t.realizedPnl, openTime: toSec(t.openTime), closeTime: toSec(t.closeTime) }))

  const start = Math.min(...liveTrades.map((t: any) => t.openTime))
  const end   = Math.max(...liveTrades.map((t: any) => t.closeTime))
  const liveSymbols = Array.from(new Set(liveTrades.map((t: any) => t.symbol))) as string[]

  // Active windows: the live scanner traded intermittently (whole hours with 0 trades). Build
  // [start,end] buckets around clustered live entries so the (continuous) backtest only trades
  // when live was actually active — apples-to-apples. Merge entries within 30min; pad ±15min.
  // Prefer TRUE scanner uptime segments (logged by the bg scanner). Fall back to inferring from
  // trade timestamps only if no uptime log exists yet.
  let activeWindows: [number, number][] = []
  try {
    const ur = await realFetch(`${BASE}/api/bgscanner/uptime`)
    const uj = await ur.json()
    const segs = (uj?.data?.segments ?? []).filter((s: any) => s.end >= start && s.start <= end)
    if (segs.length > 0) {
      activeWindows = segs.map((s: any) => [Math.max(s.start, start), Math.min(s.end, end)] as [number, number])
      console.log(`active windows from REAL scanner uptime log: ${activeWindows.length} segments covering ~${Math.round(activeWindows.reduce((a, [s, e]) => a + (e - s), 0) / 3600)}h of the ${Math.round((end - start) / 3600)}h span`)
    }
  } catch { /* fall through */ }
  if (activeWindows.length === 0) {
    const PAD = 2 * 60, MERGE = 3 * 60
    const opens = liveTrades.map((t: any) => t.openTime).sort((a: number, b: number) => a - b)
    for (const o of opens) {
      const last = activeWindows[activeWindows.length - 1]
      if (last && o - last[1] <= MERGE) last[1] = o + PAD
      else activeWindows.push([o - PAD, o + PAD])
    }
    console.log(`active windows INFERRED from trades (no uptime log yet): ${activeWindows.length} buckets covering ~${Math.round(activeWindows.reduce((s, [a, b]) => s + (b - a), 0) / 3600)}h of the ${Math.round((end - start) / 3600)}h span`)
  }
  console.log(`live trades: ${liveTrades.length} | symbols: ${liveSymbols.length} | window: ${new Date(start*1000).toISOString()} → ${new Date(end*1000).toISOString()}`)
  console.log(`live net realized P&L: $${liveTrades.reduce((s: number, t: any) => s + t.realizedPnl, 0).toFixed(4)}\n`)

  console.log('[live-parity] running backtest over same window+symbols (MEXC candles)...')
  const bt = await simulatePaperBacktest({
    symbols: liveSymbols,
    timeframe: TF,
    baseSettings: buildSettings(),
    options: {
      startingCapital: 27, tradeAmount: 1, leverage: 20, marginMode: 'cross',
      feeRatePct: 0.02, maxOpenPositions: 20,
      source: 'mexc', windowStart: start, windowEnd: end, activeWindows,
    },
    onProgress: () => {},
  })
  console.log(`backtest: ${bt.summary.totalTrades} trades, net $${bt.summary.netPnl.toFixed(4)}`)
  console.log(`diag: ${bt.diag.line}`)
  // Backtest SL/TP distances vs live's observed ~0.82% exits.
  const closed = bt.trades.filter((t: any) => t.result !== 'open')
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
  const slPct = closed.map((t: any) => Math.abs(t.sl - t.entry) / t.entry * 100)
  const tpPct = closed.map((t: any) => Math.abs(t.tp1 - t.entry) / t.entry * 100)
  const exitMove = closed.map((t: any) => Math.abs(t.exitPrice - t.entry) / t.entry * 100)
  console.log(`backtest SL% median=${med(slPct).toFixed(3)}  TP% median=${med(tpPct).toFixed(3)}  actual-exit-move median=${med(exitMove).toFixed(3)}  (live exit ~0.82%)\n`)

  // Re-entry distribution: how many symbols had 1/2/3+ trades, live vs backtest.
  const dist = (counts: number[]) => ({ one: counts.filter(c => c === 1).length, two: counts.filter(c => c === 2).length, threeplus: counts.filter(c => c >= 3).length })
  const liveCounts: Record<string, number> = {}
  for (const t of liveTrades) liveCounts[t.symbol] = (liveCounts[t.symbol] ?? 0) + 1
  const btCounts = Object.entries(bt.symbolBreakdown).filter(([, v]: any) => v.trades > 0).map(([, v]: any) => v.trades)
  console.log('re-entry dist LIVE:', dist(Object.values(liveCounts)), '| BACKTEST:', dist(btCounts))

  const d = computeParityDiff(liveTrades, bt.symbolBreakdown, bt.summary.totalTrades)
  console.log('=== VERDICT:', parityVerdict(d), '===')
  console.log(`live trades=${d.live.count}  backtest trades=${d.backtest.count}  match=${d.tradeCountMatchPct.toFixed(0)}%`)
  console.log(`symbols matched=${d.symbolsMatched}  live-only=${d.symbolsLiveOnly}  bt-only=${d.symbolsBtOnly}`)
  console.log('\ntop divergent symbols (live traded, backtest count):')
  for (const row of d.rows.slice(0, 15)) {
    console.log(`  ${row.symbol.padEnd(14)} live=${row.liveTrades} bt=${row.btTrades} livePnl=${row.livePnl.toFixed(4)} ${row.match ? '✓' : '✗'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
