// Shared indicator functions for the backend scanner (ported from src/utils/ohlcv.ts)

export type OhlcvBar = { time: number; open: number; high: number; low: number; close: number; volume: number }

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { sma.push(null); continue }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  return sma
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = []
  const k = 2 / (period + 1)
  let lastEma: number | null = null
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { ema.push(null); continue }
    if (i === period - 1) {
      lastEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      ema.push(lastEma); continue
    }
    lastEma = data[i] * k + (lastEma ?? 0) * (1 - k)
    ema.push(lastEma)
  }
  return ema
}

export function calculateRSI(data: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = []
  let gains = 0, losses = 0
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { rsi.push(null); continue }
    const diff = data[i] - data[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    if (i <= period) {
      gains += gain; losses += loss
      if (i === period) {
        const rs = losses === 0 ? 100 : (gains / period) / (losses / period)
        rsi.push(100 - 100 / (1 + rs))
      } else rsi.push(null)
    } else {
      const ag = (gains * (period - 1) + gain) / period
      const al = (losses * (period - 1) + loss) / period
      gains = ag; losses = al
      rsi.push(100 - 100 / (1 + (al === 0 ? 100 : ag / al)))
    }
  }
  return rsi
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): (number | null)[] {
  const tr = [highs[0] - lows[0]]
  for (let i = 1; i < highs.length; i++)
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])))
  const atr: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) { sum += tr[i]; atr.push(null); continue }
    if (i === period - 1) { sum += tr[i]; atr.push(sum / period); continue }
    atr.push((atr[i-1]! * (period - 1) + tr[i]) / period)
  }
  return atr
}

/**
 * TTM Squeeze Momentum (John Carter). MUST stay byte-for-byte identical to the frontend
 * `calculateSqueezeMomentum` in src/utils/ohlcv.ts so live and backtest agree.
 *
 * `squeezeOn[i]` is true when Bollinger Bands sit INSIDE the Keltner Channel (volatility
 * compressing). The squeeze "fires" the bar it flips back to false. `momentum[i]` is the
 * linear-regression value of a de-trended price series — sign gives direction, slope confirms.
 */
export function calculateSqueezeMomentum(
  highs: number[],
  lows: number[],
  closes: number[],
  opts: { bbLen?: number; bbStd?: number; kcLen?: number; kcMult?: number; momLen?: number } = {},
): { squeezeOn: (boolean | null)[]; momentum: (number | null)[] } {
  const n = closes.length
  const bbLen = Math.max(2, Math.floor(opts.bbLen ?? 20))
  const bbStd = Math.max(0.1, opts.bbStd ?? 2.0)
  const kcLen = Math.max(2, Math.floor(opts.kcLen ?? 20))
  const kcMult = Math.max(0.1, opts.kcMult ?? 1.5)
  const momLen = Math.max(2, Math.floor(opts.momLen ?? 20))

  const bb = calculateBollingerBands(closes, bbLen, bbStd)
  const kcBasis = calculateSMA(closes, kcLen)
  const atr = calculateATR(highs, lows, closes, kcLen)

  const squeezeOn: (boolean | null)[] = new Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    const bu = bb.upper[i], bl = bb.lower[i], kb = kcBasis[i], a = atr[i]
    if (bu == null || bl == null || kb == null || a == null || !Number.isFinite(a)) continue
    const ku = kb + kcMult * a
    const kl = kb - kcMult * a
    squeezeOn[i] = bu < ku && bl > kl
  }

  const smaMom = calculateSMA(closes, momLen)
  const source: (number | null)[] = new Array(n).fill(null)
  for (let i = momLen - 1; i < n; i++) {
    const sm = smaMom[i]
    if (sm == null) continue
    let hh = -Infinity, ll = Infinity
    for (let j = i - momLen + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j]
      if (lows[j] < ll) ll = lows[j]
    }
    source[i] = closes[i] - ((hh + ll) / 2 + sm) / 2
  }

  const momentum: (number | null)[] = new Array(n).fill(null)
  for (let i = momLen - 1; i < n; i++) {
    let count = 0, sx = 0, sy = 0, sxx = 0, sxy = 0
    for (let k = 0; k < momLen; k++) {
      const v = source[i - momLen + 1 + k]
      if (v == null) { count = 0; break }
      sx += k; sy += v; sxx += k * k; sxy += k * v; count++
    }
    if (count < momLen) continue
    const denom = momLen * sxx - sx * sx
    if (denom === 0) { momentum[i] = source[i] ?? null; continue }
    const slope = (momLen * sxy - sx * sy) / denom
    const intercept = (sy - slope * sx) / momLen
    momentum[i] = intercept + slope * (momLen - 1)
  }

  return { squeezeOn, momentum }
}

