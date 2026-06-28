/**
 * Baccarat betting-strategy backtester.
 *
 * Monte-Carlo simulation that pits FLAT betting against positive-progression
 * systems (Paroli, 1-3-2-6, 1-3-2-4) using mathematically correct 8-deck
 * baccarat outcome probabilities. Always bets BANKER (lowest house edge), which
 * pays 0.95:1 due to the standard 5% commission. Ties push (stake returned).
 *
 * Deterministic: uses a seeded RNG so runs are reproducible. No network.
 *
 * Run:  npx tsx scripts/baccarat-sim.ts
 *       npx tsx scripts/baccarat-sim.ts --sessions=20000 --hands=70 --unit=10 --bankroll=300
 *
 * The point it proves: progressions don't beat the ~1.06% banker edge on
 * expected value — over enough hands every system bleeds at the same rate.
 * What they DO change is the *shape* of outcomes: variance, how often you
 * leave a session ahead, and how often you bust. That's the real tradeoff.
 */

// ── 8-deck baccarat outcome probabilities (exact, well-established) ──
const P_BANKER = 0.458597
const P_PLAYER = 0.446247
const P_TIE = 0.095156 // P_BANKER + P_PLAYER + P_TIE ≈ 1
const BANKER_PAYOUT = 0.95 // 1:1 minus 5% commission on a win

type Outcome = 'banker' | 'player' | 'tie'

// ── Seeded RNG (mulberry32) so the whole report is reproducible ──
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawOutcome(rng: () => number): Outcome {
  const r = rng()
  if (r < P_BANKER) return 'banker'
  if (r < P_BANKER + P_PLAYER) return 'player'
  return 'tie'
}

// ── Strategy: given the bet # in a streak, returns the stake in units. ──
// next() is called after each settled (non-tie) hand to advance/reset state.
interface Strategy {
  name: string
  stakeUnits(): number
  /** advance after a settled hand. `won` = banker bet won. */
  next(won: boolean): void
  reset(): void
}

function flat(): Strategy {
  return {
    name: 'Flat',
    stakeUnits: () => 1,
    next: () => {},
    reset: () => {},
  }
}

/**
 * Paroli: bet base, let winnings ride. After `cap` consecutive wins, bank the
 * profit and restart. Any loss restarts immediately.
 */
function paroli(cap = 3): Strategy {
  let wins = 0
  return {
    name: `Paroli(stop@${cap})`,
    stakeUnits: () => 1 << wins, // 1, 2, 4, ...
    next: (won) => {
      if (won) {
        wins++
        if (wins >= cap) wins = 0
      } else {
        wins = 0
      }
    },
    reset: () => {
      wins = 0
    },
  }
}

/** Sequence progression (e.g. 1-3-2-6): advance on a win, restart on a loss
 *  and after the sequence completes. */
function sequence(name: string, seq: number[]): Strategy {
  let step = 0
  return {
    name,
    stakeUnits: () => seq[step],
    next: (won) => {
      if (won) {
        step++
        if (step >= seq.length) step = 0 // completed run → bank & restart
      } else {
        step = 0
      }
    },
    reset: () => {
      step = 0
    },
  }
}

/**
 * Martingale (NEGATIVE progression — shown only as a cautionary contrast):
 * double the bet after every loss to recover, reset to base after a win.
 * This is the system that detonates during a loss streak.
 */
function martingale(): Strategy {
  let losses = 0
  return {
    name: 'Martingale',
    stakeUnits: () => 1 << losses, // 1, 2, 4, 8, 16, ...
    next: (won) => {
      losses = won ? 0 : losses + 1
    },
    reset: () => {
      losses = 0
    },
  }
}

interface SessionResult {
  endBankroll: number // in units
  peak: number
  busted: boolean
  endedAhead: boolean
  maxDrawdown: number // deepest peak-to-trough drop in the session (units)
  worstLossStreakCost: number // most units lost in a single uninterrupted loss run
}

function playSession(
  strat: Strategy,
  rng: () => number,
  hands: number,
  startBankroll: number,
): SessionResult {
  strat.reset()
  let bankroll = startBankroll
  let peak = startBankroll
  let maxDrawdown = 0
  let curLossCost = 0 // units lost in the current uninterrupted loss run
  let worstLossStreakCost = 0
  for (let h = 0; h < hands; h++) {
    let stake = strat.stakeUnits()
    if (stake > bankroll) stake = bankroll // can't bet more than you have
    if (stake <= 0) break // busted
    const outcome = drawOutcome(rng)
    if (outcome === 'tie') {
      continue // push — stake returned, progression state unchanged
    }
    const won = outcome === 'banker'
    if (won) {
      bankroll += stake * BANKER_PAYOUT
      curLossCost = 0 // streak broken
    } else {
      bankroll -= stake
      curLossCost += stake
      if (curLossCost > worstLossStreakCost) worstLossStreakCost = curLossCost
    }
    strat.next(won)
    if (bankroll > peak) peak = bankroll
    if (peak - bankroll > maxDrawdown) maxDrawdown = peak - bankroll
    if (bankroll <= 0) {
      return {
        endBankroll: 0,
        peak,
        busted: true,
        endedAhead: false,
        maxDrawdown,
        worstLossStreakCost,
      }
    }
  }
  return {
    endBankroll: bankroll,
    peak,
    busted: false,
    endedAhead: bankroll > startBankroll,
    maxDrawdown,
    worstLossStreakCost,
  }
}

