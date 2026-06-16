/**
 * Tests the parity-diff verdict logic (the math behind the in-app Parity Check) against
 * hand-built live-vs-backtest scenarios. Proves the comparison itself is correct, so when the
 * user runs it against their real MEXC trades, the verdict is trustworthy.
 * Run: npx tsx scripts/parity-diff-test.ts
 */
import { computeParityDiff, parityVerdict } from '../src/utils/parityDiff.js'

let pass = 0, fail = 0
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`) }
}

console.log('[parity-diff-test] verdict logic vs hand-built scenarios\n')

// ── Scenario 1: perfect match — same symbols, same trade count ──
console.log('1. Perfect match:')
{
  const live = [
    { symbol: 'BTCUSDT', realizedPnl: 5,  openTime: 100, closeTime: 200 },
    { symbol: 'BTCUSDT', realizedPnl: -2, openTime: 250, closeTime: 300 },
    { symbol: 'ETHUSDT', realizedPnl: 3,  openTime: 150, closeTime: 400 },
  ]
  const bt = { BTCUSDT: { trades: 2 }, ETHUSDT: { trades: 1 } }
  const d = computeParityDiff(live, bt, 3)
  check('live count', d.live.count, 3)
  check('backtest count', d.backtest.count, 3)
  check('trade-count match %', d.tradeCountMatchPct, 100)
  check('symbols matched', d.symbolsMatched, 2)
  check('live-only', d.symbolsLiveOnly, 0)
  check('bt-only', d.symbolsBtOnly, 0)
  check('live total pnl', d.live.totalPnl, 6)
  check('window', d.window, { start: 100, end: 400 })
  check('verdict', parityVerdict(d), 'STRONG MATCH')
}

// ── Scenario 2: backtest misses a symbol live traded (missed signal) ──
console.log('\n2. Backtest missed a symbol:')
{
  const live = [
    { symbol: 'BTCUSDT', realizedPnl: 5, openTime: 100, closeTime: 200 },
    { symbol: 'SOLUSDT', realizedPnl: 9, openTime: 120, closeTime: 220 },
  ]
  const bt = { BTCUSDT: { trades: 1 } }   // SOL missing
  const d = computeParityDiff(live, bt, 1)
  check('live-only (missed)', d.symbolsLiveOnly, 1)
  check('trade-count match % (1 of 2)', d.tradeCountMatchPct, 50)
  check('verdict', parityVerdict(d), 'MISMATCH')
}

// ── Scenario 3: close-but-not-exact (9 of 10 trades) → partial ──
console.log('\n3. Partial match (9 vs 10):')
{
  const live = Array.from({ length: 10 }, (_, i) => ({ symbol: 'BTCUSDT', realizedPnl: 1, openTime: 100 + i, closeTime: 200 + i }))
  const bt = { BTCUSDT: { trades: 9 } }
  const d = computeParityDiff(live, bt, 9)
  check('trade-count match % (90)', d.tradeCountMatchPct, 90)
  // symbolsLiveOnly is 0 (BTC traded in both), match% 90 → STRONG per rule
  check('verdict (90%, no live-only)', parityVerdict(d), 'STRONG MATCH')
}

// ── Scenario 4: the user's BTC example — add-only store is separate concern; here just diff ──
console.log('\n4. Backtest has a phantom symbol live did not trade:')
{
  const live = [{ symbol: 'BTCUSDT', realizedPnl: 5, openTime: 100, closeTime: 200 }]
  const bt = { BTCUSDT: { trades: 1 }, DOGEUSDT: { trades: 3 } }  // DOGE phantom
  const d = computeParityDiff(live, bt, 4)
  check('bt-only (phantom)', d.symbolsBtOnly, 1)
  check('live-only', d.symbolsLiveOnly, 0)
  // backtest 4 vs live 1 → |4-1|/1 = 300% over → clamped to 0
  check('trade-count match % (clamped 0)', d.tradeCountMatchPct, 0)
  check('verdict', parityVerdict(d), 'MISMATCH')
}

// ── Scenario 5: rows sorted by live trade count desc ──
console.log('\n5. Rows sorted by live trades desc:')
{
  const live = [
    { symbol: 'A', realizedPnl: 1, openTime: 1, closeTime: 2 },
    { symbol: 'B', realizedPnl: 1, openTime: 1, closeTime: 2 },
    { symbol: 'B', realizedPnl: 1, openTime: 1, closeTime: 2 },
    { symbol: 'B', realizedPnl: 1, openTime: 1, closeTime: 2 },
  ]
  const d = computeParityDiff(live, { A: { trades: 1 }, B: { trades: 3 } }, 4)
  check('first row is B (3 live trades)', d.rows[0].symbol, 'B')
  check('B live trades', d.rows[0].liveTrades, 3)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
