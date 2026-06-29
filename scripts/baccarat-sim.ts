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

// ════════════════════════════════════════════════════════════════════════
//  GOAL MODE — "which system best reaches $2,000,000?"
//  Run:  npx tsx scripts/baccarat-sim.ts --goal=2000000 --start=1000 --unit=10
//  Play until you hit the goal (success) or go broke (bust). Measures the
//  PROBABILITY of reaching the target — a risk-of-ruin-vs-goal question.
// ════════════════════════════════════════════════════════════════════════

/**
 * stake function for goal mode: receives live bankroll + remaining-to-goal
 * (both in units) and returns the stake in units.
 */
type GoalStake = (bankroll: number, toGoal: number) => number

interface GoalStrategy {
  name: string
  stake: GoalStake
  next?: (won: boolean) => void
  reset?: () => void
}

function goalStrategies(): GoalStrategy[] {
  // Bold play: bet everything you have, but never overshoot the goal.
  // Dubins & Savage proved this MAXIMIZES P(reach target) in a subfair game.
  const bold: GoalStrategy = {
    name: 'Bold (all-in)',
    stake: (bank, toGoal) => Math.min(bank, toGoal),
  }

  // Proportional bold: bet a fixed fraction of bankroll (less wild than all-in).
  const proportional = (frac: number): GoalStrategy => ({
    name: `Bold ${Math.round(frac * 100)}%`,
    stake: (bank, toGoal) => Math.min(Math.max(bank * frac, 1), bank, toGoal),
  })

  const flatG: GoalStrategy = {
    name: 'Flat',
    stake: (bank, toGoal) => Math.min(1, bank, toGoal),
  }

  const seqG = (name: string, seq: number[]): GoalStrategy => {
    let step = 0
    return {
      name,
      stake: (bank, toGoal) => Math.min(seq[step], bank, toGoal),
      next: (won) => {
        step = won ? (step + 1) % seq.length : 0
      },
      reset: () => {
        step = 0
      },
    }
  }

  const martG: GoalStrategy = (() => {
    let losses = 0
    return {
      name: 'Martingale',
      stake: (bank, toGoal) => Math.min(1 << losses, bank, toGoal),
      next: (won: boolean) => {
        losses = won ? 0 : losses + 1
      },
      reset: () => {
        losses = 0
      },
    }
  })()

  return [flatG, seqG('1-3-2-4', [1, 3, 2, 4]), seqG('1-3-2-6', [1, 3, 2, 6]), martG, proportional(0.5), bold]
}

function playToGoal(
  strat: GoalStrategy,
  rng: () => number,
  startUnits: number,
  goalUnits: number,
  maxHands: number,
): { success: boolean; hands: number } {
  strat.reset?.()
  let bankroll = startUnits
  for (let h = 0; h < maxHands; h++) {
    const toGoal = goalUnits - bankroll
    let stake = strat.stake(bankroll, toGoal)
    if (stake < 1) stake = Math.min(1, bankroll) // floor of 1 unit while solvent
    if (stake <= 0 || bankroll <= 0) return { success: false, hands: h }
    const outcome = drawOutcome(rng)
    if (outcome === 'tie') continue
    const won = outcome === 'banker'
    if (won) bankroll += stake * BANKER_PAYOUT
    else bankroll -= stake
    strat.next?.(won)
    if (bankroll >= goalUnits) return { success: true, hands: h + 1 }
    if (bankroll <= 0) return { success: false, hands: h + 1 }
  }
  return { success: false, hands: maxHands } // ran out of patience (treated as fail)
}

function runGoal() {
  const goalDollars = arg('goal', 2_000_000)
  const startDollars = arg('start', 1000)
  const goalUnits = goalDollars / UNIT
  const startUnits = startDollars / UNIT
  const maxHands = arg('maxhands', 500_000)
  const sessions = arg('sessions', 200_000)

  console.log('═'.repeat(74))
  console.log('  BACCARAT GOAL SEEK — probability of reaching a target')
  console.log('═'.repeat(74))
  console.log(
    `  Start: $${startDollars.toLocaleString()}   Goal: $${goalDollars.toLocaleString()}` +
      `  (${(goalDollars / startDollars).toFixed(0)}× your money)`,
  )
  console.log(
    `  Unit: $${UNIT}   Sessions: ${sessions.toLocaleString()}   Bet: Banker (5% comm.)`,
  )
  console.log('─'.repeat(74))
  console.log('  Strategy        ReachedGoal     OddsAs        AvgHandsToFinish')
  console.log('─'.repeat(74))

  for (const strat of goalStrategies()) {
    const rng = makeRng(0xc0ffee)
    let wins = 0
    let handSum = 0
    for (let s = 0; s < sessions; s++) {
      const r = playToGoal(strat, rng, startUnits, goalUnits, maxHands)
      if (r.success) wins++
      handSum += r.hands
    }
    const p = wins / sessions
    const odds = p > 0 ? `1 in ${Math.round(1 / p).toLocaleString()}` : 'never seen'
    console.log(
      '  ' +
        strat.name.padEnd(15) +
        (p * 100).toFixed(4).padStart(9) +
        '%' +
        odds.padStart(16) +
        Math.round(handSum / sessions).toLocaleString().padStart(16),
    )
  }

  console.log('─'.repeat(74))
  console.log('  ReachedGoal = % of runs that hit the target before going broke')
  console.log('═'.repeat(74))
  console.log(
    '\n  ANSWER — best system to reach $2,000,000:\n' +
      '  BOLD PLAY (bet big, few hands). This is Dubins & Savage\'s theorem: in a\n' +
      '  game with a house edge, the MORE you spread risk over many small bets, the\n' +
      '  more certainly the edge grinds you to zero. To chase a far target your only\n' +
      '  real hope is FEW, LARGE bets — give the edge fewer chances to act on you.\n\n' +
      '  Flat & the slow progressions reach $2M essentially NEVER: millions of hands\n' +
      '  means the 1.06% edge is mathematically certain to bust you first.\n\n' +
      '  Reality check: even Bold play\'s odds are tiny — and "best" here only means\n' +
      "  least-bad. There is NO system with a positive expectation. $2M from $1k by\n" +
      '  baccarat is a lottery ticket, not a strategy.',
  )
}

