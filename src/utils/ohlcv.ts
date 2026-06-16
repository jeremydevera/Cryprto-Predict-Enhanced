export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export type OhlcvBar = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const tfSeconds: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
}

const basePrices: Record<string, number> = {
  BTCUSDT: 65000,
  ETHUSDT: 3200,
  SOLUSDT: 160,
  BNBUSDT: 560,
  XRPUSDT: 0.55,
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const hashString = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const lcg = (seed0: number) => {
  let seed = seed0 >>> 0
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function generateSampleOhlcv(params: {
  symbol: string
  timeframe: Timeframe
  bars?: number
  endTimeSec?: number
}): OhlcvBar[] {
  const bars = params.bars ?? 260
  const step = tfSeconds[params.timeframe]
  const endTimeSec =
    params.endTimeSec ?? Math.floor(Date.now() / 1000 / step) * step

  const base = basePrices[params.symbol] ?? 100
  const rnd = lcg(hashString(`${params.symbol}_${params.timeframe}_${endTimeSec}`))

  const volBase = base < 10 ? 800000 : base < 500 ? 200000 : 80000
  const amp = base < 2 ? 0.02 : base < 50 ? 0.012 : base < 5000 ? 0.008 : 0.006

  const out: OhlcvBar[] = []
  let lastClose = base
  let phase = rnd() * Math.PI * 2
  const drift = (rnd() - 0.5) * amp * 0.1
  for (let i = bars - 1; i >= 0; i -= 1) {
    const t = endTimeSec - i * step
    phase += 0.22 + rnd() * 0.08
    const cyc = Math.sin(phase) * amp
    const noise = (rnd() - 0.5) * amp * 0.8
    const ret = drift + cyc + noise

    const open = lastClose
    const close = Math.max(0.0001, open * (1 + ret))
    const spread = Math.abs(ret) * 0.9 + amp * (0.25 + rnd() * 0.2)
    const high = Math.max(open, close) * (1 + spread * (0.25 + rnd() * 0.6))
    const low = Math.min(open, close) * (1 - spread * (0.25 + rnd() * 0.6))

    const volJitter = 0.55 + rnd() * 0.9
    const volShock = 1 + clamp(Math.abs(ret) / amp, 0, 2.5) * 0.45
    const volume = Math.round(volBase * volJitter * volShock)

    out.push({
      time: t,
      open,
      high,
      low,
      close,
      volume,
    })

    lastClose = close
  }
  return out
}

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = []
  for (let i = 0; i < data.length; i += 1) {
    if (i < period - 1) {
      sma.push(null)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }
  return sma
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = []
  const k = 2 / (period + 1)
  let lastEma: number | null = null

  for (let i = 0; i < data.length; i += 1) {
    if (i < period - 1) {
      ema.push(null)
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0)
      lastEma = sum / period
      ema.push(lastEma)
    } else {
      lastEma = data[i] * k + (lastEma ?? 0) * (1 - k)
      ema.push(lastEma)
    }
  }
  return ema
}

export function calculateBollingerBands(
  data: number[],
  period: number,
  stdDev: number,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, period)
  const n = data.length
  const upper: (number | null)[] = new Array(n)
  const lower: (number | null)[] = new Array(n)

  // Rolling sum of squares so std-dev is O(1) per bar instead of O(period).
  let sumSq = 0
  for (let i = 0; i < n; i += 1) {
    const v = data[i]
    sumSq += v * v
    if (i >= period) {
      const drop = data[i - period]
      sumSq -= drop * drop
    }
    if (middle[i] === null) {
      upper[i] = null
      lower[i] = null
      continue
    }
    const avg = middle[i]!
    // variance = E[x^2] - (E[x])^2; clamp to 0 to guard against fp negatives near zero variance
    const variance = Math.max(0, sumSq / period - avg * avg)
    const sd = Math.sqrt(variance)
    upper[i] = avg + stdDev * sd
    lower[i] = avg - stdDev * sd
  }
  return { upper, middle, lower }
}