export function kernelRegressionOneSided(
  values: number[],
  lookback: number,
  bandwidth: number,
): (number | null)[] {
  const n = values.length
  const out: (number | null)[] = new Array(n).fill(null)
  const lb = Math.max(2, Math.floor(lookback))
  const bw = Math.max(0.5, bandwidth)
  const denomScale = 2 * bw * bw
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - lb + 1)
    let wSum = 0
    let vSum = 0
    for (let j = start; j <= i; j++) {
      const d = i - j
      const w = Math.exp(-(d * d) / denomScale)
      wSum += w
      vSum += w * values[j]
    }
    out[i] = wSum > 0 ? vSum / wSum : values[i]
  }
  return out
}

export function calculateSupertrend(params: {
  highs: number[]
  lows: number[]
  closes: number[]
  atrPeriod: number
  multiplier: number
  useKernel?: boolean
  kernelLookback?: number
  kernelBandwidth?: number
}): {
  direction: ('bull' | 'bear' | null)[]
  supertrend: (number | null)[]
  finalUpper: (number | null)[]
  finalLower: (number | null)[]
} {
  const { highs, lows, closes } = params
  const n = closes.length
  const atrPeriod = Math.max(2, Math.floor(params.atrPeriod))
  const multiplier = Math.max(0.1, params.multiplier)

  const atr = calculateATR(highs, lows, closes, atrPeriod)
  const hl2 = closes.map((_, i) => (highs[i] + lows[i]) / 2)
  const src = params.useKernel
    ? kernelRegressionOneSided(hl2, params.kernelLookback ?? 20, params.kernelBandwidth ?? 6)
    : hl2.map((v) => v as number | null)

  const finalUpper: (number | null)[] = new Array(n).fill(null)
  const finalLower: (number | null)[] = new Array(n).fill(null)
  const supertrend: (number | null)[] = new Array(n).fill(null)
  const direction: ('bull' | 'bear' | null)[] = new Array(n).fill(null)

  for (let i = 0; i < n; i++) {
    const a = atr[i]
    const s = src[i]
    if (a === null || s === null || !Number.isFinite(a) || !Number.isFinite(s)) continue

    const basicUpper = s + multiplier * a
    const basicLower = s - multiplier * a

    if (i === 0) {
      finalUpper[i] = basicUpper
      finalLower[i] = basicLower
      direction[i] = closes[i] >= s ? 'bull' : 'bear'
      supertrend[i] = direction[i] === 'bull' ? finalLower[i] : finalUpper[i]
      continue
    }

    const prevFU = finalUpper[i - 1]
    const prevFL = finalLower[i - 1]
    const prevClose = closes[i - 1]

    finalUpper[i] =
      prevFU === null || basicUpper < prevFU || prevClose > prevFU ? basicUpper : prevFU
    finalLower[i] =
      prevFL === null || basicLower > prevFL || prevClose < prevFL ? basicLower : prevFL

    const prevDir = direction[i - 1]
    const fu = finalUpper[i]
    const fl = finalLower[i]
    if (fu === null || fl === null) continue

    if (prevDir === null) {
      direction[i] = closes[i] >= s ? 'bull' : 'bear'
    } else if (prevDir === 'bear' && closes[i] > fu) {
      direction[i] = 'bull'
    } else if (prevDir === 'bull' && closes[i] < fl) {
      direction[i] = 'bear'
    } else {
      direction[i] = prevDir
    }

    supertrend[i] = direction[i] === 'bull' ? fl : fu
  }

  return { direction, supertrend, finalUpper, finalLower }
}

export function calculateBollingerBands(data: number[], period = 20, stdDev = 2) {
  const middle = calculateSMA(data, period)
  const upper: (number | null)[] = [], lower: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = data.slice(i - period + 1, i + 1)
    const avg = middle[i]!
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - avg) ** 2, 0) / period)
    upper.push(avg + stdDev * sd); lower.push(avg - stdDev * sd)
  }
  return { upper, middle, lower }
}

export function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, dPeriod = 3, smoothK = 3) {
  const n = closes.length
  const rawK: (number | null)[] = new Array(n).fill(null)
  for (let i = kPeriod - 1; i < n; i++) {
    const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1))
    const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1))
    rawK[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100
  }
  const firstK = rawK.findIndex(v => v !== null)
  const kSmoothed = calculateSMA(rawK.filter((v): v is number => v !== null), smoothK)
  const k: (number | null)[] = new Array(n).fill(null)
  kSmoothed.forEach((v, i) => { k[firstK + i] = v })
  const firstD = k.findIndex(v => v !== null)
  const dRaw = calculateSMA(k.filter((v): v is number => v !== null), dPeriod)
  const d: (number | null)[] = new Array(n).fill(null)
  dRaw.forEach((v, i) => { d[firstD + i] = v })
  return { k, d }
}