// ════════════════════════════════════════════════════════════════════════
//  GRIND MODE — "small bets, play every day, try to grow steadily"
//  Run:  npx tsx scripts/baccarat-sim.ts --days=365 --start=20000 --unit=25
//  Each day = one session of small bets; bankroll carries to the next day.
//  Shows what happens to the SAME players over a month / quarter / year.
// ════════════════════════════════════════════════════════════════════════
function runGrind() {
  const days = arg('days', 365)
  const startDollars = arg('start', 20000)
  const handsPerDay = arg('hands', 50)
  const players = arg('sessions', 50000)
  const startUnits = startDollars / UNIT

  const milestones = [30, 90, 180, days].filter((d, i, a) => d <= days && a.indexOf(d) === i)

  console.log('═'.repeat(74))
  console.log('  BACCARAT DAILY GRIND — small flat bets, every day, bankroll carries over')
  console.log('═'.repeat(74))
  console.log(
    `  Start: $${startDollars.toLocaleString()}   Unit: $${UNIT} (${(
      (UNIT / startDollars) *
      100
    ).toFixed(2)}% of bankroll)   Hands/day: ${handsPerDay}`,
  )
  console.log(`  Players simulated: ${players.toLocaleString()}   Strategy: Flat Banker`)
  console.log('─'.repeat(74))
  console.log('  After…       MedianBankroll   StillUp%   Down>20%   Wiped out')
  console.log('─'.repeat(74))

  // Snapshot every player's bankroll at each milestone.
  const snapshots: Record<number, number[]> = {}
  for (const m of milestones) snapshots[m] = []

  const strat = flat()
  for (let p = 0; p < players; p++) {
    const rng = makeRng((0xc0ffee + p * 2654435761) >>> 0) // distinct stream per player
    let bankroll = startUnits
    let day = 0
    for (const m of milestones) {
      while (day < m && bankroll > 0) {
        const res = playSession(strat, rng, handsPerDay, bankroll)
        bankroll = res.endBankroll
        day++
      }
      snapshots[m].push(bankroll)
    }
  }

  for (const m of milestones) {
    const ends = snapshots[m].slice().sort((a, b) => a - b)
    const median = ends[Math.floor(ends.length / 2)] * UNIT
    const up = ends.filter((b) => b > startUnits).length / ends.length
    const downBad = ends.filter((b) => b < startUnits * 0.8).length / ends.length
    const wiped = ends.filter((b) => b <= 0).length / ends.length
    const label = m === days ? `${m}d (goal)` : `${m} days`
    console.log(
      '  ' +
        label.padEnd(13) +
        ('$' + Math.round(median).toLocaleString()).padStart(13) +
        ((up * 100).toFixed(1) + '%').padStart(11) +
        ((downBad * 100).toFixed(1) + '%').padStart(11) +
        ((wiped * 100).toFixed(1) + '%').padStart(12),
    )
  }

  console.log('─'.repeat(74))
  console.log('  StillUp% = players whose bankroll is above where they started')
  console.log('  Down>20% = players who have lost more than a fifth of their money')
  console.log('═'.repeat(74))
  console.log(
    '\n  THE HARD TRUTH about "small bets, never lose, grow every day":\n' +
      '  It is mathematically impossible in baccarat. Small bets = MORE hands, and\n' +
      '  every hand pays the house its ~1.06% edge. The more you play, the more\n' +
      '  certain you are to be DOWN — watch StillUp% fall as the days add up.\n\n' +
      '  "Progress every day" requires a positive expectation. Baccarat has a\n' +
      '  NEGATIVE one. No bet size, no progression, no streak-reading changes that.\n' +
      '  The only days you reliably grow money are days you do NOT play.\n\n' +
      '  If your real goal is to grow $20k steadily, that is an INVESTING question,\n' +
      "  not a gambling one — and it's exactly what this repo's tooling is built for.",
  )
}

// Mode select: --days = daily grind, --goal = reach a target, else session backtest.
if (process.argv.some((a) => a.startsWith('--days='))) {
  runGrind()
} else if (process.argv.some((a) => a.startsWith('--goal='))) {
  runGoal()
} else {
  run()
}