export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = []
  let gains = 0
  let losses = 0

  for (let i = 0; i < data.length; i += 1) {
    if (i === 0) {
      rsi.push(null)
      continue
    }

    const diff = data[i] - data[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0

    if (i <= period) {
      gains += gain
      losses += loss
      if (i === period) {
        const avgGain = gains / period
        const avgLoss = losses / period
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        rsi.push(100 - 100 / (1 + rs))
      } else {
        rsi.push(null)
      }
    } else {
      const avgGain = (gains * (period - 1) + gain) / period
      const avgLoss = (losses * (period - 1) + loss) / period
      gains = avgGain
      losses = avgLoss
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    }
  }
  return rsi
}

export function calculateMACD(
  data: number[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEma = calculateEMA(data, fast)
  const slowEma = calculateEMA(data, slow)
  const macd: (number | null)[] = []

  for (let i = 0; i < data.length; i += 1) {
    if (fastEma[i] === null || slowEma[i] === null) {
      macd.push(null)
    } else {
      macd.push(fastEma[i]! - slowEma[i]!)
    }
  }

  const macdNonNullable = macd.filter((v): v is number => v !== null)
  const signalLineRaw = calculateEMA(macdNonNullable, signal)
  const signalLine: (number | null)[] = new Array(macd.length).fill(null)
  
  const firstMacdIdx = macd.findIndex(v => v !== null)
  for (let i = 0; i < signalLineRaw.length; i++) {
    signalLine[firstMacdIdx + i] = signalLineRaw[i]
  }

  const histogram: (number | null)[] = macd.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i]! : null,
  )

  return { macd, signal: signalLine, histogram }
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }

  const atr: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      sum += tr[i]
      atr.push(null)
    } else if (i === period - 1) {
      sum += tr[i]
      atr.push(sum / period)
    } else {
      atr.push((atr[i - 1]! * (period - 1) + tr[i]) / period)
    }
  }
  return atr
}