export function calculateIchimoku(
  highs: number[],
  lows: number[],
): {
  tenkan: (number | null)[]
  kijun: (number | null)[]
  spanA: (number | null)[]
  spanB: (number | null)[]
} {
  const n = highs.length
  const tenkan: (number | null)[] = new Array(n).fill(null)
  const kijun: (number | null)[] = new Array(n).fill(null)
  const spanA: (number | null)[] = new Array(n).fill(null)
  const spanB: (number | null)[] = new Array(n).fill(null)

  for (let i = 0; i < n; i += 1) {
    if (i >= 9 - 1) {
      const hh = Math.max(...highs.slice(i - 9 + 1, i + 1))
      const ll = Math.min(...lows.slice(i - 9 + 1, i + 1))
      tenkan[i] = (hh + ll) / 2
    }
    if (i >= 26 - 1) {
      const hh = Math.max(...highs.slice(i - 26 + 1, i + 1))
      const ll = Math.min(...lows.slice(i - 26 + 1, i + 1))
      kijun[i] = (hh + ll) / 2
    }
    if (tenkan[i] !== null && kijun[i] !== null) {
      spanA[i] = (tenkan[i]! + kijun[i]!) / 2
    }
    if (i >= 52 - 1) {
      const hh = Math.max(...highs.slice(i - 52 + 1, i + 1))
      const ll = Math.min(...lows.slice(i - 52 + 1, i + 1))
      spanB[i] = (hh + ll) / 2
    }
  }

  return { tenkan, kijun, spanA, spanB }
}

export type AMDSession = 'asian' | 'london' | 'ny' | 'closed'
export function detectAMDSession(timestampSec: number): AMDSession {
  const h = Math.floor((timestampSec % 86400) / 3600)
  if (h < 8) return 'asian'
  if (h < 13) return 'london'
  if (h < 21) return 'ny'
  return 'closed'
}

export function isKillZone(timestampSec: number): boolean {
  const m = Math.floor((timestampSec % 86400) / 60)
  return (m >= 480 && m < 600) || (m >= 780 && m < 960)
}

export type OrderBlock = { type: 'bull'|'bear'; open: number; close: number; high: number; low: number; index: number }
export function detectOrderBlocks(opens: number[], highs: number[], lows: number[], closes: number[], lookback = 40): { bullOB: OrderBlock|null; bearOB: OrderBlock|null } {
  const n = closes.length
  if (n < 10) return { bullOB: null, bearOB: null }
  const start = Math.max(0, n - lookback)
  const sH = highs.slice(start, n - 1), sL = lows.slice(start, n - 1)
  const swHIdx = start + sH.indexOf(Math.max(...sH))
  const swLIdx = start + sL.indexOf(Math.min(...sL))
  let bullOB: OrderBlock|null = null, bearOB: OrderBlock|null = null
  if (closes[n-1] > highs[swHIdx] && swHIdx > start)
    for (let i = swHIdx - 1; i >= start; i--)
      if (closes[i] < opens[i]) { bullOB = { type: 'bull', open: opens[i], close: closes[i], high: highs[i], low: lows[i], index: i }; break }
  if (closes[n-1] < lows[swLIdx] && swLIdx > start)
    for (let i = swLIdx - 1; i >= start; i--)
      if (closes[i] > opens[i]) { bearOB = { type: 'bear', open: opens[i], close: closes[i], high: highs[i], low: lows[i], index: i }; break }
  return { bullOB, bearOB }
}

export type FVGZone = { type: 'bull'|'bear'; top: number; bottom: number; midpoint: number; index: number }
export function detectFVGZones(highs: number[], lows: number[], lookback = 60): FVGZone[] {
  const n = highs.length, zones: FVGZone[] = []
  for (let i = Math.max(1, n - lookback); i < n - 1; i++) {
    if (highs[i-1] < lows[i+1]) zones.push({ type: 'bull', bottom: highs[i-1], top: lows[i+1], midpoint: (highs[i-1] + lows[i+1]) / 2, index: i })
    if (lows[i-1] > highs[i+1]) zones.push({ type: 'bear', top: lows[i-1], bottom: highs[i+1], midpoint: (lows[i-1] + highs[i+1]) / 2, index: i })
  }
  return zones
}

export type SupplyDemandZone = {
  type: 'demand' | 'supply'
  top: number
  bottom: number
  midpoint: number
  baseStart: number
  baseEnd: number
  legStrengthAtr: number
  retests: number
}