// ── CLI args ──
function arg(name: string, def: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (!hit) return def
  const v = Number(hit.split('=')[1])
  return Number.isFinite(v) ? v : def
}

const SESSIONS = arg('sessions', 50000)
const HANDS = arg('hands', 60) // hands per session (≈ one shoe)
const UNIT = arg('unit', 10) // $ per unit
const BANKROLL_UNITS = arg('bankroll', 50) // starting bankroll in units

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}
function money(units: number): string {
  const d = units * UNIT
  return (d >= 0 ? '+$' : '-$') + Math.abs(d).toFixed(0)
}

function run() {
  const strategies: Strategy[] = [
    flat(),
    paroli(3),
    sequence('1-3-2-6', [1, 3, 2, 6]),
    sequence('1-3-2-4', [1, 3, 2, 4]),
    martingale(), // cautionary contrast — what NOT to do in a loss streak
  ]

  console.log('═'.repeat(74))
  console.log('  BACCARAT STRATEGY BACKTEST — Banker bet (5% commission)')
  console.log('═'.repeat(74))
  console.log(
    `  Sessions: ${SESSIONS.toLocaleString()}   Hands/session: ${HANDS}   ` +
      `Unit: $${UNIT}   Bankroll: ${BANKROLL_UNITS}u ($${BANKROLL_UNITS * UNIT})`,
  )
  console.log(
    `  Outcome odds: Banker ${pct(P_BANKER)} · Player ${pct(P_PLAYER)} · Tie ${pct(P_TIE)}`,
  )
  console.log('─'.repeat(74))
  console.log(
    '  Strategy      AvgEnd  EndedAhead  BustRate  AvgDrawdwn  TypicalLossRun  WorstRun',
  )
  console.log('─'.repeat(74))

  for (const strat of strategies) {
    // Fresh RNG per strategy → every strategy sees the SAME shoe sequence.
    const rng = makeRng(0xc0ffee)
    let sumEnd = 0
    let ahead = 0
    let busts = 0
    let worst = Infinity
    let sumDrawdown = 0
    const lossRuns: number[] = []

    for (let s = 0; s < SESSIONS; s++) {
      const res = playSession(strat, rng, HANDS, BANKROLL_UNITS)
      const net = res.endBankroll - BANKROLL_UNITS
      sumEnd += net
      if (res.endedAhead) ahead++
      if (res.busted) busts++
      if (net < worst) worst = net
      sumDrawdown += res.maxDrawdown
      lossRuns.push(res.worstLossStreakCost)
    }

    // 95th-percentile worst loss run = the "bad streak" you should plan for.
    lossRuns.sort((a, b) => a - b)
    const p95LossRun = lossRuns[Math.floor(lossRuns.length * 0.95)]
    const avg = sumEnd / SESSIONS
    const avgDD = sumDrawdown / SESSIONS

    console.log(
      '  ' +
        strat.name.padEnd(13) +
        money(avg).padStart(7) +
        pct(ahead / SESSIONS).padStart(11) +
        pct(busts / SESSIONS).padStart(10) +
        ('-$' + (avgDD * UNIT).toFixed(0)).padStart(12) +
        ('-$' + (p95LossRun * UNIT).toFixed(0)).padStart(16) +
        money(worst).padStart(10),
    )
  }

  console.log('─'.repeat(74))
  console.log('  AvgDrawdwn     = avg deepest peak-to-trough drop within a session')
  console.log('  TypicalLossRun = 95th-pctile $ lost in one uninterrupted loss streak')
  console.log('  WorstRun       = worst single session out of all sessions')
  console.log('═'.repeat(74))
  console.log(
    '\n  ANSWER — minimizing loss-streak damage while still progressing:\n' +
      '  All four positive systems reset to 1 unit after every loss, so a cold\n' +
      '  streak only ever costs you base units — look at their tiny TypicalLossRun.\n' +
      '  Martingale does the opposite: it DOUBLES into the streak (huge loss run +\n' +
      "  bust risk). That's the trap to avoid.\n\n" +
      '  Best balance: 1-3-2-4 (or Paroli). Same loss-streak protection as 1-3-2-6\n' +
      '  but it banks profit one step earlier, so drawdowns are shallower while you\n' +
      '  still ride winning streaks up.',
  )
}

run()