/**
 * TTM Squeeze Momentum (John Carter). Used by the "Squeeze Momentum" strategy.
 *
 * `squeezeOn[i]` is true when the Bollinger Bands have contracted INSIDE the Keltner
 * Channel — i.e. volatility is compressing ("coiling"). A squeeze "releases/fires" the
 * first bar `squeezeOn` flips back to false, which historically precedes an expansion.
 *
 * `momentum[i]` is the linear-regression value (at the latest bar) of a de-trended price
 * series over `momLen` bars. Its sign gives direction (>0 bullish, <0 bearish) and its
 * slope (rising/falling) confirms the move. Both arrays are index-aligned to `closes`.
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

  // De-trended source: close − midpoint of [Donchian-mid(momLen), SMA(close, momLen)].
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

  // momentum[i] = least-squares regression value at the latest bar over the last momLen sources.
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

export function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const n = highs.length
  const plusDM: number[] = [0]
  const minusDM: number[] = [0]
  
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    
    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove)
    } else {
      plusDM.push(0)
    }
    
    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove)
    } else {
      minusDM.push(0)
    }
  }

  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < n; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }

  const smoothTR: number[] = new Array(n).fill(0)
  const smoothPlusDM: number[] = new Array(n).fill(0)
  const smoothMinusDM: number[] = new Array(n).fill(0)
  
  let trSum = 0, plusSum = 0, minusSum = 0
  for (let i = 0; i < period; i++) {
    trSum += tr[i]
    plusSum += plusDM[i]
    minusSum += minusDM[i]
  }
  
  smoothTR[period - 1] = trSum
  smoothPlusDM[period - 1] = plusSum
  smoothMinusDM[period - 1] = minusSum
  
  for (let i = period; i < n; i++) {
    smoothTR[i] = smoothTR[i - 1] - (smoothTR[i - 1] / period) + tr[i]
    smoothPlusDM[i] = smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / period) + plusDM[i]
    smoothMinusDM[i] = smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / period) + minusDM[i]
  }

  const dx: number[] = new Array(n).fill(0)
  for (let i = period - 1; i < n; i++) {
    const diPlus = (smoothPlusDM[i] / smoothTR[i]) * 100
    const diMinus = (smoothMinusDM[i] / smoothTR[i]) * 100
    dx[i] = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100
  }

  const adx: (number | null)[] = new Array(n).fill(null)
  let dxSum = 0
  for (let i = period - 1; i < period * 2 - 1; i++) {
    dxSum += dx[i]
  }
  adx[period * 2 - 2] = dxSum / period
  
  for (let i = period * 2 - 1; i < n; i++) {
    adx[i] = (adx[i - 1]! * (period - 1) + dx[i]) / period
  }

  return adx
}

export function calculateDI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14,
): { plus: (number | null)[]; minus: (number | null)[] } {
  const n = highs.length
  const p = Math.max(2, Math.floor(period))
  const plusDM: number[] = [0]
  const minusDM: number[] = [0]
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1]
    const downMove = lows[i - 1] - lows[i]
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }

  const tr: number[] = [highs[0] - lows[0]]
  for (let i = 1; i < n; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ))
  }

  const smoothTR: number[] = new Array(n).fill(0)
  const smoothPlusDM: number[] = new Array(n).fill(0)
  const smoothMinusDM: number[] = new Array(n).fill(0)
  let trSum = 0, plusSum = 0, minusSum = 0
  const initEnd = Math.min(p, n)
  for (let i = 0; i < initEnd; i++) {
    trSum += tr[i]
    plusSum += plusDM[i]
    minusSum += minusDM[i]
  }
  if (initEnd === p) {
    smoothTR[p - 1] = trSum
    smoothPlusDM[p - 1] = plusSum
    smoothMinusDM[p - 1] = minusSum
    for (let i = p; i < n; i++) {
      smoothTR[i] = smoothTR[i - 1] - (smoothTR[i - 1] / p) + tr[i]
      smoothPlusDM[i] = smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / p) + plusDM[i]
      smoothMinusDM[i] = smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / p) + minusDM[i]
    }
  }

  const plus: (number | null)[] = new Array(n).fill(null)
  const minus: (number | null)[] = new Array(n).fill(null)
  for (let i = p - 1; i < n; i++) {
    const denom = smoothTR[i]
    if (!(denom > 0) || !Number.isFinite(denom)) continue
    const diPlus = (smoothPlusDM[i] / denom) * 100
    const diMinus = (smoothMinusDM[i] / denom) * 100
    plus[i] = Number.isFinite(diPlus) ? diPlus : null
    minus[i] = Number.isFinite(diMinus) ? diMinus : null
  }
  return { plus, minus }
}

export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smoothK: number = 3,
): { k: (number | null)[]; d: (number | null)[] } {
  const n = closes.length
  const rawK: (number | null)[] = new Array(n).fill(null)

  for (let i = 0; i < n; i += 1) {
    if (i < kPeriod - 1) continue
    const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1))
    const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1))
    const denom = hh - ll
    rawK[i] = denom === 0 ? 50 : ((closes[i] - ll) / denom) * 100
  }

  const rawKNonNull = rawK.filter((v): v is number => v !== null)
  const kSmoothedRaw = calculateSMA(rawKNonNull, smoothK)
  const k: (number | null)[] = new Array(n).fill(null)
  const firstKIdx = rawK.findIndex((v) => v !== null)
  for (let i = 0; i < kSmoothedRaw.length; i += 1) {
    k[firstKIdx + i] = kSmoothedRaw[i]
  }

  const kNonNull = k.filter((v): v is number => v !== null)
  const dRaw = calculateSMA(kNonNull, dPeriod)
  const d: (number | null)[] = new Array(n).fill(null)
  const firstDIdx = k.findIndex((v) => v !== null)
  for (let i = 0; i < dRaw.length; i += 1) {
    d[firstDIdx + i] = dRaw[i]
  }

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

export function calculateFibonacciRetracement(params: {
  highs: number[]
  lows: number[]
  closes: number[]
  lookback?: number
}): {
  direction: 'up' | 'down'
  high: number
  low: number
  levels: { ratio: number; price: number }[]
} | null {
  const lookback = Math.max(20, params.lookback ?? 120)
  const n = params.closes.length
  if (n < 5) return null
  const start = Math.max(0, n - lookback)
  const highs = params.highs.slice(start)
  const lows = params.lows.slice(start)

  const high = Math.max(...highs)
  const low = Math.min(...lows)
  const range = high - low
  if (!Number.isFinite(range) || range <= 0) return null

  const idxHigh = highs.lastIndexOf(high)
  const idxLow = lows.lastIndexOf(low)
  const direction: 'up' | 'down' = idxHigh > idxLow ? 'up' : 'down'

  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
  const levels = ratios.map((r) => {
    const price = direction === 'up' ? high - range * r : low + range * r
    return { ratio: r, price }
  })

  return { direction, high, low, levels }
}

export type CandlePattern = 'Doji' | 'Bull' | 'Bear' | 'Eve' | 'Morn' | 'Shoot' | null

export function detectCandlePatterns(candles: OhlcvBar[]): CandlePattern[] {
  return candles.map((c, i) => {
    if (i === 0) return null
    
    const bodySize = Math.abs(c.close - c.open)
    const candleSize = c.high - c.low
    const isBull = c.close > c.open
    const prev = candles[i - 1]
    const prevBodySize = Math.abs(prev.close - prev.open)
    const prevIsBull = prev.close > prev.open

    // Doji: Body is less than 10% of total range
    if (bodySize < candleSize * 0.1) return 'Doji'

    // Engulfing Bull
    if (isBull && !prevIsBull && c.close > prev.open && c.open < prev.close && bodySize > prevBodySize) return 'Bull'

    // Engulfing Bear
    if (!isBull && prevIsBull && c.close < prev.open && c.open > prev.close && bodySize > prevBodySize) return 'Bear'

    // Shooting Star: Small body, long upper wick (at least 2x body), little to no lower wick
    const upperWick = c.high - Math.max(c.open, c.close)
    const lowerWick = Math.min(c.open, c.close) - c.low
    if (upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) return 'Shoot'

    // Morning Star / Evening Star simplified logic (looking for reversals)
    if (i >= 2) {
      const prev2 = candles[i - 2]
      // Morning Star: Large Bear -> Small Body -> Large Bull
      if (prev2.close < prev2.open && prevBodySize < Math.abs(prev2.close - prev2.open) * 0.3 && isBull && c.close > (prev2.open + prev2.close) / 2) return 'Morn'
      // Evening Star: Large Bull -> Small Body -> Large Bear
      if (prev2.close > prev2.open && prevBodySize < Math.abs(prev2.close - prev2.open) * 0.3 && !isBull && c.close < (prev2.open + prev2.close) / 2) return 'Eve'
    }

    return null
  })
}

export type TradeSetup = {
  entry: number
  sl: number
  tp1: number
  tp2?: number
  side: 'long' | 'short'
}

export function calculateTradeSetup(candles: OhlcvBar[], side: 'long' | 'short'): TradeSetup {
  const last = candles[candles.length - 1]
  const atr = calculateATR(candles.map(c => c.high), candles.map(c => c.low), candles.map(c => c.close), 14)
  const lastAtr = atr[atr.length - 1] ?? last.close * 0.02

  if (side === 'long') {
    return {
      side: 'long',
      entry: last.close,
      sl: last.close - lastAtr * 1.5,
      tp1: last.close + lastAtr * 2,
      tp2: last.close + lastAtr * 4
    }
  } else {
    return {
      side: 'short',
      entry: last.close,
      sl: last.close + lastAtr * 1.5,
      tp1: last.close - lastAtr * 2,
      tp2: last.close - lastAtr * 4
    }
  }
}

export type VolumeProfileBucket = {
  price: number
  volume: number
}

export function calculateVolumeProfile(candles: OhlcvBar[], buckets: number = 24): VolumeProfileBucket[] {
  if (candles.length === 0) return []

  const prices = candles.map(c => c.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice
  const bucketSize = range / buckets

  const result: VolumeProfileBucket[] = []
  for (let i = 0; i < buckets; i++) {
    const bucketMin = minPrice + i * bucketSize
    const bucketMax = bucketMin + bucketSize

    const volume = candles
      .filter(c => c.close >= bucketMin && c.close < bucketMax)
      .reduce((sum, c) => sum + c.volume, 0)

    result.push({
      price: (bucketMin + bucketMax) / 2,
      volume
    })
  }

  return result
}

// ── ICT / Fractal AMD helpers ─────────────────────────────────────────────

export type AMDSession = 'asian' | 'london' | 'ny' | 'closed'

export function detectAMDSession(timestampSec: number): AMDSession {
  const secondsInDay = timestampSec % 86400
  const hourUTC = Math.floor(secondsInDay / 3600)
  if (hourUTC < 8) return 'asian'
  if (hourUTC < 13) return 'london'
  if (hourUTC < 21) return 'ny'
  return 'closed'
}

// London Kill Zone: 08:00–10:00 UTC | NY Kill Zone: 13:00–16:00 UTC
// Works best on 15m and 1h timeframes; 4h candles span multiple sessions.
export function isKillZone(timestampSec: number): boolean {
  const minsUTC = Math.floor((timestampSec % 86400) / 60)
  return (minsUTC >= 480 && minsUTC < 600) || (minsUTC >= 780 && minsUTC < 960)
}

export type FractalResult = {
  fractalHighs: (number | null)[]
  fractalLows: (number | null)[]
}

export function detectFractals(highs: number[], lows: number[], left = 2, right = 2): FractalResult {
  const n = highs.length
  const fractalHighs: (number | null)[] = new Array(n).fill(null)
  const fractalLows: (number | null)[] = new Array(n).fill(null)

  for (let i = left; i < n - right; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue
      if (highs[j] >= highs[i]) isHigh = false
      if (lows[j] <= lows[i]) isLow = false
    }
    if (isHigh) fractalHighs[i] = highs[i]
    if (isLow) fractalLows[i] = lows[i]
  }

  return { fractalHighs, fractalLows }
}

export type OrderBlock = {
  type: 'bull' | 'bear'
  open: number
  close: number
  high: number
  low: number
  index: number
}

// Bull OB: last bearish candle before the bullish impulse that caused BOS up.
// Bear OB: last bullish candle before the bearish impulse that caused BOS down.
export function detectOrderBlocks(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 40,
): { bullOB: OrderBlock | null; bearOB: OrderBlock | null } {
  const n = closes.length
  if (n < 10) return { bullOB: null, bearOB: null }

  const start = Math.max(0, n - lookback)
  const searchHighs = highs.slice(start, n - 1)
  const searchLows  = lows.slice(start, n - 1)

  const swingHighIdx = start + searchHighs.indexOf(Math.max(...searchHighs))
  const swingLowIdx  = start + searchLows.indexOf(Math.min(...searchLows))

  let bullOB: OrderBlock | null = null
  let bearOB: OrderBlock | null = null

  if (closes[n - 1] > highs[swingHighIdx] && swingHighIdx > start) {
    for (let i = swingHighIdx - 1; i >= start; i--) {
      if (closes[i] < opens[i]) {
        bullOB = { type: 'bull', open: opens[i], close: closes[i], high: highs[i], low: lows[i], index: i }
        break
      }
    }
  }

  if (closes[n - 1] < lows[swingLowIdx] && swingLowIdx > start) {
    for (let i = swingLowIdx - 1; i >= start; i--) {
      if (closes[i] > opens[i]) {
        bearOB = { type: 'bear', open: opens[i], close: closes[i], high: highs[i], low: lows[i], index: i }
        break
      }
    }
  }

  return { bullOB, bearOB }
}

export type FVGZone = {
  type: 'bull' | 'bear'
  top: number
  bottom: number
  midpoint: number
  index: number
}

export function detectFVGZones(highs: number[], lows: number[], lookback = 60): FVGZone[] {
  const n = highs.length
  const zones: FVGZone[] = []
  const start = Math.max(1, n - lookback)

  for (let i = start; i < n - 1; i++) {
    if (highs[i - 1] < lows[i + 1]) {
      zones.push({
        type: 'bull',
        bottom: highs[i - 1],
        top: lows[i + 1],
        midpoint: (highs[i - 1] + lows[i + 1]) / 2,
        index: i,
      })
    }
    if (lows[i - 1] > highs[i + 1]) {
      zones.push({
        type: 'bear',
        top: lows[i - 1],
        bottom: highs[i + 1],
        midpoint: (lows[i - 1] + highs[i + 1]) / 2,
        index: i,
      })
    }
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

// Supply/Demand zones based on rally-base-rally / drop-base-drop logic.
// A demand zone = tight base (≤2 bars) preceding a strong bullish leg (>2×ATR move).
// A supply zone = tight base preceding a strong bearish leg.
// Returns zones sorted newest-first; freshness measured by retest count.
export function detectSupplyDemandZones(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  atr: number,
  lookback = 80,
  minLegAtrMult = 2.0,
  maxBaseBars = 3,
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
        zones.push({
          type: 'demand',
          top: baseHigh,
          bottom: baseLow,
          midpoint: (baseHigh + baseLow) / 2,
          baseStart, baseEnd,
          legStrengthAtr: legBody / atr,
          retests,
        })
        break
      }
      if (isBearLeg) {
        let retests = 0
        for (let j = legIdx + 1; j < n; j++) {
          if (highs[j] >= baseLow - atr * 0.2 && highs[j] <= baseHigh + atr * 0.2) retests++
          if (closes[j] > baseHigh + atr * 0.5) { retests = 99; break }
        }
        zones.push({
          type: 'supply',
          top: baseHigh,
          bottom: baseLow,
          midpoint: (baseHigh + baseLow) / 2,
          baseStart, baseEnd,
          legStrengthAtr: legBody / atr,
          retests,
        })
        break
      }
    }
  }

  return zones.sort((a, b) => b.baseEnd - a.baseEnd)
}

// Narrow-range consolidation candle followed by a breakout = CRT expansion entry trigger.
export function detectCRTExpansion(
  highs: number[],
  lows: number[],
  closes: number[],
  opens: number[],
): { bullCRT: boolean; bearCRT: boolean } {
  const n = closes.length
  if (n < 4) return { bullCRT: false, bearCRT: false }

  const wStart = Math.max(0, n - 12)
  const wEnd   = n - 2
  let totalRange = 0
  let count = 0
  for (let i = wStart; i < wEnd; i++) {
    totalRange += highs[i] - lows[i]
    count++
  }
  const avgRange = count > 0 ? totalRange / count : 0

  const setupRange = highs[n - 2] - lows[n - 2]
  const isConsolidation = avgRange > 0 && setupRange < avgRange * 0.65

  const bullCRT = isConsolidation && closes[n - 1] > highs[n - 2] && closes[n - 1] > opens[n - 1]
  const bearCRT = isConsolidation && closes[n - 1] < lows[n - 2]  && closes[n - 1] < opens[n - 1]

  return { bullCRT, bearCRT }
}

// Equal-high or equal-low sweep: stop hunt candle that wicks through clustered levels then closes back.
export function detectLiquiditySweep(
  highs: number[],
  lows: number[],
  closes: number[],
  opens: number[],
  lookback = 25,
): { bullSweep: boolean; bearSweep: boolean } {
  const n = closes.length
  if (n < lookback + 2) return { bullSweep: false, bearSweep: false }

  const start = n - lookback - 1
  const recentLows  = lows.slice(start, n - 1)
  const recentHighs = highs.slice(start, n - 1)

  const minLow  = Math.min(...recentLows)
  const maxHigh = Math.max(...recentHighs)

  const equalLowCount  = recentLows.filter((l) => l > 0 && Math.abs(l - minLow)  / minLow  < 0.003).length
  const equalHighCount = recentHighs.filter((h) => h > 0 && Math.abs(h - maxHigh) / maxHigh < 0.003).length

  const bullSweep = equalLowCount  >= 2 && lows[n - 1]  < minLow  && closes[n - 1] > minLow  && closes[n - 1] > opens[n - 1]
  const bearSweep = equalHighCount >= 2 && highs[n - 1] > maxHigh && closes[n - 1] < maxHigh && closes[n - 1] < opens[n - 1]

  return { bullSweep, bearSweep }
}

// Swing-based RSI divergence: compares actual swing pivots, not just a fixed bar offset.
export function detectSwingRSIDivergence(
  closes: number[],
  rsiValues: (number | null)[],
  lookback = 40,
  minSwingBars = 5,
): { bullDiv: boolean; bearDiv: boolean } {
  const n = closes.length
  if (n < lookback) return { bullDiv: false, bearDiv: false }

  const start = Math.max(2, n - lookback)

  let prevLowPrice = Infinity, prevLowRSI = 50, prevLowIdx = -1
  for (let i = start; i < n - 2; i++) {
    if (closes[i] < closes[i - 1] && closes[i] < closes[i - 2] && closes[i] < closes[i + 1] && closes[i] < closes[i + 2]) {
      const rsiHere = typeof rsiValues[i] === 'number' ? (rsiValues[i] as number) : 50
      if (prevLowIdx >= 0 && i - prevLowIdx >= minSwingBars && closes[i] < prevLowPrice && rsiHere > prevLowRSI) {
        return { bullDiv: true, bearDiv: false }
      }
      if (prevLowIdx < 0 || closes[i] < prevLowPrice) {
        prevLowPrice = closes[i]; prevLowRSI = rsiHere; prevLowIdx = i
      }
    }
  }

  let prevHighPrice = 0, prevHighRSI = 50, prevHighIdx = -1
  for (let i = start; i < n - 2; i++) {
    if (closes[i] > closes[i - 1] && closes[i] > closes[i - 2] && closes[i] > closes[i + 1] && closes[i] > closes[i + 2]) {
      const rsiHere = typeof rsiValues[i] === 'number' ? (rsiValues[i] as number) : 50
      if (prevHighIdx >= 0 && i - prevHighIdx >= minSwingBars && closes[i] > prevHighPrice && rsiHere < prevHighRSI) {
        return { bullDiv: false, bearDiv: true }
      }
      if (prevHighIdx < 0 || closes[i] > prevHighPrice) {
        prevHighPrice = closes[i]; prevHighRSI = rsiHere; prevHighIdx = i
      }
    }
  }

  return { bullDiv: false, bearDiv: false }
}

// Checks if the London session swept outside the Asian session range (manipulation leg confirmed).
export function detectAsianRangeSweep(candles: OhlcvBar[]): { londonSweptLow: boolean; londonSweptHigh: boolean } {
  if (candles.length < 20) return { londonSweptLow: false, londonSweptHigh: false }

  let asianHigh = 0, asianLow = Infinity
  let londonHigh = 0, londonLow = Infinity
  let foundAsian = false, foundLondon = false

  const scanStart = Math.max(0, candles.length - 50)
  for (let i = scanStart; i < candles.length; i++) {
    const sess = detectAMDSession(candles[i].time)
    if (sess === 'asian') {
      if (candles[i].high > asianHigh) asianHigh = candles[i].high
      if (candles[i].low  < asianLow)  asianLow  = candles[i].low
      foundAsian = true
    }
    if (sess === 'london') {
      if (candles[i].high > londonHigh) londonHigh = candles[i].high
      if (candles[i].low  < londonLow)  londonLow  = candles[i].low
      foundLondon = true
    }
  }

  if (!foundAsian || !foundLondon || asianLow === Infinity) {
    return { londonSweptLow: false, londonSweptHigh: false }
  }

  return {
    londonSweptLow:  londonLow  < asianLow,
    londonSweptHigh: londonHigh > asianHigh,
  }
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