export function detectSupplyDemandZones(
  opens: number[], highs: number[], lows: number[], closes: number[],
  atr: number, lookback = 80, minLegAtrMult = 2.0, maxBaseBars = 3,
): SupplyDemandZone[] {
  const n = closes.length
  if (n < 10 || !Number.isFinite(atr) || atr <= 0) return []
  const zones: SupplyDemandZone[] = []
  const start = Math.max(2, n - lookback)
  for (let i = start; i < n - 2; i++) {
    const baseLen = Math.min(maxBaseBars, i - start)
    for (let bl = 1; bl <= baseLen; bl++) {
      const baseStart = i - bl + 1
      const baseEnd = i
      const baseHigh = Math.max(...highs.slice(baseStart, baseEnd + 1))
      const baseLow = Math.min(...lows.slice(baseStart, baseEnd + 1))
      const baseRange = baseHigh - baseLow
      if (baseRange > atr * 1.4) continue
      const legIdx = baseEnd + 1
      if (legIdx >= n) continue
      const legBody = Math.abs(closes[legIdx] - opens[legIdx])
      if (legBody < atr * minLegAtrMult) continue
      const isBullLeg = closes[legIdx] > opens[legIdx] && closes[legIdx] > baseHigh
      const isBearLeg = closes[legIdx] < opens[legIdx] && closes[legIdx] < baseLow
      if (isBullLeg) {
        let retests = 0
        for (let j = legIdx + 1; j < n; j++) {
          if (lows[j] <= baseHigh + atr * 0.2 && lows[j] >= baseLow - atr * 0.2) retests++
          if (closes[j] < baseLow - atr * 0.5) { retests = 99; break }
        }
        zones.push({ type: 'demand', top: baseHigh, bottom: baseLow, midpoint: (baseHigh + baseLow) / 2, baseStart, baseEnd, legStrengthAtr: legBody / atr, retests })
        break
      }
      if (isBearLeg) {
        let retests = 0
        for (let j = legIdx + 1; j < n; j++) {
          if (highs[j] >= baseLow - atr * 0.2 && highs[j] <= baseHigh + atr * 0.2) retests++
          if (closes[j] > baseHigh + atr * 0.5) { retests = 99; break }
        }
        zones.push({ type: 'supply', top: baseHigh, bottom: baseLow, midpoint: (baseHigh + baseLow) / 2, baseStart, baseEnd, legStrengthAtr: legBody / atr, retests })
        break
      }
    }
  }
  return zones.sort((a, b) => b.baseEnd - a.baseEnd)
}

export function detectFractals(highs: number[], lows: number[], left = 2, right = 2) {
  const n = highs.length
  const fractalHighs: (number|null)[] = new Array(n).fill(null)
  const fractalLows: (number|null)[] = new Array(n).fill(null)
  for (let i = left; i < n - right; i++) {
    let isH = true, isL = true
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue
      if (highs[j] >= highs[i]) isH = false
      if (lows[j] <= lows[i]) isL = false
    }
    if (isH) fractalHighs[i] = highs[i]
    if (isL) fractalLows[i] = lows[i]
  }
  return { fractalHighs, fractalLows }
}

export function detectCRTExpansion(highs: number[], lows: number[], closes: number[], opens: number[]) {
  const n = closes.length
  if (n < 4) return { bullCRT: false, bearCRT: false }
  const wStart = Math.max(0, n - 12), wEnd = n - 2
  let total = 0, cnt = 0
  for (let i = wStart; i < wEnd; i++) { total += highs[i] - lows[i]; cnt++ }
  const avg = cnt > 0 ? total / cnt : 0
  const setupRange = highs[n-2] - lows[n-2]
  const isConsolidation = avg > 0 && setupRange < avg * 0.65
  return {
    bullCRT: isConsolidation && closes[n-1] > highs[n-2] && closes[n-1] > opens[n-1],
    bearCRT: isConsolidation && closes[n-1] < lows[n-2]  && closes[n-1] < opens[n-1],
  }
}

export function detectLiquiditySweep(highs: number[], lows: number[], closes: number[], opens: number[], lookback = 25) {
  const n = closes.length
  if (n < lookback + 2) return { bullSweep: false, bearSweep: false }
  const start = n - lookback - 1
  const rL = lows.slice(start, n - 1), rH = highs.slice(start, n - 1)
  const minL = Math.min(...rL), maxH = Math.max(...rH)
  const eqL = rL.filter(l => l > 0 && Math.abs(l - minL) / minL < 0.003).length
  const eqH = rH.filter(h => h > 0 && Math.abs(h - maxH) / maxH < 0.003).length
  return {
    bullSweep: eqL >= 2 && lows[n-1]  < minL  && closes[n-1] > minL  && closes[n-1] > opens[n-1],
    bearSweep: eqH >= 2 && highs[n-1] > maxH && closes[n-1] < maxH && closes[n-1] < opens[n-1],
  }
}

export function detectSwingRSIDivergence(closes: number[], rsiValues: (number|null)[], lookback = 40, minSwingBars = 5) {
  const n = closes.length
  if (n < lookback) return { bullDiv: false, bearDiv: false }
  const start = Math.max(2, n - lookback)
  let prevLP = Infinity, prevLR = 50, prevLI = -1
  for (let i = start; i < n - 2; i++) {
    if (closes[i] < closes[i-1] && closes[i] < closes[i-2] && closes[i] < closes[i+1] && closes[i] < closes[i+2]) {
      const r = typeof rsiValues[i] === 'number' ? (rsiValues[i] as number) : 50
      if (prevLI >= 0 && i - prevLI >= minSwingBars && closes[i] < prevLP && r > prevLR) return { bullDiv: true, bearDiv: false }
      if (prevLI < 0 || closes[i] < prevLP) { prevLP = closes[i]; prevLR = r; prevLI = i }
    }
  }
  let prevHP = 0, prevHR = 50, prevHI = -1
  for (let i = start; i < n - 2; i++) {
    if (closes[i] > closes[i-1] && closes[i] > closes[i-2] && closes[i] > closes[i+1] && closes[i] > closes[i+2]) {
      const r = typeof rsiValues[i] === 'number' ? (rsiValues[i] as number) : 50
      if (prevHI >= 0 && i - prevHI >= minSwingBars && closes[i] > prevHP && r < prevHR) return { bullDiv: false, bearDiv: true }
      if (prevHI < 0 || closes[i] > prevHP) { prevHP = closes[i]; prevHR = r; prevHI = i }
    }
  }
  return { bullDiv: false, bearDiv: false }
}

