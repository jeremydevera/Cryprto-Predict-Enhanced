export type PatternResult = {
  pattern: string
  direction: 'buy' | 'sell'
  confidence: number  // 0–100
  keyLevel: number
  notes: string
}

function fmt(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return p.toFixed(2)
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toFixed(2)
  const s = p.toFixed(20)
  const dec = s.split('.')[1] ?? ''
  let z = 0
  for (const c of dec) { if (c !== '0') break; z++ }
  return p.toFixed(z + 4)
}

function pctDiff(a: number, b: number): number {
  const base = Math.max(Math.abs(a), Math.abs(b))
  return base > 0 ? Math.abs(a - b) / base * 100 : 0
}

// Absolute-indexed swing highs within [start, end) of the highs array
function findSwingHighs(highs: number[], start: number, end: number, win = 3): Array<{ idx: number; price: number }> {
  const out: Array<{ idx: number; price: number }> = []
  for (let i = start + win; i < end - win; i++) {
    let ok = true
    for (let j = i - win; j <= i + win; j++) {
      if (j !== i && (highs[j] ?? 0) >= highs[i]) { ok = false; break }
    }
    if (ok) out.push({ idx: i, price: highs[i] })
  }
  return out
}

// Absolute-indexed swing lows within [start, end) of the lows array
function findSwingLows(lows: number[], start: number, end: number, win = 3): Array<{ idx: number; price: number }> {
  const out: Array<{ idx: number; price: number }> = []
  for (let i = start + win; i < end - win; i++) {
    let ok = true
    for (let j = i - win; j <= i + win; j++) {
      if (j !== i && (lows[j] ?? Infinity) <= lows[i]) { ok = false; break }
    }
    if (ok) out.push({ idx: i, price: lows[i] })
  }
  return out
}

// ── Pattern 1: Double Top / Double Bottom ────────────────────────────────────
export function detectDoubleTopBottom(
  highs: number[], lows: number[], closes: number[], lookback = 80
): PatternResult | null {
  const n = closes.length
  if (n < 30) return null

  const end   = n - 2                       // exclude last 2 bars so pattern can complete
  const start = Math.max(0, end - lookback)
  const current = closes[n - 1]

  // Double Top
  const sh = findSwingHighs(highs, start, end, 3)
  if (sh.length >= 2) {
    const t1 = sh[sh.length - 2]
    const t2 = sh[sh.length - 1]
    if (pctDiff(t1.price, t2.price) <= 2.0 && t2.idx > t1.idx + 3) {
      const between = lows.slice(t1.idx + 1, t2.idx)
      if (between.length >= 2) {
        const neckline = Math.min(...between)
        const maxTop   = Math.max(t1.price, t2.price)
        const retrace  = pctDiff(maxTop, neckline)
        if (retrace >= 3 && retrace <= 30 && current <= neckline * 1.005) {
          const topDiff = pctDiff(t1.price, t2.price)
          return {
            pattern: 'Double Top',
            direction: 'sell',
            confidence: Math.min(90, Math.round(55 + (2 - topDiff) * 12 + Math.min(retrace - 3, 5) * 2)),
            keyLevel: neckline,
            notes: `Double Top: peaks near ${fmt(t1.price)}, neckline break at ${fmt(neckline)}`
          }
        }
      }
    }
  }

  // Double Bottom
  const sl = findSwingLows(lows, start, end, 3)
  if (sl.length >= 2) {
    const b1 = sl[sl.length - 2]
    const b2 = sl[sl.length - 1]
    if (pctDiff(b1.price, b2.price) <= 2.0 && b2.idx > b1.idx + 3) {
      const between = highs.slice(b1.idx + 1, b2.idx)
      if (between.length >= 2) {
        const neckline = Math.max(...between)
        const minBot   = Math.min(b1.price, b2.price)
        const bounce   = pctDiff(neckline, minBot)
        if (bounce >= 3 && bounce <= 30 && current >= neckline * 0.995) {
          const botDiff = pctDiff(b1.price, b2.price)
          return {
            pattern: 'Double Bottom',
            direction: 'buy',
            confidence: Math.min(90, Math.round(55 + (2 - botDiff) * 12 + Math.min(bounce - 3, 5) * 2)),
            keyLevel: neckline,
            notes: `Double Bottom: troughs near ${fmt(b1.price)}, neckline break at ${fmt(neckline)}`
          }
        }
      }
    }
  }

  return null
}

