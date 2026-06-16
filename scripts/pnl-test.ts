/**
 * Deterministic exit/P&L test — asserts the backtest's trade-resolution math against
 * HAND-COMPUTED values. No network, no account. Run: npx tsx scripts/pnl-test.ts
 *
 * This proves the half that signal-parity doesn't cover: given a trade, does the backtest
 * compute the same exit price and P&L that the math (and live MEXC) would produce?
 */
import { resolveExit, resolvePhasedExit, grossPnl, roundTripFee, netPnl, isolatedLiqPrice, crossLiqPrice } from '../src/utils/tradeExec.js'

let pass = 0, fail = 0
function check(name: string, got: number | string | boolean, want: number | string | boolean, tol = 1e-9) {
  const ok = typeof got === 'number' && typeof want === 'number'
    ? Math.abs(got - want) <= tol + Math.abs(want) * 1e-9
    : got === want
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}: got ${got}, want ${want}`) }
}

console.log('[pnl-test] exit/P&L math vs hand-computed truth\n')

// ── Scenario setup: LONG at entry=100, SL=98.5 (-1.5%), TP1=103 (+3%), 20x leverage ──
const entry = 100, sl = 98.5, tp1 = 103, leverage = 20, maint = 0.005
const positionSize = 200   // notional (margin 10 * 20x)
const feeRatePct = 0.02
const liq = isolatedLiqPrice('buy', entry, leverage, maint)
// hand: 100 * (1 - 1/20 + 0.005) = 100 * (1 - 0.05 + 0.005) = 100 * 0.955 = 95.5
console.log('Liquidation price:')
check('isolated liq (long, 20x)', liq, 95.5)

// ── 1. TP hit (candle high reaches 103) ──
console.log('\n1. TP1 hit:')
{
  const d = resolveExit({ direction: 'buy', sl, tp1, liqPrice: liq, candle: { high: 103.2, low: 99.8 }, pessimisticSameBar: true })
  check('reason', d.reason, 'tp')
  check('exitPrice', d.exitPrice, 103)
  // gross = 200 * (103-100)/100 = 200 * 0.03 = 6.00 ; fee = 200*0.0002*2 = 0.08 ; net = 5.92
  check('gross', grossPnl('buy', entry, d.exitPrice, positionSize), 6)
  check('fee', roundTripFee(positionSize, feeRatePct), 0.08)
  check('net', netPnl('buy', entry, d.exitPrice, positionSize, feeRatePct), 5.92)
}

// ── 2. SL hit (candle low reaches 98.5) ──
console.log('\n2. SL hit:')
{
  const d = resolveExit({ direction: 'buy', sl, tp1, liqPrice: liq, candle: { high: 100.5, low: 98.4 }, pessimisticSameBar: true })
  check('reason', d.reason, 'sl')
  check('exitPrice', d.exitPrice, 98.5)
  // gross = 200 * (98.5-100)/100 = 200 * -0.015 = -3.00 ; net = -3.08
  check('gross', grossPnl('buy', entry, d.exitPrice, positionSize), -3)
  check('net', netPnl('buy', entry, d.exitPrice, positionSize, feeRatePct), -3.08)
}

// ── 3. Same-bar SL+TP → pessimistic = SL (loss) ──
console.log('\n3. Same-bar SL+TP (pessimistic):')
{
  const d = resolveExit({ direction: 'buy', sl, tp1, liqPrice: liq, candle: { high: 103.5, low: 98.4 }, pessimisticSameBar: true })
  check('reason', d.reason, 'sl')
  check('exitPrice', d.exitPrice, 98.5)
}

// ── 4. SL fires before liquidation (candle blows through both to 95.0) ──
console.log('\n4. Big down candle pierces SL AND liq → SL wins (not liquidation):')
{
  const d = resolveExit({ direction: 'buy', sl, tp1, liqPrice: liq, candle: { high: 100.2, low: 95.0 }, pessimisticSameBar: true })
  check('reason (must be sl, not liquidated)', d.reason, 'sl')
  check('exitPrice', d.exitPrice, 98.5)
}

// ── 5. True liquidation: SL is BELOW liq (wide SL), candle hits liq only ──
console.log('\n5. Wide SL below liq → genuine liquidation:')
{
  const wideSl = 94   // below liq 95.5
  const d = resolveExit({ direction: 'buy', sl: wideSl, tp1, liqPrice: liq, candle: { high: 100.2, low: 95.4 }, pessimisticSameBar: true })
  check('reason', d.reason, 'liquidated')
  check('exitPrice', d.exitPrice, 95.5)
}

// ── 6. SHORT TP hit (entry 100, tp1 97) ──
console.log('\n6. SHORT TP1 hit:')
{
  const d = resolveExit({ direction: 'sell', sl: 101.5, tp1: 97, liqPrice: isolatedLiqPrice('sell', 100, leverage, maint), candle: { high: 100.3, low: 96.8 }, pessimisticSameBar: true })
  check('reason', d.reason, 'tp')
  check('exitPrice', d.exitPrice, 97)
  // short gross = 200 * (100-97)/100 = 6.00
  check('gross', grossPnl('sell', 100, 97, positionSize), 6)
}

// ── 7. Fee scales with leverage (the "75% win but negative PnL" root cause) ──
console.log('\n7. Fee drag at 20x (tiny TP barely beats fee):')
{
  // entry 100, TP +0.05% = 100.05 ; gross = 200 * 0.0005 = 0.10 ; fee = 0.08 ; net = +0.02 (barely a win)
  check('net just positive', netPnl('buy', 100, 100.05, positionSize, feeRatePct), 0.02, 1e-6)
  // TP +0.03% = 100.03 ; gross = 0.06 ; fee 0.08 ; net = -0.02 → TP HIT but a LOSS after fees
  check('TP-hit but net LOSS after fee', netPnl('buy', 100, 100.03, positionSize, feeRatePct) < 0, true)
}

// ── 8. Cross-margin liquidation (regression: old formula subtracted a $-ratio from price) ──
console.log('\n8. Cross-margin liquidation price:')
{
  // DEFAULT_OPTS shape: equity 27 backing a $1 notional long — practically unliquidatable.
  // Old formula: 3000*1.005 - 27/1 = 2988 → phantom liquidation on a 0.4% dip.
  check('equity >> notional long → no liquidation (0)', crossLiqPrice('buy', 3000, 27, 1, maint), 0)
  // Long, equity = 10% of notional: P = E(1 - 0.1)/(1 - 0.005) = 100 * 0.9/0.995 = 90.45226…
  check('long equity=10% of notional', crossLiqPrice('buy', 100, 20, 200, maint), 100 * 0.9 / 0.995, 1e-6)
  // Equity check at that price: 20 + (90.4523-100)*(200/100) = 20 - 19.0955 = 0.9045 = mmr*qty*P ✓
  // Short, same ratio: P = E(1 + 0.1)/(1 + 0.005) = 100 * 1.1/1.005 = 109.45273…
  check('short equity=10% of notional', crossLiqPrice('sell', 100, 20, 200, maint), 100 * 1.1 / 1.005, 1e-6)
  // Cheap coin (price < equity/qty ratio in old formula clamped to 0 = liq disabled).
  // Price 0.5, equity 5, notional 200 (ratio 2.5%): long liq = 0.5*0.975/0.995 = 0.48995
  check('cheap coin long liq is real (not 0)', crossLiqPrice('buy', 0.5, 5, 200, maint), 0.5 * 0.975 / 0.995, 1e-9)
  check('zero equity → 0 (no position)', crossLiqPrice('buy', 100, 0, 200, maint), 0)
}

// ── 9. Phased exit (TP1 partial → breakeven stop → TP2 runner) ──
console.log('\n9. Phased exit (runner mode):')
{
  // LONG entry=100, SL=98.5 (risk 1.5), TP1=103 (2R), TP2=106 (4R), runnerFraction=0.5
  const base = { direction: 'buy' as const, entry: 100, sl: 98.5, tp1: 103, tp2: 106, liqPrice: 0, pessimisticSameBar: true, runnerFraction: 0.5 }

  // a. Phase 1: SL hit → full close at SL, r=-1
  const a = resolvePhasedExit({ ...base, candle: { high: 100.5, low: 98.4 }, tp1Taken: false })
  check('a. full SL: one portion', a.portions.length, 1)
  check('a. fraction', a.portions[0].fraction, 1)
  check('a. price', a.portions[0].price, 98.5)
  check('a. r = -1', a.portions[0].r, -1)
  check('a. flat', a.remainingFraction, 0)

  // b. Phase 1: SL+TP1 same bar (pessimistic) → full SL, no partial
  const b = resolvePhasedExit({ ...base, candle: { high: 103.5, low: 98.4 }, tp1Taken: false })
  check('b. pessimistic same-bar → sl', b.portions[0].reason, 'sl')
  check('b. one portion only', b.portions.length, 1)

  // c. Phase 1: TP1 hit, low stays above entry → partial booked, runner stays open
  // tp1RR = (103-100)/1.5 = 2 → partial r = 0.5 * 2 = 1
  const c = resolvePhasedExit({ ...base, candle: { high: 103.2, low: 101.0 }, tp1Taken: false })
  check('c. partial reason', c.portions[0].reason, 'tp1')
  check('c. partial fraction', c.portions[0].fraction, 0.5)
  check('c. partial r = 1', c.portions[0].r, 1)
  check('c. runner open', c.remainingFraction, 0.5)
  check('c. tp1Taken', c.tp1Taken, true)

  // d. Phase 1: TP1 hit AND low touches entry same bar (pessimistic) → partial + BE stop
  const d = resolvePhasedExit({ ...base, candle: { high: 103.2, low: 99.9 }, tp1Taken: false })
  check('d. two portions', d.portions.length, 2)
  check('d. second reason = be', d.portions[1].reason, 'be')
  check('d. be price = entry', d.portions[1].price, 100)
  check('d. be r = 0', d.portions[1].r, 0)
  check('d. flat', d.remainingFraction, 0)
  check('d. total r = 1 (partial only)', d.portions.reduce((s, p) => s + p.r, 0), 1)

  // e. Phase 2: runner hits TP2 → r = 0.5 * (106-100)/1.5 = 2
  const e = resolvePhasedExit({ ...base, candle: { high: 106.3, low: 102.0 }, tp1Taken: true })
  check('e. reason tp2', e.portions[0].reason, 'tp2')
  check('e. r = 2', e.portions[0].r, 2)
  check('e. flat', e.remainingFraction, 0)

  // f. Phase 2: runner stopped at breakeven → r = 0
  const f = resolvePhasedExit({ ...base, candle: { high: 102.0, low: 99.8 }, tp1Taken: true })
  check('f. reason be', f.portions[0].reason, 'be')
  check('f. price = entry', f.portions[0].price, 100)
  check('f. r = 0', f.portions[0].r, 0)

  // g. Phase 2: BE+TP2 same bar (pessimistic) → BE
  const g = resolvePhasedExit({ ...base, candle: { high: 106.5, low: 99.9 }, tp1Taken: true })
  check('g. pessimistic → be', g.portions[0].reason, 'be')

  // h. Legacy degrade: tp2=0 → full close at TP1
  const h = resolvePhasedExit({ ...base, tp2: 0, candle: { high: 103.2, low: 101.0 }, tp1Taken: false })
  check('h. tp2=0 → full tp1', h.portions[0].fraction, 1)
  check('h. r = tp1RR = 2', h.portions[0].r, 2)

  // i. SHORT mirror: entry=100, sl=101.5, tp1=97 (2R), tp2=94; TP1 bar, high stays under entry
  const i9 = resolvePhasedExit({ direction: 'sell', entry: 100, sl: 101.5, tp1: 97, tp2: 94, liqPrice: 0, pessimisticSameBar: true, runnerFraction: 0.5, candle: { high: 99.5, low: 96.8 }, tp1Taken: false })
  check('i. short partial r = 1', i9.portions[0].r, 1)
  check('i. short runner open', i9.remainingFraction, 0.5)

  // j. No exit at all → nothing booked
  const j = resolvePhasedExit({ ...base, candle: { high: 102.0, low: 100.5 }, tp1Taken: false })
  check('j. no portions', j.portions.length, 0)
  check('j. still full size', j.remainingFraction, 1)

  // k. ENTRY BAR: low ≤ entry is trivially true (open = entry) — runner must survive.
  // Buy fills at open=100; bar runs 99.9–103.2 hitting TP1. Without the entryBar flag the
  // runner would be BE-stopped by its own open print and TP2 would be unreachable.
  const k = resolvePhasedExit({ ...base, candle: { high: 103.2, low: 99.9 }, tp1Taken: false, entryBar: true })
  check('k. entry-bar TP1: partial only', k.portions.length, 1)
  check('k. runner survives', k.remainingFraction, 0.5)
  // l. Entry bar that hits SL still closes fully (SL ≠ BE triviality)
  const l = resolvePhasedExit({ ...base, candle: { high: 100.5, low: 98.4 }, tp1Taken: false, entryBar: true })
  check('l. entry-bar SL: full close', l.portions[0].reason, 'sl')
  check('l. r = -1', l.portions[0].r, -1)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