export function calculateMACD(data: number[], fast = 12, slow = 26, signal = 9): { macd: (number|null)[]; signal: (number|null)[]; histogram: (number|null)[] } {
  const fastEma = calculateEMA(data, fast)
  const slowEma = calculateEMA(data, slow)
  const macd: (number|null)[] = data.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? fastEma[i]! - slowEma[i]! : null)
  const firstIdx = macd.findIndex(v => v !== null)
  const signalRaw = calculateEMA(macd.filter((v): v is number => v !== null), signal)
  const signalLine: (number|null)[] = new Array(data.length).fill(null)
  signalRaw.forEach((v, i) => { signalLine[firstIdx + i] = v })
  const histogram: (number|null)[] = macd.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i]! : null)
  return { macd, signal: signalLine, histogram }
}

export function calculateADX(highs: number[], lows: number[], closes: number[], period = 14): (number|null)[] {
  const n = highs.length
  const plusDM: number[] = [0], minusDM: number[] = [0]
  for (let i = 1; i < n; i++) {
    const up = highs[i] - highs[i-1], down = lows[i-1] - lows[i]
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
  }
  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < n; i++)
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])))
  const sTR = new Array(n).fill(0), sP = new Array(n).fill(0), sM = new Array(n).fill(0)
  let trs = 0, ps = 0, ms = 0
  for (let i = 0; i < period; i++) { trs += tr[i]; ps += plusDM[i]; ms += minusDM[i] }
  sTR[period-1] = trs; sP[period-1] = ps; sM[period-1] = ms
  for (let i = period; i < n; i++) {
    sTR[i] = sTR[i-1] - sTR[i-1]/period + tr[i]
    sP[i]  = sP[i-1]  - sP[i-1]/period  + plusDM[i]
    sM[i]  = sM[i-1]  - sM[i-1]/period  + minusDM[i]
  }
  const dx = new Array(n).fill(0)
  for (let i = period-1; i < n; i++) {
    const dp = (sP[i]/sTR[i])*100, dm = (sM[i]/sTR[i])*100
    dx[i] = Math.abs(dp-dm)/(dp+dm)*100
  }
  const adx: (number|null)[] = new Array(n).fill(null)
  let dxs = 0
  for (let i = period-1; i < period*2-1; i++) dxs += dx[i]
  adx[period*2-2] = dxs/period
  for (let i = period*2-1; i < n; i++) adx[i] = (adx[i-1]! * (period-1) + dx[i]) / period
  return adx
}

export function calculateDI(highs: number[], lows: number[], closes: number[], period = 14): { plus: (number|null)[]; minus: (number|null)[] } {
  const n = highs.length
  const p = Math.max(2, Math.floor(period))
  const plusDM: number[] = [0], minusDM: number[] = [0]
  for (let i = 1; i < n; i++) {
    const up = highs[i] - highs[i-1], down = lows[i-1] - lows[i]
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
  }
  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < n; i++)
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])))
  const sTR = new Array(n).fill(0), sP = new Array(n).fill(0), sM = new Array(n).fill(0)
  let trs = 0, ps = 0, ms = 0
  const initEnd = Math.min(p, n)
  for (let i = 0; i < initEnd; i++) { trs += tr[i]; ps += plusDM[i]; ms += minusDM[i] }
  if (initEnd === p) {
    sTR[p-1] = trs; sP[p-1] = ps; sM[p-1] = ms
    for (let i = p; i < n; i++) {
      sTR[i] = sTR[i-1] - sTR[i-1]/p + tr[i]
      sP[i]  = sP[i-1]  - sP[i-1]/p  + plusDM[i]
      sM[i]  = sM[i-1]  - sM[i-1]/p  + minusDM[i]
    }
  }
  const plus: (number|null)[] = new Array(n).fill(null)
  const minus: (number|null)[] = new Array(n).fill(null)
  for (let i = p-1; i < n; i++) {
    const denom = sTR[i]
    if (!(denom > 0) || !Number.isFinite(denom)) continue
    const dp = (sP[i]/denom)*100
    const dm = (sM[i]/denom)*100
    plus[i] = Number.isFinite(dp) ? dp : null
    minus[i] = Number.isFinite(dm) ? dm : null
  }
  return { plus, minus }
}