// ── Pattern 2: Head & Shoulders / Inverse H&S ───────────────────────────────
export function detectHeadAndShoulders(
  highs: number[], lows: number[], closes: number[], lookback = 100
): PatternResult | null {
  const n = closes.length
  if (n < 40) return null

  const end   = n - 2
  const start = Math.max(0, end - lookback)
  const current = closes[n - 1]

  // Head & Shoulders (bearish)
  const sh = findSwingHighs(highs, start, end, 3)
  if (sh.length >= 3) {
    const ls   = sh[sh.length - 3]
    const head = sh[sh.length - 2]
    const rs   = sh[sh.length - 1]

    if (
      head.price > ls.price && head.price > rs.price &&
      rs.idx > head.idx + 2 && head.idx > ls.idx + 2
    ) {
      const shoulderDiff = pctDiff(ls.price, rs.price)
      if (shoulderDiff <= 4) {
        const t1 = lows.slice(ls.idx + 1, head.idx)
        const t2 = lows.slice(head.idx + 1, rs.idx)
        if (t1.length >= 1 && t2.length >= 1) {
          const neckline  = (Math.min(...t1) + Math.min(...t2)) / 2
          const headAbove = pctDiff(head.price, neckline)
          if (headAbove >= 3 && current <= neckline * 1.01) {
            return {
              pattern: 'Head & Shoulders',
              direction: 'sell',
              confidence: Math.min(90, Math.round(60 + (4 - shoulderDiff) * 5 + Math.min(headAbove - 3, 5) * 2)),
              keyLevel: neckline,
              notes: `H&S: head at ${fmt(head.price)}, neckline break at ${fmt(neckline)}`
            }
          }
        }
      }
    }
  }

  // Inverse Head & Shoulders (bullish)
  const sl = findSwingLows(lows, start, end, 3)
  if (sl.length >= 3) {
    const ls   = sl[sl.length - 3]
    const head = sl[sl.length - 2]
    const rs   = sl[sl.length - 1]

    if (
      head.price < ls.price && head.price < rs.price &&
      rs.idx > head.idx + 2 && head.idx > ls.idx + 2
    ) {
      const shoulderDiff = pctDiff(ls.price, rs.price)
      if (shoulderDiff <= 4) {
        const p1 = highs.slice(ls.idx + 1, head.idx)
        const p2 = highs.slice(head.idx + 1, rs.idx)
        if (p1.length >= 1 && p2.length >= 1) {
          const neckline  = (Math.max(...p1) + Math.max(...p2)) / 2
          const headBelow = pctDiff(neckline, head.price)
          if (headBelow >= 3 && current >= neckline * 0.99) {
            return {
              pattern: 'Inv. Head & Shoulders',
              direction: 'buy',
              confidence: Math.min(90, Math.round(60 + (4 - shoulderDiff) * 5 + Math.min(headBelow - 3, 5) * 2)),
              keyLevel: neckline,
              notes: `Inv. H&S: head at ${fmt(head.price)}, neckline break at ${fmt(neckline)}`
            }
          }
        }
      }
    }
  }

  return null
}

// ── Pattern 3: Ascending / Descending Triangle ───────────────────────────────
export function detectTriangle(
  highs: number[], lows: number[], closes: number[], lookback = 60
): PatternResult | null {
  const n = closes.length
  if (n < 20) return null

  const end   = n - 1
  const start = Math.max(0, end - lookback)
  const current = closes[n - 1]

  const sh = findSwingHighs(highs, start, end, 3)
  const sl = findSwingLows(lows,   start, end, 3)
  if (sh.length < 2 || sl.length < 2) return null

  const h1 = sh[sh.length - 2]
  const h2 = sh[sh.length - 1]
  const l1 = sl[sl.length - 2]
  const l2 = sl[sl.length - 1]

  const highsDiff    = pctDiff(h1.price, h2.price)
  const lowsDiff     = pctDiff(l1.price, l2.price)
  const highsFalling = h2.price < h1.price
  const lowsRising   = l2.price > l1.price
  const highsFlat    = highsDiff < 0.8
  const lowsFlat     = lowsDiff  < 0.8

  // Ascending Triangle: flat resistance + rising lows
  if (highsFlat && lowsRising && lowsDiff >= 0.5) {
    const resistance = (h1.price + h2.price) / 2
    if (current >= resistance * 0.997) {
      return {
        pattern: 'Ascending Triangle',
        direction: 'buy',
        confidence: 68,
        keyLevel: resistance,
        notes: `Ascending Triangle: resistance at ${fmt(resistance)}, rising lows confirm bullish breakout`
      }
    }
  }

  // Descending Triangle: falling highs + flat support
  if (highsFalling && lowsFlat && highsDiff >= 0.5) {
    const support = (l1.price + l2.price) / 2
    if (current <= support * 1.003) {
      return {
        pattern: 'Descending Triangle',
        direction: 'sell',
        confidence: 68,
        keyLevel: support,
        notes: `Descending Triangle: support at ${fmt(support)}, lower highs confirm bearish breakdown`
      }
    }
  }

  return null
}

// ── Run all detectors — return highest-confidence hit ────────────────────────
export function detectChartPatterns(
  highs: number[], lows: number[], closes: number[]
): PatternResult | null {
  const candidates: PatternResult[] = []

  const dt = detectDoubleTopBottom(highs, lows, closes)
  if (dt) candidates.push(dt)

  const hs = detectHeadAndShoulders(highs, lows, closes)
  if (hs) candidates.push(hs)

  const tri = detectTriangle(highs, lows, closes)
  if (tri) candidates.push(tri)

  if (candidates.length === 0) return null
  return candidates.reduce((best, r) => r.confidence > best.confidence ? r : best)
}
