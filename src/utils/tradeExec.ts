/**
 * Pure trade-execution math — single source of truth for how the backtest resolves a trade
 * against a candle and computes P&L. Extracted from the backtest engines so it can be unit-tested
 * against hand-computed values (no network, no account needed).
 *
 * These functions encode the SAME rules both engines use and that mirror live MEXC behavior:
 *  - SL/TP/liquidation detection from a candle's high/low
 *  - SL fires before liquidation when it's tighter (price crosses SL first)
 *  - pessimistic same-bar SL+TP = loss
 *  - P&L = positionSize * move%  ;  fee = positionSize * rate% * 2 sides
 */

export type Direction = 'buy' | 'sell'

export type ExitDecision = {
  closed: boolean
  reason: 'tp' | 'sl' | 'liquidated' | 'open'
  exitPrice: number
}

/**
 * Decide whether a trade closes on a given candle, and at what price.
 * Mirrors the exit logic in simulatePaperBacktest / simulateBacktest exactly.
 */
export function resolveExit(params: {
  direction: Direction
  sl: number
  tp1: number
  liqPrice: number          // 0 = no liquidation (leverage <= 1)
  candle: { high: number; low: number }
  pessimisticSameBar: boolean
}): ExitDecision {
  const { direction, sl, tp1, liqPrice, candle, pessimisticSameBar } = params
  const isBull = direction === 'buy'
  const { high, low } = candle

  const liqHit = liqPrice > 0 && (isBull ? low <= liqPrice : high >= liqPrice)
  const slHit  = isBull ? low <= sl : high >= sl
  const tpHit  = isBull ? high >= tp1 : low <= tp1

  // SL is tighter than liq, so price crosses SL first. Only liquidate if SL wasn't also hit
  // this bar (true gap past SL, or SL set beyond liq).
  const slBeforeLiq = slHit && (isBull ? sl >= liqPrice : sl <= liqPrice)

  if (liqHit && !slBeforeLiq) return { closed: true, reason: 'liquidated', exitPrice: liqPrice }
  if (slHit && tpHit) {
    // Pessimistic: assume the worse (SL) happened first within the bar.
    if (pessimisticSameBar) return { closed: true, reason: 'sl', exitPrice: sl }
    return { closed: true, reason: 'sl', exitPrice: sl } // engines also default to SL-first here
  }
  if (slHit) return { closed: true, reason: 'sl', exitPrice: sl }
  if (tpHit) return { closed: true, reason: 'tp', exitPrice: tp1 }
  return { closed: false, reason: 'open', exitPrice: 0 }
}

export type PhasedPortion = {
  fraction: number   // share of the original position closed by this portion (0..1)
  price: number      // level price (un-slipped — caller applies fill slippage)
  reason: 'tp1' | 'tp2' | 'sl' | 'be' | 'liquidated'
  r: number          // fraction-weighted, level-based R contribution
}

export type PhasedExitDecision = {
  portions: PhasedPortion[]   // closed on this candle (possibly empty)
  remainingFraction: number   // still open after this candle
  tp1Taken: boolean
}

/**
 * Multi-phase exit: (1 − runnerFraction) closes at TP1 and the stop moves to breakeven
 * (entry); the runner targets TP2 with the BE stop. Pessimistic same-bar ordering:
 *  - phase 1, SL+TP1 same bar → full SL (no partial granted)
 *  - TP1 bar that also touches entry afterwards-unknowable → runner stopped at BE same bar;
 *    TP2 is never granted on the TP1 bar (optimistic mode grants TP2 before BE instead)
 *  - phase 2, BE+TP2 same bar → BE (loss side first)
 * tp2 ≤ 0 or runnerFraction ≤ 0 degrades to the legacy all-out-at-TP1 model.
 */