export function calculateFibonacciRetracement(params: { highs: number[]; lows: number[]; closes: number[]; lookback?: number }): { direction: 'up'|'down'; high: number; low: number; levels: { ratio: number; price: number }[] } | null {
  const lookback = Math.max(20, params.lookback ?? 120)
  const n = params.closes.length
  if (n < 5) return null
  const start = Math.max(0, n - lookback)
  const highs = params.highs.slice(start), lows = params.lows.slice(start)
  const high = Math.max(...highs), low = Math.min(...lows)
  const range = high - low
  if (!Number.isFinite(range) || range <= 0) return null
  const idxHigh = highs.lastIndexOf(high), idxLow = lows.lastIndexOf(low)
  const direction: 'up'|'down' = idxHigh > idxLow ? 'up' : 'down'
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
  const levels = ratios.map(r => ({ ratio: r, price: direction === 'up' ? high - range*r : low + range*r }))
  return { direction, high, low, levels }
}

export type PatternResult = { pattern: string; direction: 'buy'|'sell'; confidence: number; keyLevel: number; notes: string }

function pctDiff(a: number, b: number): number {
  const base = Math.max(Math.abs(a), Math.abs(b))
  return base > 0 ? Math.abs(a-b)/base*100 : 0
}
function findSwingHighs(highs: number[], start: number, end: number, win = 3): Array<{idx:number;price:number}> {
  const out: Array<{idx:number;price:number}> = []
  for (let i = start+win; i < end-win; i++) {
    let ok = true
    for (let j = i-win; j <= i+win; j++) { if (j !== i && (highs[j]??0) >= highs[i]) { ok=false; break } }
    if (ok) out.push({ idx: i, price: highs[i] })
  }
  return out
}
function findSwingLows(lows: number[], start: number, end: number, win = 3): Array<{idx:number;price:number}> {
  const out: Array<{idx:number;price:number}> = []
  for (let i = start+win; i < end-win; i++) {
    let ok = true
    for (let j = i-win; j <= i+win; j++) { if (j !== i && (lows[j]??Infinity) <= lows[i]) { ok=false; break } }
    if (ok) out.push({ idx: i, price: lows[i] })
  }
  return out
}
export function detectChartPatterns(highs: number[], lows: number[], closes: number[]): PatternResult | null {
  const n = closes.length
  if (n < 30) return null
  const end = n-2, start = Math.max(0, end-100), current = closes[n-1]
  const candidates: PatternResult[] = []
  // Double Top / Bottom
  const sh80 = findSwingHighs(highs, Math.max(0,end-80), end, 3)
  const sl80 = findSwingLows(lows,   Math.max(0,end-80), end, 3)
  if (sh80.length >= 2) {
    const t1 = sh80[sh80.length-2], t2 = sh80[sh80.length-1]
    if (pctDiff(t1.price,t2.price) <= 2.0 && t2.idx > t1.idx+3) {
      const between = lows.slice(t1.idx+1, t2.idx)
      if (between.length >= 2) {
        const neckline = Math.min(...between), maxTop = Math.max(t1.price,t2.price)
        const retrace = pctDiff(maxTop, neckline)
        if (retrace >= 3 && retrace <= 30 && current <= neckline*1.005)
          candidates.push({ pattern:'Double Top', direction:'sell', confidence: Math.min(90,Math.round(55+(2-pctDiff(t1.price,t2.price))*12+Math.min(retrace-3,5)*2)), keyLevel:neckline, notes:'' })
      }
    }
  }
  if (sl80.length >= 2) {
    const b1 = sl80[sl80.length-2], b2 = sl80[sl80.length-1]
    if (pctDiff(b1.price,b2.price) <= 2.0 && b2.idx > b1.idx+3) {
      const between = highs.slice(b1.idx+1, b2.idx)
      if (between.length >= 2) {
        const neckline = Math.max(...between), minBot = Math.min(b1.price,b2.price)
        const bounce = pctDiff(neckline, minBot)
        if (bounce >= 3 && bounce <= 30 && current >= neckline*0.995)
          candidates.push({ pattern:'Double Bottom', direction:'buy', confidence: Math.min(90,Math.round(55+(2-pctDiff(b1.price,b2.price))*12+Math.min(bounce-3,5)*2)), keyLevel:neckline, notes:'' })
      }
    }
  }
  // H&S
  const sh100 = findSwingHighs(highs, start, end, 3), sl100 = findSwingLows(lows, start, end, 3)
  if (sh100.length >= 3) {
    const ls=sh100[sh100.length-3], head=sh100[sh100.length-2], rs=sh100[sh100.length-1]
    if (head.price>ls.price && head.price>rs.price && rs.idx>head.idx+2 && head.idx>ls.idx+2) {
      const sd = pctDiff(ls.price,rs.price)
      if (sd <= 4) {
        const t1=lows.slice(ls.idx+1,head.idx), t2=lows.slice(head.idx+1,rs.idx)
        if (t1.length>=1 && t2.length>=1) {
          const neckline=(Math.min(...t1)+Math.min(...t2))/2, ha=pctDiff(head.price,neckline)
          if (ha>=3 && current<=neckline*1.01)
            candidates.push({ pattern:'Head & Shoulders', direction:'sell', confidence:Math.min(90,Math.round(60+(4-sd)*5+Math.min(ha-3,5)*2)), keyLevel:neckline, notes:'' })
        }
      }
    }
  }
  if (sl100.length >= 3) {
    const ls=sl100[sl100.length-3], head=sl100[sl100.length-2], rs=sl100[sl100.length-1]
    if (head.price<ls.price && head.price<rs.price && rs.idx>head.idx+2 && head.idx>ls.idx+2) {
      const sd = pctDiff(ls.price,rs.price)
      if (sd <= 4) {
        const p1=highs.slice(ls.idx+1,head.idx), p2=highs.slice(head.idx+1,rs.idx)
        if (p1.length>=1 && p2.length>=1) {
          const neckline=(Math.max(...p1)+Math.max(...p2))/2, hb=pctDiff(neckline,head.price)
          if (hb>=3 && current>=neckline*0.99)
            candidates.push({ pattern:'Inv. Head & Shoulders', direction:'buy', confidence:Math.min(90,Math.round(60+(4-sd)*5+Math.min(hb-3,5)*2)), keyLevel:neckline, notes:'' })
        }
      }
    }
  }
  // Triangle
  const shT = findSwingHighs(highs, Math.max(0,end-60), end, 3), slT = findSwingLows(lows, Math.max(0,end-60), end, 3)
  if (shT.length>=2 && slT.length>=2) {
    const h1=shT[shT.length-2], h2=shT[shT.length-1], l1=slT[slT.length-2], l2=slT[slT.length-1]
    if (pctDiff(h1.price,h2.price)<0.8 && l2.price>l1.price && pctDiff(l1.price,l2.price)>=0.5) {
      const resistance=(h1.price+h2.price)/2
      if (current>=resistance*0.997) candidates.push({ pattern:'Ascending Triangle', direction:'buy', confidence:68, keyLevel:resistance, notes:'' })
    }
    if (h2.price<h1.price && pctDiff(h1.price,h2.price)>=0.5 && pctDiff(l1.price,l2.price)<0.8) {
      const support=(l1.price+l2.price)/2
      if (current<=support*1.003) candidates.push({ pattern:'Descending Triangle', direction:'sell', confidence:68, keyLevel:support, notes:'' })
    }
  }
  if (candidates.length === 0) return null
  return candidates.reduce((best, r) => r.confidence > best.confidence ? r : best)
}

export function detectAsianRangeSweep(candles: OhlcvBar[]) {
  if (candles.length < 20) return { londonSweptLow: false, londonSweptHigh: false }
  let asianHigh = 0, asianLow = Infinity, londonHigh = 0, londonLow = Infinity
  let foundAsian = false, foundLondon = false
  for (let i = Math.max(0, candles.length - 50); i < candles.length; i++) {
    const s = detectAMDSession(candles[i].time)
    if (s === 'asian') { if (candles[i].high > asianHigh) asianHigh = candles[i].high; if (candles[i].low < asianLow) asianLow = candles[i].low; foundAsian = true }
    if (s === 'london') { if (candles[i].high > londonHigh) londonHigh = candles[i].high; if (candles[i].low < londonLow) londonLow = candles[i].low; foundLondon = true }
  }
  if (!foundAsian || !foundLondon || asianLow >= asianHigh) return { londonSweptLow: false, londonSweptHigh: false }
  return { londonSweptLow: londonLow < asianLow, londonSweptHigh: londonHigh > asianHigh }
}

export type FluxGateDualEngineOutput = {
  scoreNow: number
  scorePrev: number
  longThresholdNow: number
  longThresholdPrev: number
  shortThresholdNow: number
  shortThresholdPrev: number
  longCross: boolean
  shortCross: boolean
}