export function resolvePhasedExit(params: {
  direction: Direction
  entry: number
  sl: number
  tp1: number
  tp2: number
  liqPrice: number
  candle: { high: number; low: number }
  pessimisticSameBar: boolean
  tp1Taken: boolean
  runnerFraction: number
  /**
   * True when this candle is the trade's ENTRY bar. Entries fill at the bar's open, so
   * low ≤ open ≤ entry holds BY CONSTRUCTION (mirrored for shorts) — the "BE touch" is the
   * bar's own open print, which happened before TP1 and before any BE stop existed. Without
   * this flag every entry-bar TP1 would stop its runner at BE, making TP2 unreachable for
   * the most common TP1 timing.
   */
  entryBar?: boolean
}): PhasedExitDecision {
  const { direction, entry, sl, tp1, tp2, liqPrice, candle, pessimisticSameBar, tp1Taken, entryBar } = params
  const isBull = direction === 'buy'
  const rf = Math.min(Math.max(params.runnerFraction, 0), 1)
  const risk = Math.max(Math.abs(entry - sl), 1e-8)
  const rAt = (price: number) => (isBull ? price - entry : entry - price) / risk

  if (!tp1Taken) {
    const d = resolveExit({ direction, sl, tp1, liqPrice, candle, pessimisticSameBar })
    if (!d.closed) return { portions: [], remainingFraction: 1, tp1Taken: false }
    if (d.reason === 'sl' || d.reason === 'liquidated') {
      return {
        portions: [{ fraction: 1, price: d.exitPrice, reason: d.reason, r: rAt(d.exitPrice) }],
        remainingFraction: 0,
        tp1Taken: false,
      }
    }
    // TP1 touched, SL not.
    if (!(tp2 > 0) || rf <= 0) {
      return { portions: [{ fraction: 1, price: tp1, reason: 'tp1', r: rAt(tp1) }], remainingFraction: 0, tp1Taken: true }
    }
    const portions: PhasedPortion[] = [{ fraction: 1 - rf, price: tp1, reason: 'tp1', r: (1 - rf) * rAt(tp1) }]
    const tp2Hit = isBull ? candle.high >= tp2 : candle.low <= tp2
    // On the entry bar the open IS the entry price, so a "BE touch" is trivially true and
    // meaningless — skip it; the BE stop genuinely arms from the next bar.
    const beHit  = !entryBar && (isBull ? candle.low <= entry : candle.high >= entry)
    if (pessimisticSameBar) {
      if (beHit) {
        portions.push({ fraction: rf, price: entry, reason: 'be', r: 0 })
        return { portions, remainingFraction: 0, tp1Taken: true }
      }
    } else if (tp2Hit) {
      portions.push({ fraction: rf, price: tp2, reason: 'tp2', r: rf * rAt(tp2) })
      return { portions, remainingFraction: 0, tp1Taken: true }
    } else if (beHit) {
      portions.push({ fraction: rf, price: entry, reason: 'be', r: 0 })
      return { portions, remainingFraction: 0, tp1Taken: true }
    }
    return { portions, remainingFraction: rf, tp1Taken: true }
  }

  // Phase 2: runner — stop at breakeven (entry), target TP2.
  const d = resolveExit({ direction, sl: entry, tp1: tp2, liqPrice, candle, pessimisticSameBar })
  if (!d.closed) return { portions: [], remainingFraction: rf, tp1Taken: true }
  const reason: PhasedPortion['reason'] = d.reason === 'tp' ? 'tp2' : d.reason === 'sl' ? 'be' : 'liquidated'
  return {
    portions: [{ fraction: rf, price: d.exitPrice, reason, r: rf * rAt(d.exitPrice) }],
    remainingFraction: 0,
    tp1Taken: true,
  }
}

/** Gross P&L in USDT: notional position size * directional move %. */
export function grossPnl(direction: Direction, entry: number, exitPrice: number, positionSize: number): number {
  const e = Math.max(entry, 1e-8)
  const movePct = direction === 'buy' ? (exitPrice - entry) / e : (entry - exitPrice) / e
  return positionSize * movePct
}

/** Round-trip fee in USDT: charged on notional, both sides (open + close). */
export function roundTripFee(positionSize: number, feeRatePct: number): number {
  return positionSize * (feeRatePct / 100) * 2
}

/** Net P&L after fees. A trade is a "win" iff this is > 0. */
export function netPnl(direction: Direction, entry: number, exitPrice: number, positionSize: number, feeRatePct: number): number {
  return grossPnl(direction, entry, exitPrice, positionSize) - roundTripFee(positionSize, feeRatePct)
}

/**
 * Isolated-margin liquidation price for a given fill and leverage.
 * Mirrors the engines' formula: entry * (1 ∓ 1/leverage ± maintenanceRate).
 */
export function isolatedLiqPrice(direction: Direction, fillPrice: number, leverage: number, maintenanceRate: number): number {
  if (leverage <= 1) return 0
  const p = direction === 'buy'
    ? fillPrice * (1 - 1 / leverage + maintenanceRate)
    : fillPrice * (1 + 1 / leverage - maintenanceRate)
  return Math.max(0, p)
}

/**
 * Cross-margin liquidation price: the position is backed by the FULL account equity,
 * so liquidation is where equity + unrealized PnL = maintenance margin.
 * Solving  equity + (P − E)·q = mmr·q·P  with q = notional/E (long; mirrored short):
 *   long:  P = E · (1 − equity/notional) / (1 − mmr)
 *   short: P = E · (1 + equity/notional) / (1 + mmr)
 * equity ≥ notional on a long ⇒ non-positive solution ⇒ 0 (cannot be liquidated).
 */
export function crossLiqPrice(direction: Direction, fillPrice: number, equity: number, notional: number, maintenanceRate: number): number {
  if (!(notional > 0) || !(fillPrice > 0) || !(equity > 0)) return 0
  const ratio = equity / notional
  const p = direction === 'buy'
    ? fillPrice * (1 - ratio) / (1 - maintenanceRate)
    : fillPrice * (1 + ratio) / (1 + maintenanceRate)
  return Math.max(0, p)
}