export function computeFluxGateDualEngine(params: {
  opens?: number[]
  highs?: number[]
  lows?: number[]
  closes: number[]
  baseLenLong?: number
  baseLenShort?: number
  volLen?: number
  persLen?: number
  curvLen?: number
  guideEmaLen?: number
  thresholdKLong?: number
  thresholdKShort?: number
  dirScale?: number
  weights?: { dir: number; pers: number; curv: number }
}): FluxGateDualEngineOutput | null {
  const closes = params.closes
  const n = closes.length
  if (!Array.isArray(closes) || n < 60) return null

  const baseLenLong = params.baseLenLong ?? 50
  const baseLenShort = params.baseLenShort ?? 65
  const volLen = params.volLen ?? 20
  const persLen = params.persLen ?? 8
  const curvLen = params.curvLen ?? 14
  const guideEmaLen = params.guideEmaLen ?? 20
  const kLong = params.thresholdKLong ?? 0.7
  const kShort = params.thresholdKShort ?? 0.7
  const dirScale = params.dirScale ?? 2.0
  const w = params.weights ?? { dir: 0.45, pers: 0.35, curv: 0.2 }

  const opens = params.opens
  const highs = params.highs
  const lows = params.lows

  const eps = 1e-12
  const typical = (() => {
    if (highs && lows && opens && highs.length === n && lows.length === n) {
      const out = new Array(n)
      for (let i = 0; i < n; i++) out[i] = (Number(highs[i] ?? 0) + Number(lows[i] ?? 0) + Number(closes[i] ?? 0)) / 3
      return out
    }
    return closes.map((c) => Number(c ?? 0))
  })()

  const emaGuide = (() => {
    const k = 2 / (guideEmaLen + 1)
    const out = new Array(n).fill(0)
    let last = typical.slice(0, guideEmaLen).reduce((a, b) => a + b, 0) / guideEmaLen
    for (let i = 0; i < n; i++) {
      if (i < guideEmaLen - 1) {
        out[i] = typical[i]
        continue
      }
      if (i === guideEmaLen - 1) {
        out[i] = last
        continue
      }
      last = typical[i] * k + last * (1 - k)
      out[i] = last
    }
    return out
  })()

  const returns = new Array(n).fill(0)
  for (let i = 1; i < n; i++) {
    const prev = closes[i - 1]
    const cur = closes[i]
    returns[i] = prev > 0 && cur > 0 ? Math.log(cur / prev) : 0
  }

  const stdevAt = (endIdx: number, len: number): number => {
    const start = endIdx - len + 1
    if (start < 1) return 0
    let sum = 0
    for (let i = start; i <= endIdx; i++) sum += returns[i]
    const mean = sum / len
    let v = 0
    for (let i = start; i <= endIdx; i++) {
      const d = returns[i] - mean
      v += d * d
    }
    return Math.sqrt(v / len)
  }

  const meanStdAt = (series: number[], endIdx: number, len: number): { mean: number; sd: number } => {
    const start = endIdx - len + 1
    if (start < 0) return { mean: 0, sd: 0 }
    let sum = 0
    for (let i = start; i <= endIdx; i++) sum += series[i]
    const mean = sum / len
    let v = 0
    for (let i = start; i <= endIdx; i++) {
      const d = series[i] - mean
      v += d * d
    }
    return { mean, sd: Math.sqrt(v / Math.max(1, len - 1)) }
  }

  const linregLast = (endIdx: number, len: number): number => {
    const start = endIdx - len + 1
    if (start < 0) return typical[endIdx] ?? closes[endIdx]
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0
    for (let i = 0; i < len; i++) {
      const x = i + 1
      const y = typical[start + i]
      sumX += x
      sumY += y
      sumXX += x * x
      sumXY += x * y
    }
    const denom = len * sumXX - sumX * sumX
    if (Math.abs(denom) < eps) return typical[endIdx]
    const slope = (len * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / len
    return intercept + slope * len
  }

  const score = new Array(n).fill(0)
  for (let i = 2; i < n; i++) {
    const vol = stdevAt(i, volLen)
    const slope = emaGuide[i] - emaGuide[i - 1]
    const dir = Math.tanh((slope / (vol + eps)) * dirScale)
    let pers = 0
    const ps = Math.max(1, i - persLen + 1)
    for (let j = ps; j <= i; j++) {
      const d = closes[j] - closes[j - 1]
      pers += d > 0 ? 1 : d < 0 ? -1 : 0
    }
    pers = pers / Math.min(persLen, i)
    const fitNow = linregLast(i, curvLen)
    const fitPrev = linregLast(i - 1, curvLen)
    const fitPrev2 = linregLast(i - 2, curvLen)
    const curv = (fitNow - 2 * fitPrev + fitPrev2) / (vol + eps)
    score[i] = w.dir * dir + w.pers * pers + w.curv * Math.tanh(curv)
  }

  const lastIdx = n - 1
  const prevIdx = n - 2
  if (prevIdx < Math.max(baseLenLong, baseLenShort) || prevIdx < 10) return null

  const longNow = meanStdAt(score, lastIdx, baseLenLong)
  const longPrev = meanStdAt(score, prevIdx, baseLenLong)
  const shortNow = meanStdAt(score, lastIdx, baseLenShort)
  const shortPrev = meanStdAt(score, prevIdx, baseLenShort)

  const longThresholdNow = longNow.mean + kLong * (longNow.sd || 0)
  const longThresholdPrev = longPrev.mean + kLong * (longPrev.sd || 0)
  const shortThresholdNow = shortNow.mean - kShort * (shortNow.sd || 0)
  const shortThresholdPrev = shortPrev.mean - kShort * (shortPrev.sd || 0)

  const scoreNow = score[lastIdx]
  const scorePrev = score[prevIdx]

  return {
    scoreNow,
    scorePrev,
    longThresholdNow,
    longThresholdPrev,
    shortThresholdNow,
    shortThresholdPrev,
    longCross: scorePrev <= longThresholdPrev && scoreNow > longThresholdNow,
    shortCross: scorePrev >= shortThresholdPrev && scoreNow < shortThresholdNow,
  }
}
