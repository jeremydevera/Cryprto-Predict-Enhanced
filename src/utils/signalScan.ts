import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateDI,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateStochastic,
  calculateSqueezeMomentum,
  calculateSupertrend,
  computeFluxGateDualEngine,
  detectLiquiditySweep,
  detectFVGZones,
  detectOrderBlocks,
  detectSupplyDemandZones,
  detectSwingRSIDivergence,
  type FVGZone,
  type OhlcvBar,
} from '@/utils/ohlcv'
import { detectChartPatterns } from '@/utils/patterns'

export type ScanSettings = {
  enabledStrategies: string[]
  selectedStrategy: string
  entryModel: 'breakout_close' | 'retest_hold' | 'retest_confirm'
  isConfluence: boolean
  minConfluence: number
  minQuality: number
  filterBTCAlignment: boolean
  filterHTFAlignment: boolean
  filterEntryConfirmation: boolean
  filterADXRegime: boolean
  filterVolumeConfirmation: boolean
  filterKeyLevelDistance: boolean
  keyLevelMaxDistancePct: number
  minVolumeRatio: number
  filterRetestConfirmation: boolean
  filterAtrEntryBuffer: boolean
  entryAtrBufferAtrMult: number
  filterStrongClose: boolean
  strongCloseBodyPct: number
  filterAvoidOppKeyLevel: boolean
  filterCooldown: boolean
  cooldownBars: number
  filterRequireOrderBlock: boolean
  filterFVG: boolean
  filterPapRequireRetest: boolean
  filterEliteSession: boolean
  filterCmSession?: boolean
  filterLiquiditySweep: boolean
  filterEliteRequireRetest: boolean
  filterEliteHTFEMA: boolean
  filterEliteMaxEmaDistance: boolean
  filterFixedPctSlTp: boolean
  fixedSlPct: number
  fixedTpPct: number
  eliteMinVolRegime: 'any' | 'medium' | 'high'
  brMinAtrPct?: number
  brMaxRangeAtrMult?: number
  brEmaSlopeLookback?: number
  brAdxMin?: number
  filterIFVG?: boolean
  filterCisdRetest?: boolean
  filterClearTarget?: boolean
  filterHtfEma50?: boolean
  errAGradeBoost?: boolean
  errStochConfirm?: boolean
  errHtfEma200?: boolean
  errMultiRetest?: boolean
  errAGradeRequired?: boolean
  errHtfEma50Required?: boolean
  errMinRREnabled?: boolean
  errMinRR?: number
  errRetestMaxBarsEnabled?: boolean
  errRetestMaxBars?: number
  errReversalBodyMinPct?: number
  errRetestAtrTolMult?: number
  errStochOS?: number
  errStochOB?: number
  errMultiRetestLookbackBars?: number
  errMultiRetestMinTouches?: number
  errAGradeBodyMinPct?: number
  errAGradeVolMinMult?: number
  errTp1MultDefault?: number
  errTp2MultDefault?: number
  errTp1MultBoost?: number
  errTp2MultBoost?: number
  ecbAGradeBodyMinPctHighVol?: number
  ecbAGradeBodyMinPctOther?: number
  ecbAGradeVolMinMult?: number
  ecbBGradeBodyMinPctMedium?: number
  ecbBGradeBodyMinPctOther?: number
  ecbBGradeVolMinMultMedium?: number
  ecbBGradeVolMinMultOther?: number
  ecbRetestAtrTolMult?: number
  ecbRetestEma20MaxDistPct?: number
  ecbRetestVolMaxFracOfBreak?: number
  ecbMaxEma50DistanceAtrMult?: number
  ecbMinConsolidBars?: number
  ecbRsiLongMinMediumAGrade?: number
  ecbRsiLongMinMediumBGrade?: number
  ecbRsiLongMinOther?: number
  ecbRsiShortMaxMediumAGrade?: number
  ecbRsiShortMaxMediumBGrade?: number
  ecbRsiShortMaxOther?: number
  ecbSlAtrMultAGradeHigh?: number
  ecbSlAtrMultAGradeOther?: number
  ecbSlAtrMultBGrade?: number
  ecbTp1RRMultAGradeHigh?: number
  ecbTp1RRMultAGradeOther?: number
  ecbTp1RRMultBGradeMedium?: number
  ecbTp1RRMultBGradeOther?: number
  ecbMeasuredMoveMinAtrMult?: number
  ecbTp2ExtraRR?: number
  ecbMaxBreakCandleRangeAtrMult?: number
  ecbBreakClosePosBullMinPct?: number
  ecbBreakClosePosBearMaxPct?: number
  fgUseADX?: boolean
  fgAdxMin?: number
  fgUseSession?: boolean
  fgSessionStartUtc?: number
  fgSessionEndUtc?: number
  fgUseStructure?: boolean
  fgStructureTolAtrMult?: number
  fgUseMomentum?: boolean
  fgUseRsiDivergence?: boolean
  fgUseStochCross?: boolean
  fgStochExtreme?: boolean
  fgStochOS?: number
  fgStochOB?: number
  fgUseVolume?: boolean
  fgMinVolumeRatio?: number
  fgRequireVolumeExpanding?: boolean
  fgUseHTFAlign?: boolean
  fgUseCost?: boolean
  fgUseExecution?: boolean
  fgBaseLenLong?: number
  fgBaseLenShort?: number
  fgGuideEmaLen?: number
  fgVolLen?: number
  fgPersLen?: number
  fgCurvLen?: number
  fgThresholdKLong?: number
  fgThresholdKShort?: number
  fgUseCross?: boolean
  stAtrPeriod?: number
  stAtrMult?: number
  stUseRelVol?: boolean
  stRelVolLen?: number
  stRelVolMin?: number
  stRequireFlip?: boolean
  stUseKernel?: boolean
  stKernelLookback?: number
  stKernelBandwidth?: number
  stUseHTFAlign?: boolean
  stHtfEmaLen?: number
  stUseHtfEmaSlope?: boolean
  stHtfEmaSlopeLookback?: number
  stHtfEmaSlopeMinPctPerBar?: number
  stUseAdx?: boolean
  stAdxPeriod?: number
  stAdxMin?: number
  stUseDiAlign?: boolean
  stDiPeriod?: number
  stUseManualSlTp?: boolean
  stManualSlPct?: number
  stManualTp1Pct?: number
  stManualTp2Pct?: number
  stUseEmaDistance?: boolean
  stEmaDistAtrMin?: number
  stUseImpulse?: boolean
  stImpulseBodyMinPct?: number
  stImpulseWickMaxPct?: number
  stUseKdeRegime?: boolean
  stKdeRegimeLookback?: number
  stKdeRegimeBandwidth?: number
  stKdeRegimeMaxConcentration?: number
  stUseKdeValueArea?: boolean
  stKdeValueAreaLookback?: number
  stKdeValueAreaBandwidth?: number
  stKdeValueAreaMaxDensity?: number
  bbssdLength?: number
  bbssdStdDev?: number
  bbssdStochK?: number
  bbssdStochD?: number
  bbssdStochSmooth?: number
  bbssdStochOS?: number
  bbssdStochOB?: number
  bbssdLookbackBars?: number
  bbssdRequireZone?: boolean
  bbssdZoneFreshOnly?: boolean
  bbssdRequireBBTag?: boolean
  bbssdRequireBBReject?: boolean
  bbssdRequireStochCross?: boolean
  bbssdRequireReversalCandle?: boolean
  bbssdHtfEma200?: boolean
  bbssdMaxAdx?: number
  bbssdUseMaxAdx?: boolean
  bbssdMinVolumeRatio?: number
  bbssdUseVolume?: boolean
  bbssdZoneTolAtrMult?: number
  bbssdMinLegAtr?: number
  bbssdRsiLongMin?: number
  bbssdRsiLongMax?: number
  bbssdRsiShortMin?: number
  bbssdRsiShortMax?: number
  bbssdFreshZonesOnly?: boolean
  bbssdRequireRsiDiv?: boolean
  bbssdAllowObFvgFallback?: boolean
  bbssdRevWickPct?: number
  bbssdRequireEntryConfirm?: boolean
  bbssdRequireLiqSweep?: boolean
  sqzBbLen?: number
  sqzBbStd?: number
  sqzKcLen?: number
  sqzKcMult?: number
  sqzMomLen?: number
  sqzRequireRelease?: boolean
  sqzMinSqueezeBars?: number
  sqzRequireMomRising?: boolean
  sqzUseHtfAlign?: boolean
  sqzHtfEmaLen?: number
  sqzUseAdx?: boolean
  sqzAdxMin?: number
  sqzUseVolume?: boolean
  sqzVolLen?: number
  sqzMinVolumeRatio?: number
  sqzSlAtrMult?: number
  sqzTp1AtrMult?: number
  sqzTp2AtrMult?: number
  sqzUseManualSlTp?: boolean
  sqzManualSlPct?: number
  sqzManualTp1Pct?: number
  sqzManualTp2Pct?: number
  nearEntryOnly: boolean
  nearEntryPct: number
  lastSignalTimeSec: number | null
  lastSignalDirection: 'buy' | 'sell' | null
  lastCandleTimeSec: number
  timeframe: string
}

export type ScanResult = {
  strategy: string
  regime: string
  direction: 'buy' | 'sell'
  quality: number
  confluence: number
  notes: string
  currentPrice: number
  entry: number
  entryDistancePct: number
  sl: number
  tp1: number
  tp2: number
}

// Causal indicators only depend on past bars, so values at index i are identical
// whether computed over [0..i] or [0..N]. Build once per symbol and read by index
// inside the backtest loop — avoids O(N) recomputation per bar.
export type IndicatorCache = {
  closes: number[]
  opens:  number[]
  highs:  number[]
  lows:   number[]
  rsi:    (number | null)[]
  ema20:  (number | null)[]
  ema50:  (number | null)[]
  ema200: (number | null)[]
  macd:   { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] }
  adx:    (number | null)[]
  atr:    (number | null)[]
  htfCloses?: number[]
  htfOpens?:  number[]
  htfHighs?:  number[]
  htfLows?:   number[]
  htfEma50?:  (number | null)[]
  htfEma200?: (number | null)[]
  htfAtr14?:  (number | null)[]
}

export function buildIndicatorCache(candles: OhlcvBar[], htfCandles?: OhlcvBar[]): IndicatorCache {
  const closes = new Array<number>(candles.length)
  const opens  = new Array<number>(candles.length)
  const highs  = new Array<number>(candles.length)
  const lows   = new Array<number>(candles.length)
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    closes[i] = Number(c.close || 0)
    opens[i]  = Number(c.open  || 0)
    highs[i]  = Number(c.high  || 0)
    lows[i]   = Number(c.low   || 0)
  }
  const cache: IndicatorCache = {
    closes, opens, highs, lows,
    rsi:    calculateRSI(closes, 14),
    ema20:  calculateEMA(closes, 20),
    ema50:  calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    macd:   calculateMACD(closes),
    adx:    calculateADX(highs, lows, closes, 14),
    atr:    calculateATR(highs, lows, closes, 14),
  }
  if (Array.isArray(htfCandles) && htfCandles.length > 0) {
    const htfCloses = new Array<number>(htfCandles.length)
    const htfOpens  = new Array<number>(htfCandles.length)
    const htfHighs  = new Array<number>(htfCandles.length)
    const htfLows   = new Array<number>(htfCandles.length)
    for (let i = 0; i < htfCandles.length; i++) {
      const c = htfCandles[i]
      htfCloses[i] = Number(c.close || 0)
      htfOpens[i]  = Number(c.open  || 0)
      htfHighs[i]  = Number(c.high  || 0)
      htfLows[i]   = Number(c.low   || 0)
    }
    cache.htfCloses = htfCloses
    cache.htfOpens  = htfOpens
    cache.htfHighs  = htfHighs
    cache.htfLows   = htfLows
    cache.htfEma50  = calculateEMA(htfCloses, 50)
    cache.htfEma200 = calculateEMA(htfCloses, 200)
    cache.htfAtr14  = calculateATR(htfHighs, htfLows, htfCloses, 14)
  }
  return cache
}

export function evaluateSignalFromCandles(params: {
  candles: OhlcvBar[]
  settings: ScanSettings
  symbol: string
  htfCandles?: OhlcvBar[]
  cache?: IndicatorCache
  lastIdx?: number
  htfLastIdx?: number
}): ScanResult | null {
  const { candles, settings, htfCandles, cache } = params
  if (!Array.isArray(candles) || candles.length < 50) return null

  const lastIdx = (() => {
    if (typeof params.lastIdx === 'number') return params.lastIdx
    // Default to the last CLOSED bar. Live callers (market analysis, forward test) fetch a
    // still-forming last candle; evaluating it repaints intrabar and diverges from the server
    // scanner, which drops the forming bar (signalEval includeLiveCandle gating). Backtests
    // pass lastIdx explicitly and are unaffected; purely historical data is unaffected too,
    // since its last bar's close time is already in the past.
    let li = candles.length - 1
    const tf = String(settings.timeframe ?? '')
    const n = Number((tf.match(/^\d+/) || [0])[0]) || 0
    const unitMs = tf.endsWith('m') ? 60_000 : tf.endsWith('h') ? 3_600_000 : tf.endsWith('d') ? 86_400_000 : 0
    const lastOpenMs = Number(candles[li]?.time ?? 0) * 1000
    if (n * unitMs > 0 && lastOpenMs > 0 && Date.now() < lastOpenMs + n * unitMs && li > 0) li--
    return li
  })()
  if (lastIdx < 0 || lastIdx >= candles.length) return null
  const effectiveLen = lastIdx + 1
  if (effectiveLen < 50) return null

  const last = candles[lastIdx]
  if (!last || typeof last.time !== 'number') return null

  const closes = cache?.closes ?? candles.map((c) => Number(c.close || 0))
  const opens  = cache?.opens  ?? candles.map((c) => Number(c.open  || 0))
  const highs  = cache?.highs  ?? candles.map((c) => Number(c.high  || 0))
  const lows   = cache?.lows   ?? candles.map((c) => Number(c.low   || 0))

  const currentPrice = closes[lastIdx]
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  const rsi    = cache?.rsi    ?? calculateRSI(closes, 14)
  const ema20  = cache?.ema20  ?? calculateEMA(closes, 20)
  const ema50  = cache?.ema50  ?? calculateEMA(closes, 50)
  const ema200 = cache?.ema200 ?? calculateEMA(closes, 200)
  const macd   = cache?.macd   ?? calculateMACD(closes)
  const adx    = cache?.adx    ?? calculateADX(highs, lows, closes, 14)
  const atr    = cache?.atr    ?? calculateATR(highs, lows, closes, 14)

  const htfLastIdx = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length === 0) return -1
    if (typeof params.htfLastIdx === 'number') {
      return Math.max(-1, Math.min(htfCandles.length - 1, params.htfLastIdx))
    }
    // Default: last CLOSED HTF bar — the forming HTF bar otherwise leaks its in-progress
    // OHLC into HTF gates for live callers. HTF period inferred from bar spacing (the HTF
    // series' timeframe string isn't passed in).
    const li = htfCandles.length - 1
    const spacingSec = li >= 1 ? Number(htfCandles[li].time) - Number(htfCandles[li - 1].time) : 0
    const lastOpenMs = Number(htfCandles[li]?.time ?? 0) * 1000
    if (spacingSec > 0 && lastOpenMs > 0 && Date.now() < lastOpenMs + spacingSec * 1000 && li > 0) return li - 1
    return li
  })()
  const htfLen = htfLastIdx + 1

  const currentRsi      = typeof rsi[lastIdx]            === 'number' ? rsi[lastIdx]            : 50
  const currentEma20    = typeof ema20[lastIdx]           === 'number' ? ema20[lastIdx]           : currentPrice
  const currentEma50    = typeof ema50[lastIdx]           === 'number' ? ema50[lastIdx]           : currentPrice
  const currentEma200   = typeof ema200[lastIdx]          === 'number' ? ema200[lastIdx]          : currentPrice
  const currentMacdHist = typeof macd.histogram[lastIdx]  === 'number' ? macd.histogram[lastIdx]  : 0
  const currentAdx      = typeof adx[lastIdx]             === 'number' ? adx[lastIdx]             : 20
  const currentAtr      = typeof atr[lastIdx]             === 'number' ? atr[lastIdx]             : currentPrice * 0.01

  const isTrending    = currentAdx > 25
  const isStrongTrend = currentAdx > 40
  const emaAligned    =
    (currentPrice > currentEma20 && currentEma20 > currentEma50) ||
    (currentPrice < currentEma20 && currentEma20 < currentEma50)

  let regime = 'Ranging'
  if (isStrongTrend)                 regime = 'Trending'
  else if (isTrending && emaAligned) regime = 'Trending'
  else if (currentAdx < 20)         regime = 'Ranging'
  else                               regime = 'Choppy'

  const eliteContextStr = 'Elite Context Breakout'
  const errStr          = 'Elite Retest Reversal'
  const brStr          = 'Breakout Retest'
  const cmStr          = 'Confirmation Model'
  const fluxStr         = 'FluxGate Dual Engine'
  const stStr           = 'Supertrend + RelVol'
  const bbssdStr        = 'BB Stoch S/D'
  const sqzStr          = 'Squeeze Momentum'

  const strategyForSignals = settings.selectedStrategy
  if (!strategyForSignals || (strategyForSignals !== eliteContextStr && strategyForSignals !== errStr && strategyForSignals !== brStr && strategyForSignals !== cmStr && strategyForSignals !== fluxStr && strategyForSignals !== stStr && strategyForSignals !== bbssdStr && strategyForSignals !== sqzStr)) return null

  const isBullCandle = closes[lastIdx] > opens[lastIdx]
  const isBearCandle = closes[lastIdx] < opens[lastIdx]

  const recentVol = candles.slice(Math.max(0, lastIdx - 19), lastIdx)
  const avgVol    =
    recentVol.length > 0
      ? recentVol.reduce((acc, c) => acc + Number(c.volume || 0), 0) / recentVol.length
      : Number(candles[lastIdx].volume || 0)

  // ── Breakout Retest Strategy (outer scope for SL/TP access) ───────────────
  // Research-backed: 65-70% of breakouts fail; retest confirmation is critical
  const brMaxRetestCandles = 12
  const brVolumeMultiplier = settings.filterVolumeConfirmation ? Math.max(1.8, settings.minVolumeRatio) : 1.0
  const brAtrBufferMult = Math.max(0.1, settings.entryAtrBufferAtrMult)

  let brSwingHigh = 0, brSwingHighIdx = -1
  let brSwingLow = Infinity, brSwingLowIdx = -1
  for (let i = lastIdx - 3; i >= Math.max(2, lastIdx - 50); i--) {
    if (brSwingHighIdx < 0 && highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      brSwingHigh = highs[i]; brSwingHighIdx = i
    }
    if (brSwingLowIdx < 0 && lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      brSwingLow = lows[i]; brSwingLowIdx = i
    }
    if (brSwingHighIdx >= 0 && brSwingLowIdx >= 0) break
  }

  const brAvgVol = recentVol.length > 0
    ? recentVol.reduce((acc, c) => acc + Number(c.volume || 0), 0) / recentVol.length
    : Number(candles[lastIdx].volume || 0)

  const brBreakoutBullIdx = (() => {
    if (brSwingHighIdx < 0) return -1
    const from = Math.max(brSwingHighIdx + 1, lastIdx - 20)
    for (let i = from; i <= lastIdx; i++) {
      const volMult = brAvgVol > 0 ? Number(candles[i]?.volume ?? 0) / brAvgVol : 1
      if (closes[i] > brSwingHigh && volMult >= brVolumeMultiplier) return i
    }
    return -1
  })()
  const brBreakoutBearIdx = (() => {
    if (brSwingLowIdx < 0) return -1
    const from = Math.max(brSwingLowIdx + 1, lastIdx - 20)
    for (let i = from; i <= lastIdx; i++) {
      const volMult = brAvgVol > 0 ? Number(candles[i]?.volume ?? 0) / brAvgVol : 1
      if (closes[i] < brSwingLow && volMult >= brVolumeMultiplier) return i
    }
    return -1
  })()

  const brBreakVolBull = brBreakoutBullIdx >= 0 ? Number(candles[brBreakoutBullIdx]?.volume ?? 0) : 0
  const brBreakVolBear = brBreakoutBearIdx >= 0 ? Number(candles[brBreakoutBearIdx]?.volume ?? 0) : 0

  const brRetestBull = (() => {
    if (brBreakoutBullIdx < 0 || brBreakoutBullIdx >= lastIdx) return false
    const breakoutMove = closes[brBreakoutBullIdx] - brSwingHigh
    if (breakoutMove <= 0) return false
    const atrBuffer = settings.filterAtrEntryBuffer ? currentAtr * brAtrBufferMult : currentAtr * 0.5
    for (let i = brBreakoutBullIdx + 1; i <= Math.min(lastIdx, brBreakoutBullIdx + brMaxRetestCandles); i++) {
      const retestDepth = (closes[brBreakoutBullIdx] - lows[i]) / breakoutMove
      const volAtRetest = Number(candles[i]?.volume ?? 0)
      const volOk = brBreakVolBull > 0 && volAtRetest <= brBreakVolBull * 0.7
      if (lows[i] <= brSwingHigh + atrBuffer && lows[i] >= brSwingHigh - atrBuffer && retestDepth >= 0 && retestDepth <= 0.618 && volOk) {
        return true
      }
    }
    return false
  })()
  const brRetestBear = (() => {
    if (brBreakoutBearIdx < 0 || brBreakoutBearIdx >= lastIdx) return false
    const breakoutMove = brSwingLow - closes[brBreakoutBearIdx]
    if (breakoutMove <= 0) return false
    const atrBuffer = settings.filterAtrEntryBuffer ? currentAtr * brAtrBufferMult : currentAtr * 0.5
    for (let i = brBreakoutBearIdx + 1; i <= Math.min(lastIdx, brBreakoutBearIdx + brMaxRetestCandles); i++) {
      const retestDepth = (highs[i] - closes[brBreakoutBearIdx]) / breakoutMove
      const volAtRetest = Number(candles[i]?.volume ?? 0)
      const volOk = brBreakVolBear > 0 && volAtRetest <= brBreakVolBear * 0.7
      if (highs[i] >= brSwingLow - atrBuffer && highs[i] <= brSwingLow + atrBuffer && retestDepth >= 0 && retestDepth <= 0.618 && volOk) {
        return true
      }
    }
    return false
  })()

  // ── Elite Context Breakout ────────────────────────────────────────────────

  // Session filter: 08:00–11:00 UTC (London) and 13:00–17:00 UTC (NY)
  const eliteInSession = (() => {
    if (!settings.filterEliteSession) return true
    const ts = Number(candles[lastIdx]?.time ?? 0)
    if (!ts) return true
    const ms        = ts < 1e12 ? ts * 1000 : ts
    const h         = new Date(ms).getUTCHours()
    const m         = new Date(ms).getUTCMinutes()
    const totalMins = h * 60 + m
    return (totalMins >= 480 && totalMins < 660) || (totalMins >= 780 && totalMins < 1020)
  })()

  // ATR% volatility regime: low <0.4%, medium 0.4–1.2%, high >1.2%
  const eliteAtrPct    = (currentAtr / currentPrice) * 100
  const eliteVolRegime: 'low' | 'medium' | 'high' =
    eliteAtrPct < 0.4 ? 'low' : eliteAtrPct < 1.2 ? 'medium' : 'high'

  // 4H structure detection: HH/HL = bullish, LH/LL = bearish
  const htfHighsArr = cache?.htfHighs ?? (Array.isArray(htfCandles) ? htfCandles.map((c) => Number(c.high  || 0)) : null)
  const htfLowsArr  = cache?.htfLows  ?? (Array.isArray(htfCandles) ? htfCandles.map((c) => Number(c.low   || 0)) : null)
  const htfClosesArr = cache?.htfCloses ?? (Array.isArray(htfCandles) ? htfCandles.map((c) => Number(c.close || 0)) : null)
  const htfOpensArr  = cache?.htfOpens  ?? (Array.isArray(htfCandles) ? htfCandles.map((c) => Number(c.open  || 0)) : null)

  const eliteHtfStructureBull = (() => {
    if (!htfHighsArr || !htfLowsArr || htfLen < 20) return false
    const swHs: number[] = [], swLs: number[] = []
    for (let i = htfLastIdx - 2; i >= 2; i--) {
      if (swHs.length < 2 && htfHighsArr[i] > htfHighsArr[i - 1] && htfHighsArr[i] > htfHighsArr[i + 1]) swHs.push(htfHighsArr[i])
      if (swLs.length < 2 && htfLowsArr[i]  < htfLowsArr[i - 1]  && htfLowsArr[i]  < htfLowsArr[i + 1])  swLs.push(htfLowsArr[i])
      if (swHs.length >= 2 && swLs.length >= 2) break
    }
    return swHs.length >= 2 && swLs.length >= 2 && swHs[0] > swHs[1] && swLs[0] > swLs[1]
  })()
  const eliteHtfStructureBear = (() => {
    if (!htfHighsArr || !htfLowsArr || htfLen < 20) return false
    const swHs: number[] = [], swLs: number[] = []
    for (let i = htfLastIdx - 2; i >= 2; i--) {
      if (swHs.length < 2 && htfHighsArr[i] > htfHighsArr[i - 1] && htfHighsArr[i] > htfHighsArr[i + 1]) swHs.push(htfHighsArr[i])
      if (swLs.length < 2 && htfLowsArr[i]  < htfLowsArr[i - 1]  && htfLowsArr[i]  < htfLowsArr[i + 1])  swLs.push(htfLowsArr[i])
      if (swHs.length >= 2 && swLs.length >= 2) break
    }
    return swHs.length >= 2 && swLs.length >= 2 && swHs[0] < swHs[1] && swLs[0] < swLs[1]
  })()

  // HTF EMA50/200 — use cached arrays when available, else compute lazily for this slice
  const _htfEma50Lazy = (() => {
    if (cache?.htfEma50) return cache.htfEma50
    if (!htfClosesArr || htfLen < 55) return null
    return calculateEMA(htfClosesArr, 50)
  })()
  const _htfEma200Lazy = (() => {
    if (cache?.htfEma200) return cache.htfEma200
    if (!htfClosesArr || htfLen < 200) return null
    return calculateEMA(htfClosesArr, 200)
  })()

  const eliteHtfEmaBull = (() => {
    if (!htfClosesArr || !_htfEma50Lazy || htfLen < 55) return false
    const e50 = _htfEma50Lazy[htfLastIdx]
    return typeof e50 === 'number' && htfClosesArr[htfLastIdx] > e50
  })()
  const eliteHtfEmaBear = (() => {
    if (!htfClosesArr || !_htfEma50Lazy || htfLen < 55) return false
    const e50 = _htfEma50Lazy[htfLastIdx]
    return typeof e50 === 'number' && htfClosesArr[htfLastIdx] < e50
  })()

  const eliteHtfEma200Bull = (() => {
    if (!htfClosesArr || !_htfEma200Lazy || htfLen < 200) return false
    const e200 = _htfEma200Lazy[htfLastIdx]
    return typeof e200 === 'number' && htfClosesArr[htfLastIdx] > e200
  })()
  const eliteHtfEma200Bear = (() => {
    if (!htfClosesArr || !_htfEma200Lazy || htfLen < 200) return false
    const e200 = _htfEma200Lazy[htfLastIdx]
    return typeof e200 === 'number' && htfClosesArr[htfLastIdx] < e200
  })()

  // Swing detection: 3-bar pivot, exclude last 3 bars, scan 60 bars back
  const eliteSwingLookback  = 60
  const eliteFreshLimit     = eliteVolRegime === 'medium' ? 4 : 6
  const eliteExtendPct      = eliteVolRegime === 'medium' ? 0.005 : 0.003
  const eliteRetestAtrMult  = strategyForSignals === errStr
    ? Math.max(0.05, Number(settings.errRetestAtrTolMult ?? 0.3))
    : strategyForSignals === eliteContextStr
      ? Math.max(0.05, Number(settings.ecbRetestAtrTolMult ?? 0.3))
      : 0.3
  const eliteConsolLen      = 8

  let eliteSwingHigh = 0,        eliteSwingHighIdx = -1
  let eliteSwingLow  = Infinity, eliteSwingLowIdx  = -1
  for (let i = lastIdx - 3; i >= Math.max(2, lastIdx - eliteSwingLookback); i--) {
    if (eliteSwingHighIdx < 0 &&
        highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      eliteSwingHigh    = highs[i]
      eliteSwingHighIdx = i
    }
    if (eliteSwingLowIdx < 0 &&
        lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      eliteSwingLow    = lows[i]
      eliteSwingLowIdx = i
    }
    if (eliteSwingHighIdx >= 0 && eliteSwingLowIdx >= 0) break
  }

  // Liquidity pool: a second swing within 0.2% of the primary level
  const eliteLiqPoolBull = (() => {
    if (eliteSwingHighIdx < 4) return false
    const ref = eliteSwingHigh
    for (let i = eliteSwingHighIdx - 3; i >= Math.max(2, eliteSwingHighIdx - 40); i--) {
      if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1] && Math.abs(highs[i] - ref) / ref <= 0.002) return true
    }
    return false
  })()
  const eliteLiqPoolBear = (() => {
    if (eliteSwingLowIdx < 4) return false
    const ref = eliteSwingLow
    for (let i = eliteSwingLowIdx - 3; i >= Math.max(2, eliteSwingLowIdx - 40); i--) {
      if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1] && Math.abs(lows[i] - ref) / ref <= 0.002) return true
    }
    return false
  })()

  // Pre-breakout consolidation range (8 bars before swing)
  const eliteBullConsolidRange = (() => {
    if (eliteSwingHighIdx < eliteConsolLen) return currentAtr * eliteConsolLen
    const ph = highs.slice(eliteSwingHighIdx - eliteConsolLen, eliteSwingHighIdx)
    const pl = lows.slice(eliteSwingHighIdx - eliteConsolLen, eliteSwingHighIdx)
    return Math.max(...ph) - Math.min(...pl)
  })()
  const eliteBearConsolidRange = (() => {
    if (eliteSwingLowIdx < eliteConsolLen) return currentAtr * eliteConsolLen
    const ph = highs.slice(eliteSwingLowIdx - eliteConsolLen, eliteSwingLowIdx)
    const pl = lows.slice(eliteSwingLowIdx - eliteConsolLen, eliteSwingLowIdx)
    return Math.max(...ph) - Math.min(...pl)
  })()
  const eliteConsolMult     = eliteVolRegime === 'medium' ? 0.8 : 1.0
  const eliteIsConsolidBull = eliteBullConsolidRange < currentAtr * eliteConsolLen * eliteConsolMult
  const eliteIsConsolidBear = eliteBearConsolidRange < currentAtr * eliteConsolLen * eliteConsolMult

  // Count tight bars (high-low ≤ 0.8×ATR) in consolidation window
  const eliteBullConsolidBars = (() => {
    if (eliteSwingHighIdx < eliteConsolLen) return 0
    let count = 0
    for (let i = eliteSwingHighIdx - eliteConsolLen; i < eliteSwingHighIdx; i++) {
      if (highs[i] - lows[i] <= currentAtr * 0.8) count++
    }
    return count
  })()
  const eliteBearConsolidBars = (() => {
    if (eliteSwingLowIdx < eliteConsolLen) return 0
    let count = 0
    for (let i = eliteSwingLowIdx - eliteConsolLen; i < eliteSwingLowIdx; i++) {
      if (highs[i] - lows[i] <= currentAtr * 0.8) count++
    }
    return count
  })()

  // Breakout: first close beyond swing + min extension
  const eliteBreakSearchLimit = 20
  const eliteBreakoutBullIdx = (() => {
    if (eliteSwingHighIdx < 0) return -1
    const from = Math.max(eliteSwingHighIdx + 1, lastIdx - eliteBreakSearchLimit)
    for (let i = from; i <= lastIdx; i++) {
      if (closes[i] > eliteSwingHigh * (1 + eliteExtendPct)) return i
    }
    return -1
  })()
  const eliteBreakoutBearIdx = (() => {
    if (eliteSwingLowIdx < 0) return -1
    const from = Math.max(eliteSwingLowIdx + 1, lastIdx - eliteBreakSearchLimit)
    for (let i = from; i <= lastIdx; i++) {
      if (closes[i] < eliteSwingLow * (1 - eliteExtendPct)) return i
    }
    return -1
  })()

  const eliteFreshBull = eliteBreakoutBullIdx >= 0 && (lastIdx - eliteBreakoutBullIdx) <= eliteFreshLimit
  const eliteFreshBear = eliteBreakoutBearIdx >= 0 && (lastIdx - eliteBreakoutBearIdx) <= eliteFreshLimit

  // A-grade: body≥65% (≥70% high vol), vol≥2.5×avg | B-grade: body≥45% (≥50% medium), vol≥1.5× (≥2.0× medium)
  const errAGradeBodyMinPct = Math.max(10, Math.min(90, Number(settings.errAGradeBodyMinPct ?? 65)))
  const errAGradeVolMinMult = Math.max(0.1, Number(settings.errAGradeVolMinMult ?? 2.5))
  const ecbAGradeBodyHigh = Math.max(10, Math.min(90, Number(settings.ecbAGradeBodyMinPctHighVol ?? 70)))
  const ecbAGradeBodyOther = Math.max(10, Math.min(90, Number(settings.ecbAGradeBodyMinPctOther ?? 65)))
  const ecbAGradeVolMinMult = Math.max(0.1, Number(settings.ecbAGradeVolMinMult ?? 2.5))
  const ecbBGradeBodyMedium = Math.max(10, Math.min(90, Number(settings.ecbBGradeBodyMinPctMedium ?? 55)))
  const ecbBGradeBodyOther = Math.max(10, Math.min(90, Number(settings.ecbBGradeBodyMinPctOther ?? 45)))
  const ecbBGradeVolMedium = Math.max(0.1, Number(settings.ecbBGradeVolMinMultMedium ?? 2.0))
  const ecbBGradeVolOther = Math.max(0.1, Number(settings.ecbBGradeVolMinMultOther ?? 1.5))

  const aGradeBodyThresh =
    strategyForSignals === errStr
      ? errAGradeBodyMinPct
      : strategyForSignals === eliteContextStr
        ? (eliteVolRegime === 'high' ? ecbAGradeBodyHigh : ecbAGradeBodyOther)
        : (eliteVolRegime === 'high' ? 70 : 65)
  const aGradeVolThresh =
    strategyForSignals === errStr
      ? errAGradeVolMinMult
      : strategyForSignals === eliteContextStr
        ? ecbAGradeVolMinMult
        : 2.5
  const bGradeBodyThresh =
    strategyForSignals === eliteContextStr
      ? (eliteVolRegime === 'medium' ? ecbBGradeBodyMedium : ecbBGradeBodyOther)
      : (eliteVolRegime === 'medium' ? 55 : 45)
  const bGradeVolThresh =
    strategyForSignals === eliteContextStr
      ? (eliteVolRegime === 'medium' ? ecbBGradeVolMedium : ecbBGradeVolOther)
      : (eliteVolRegime === 'medium' ? 2.0 : 1.5)

  const ecbMaxBreakRangeAtrMult = Math.max(0.5, Number(settings.ecbMaxBreakCandleRangeAtrMult ?? 4))
  const ecbBreakClosePosBullMin = Math.max(50, Math.min(99, Number(settings.ecbBreakClosePosBullMinPct ?? 75))) / 100
  const ecbBreakClosePosBearMax = Math.max(1, Math.min(50, Number(settings.ecbBreakClosePosBearMaxPct ?? 25))) / 100
  const eliteBreakGradeBull = (() => {
    if (eliteBreakoutBullIdx < 0) return 0
    const i       = eliteBreakoutBullIdx
    const range   = highs[i] - lows[i]
    const body    = Math.abs(closes[i] - opens[i])
    const bodyPct = range > 0 ? (body / range) * 100 : 0
    const volMult = avgVol > 0 ? Number(candles[i]?.volume ?? 0) / avgVol : 1
    if (range > currentAtr * ecbMaxBreakRangeAtrMult || closes[i] <= opens[i]) return 0
    if (closes[i] < lows[i] + range * ecbBreakClosePosBullMin) return 0
    if (i >= 3) {
      const breakVol     = Number(candles[i]?.volume ?? 0)
      const recentAvgVol = (Number(candles[i-1]?.volume ?? 0) + Number(candles[i-2]?.volume ?? 0) + Number(candles[i-3]?.volume ?? 0)) / 3
      if (recentAvgVol > 0 && breakVol <= recentAvgVol) return 0
    }
    const ultraTight = eliteBullConsolidRange < currentAtr * eliteConsolLen * 0.8
    if (bodyPct >= aGradeBodyThresh && volMult >= aGradeVolThresh && ultraTight) return 2
    if (bodyPct >= bGradeBodyThresh && volMult >= bGradeVolThresh) return 1
    return 0
  })()
  const eliteBreakGradeBear = (() => {
    if (eliteBreakoutBearIdx < 0) return 0
    const i       = eliteBreakoutBearIdx
    const range   = highs[i] - lows[i]
    const body    = Math.abs(closes[i] - opens[i])
    const bodyPct = range > 0 ? (body / range) * 100 : 0
    const volMult = avgVol > 0 ? Number(candles[i]?.volume ?? 0) / avgVol : 1
    if (range > currentAtr * ecbMaxBreakRangeAtrMult || closes[i] >= opens[i]) return 0
    if (closes[i] > lows[i] + range * ecbBreakClosePosBearMax) return 0
    if (i >= 3) {
      const breakVol     = Number(candles[i]?.volume ?? 0)
      const recentAvgVol = (Number(candles[i-1]?.volume ?? 0) + Number(candles[i-2]?.volume ?? 0) + Number(candles[i-3]?.volume ?? 0)) / 3
      if (recentAvgVol > 0 && breakVol <= recentAvgVol) return 0
    }
    const ultraTight = eliteBearConsolidRange < currentAtr * eliteConsolLen * 0.8
    if (bodyPct >= aGradeBodyThresh && volMult >= aGradeVolThresh && ultraTight) return 2
    if (bodyPct >= bGradeBodyThresh && volMult >= bGradeVolThresh) return 1
    return 0
  })()
  const eliteIsAGradeBull = eliteBreakGradeBull === 2
  const eliteIsAGradeBear = eliteBreakGradeBear === 2

  // Retest: wick within 0–0.3×ATR of swing, close holds above/below, vol ≤70% of breakout
  let eliteRetestBull = false, eliteRetestEmaAlignBull = false
  let eliteRetestBear = false, eliteRetestEmaAlignBear = false
  let eliteBreakVolBull = 0, eliteRetestVolBull = 0
  let eliteBreakVolBear = 0, eliteRetestVolBear = 0

  if (eliteBreakoutBullIdx >= 0 && eliteBreakoutBullIdx < lastIdx) {
    eliteBreakVolBull = Number(candles[eliteBreakoutBullIdx]?.volume ?? 0)
    for (let i = eliteBreakoutBullIdx + 1; i <= lastIdx; i++) {
      const nearSwing = eliteSwingHigh > 0 &&
        lows[i] <= eliteSwingHigh + currentAtr * eliteRetestAtrMult &&
        lows[i] >= eliteSwingHigh - currentAtr * eliteRetestAtrMult
      if (nearSwing && closes[i] >= eliteSwingHigh) {
        eliteRetestBull         = true
        eliteRetestVolBull      = Number(candles[i]?.volume ?? 0)
        const e20i              = ema20[i]
        const maxPct = Math.max(0.01, Number(settings.ecbRetestEma20MaxDistPct ?? 0.3)) / 100
        eliteRetestEmaAlignBull = typeof e20i === 'number' && Math.abs(lows[i] - e20i) / e20i <= maxPct
        break
      }
    }
  }
  if (eliteBreakoutBearIdx >= 0 && eliteBreakoutBearIdx < lastIdx) {
    eliteBreakVolBear = Number(candles[eliteBreakoutBearIdx]?.volume ?? 0)
    for (let i = eliteBreakoutBearIdx + 1; i <= lastIdx; i++) {
      const nearSwing = eliteSwingLow < Infinity &&
        highs[i] >= eliteSwingLow - currentAtr * eliteRetestAtrMult &&
        highs[i] <= eliteSwingLow + currentAtr * eliteRetestAtrMult
      if (nearSwing && closes[i] <= eliteSwingLow) {
        eliteRetestBear         = true
        eliteRetestVolBear      = Number(candles[i]?.volume ?? 0)
        const e20i              = ema20[i]
        const maxPct = Math.max(0.01, Number(settings.ecbRetestEma20MaxDistPct ?? 0.3)) / 100
        eliteRetestEmaAlignBear = typeof e20i === 'number' && Math.abs(highs[i] - e20i) / e20i <= maxPct
        break
      }
    }
  }
  const retestVolMaxFrac = Math.max(0.05, Number(settings.ecbRetestVolMaxFracOfBreak ?? 0.7))
  const eliteRetestVolOkBull = eliteRetestBull && eliteBreakVolBull > 0 && eliteRetestVolBull <= eliteBreakVolBull * retestVolMaxFrac
  const eliteRetestVolOkBear = eliteRetestBear && eliteBreakVolBear > 0 && eliteRetestVolBear <= eliteBreakVolBear * retestVolMaxFrac

  // ── Elite Retest Reversal — reversal candle on current bar ───────────────
  const errCandleBodyPct = (() => {
    const range = highs[lastIdx] - lows[lastIdx]
    const body  = Math.abs(closes[lastIdx] - opens[lastIdx])
    return range > 0 ? (body / range) * 100 : 100
  })()
  const errRetestRevBull =
    eliteBreakoutBullIdx >= 0 && eliteSwingHigh > 0 &&
    lows[lastIdx]  <= eliteSwingHigh + currentAtr * eliteRetestAtrMult &&
    lows[lastIdx]  >= eliteSwingHigh - currentAtr * eliteRetestAtrMult &&
    closes[lastIdx] > eliteSwingHigh && isBullCandle && errCandleBodyPct >= Math.max(10, Math.min(90, Number(settings.errReversalBodyMinPct ?? 50)))
  const errRetestRevBear =
    eliteBreakoutBearIdx >= 0 && eliteSwingLow < Infinity &&
    highs[lastIdx] >= eliteSwingLow - currentAtr * eliteRetestAtrMult &&
    highs[lastIdx] <= eliteSwingLow + currentAtr * eliteRetestAtrMult &&
    closes[lastIdx] < eliteSwingLow && isBearCandle && errCandleBodyPct >= Math.max(10, Math.min(90, Number(settings.errReversalBodyMinPct ?? 50)))
  const errVolBull         = errRetestRevBull ? Number(candles[lastIdx]?.volume ?? 0) : 0
  const errRetestVolOkBull = errRetestRevBull && eliteBreakVolBull > 0 && errVolBull <= eliteBreakVolBull * 0.7
  const errVolBear         = errRetestRevBear ? Number(candles[lastIdx]?.volume ?? 0) : 0
  const errRetestVolOkBear = errRetestRevBear && eliteBreakVolBear > 0 && errVolBear <= eliteBreakVolBear * 0.7
  const e20Last         = typeof ema20[lastIdx] === 'number' ? ema20[lastIdx] as number : null
  const errEmaAlignBull = errRetestRevBull && e20Last !== null && Math.abs(lows[lastIdx]  - e20Last) / e20Last <= 0.003
  const errEmaAlignBear = errRetestRevBear && e20Last !== null && Math.abs(highs[lastIdx] - e20Last) / e20Last <= 0.003

  // Liquidity sweep: wick below recent swing low (bull) or above swing high (bear) with close back
  const liqSweepWindow = 20
  const eliteLiquiditySweepBull = (() => {
    const start = Math.max(2, lastIdx - liqSweepWindow)
    for (let i = start; i <= lastIdx - 2; i++) {
      if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
        const swLow = lows[i]
        for (let j = i + 1; j <= lastIdx; j++) {
          if (lows[j] < swLow && closes[j] > swLow) return true
        }
      }
    }
    return false
  })()
  const eliteLiquiditySweepBear = (() => {
    const start = Math.max(2, lastIdx - liqSweepWindow)
    for (let i = start; i <= lastIdx - 2; i++) {
      if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
        const swHigh = highs[i]
        for (let j = i + 1; j <= lastIdx; j++) {
          if (highs[j] > swHigh && closes[j] < swHigh) return true
        }
      }
    }
    return false
  })()

  // Auxiliary quality signals
  const eliteEmaBull    = currentPrice > currentEma50
  const eliteEmaBear    = currentPrice < currentEma50
  const eliteEma200Bull = currentPrice > currentEma200
  const eliteEma200Bear = currentPrice < currentEma200
  const eliteRsiBull    = currentRsi >= 45 && currentRsi <= 70
  const eliteRsiBear    = currentRsi >= 30 && currentRsi <= 55
  const eliteMacdBull   = currentMacdHist > 0
  const eliteMacdBear   = currentMacdHist < 0

  // Order Blocks and FVG — slice to lastIdx-bounded view so detectors find the correct "last" bar
  const _opensView  = effectiveLen < opens.length  ? opens.slice(0, effectiveLen)  : opens
  const _highsView  = effectiveLen < highs.length  ? highs.slice(0, effectiveLen)  : highs
  const _lowsView   = effectiveLen < lows.length   ? lows.slice(0, effectiveLen)   : lows
  const _closesView = effectiveLen < closes.length ? closes.slice(0, effectiveLen) : closes
  const eliteOBs    = detectOrderBlocks(_opensView, _highsView, _lowsView, _closesView, 60)
  const eliteBullOB = eliteOBs.bullOB
  const eliteBearOB = eliteOBs.bearOB
  const eliteFVGZones: FVGZone[] = detectFVGZones(_highsView, _lowsView, 60)
  const eliteFVGBull = eliteFVGZones.some(z => z.type === 'bull' && z.top < currentPrice)
  const eliteFVGBear = eliteFVGZones.some(z => z.type === 'bear' && z.bottom > currentPrice)

  const entryBuyOk  = !settings.filterEntryConfirmation || eliteBreakoutBullIdx >= 0 || isBullCandle
  const entrySellOk = !settings.filterEntryConfirmation || eliteBreakoutBearIdx >= 0 || isBearCandle

  type Signal = { active: boolean; direction: 'buy' | 'sell'; label: string; quality: number }

  const detectedPattern = detectChartPatterns(_highsView, _lowsView, _closesView)

  const baseSignals: Signal[] = (() => {
    if (strategyForSignals === stStr) {
      const atrPeriod = settings.stAtrPeriod ?? 10
      const mult = settings.stAtrMult ?? 3
      const requireFlip = settings.stRequireFlip ?? true
      const useRelVol = settings.stUseRelVol ?? true
      const relVolLen = settings.stRelVolLen ?? 20
      const relVolMin = settings.stRelVolMin ?? 1.5
      const useKernel = settings.stUseKernel ?? false
      const kLookback = settings.stKernelLookback ?? 20
      const kBandwidth = settings.stKernelBandwidth ?? 6
      const useHtf = settings.stUseHTFAlign ?? true
      const htfEmaLen = settings.stHtfEmaLen ?? 200
      const useHtfSlope = settings.stUseHtfEmaSlope ?? false
      const htfSlopeLookback = settings.stHtfEmaSlopeLookback ?? 3
      const htfSlopeMinPctPerBar = settings.stHtfEmaSlopeMinPctPerBar ?? 0
      const useEmaDistance = settings.stUseEmaDistance ?? false
      const emaDistAtrMin = settings.stEmaDistAtrMin ?? 0.6
      const useImpulse = settings.stUseImpulse ?? false
      const impulseBodyMinPct = settings.stImpulseBodyMinPct ?? 55
      const impulseWickMaxPct = settings.stImpulseWickMaxPct ?? 30
      const useKdeRegime = settings.stUseKdeRegime ?? false
      const kdeRegimeLookback = settings.stKdeRegimeLookback ?? 200
      const kdeRegimeBw = settings.stKdeRegimeBandwidth ?? 0.8
      const kdeRegimeMaxConc = settings.stKdeRegimeMaxConcentration ?? 0.55
      const useKdeVa = settings.stUseKdeValueArea ?? false
      const kdeVaLookback = settings.stKdeValueAreaLookback ?? 260
      const kdeVaBw = settings.stKdeValueAreaBandwidth ?? 0.8
      const kdeVaMaxDensity = settings.stKdeValueAreaMaxDensity ?? 0.6

      const _stHighs  = effectiveLen < highs.length  ? highs.slice(0, effectiveLen)  : highs
      const _stLows   = effectiveLen < lows.length   ? lows.slice(0, effectiveLen)   : lows
      const _stCloses = effectiveLen < closes.length ? closes.slice(0, effectiveLen) : closes
      const st = calculateSupertrend({
        highs: _stHighs,
        lows: _stLows,
        closes: _stCloses,
        atrPeriod,
        multiplier: mult,
        useKernel,
        kernelLookback: kLookback,
        kernelBandwidth: kBandwidth,
      })
      const dirNow = st.direction[lastIdx]
      const dirPrev = st.direction[lastIdx - 1]
      const flipToBull = dirPrev === 'bear' && dirNow === 'bull'
      const flipToBear = dirPrev === 'bull' && dirNow === 'bear'
      const trendBull = dirNow === 'bull'
      const trendBear = dirNow === 'bear'
      const gateTrendLong = requireFlip ? flipToBull : trendBull
      const gateTrendShort = requireFlip ? flipToBear : trendBear

      const relVol = (() => {
        const len = Math.max(5, Math.floor(relVolLen))
        const start = Math.max(0, lastIdx - len)
        const slice = candles.slice(start, lastIdx)
        if (slice.length === 0) return 1
        const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
        const now = Number(candles[lastIdx].volume || 0)
        const hasVol = avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
        return hasVol ? now / avg : 1
      })()
      const avgVolOk = (() => {
        const len = Math.max(5, Math.floor(relVolLen))
        const start = Math.max(0, lastIdx - len)
        const slice = candles.slice(start, lastIdx)
        if (slice.length === 0) return false
        const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
        const now = Number(candles[lastIdx].volume || 0)
        return avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
      })()
      // Fail CLOSED: zero/missing volume must not pass the strategy's namesake filter.
      const gateRelVol = !useRelVol || (avgVolOk && relVol >= relVolMin)

      const htfFallback = !(htfClosesArr && htfLen >= Math.max(60, htfEmaLen + 5))
      const htfCloses = htfFallback ? closes : (htfClosesArr as number[])
      const htfLast = htfFallback ? lastIdx : htfLastIdx
      const htfEma = (() => {
        if (!htfFallback && htfEmaLen === 50  && cache?.htfEma50)  return cache.htfEma50
        if (!htfFallback && htfEmaLen === 200 && cache?.htfEma200) return cache.htfEma200
        return calculateEMA(htfCloses, htfEmaLen)
      })()
      const htfClose = htfCloses[htfLast]
      const htfEmaV = htfEma[htfLast]
      const hasHtfEma = typeof htfEmaV === 'number' && Number.isFinite(htfEmaV)
      const htfBull = hasHtfEma && Number.isFinite(htfClose) ? htfClose > htfEmaV : null
      // Fail CLOSED: when the HTF EMA can't be computed the enabled gate blocks BOTH sides
      // instead of waving both through.
      const gateHtfLong = !useHtf || htfBull === true
      const gateHtfShort = !useHtf || htfBull === false

      const htfSlope = (() => {
        if (!useHtfSlope) return { longOk: true, shortOk: true, slopePctPerBar: null as number | null }
        const lb = Math.max(1, Math.floor(htfSlopeLookback))
        const min = Math.max(0, Number(htfSlopeMinPctPerBar) || 0)
        const i1 = htfLast
        const i0 = htfLast - lb
        if (!hasHtfEma || i0 < 0) return { longOk: true, shortOk: true, slopePctPerBar: null as number | null }
        const e1 = htfEma[i1]
        const e0 = htfEma[i0]
        if (typeof e1 !== 'number' || typeof e0 !== 'number' || !Number.isFinite(e1) || !Number.isFinite(e0)) {
          return { longOk: true, shortOk: true, slopePctPerBar: null as number | null }
        }
        const denom = Math.abs(e1)
        if (!(denom > 0) || !Number.isFinite(denom)) return { longOk: true, shortOk: true, slopePctPerBar: null as number | null }
        const slopePctPerBar = ((e1 - e0) / denom) * (100 / lb)
        return { longOk: slopePctPerBar > min, shortOk: slopePctPerBar < -min, slopePctPerBar }
      })()
      const gateHtfSlopeLong = htfSlope.longOk
      const gateHtfSlopeShort = htfSlope.shortOk

      const stAtrArr = calculateATR(_stHighs, _stLows, _stCloses, Math.max(2, Math.floor(atrPeriod)))
      const stAtrNow = stAtrArr[lastIdx]
      const emaDistAtr = (hasHtfEma && typeof stAtrNow === 'number' && Number.isFinite(stAtrNow) && stAtrNow > 0)
        ? Math.abs(currentPrice - (htfEmaV as number)) / stAtrNow
        : null
      const gateEmaDistance = !useEmaDistance || emaDistAtr === null || emaDistAtr >= emaDistAtrMin

      const impulse = (() => {
        const o = Number(opens[lastIdx] ?? 0)
        const h = Number(highs[lastIdx] ?? 0)
        const l = Number(lows[lastIdx] ?? 0)
        const c = Number(closes[lastIdx] ?? 0)
        const range = h - l
        if (!(range > 0) || !Number.isFinite(range)) return { longOk: true, shortOk: true, bodyPct: 0, upperWickPct: 100, lowerWickPct: 100 }
        const bodyPct = (Math.abs(c - o) / range) * 100
        const upperWick = h - Math.max(o, c)
        const lowerWick = Math.min(o, c) - l
        const upperWickPct = (upperWick / range) * 100
        const lowerWickPct = (lowerWick / range) * 100
        const longOk = isBullCandle && bodyPct >= impulseBodyMinPct && upperWickPct <= impulseWickMaxPct
        const shortOk = isBearCandle && bodyPct >= impulseBodyMinPct && lowerWickPct <= impulseWickMaxPct
        return { longOk, shortOk, bodyPct, upperWickPct, lowerWickPct }
      })()
      const gateImpulseLong = !useImpulse || impulse.longOk
      const gateImpulseShort = !useImpulse || impulse.shortOk

      const kdeScore = (samples: number[], x: number, bw: number): number => {
        const h = Math.max(0.000001, Number(bw) || 0.000001)
        if (!samples || samples.length === 0 || !Number.isFinite(x)) return 0
        let sum = 0
        let n = 0
        for (let i = 0; i < samples.length; i++) {
          const v = samples[i]
          if (typeof v !== 'number' || !Number.isFinite(v)) continue
          const d = (x - v) / h
          sum += Math.exp(-0.5 * d * d)
          n++
        }
        return n > 0 ? sum / n : 0
      }

      const kdeRegime = (() => {
        const lb = Math.max(50, Math.floor(kdeRegimeLookback))
        const start = Math.max(1, lastIdx - lb + 1)
        const xs: number[] = []
        for (let i = start; i <= lastIdx; i++) {
          const a = stAtrArr[i]
          const c0 = Number(closes[i - 1] ?? 0)
          const c1 = Number(closes[i] ?? 0)
          if (typeof a !== 'number' || !Number.isFinite(a) || !(a > 0)) continue
          if (!Number.isFinite(c0) || !Number.isFinite(c1)) continue
          xs.push((c1 - c0) / a)
        }
        if (xs.length < 20) return { ok: true, conc: null as number | null }
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length
        const var0 = xs.reduce((a, b) => {
          const d = b - mean
          return a + d * d
        }, 0) / Math.max(1, xs.length - 1)
        const stdev = Math.sqrt(var0)
        if (!(stdev > 0) || !Number.isFinite(stdev)) return { ok: true, conc: null as number | null }
        const h = Math.max(0.000001, kdeRegimeBw * stdev)
        const dens0 = kdeScore(xs, 0, h)
        const minX = mean - 2 * stdev
        const maxX = mean + 2 * stdev
        let densMax = 0
        for (let k = 0; k <= 20; k++) {
          const x = minX + (k / 20) * (maxX - minX)
          densMax = Math.max(densMax, kdeScore(xs, x, h))
        }
        const conc = densMax > 0 ? dens0 / densMax : 1
        return { ok: conc <= kdeRegimeMaxConc, conc }
      })()
      const gateKdeRegime = !useKdeRegime || kdeRegime.ok

      const kdeVa = (() => {
        const lb = Math.max(80, Math.floor(kdeVaLookback))
        const start = Math.max(0, lastIdx - lb + 1)
        const slice = closes.slice(start, lastIdx + 1).map((v) => Number(v ?? 0)).filter((v) => Number.isFinite(v))
        if (slice.length < 40) return { ok: true, dens: null as number | null }
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length
        const var0 = slice.reduce((a, b) => {
          const d = b - mean
          return a + d * d
        }, 0) / Math.max(1, slice.length - 1)
        const stdev = Math.sqrt(var0)
        if (!(stdev > 0) || !Number.isFinite(stdev)) return { ok: true, dens: null as number | null }
        const zs = slice.map((v) => (v - mean) / stdev)
        const zNow = (currentPrice - mean) / stdev
        const h = Math.max(0.000001, kdeVaBw)
        const dens0 = kdeScore(zs, zNow, h)
        let densMax = 0
        for (let k = 0; k <= 24; k++) {
          const x = -3 + (k / 24) * 6
          densMax = Math.max(densMax, kdeScore(zs, x, h))
        }
        const dens = densMax > 0 ? dens0 / densMax : 1
        return { ok: dens <= kdeVaMaxDensity, dens }
      })()
      const gateKdeVa = !useKdeVa || kdeVa.ok

      const useAdx = settings.stUseAdx ?? false
      const adxPeriod = settings.stAdxPeriod ?? 14
      const adxMin = settings.stAdxMin ?? 22
      const stAdxArr = calculateADX(_stHighs, _stLows, _stCloses, Math.max(2, Math.floor(adxPeriod)))
      const stAdxNow = stAdxArr[lastIdx]
      const gateAdx = !useAdx || (typeof stAdxNow === 'number' && Number.isFinite(stAdxNow) && stAdxNow >= adxMin)

      const useDiAlign = settings.stUseDiAlign ?? false
      const diPeriod = settings.stDiPeriod ?? adxPeriod
      const di = calculateDI(_stHighs, _stLows, _stCloses, Math.max(2, Math.floor(diPeriod)))
      const diPlus = di.plus[lastIdx]
      const diMinus = di.minus[lastIdx]
      const hasDi = typeof diPlus === 'number' && typeof diMinus === 'number' && Number.isFinite(diPlus) && Number.isFinite(diMinus)
      // Fail CLOSED: missing DI data blocks both sides while the gate is enabled.
      const gateDiLong = !useDiAlign || (hasDi && diPlus > diMinus)
      const gateDiShort = !useDiAlign || (hasDi && diMinus > diPlus)

      // Enabled filters are HARD GATES in BOTH modes. Confluence mode previously gated only
      // on the flip and demoted RelVol/HTF/ADX to optional score boosters — the UI describes
      // them as requirements, and under shipped defaults the strategy fired without them.
      const longAll = gateTrendLong && gateRelVol && gateHtfLong && gateHtfSlopeLong && gateAdx && gateDiLong && gateEmaDistance && gateImpulseLong && gateKdeRegime && gateKdeVa
      const shortAll = gateTrendShort && gateRelVol && gateHtfShort && gateHtfSlopeShort && gateAdx && gateDiShort && gateEmaDistance && gateImpulseShort && gateKdeRegime && gateKdeVa
      if (!longAll && !shortAll) return []

      const out: Signal[] = []
      if (longAll) {
        out.push({ active: true, direction: 'buy', label: requireFlip ? 'Supertrend Flip' : 'Supertrend Trend', quality: 6 })
        if (useRelVol && avgVolOk && relVol >= relVolMin) out.push({ active: true, direction: 'buy', label: 'RelVol', quality: 4 })
        if (useHtf && htfBull === true) out.push({ active: true, direction: 'buy', label: 'HTF EMA', quality: 4 })
        if (useHtfSlope && gateHtfSlopeLong && htfSlope.slopePctPerBar !== null) out.push({ active: true, direction: 'buy', label: 'HTF Slope', quality: 3 })
        if (useAdx && gateAdx) out.push({ active: true, direction: 'buy', label: 'ADX', quality: 4 })
        if (useDiAlign && hasDi && gateDiLong) out.push({ active: true, direction: 'buy', label: 'DI Align', quality: 3 })
        if (useEmaDistance && gateEmaDistance && emaDistAtr !== null) out.push({ active: true, direction: 'buy', label: 'EMA Dist', quality: 3 })
        if (useImpulse && gateImpulseLong) out.push({ active: true, direction: 'buy', label: 'Impulse', quality: 3 })
        if (useKdeRegime && gateKdeRegime && kdeRegime.conc !== null) out.push({ active: true, direction: 'buy', label: 'KDE Regime', quality: 3 })
        if (useKdeVa && gateKdeVa && kdeVa.dens !== null) out.push({ active: true, direction: 'buy', label: 'KDE VA', quality: 3 })
        if (useKernel) out.push({ active: true, direction: 'buy', label: 'Kernel', quality: 3 })
      }
      if (shortAll) {
        out.push({ active: true, direction: 'sell', label: requireFlip ? 'Supertrend Flip' : 'Supertrend Trend', quality: 6 })
        if (useRelVol && avgVolOk && relVol >= relVolMin) out.push({ active: true, direction: 'sell', label: 'RelVol', quality: 4 })
        if (useHtf && htfBull === false) out.push({ active: true, direction: 'sell', label: 'HTF EMA', quality: 4 })
        if (useHtfSlope && gateHtfSlopeShort && htfSlope.slopePctPerBar !== null) out.push({ active: true, direction: 'sell', label: 'HTF Slope', quality: 3 })
        if (useAdx && gateAdx) out.push({ active: true, direction: 'sell', label: 'ADX', quality: 4 })
        if (useDiAlign && hasDi && gateDiShort) out.push({ active: true, direction: 'sell', label: 'DI Align', quality: 3 })
        if (useEmaDistance && gateEmaDistance && emaDistAtr !== null) out.push({ active: true, direction: 'sell', label: 'EMA Dist', quality: 3 })
        if (useImpulse && gateImpulseShort) out.push({ active: true, direction: 'sell', label: 'Impulse', quality: 3 })
        if (useKdeRegime && gateKdeRegime && kdeRegime.conc !== null) out.push({ active: true, direction: 'sell', label: 'KDE Regime', quality: 3 })
        if (useKdeVa && gateKdeVa && kdeVa.dens !== null) out.push({ active: true, direction: 'sell', label: 'KDE VA', quality: 3 })
        if (useKernel) out.push({ active: true, direction: 'sell', label: 'Kernel', quality: 3 })
      }
      return out
    }

    if (strategyForSignals === sqzStr) {
      const bbLen = settings.sqzBbLen ?? 20
      const bbStd = settings.sqzBbStd ?? 2.0
      const kcLen = settings.sqzKcLen ?? 20
      const kcMult = settings.sqzKcMult ?? 1.5
      const momLen = settings.sqzMomLen ?? 20
      const requireRelease = settings.sqzRequireRelease ?? true
      const minSqueezeBars = Math.max(1, Math.floor(settings.sqzMinSqueezeBars ?? 2))
      const requireMomRising = settings.sqzRequireMomRising ?? true
      const useHtf = settings.sqzUseHtfAlign ?? false
      const htfEmaLen = settings.sqzHtfEmaLen ?? 200
      const useAdx = settings.sqzUseAdx ?? false
      const adxMin = settings.sqzAdxMin ?? 18
      const useVol = settings.sqzUseVolume ?? false
      const volLen = settings.sqzVolLen ?? 20
      const minVolRatio = settings.sqzMinVolumeRatio ?? 1.2

      const _sqzHighs  = effectiveLen < highs.length  ? highs.slice(0, effectiveLen)  : highs
      const _sqzLows   = effectiveLen < lows.length   ? lows.slice(0, effectiveLen)   : lows
      const _sqzCloses = effectiveLen < closes.length ? closes.slice(0, effectiveLen) : closes
      const sqz = calculateSqueezeMomentum(_sqzHighs, _sqzLows, _sqzCloses, { bbLen, bbStd, kcLen, kcMult, momLen })

      const onNow = sqz.squeezeOn[lastIdx]
      const onPrev = sqz.squeezeOn[lastIdx - 1]
      const momNow = sqz.momentum[lastIdx]
      const momPrev = sqz.momentum[lastIdx - 1]
      if (typeof momNow !== 'number' || !Number.isFinite(momNow)) return []

      // Squeeze must have been ON for >= minSqueezeBars, then release (flip to OFF) this bar.
      const releasedNow = onPrev === true && onNow === false
      let wasSqueezed = true
      for (let k = 1; k <= minSqueezeBars; k++) {
        if (sqz.squeezeOn[lastIdx - k] !== true) { wasSqueezed = false; break }
      }
      const fired = requireRelease ? (releasedNow && wasSqueezed) : (onNow === false)
      if (!fired) return []

      const hasPrevMom = typeof momPrev === 'number' && Number.isFinite(momPrev)
      const momRising = hasPrevMom ? momNow > (momPrev as number) : true
      const momFalling = hasPrevMom ? momNow < (momPrev as number) : true
      const longMom = momNow > 0 && (!requireMomRising || momRising)
      const shortMom = momNow < 0 && (!requireMomRising || momFalling)

      // HTF EMA trend filter (same fallback pattern as Supertrend).
      const htfFallback = !(htfClosesArr && htfLen >= Math.max(60, htfEmaLen + 5))
      const htfCloses = htfFallback ? closes : (htfClosesArr as number[])
      const htfLast = htfFallback ? lastIdx : htfLastIdx
      const htfEma = (() => {
        if (!htfFallback && htfEmaLen === 200 && cache?.htfEma200) return cache.htfEma200
        if (!htfFallback && htfEmaLen === 50  && cache?.htfEma50)  return cache.htfEma50
        return calculateEMA(htfCloses, htfEmaLen)
      })()
      const htfEmaV = htfEma[htfLast]
      const htfClose = htfCloses[htfLast]
      const hasHtfEma = typeof htfEmaV === 'number' && Number.isFinite(htfEmaV)
      const htfBull = hasHtfEma && Number.isFinite(htfClose) ? htfClose > (htfEmaV as number) : null
      const gateHtfLong = !useHtf || htfBull === null || htfBull
      const gateHtfShort = !useHtf || htfBull === null || !htfBull

      const sqzAdxArr = calculateADX(_sqzHighs, _sqzLows, _sqzCloses, 14)
      const adxNow = sqzAdxArr[lastIdx]
      const gateAdx = !useAdx || (typeof adxNow === 'number' && Number.isFinite(adxNow) && adxNow >= adxMin)

      const relVol = (() => {
        const len = Math.max(5, Math.floor(volLen))
        const start = Math.max(0, lastIdx - len)
        const slice = candles.slice(start, lastIdx)
        if (slice.length === 0) return 1
        const avg = slice.reduce((a, c) => a + Number(c.volume || 0), 0) / slice.length
        const now = Number(candles[lastIdx].volume || 0)
        return avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now) ? now / avg : 1
      })()
      const gateVol = !useVol || relVol >= minVolRatio

      const out: Signal[] = []
      if (longMom && gateHtfLong && gateAdx && gateVol) {
        out.push({ active: true, direction: 'buy', label: 'Squeeze Fire', quality: 6 })
        out.push({ active: true, direction: 'buy', label: 'Momentum Up', quality: 5 })
        if (useHtf && htfBull === true) out.push({ active: true, direction: 'buy', label: 'HTF EMA', quality: 4 })
        if (useAdx && gateAdx) out.push({ active: true, direction: 'buy', label: 'ADX', quality: 4 })
        if (useVol && gateVol) out.push({ active: true, direction: 'buy', label: 'Vol Expand', quality: 4 })
      }
      if (shortMom && gateHtfShort && gateAdx && gateVol) {
        out.push({ active: true, direction: 'sell', label: 'Squeeze Fire', quality: 6 })
        out.push({ active: true, direction: 'sell', label: 'Momentum Down', quality: 5 })
        if (useHtf && htfBull === false) out.push({ active: true, direction: 'sell', label: 'HTF EMA', quality: 4 })
        if (useAdx && gateAdx) out.push({ active: true, direction: 'sell', label: 'ADX', quality: 4 })
        if (useVol && gateVol) out.push({ active: true, direction: 'sell', label: 'Vol Expand', quality: 4 })
      }
      return out
    }

    if (strategyForSignals === fluxStr) {
      const flux = computeFluxGateDualEngine({
        opens: opens.slice(0, effectiveLen),
        highs: highs.slice(0, effectiveLen),
        lows: lows.slice(0, effectiveLen),
        closes: closes.slice(0, effectiveLen),
        baseLenLong: settings.fgBaseLenLong,
        baseLenShort: settings.fgBaseLenShort,
        guideEmaLen: settings.fgGuideEmaLen,
        volLen: settings.fgVolLen,
        persLen: settings.fgPersLen,
        curvLen: settings.fgCurvLen,
        thresholdKLong: settings.fgThresholdKLong,
        thresholdKShort: settings.fgThresholdKShort,
      })
      if (!flux) return []

      const useADX = settings.fgUseADX ?? true
      const adxMin = settings.fgAdxMin ?? 22
      const gate1Adx = !useADX || currentAdx >= adxMin

      const useSession = settings.fgUseSession ?? true
      const sessionStartUtc = settings.fgSessionStartUtc ?? 8
      const sessionEndUtc = settings.fgSessionEndUtc ?? 12
      const utcHour = (() => {
        const t = candles[lastIdx]?.time
        if (typeof t !== 'number' || !Number.isFinite(t)) return null
        return new Date(t * 1000).getUTCHours()
      })()
      const inSession = (() => {
        if (utcHour === null) return true
        if (sessionStartUtc === sessionEndUtc) return true
        if (sessionStartUtc < sessionEndUtc) return utcHour >= sessionStartUtc && utcHour < sessionEndUtc
        return utcHour >= sessionStartUtc || utcHour < sessionEndUtc
      })()
      const gate2Session = !useSession || inSession

      const candleRange = Number(highs[lastIdx] ?? 0) - Number(lows[lastIdx] ?? 0)

      const fgHtfFallback = !(htfClosesArr && htfLen >= 60)
      const htfCloses = fgHtfFallback ? closes : (htfClosesArr as number[])
      const htfOpens  = fgHtfFallback ? opens  : (htfOpensArr as number[])
      const htfHighs  = fgHtfFallback ? highs  : (htfHighsArr as number[])
      const htfLows   = fgHtfFallback ? lows   : (htfLowsArr  as number[])
      const htfLast   = fgHtfFallback ? lastIdx : htfLastIdx
      const htfAtrArr = (!fgHtfFallback && cache?.htfAtr14) ? cache.htfAtr14 : calculateATR(htfHighs, htfLows, htfCloses, 14)
      const htfAtr = typeof htfAtrArr[htfLast] === 'number'
        ? (htfAtrArr[htfLast] as number)
        : currentAtr
      const tolMult = settings.fgStructureTolAtrMult ?? 0.25
      const tol = htfAtr * tolMult

      const htfEma200 = (!fgHtfFallback && cache?.htfEma200) ? cache.htfEma200 : calculateEMA(htfCloses, 200)
      const htfClose = htfCloses[htfLast]
      const htfEma200v = typeof htfEma200[htfLast] === 'number' ? (htfEma200[htfLast] as number) : htfClose
      const htfBiasBull = Number.isFinite(htfClose) && Number.isFinite(htfEma200v) && htfEma200v > 0 ? htfClose > htfEma200v : currentPrice > currentEma200

      const _htfBaseLen = fgHtfFallback ? effectiveLen : htfLen
      const obs = detectOrderBlocks(htfOpens.slice(0, _htfBaseLen), htfHighs.slice(0, _htfBaseLen), htfLows.slice(0, _htfBaseLen), htfCloses.slice(0, _htfBaseLen), 60)
      const bullOB = obs.bullOB
      const bearOB = obs.bearOB
      const fvgZones = detectFVGZones(htfHighs.slice(0, _htfBaseLen), htfLows.slice(0, _htfBaseLen), 80)
      const nearBullFvg = fvgZones.some((z) => z.type === 'bull' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol)
      const nearBearFvg = fvgZones.some((z) => z.type === 'bear' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol)
      const gate4Demand = !!bullOB
        ? currentPrice >= bullOB.low - tol && currentPrice <= bullOB.high + tol
        : nearBullFvg
      const gate4Supply = !!bearOB
        ? currentPrice >= bearOB.low - tol && currentPrice <= bearOB.high + tol
        : nearBearFvg
      const useStructure = settings.fgUseStructure ?? true
      const gate4DemandFinal = !useStructure || gate4Demand
      const gate4SupplyFinal = !useStructure || gate4Supply

      const div = detectSwingRSIDivergence(closes.slice(0, effectiveLen), rsi.slice(0, effectiveLen), 40, 5)
      const stoch = calculateStochastic(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), 14, 3, 3)
      const prevK = typeof stoch.k[lastIdx - 1] === 'number' ? (stoch.k[lastIdx - 1] as number) : null
      const prevD = typeof stoch.d[lastIdx - 1] === 'number' ? (stoch.d[lastIdx - 1] as number) : null
      const curK = typeof stoch.k[lastIdx] === 'number' ? (stoch.k[lastIdx] as number) : null
      const curD = typeof stoch.d[lastIdx] === 'number' ? (stoch.d[lastIdx] as number) : null
      const stochCrossUp = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK <= prevD && curK > curD
      const stochCrossDown = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK >= prevD && curK < curD
      const stochExtreme = settings.fgStochExtreme ?? false
      const stochOS = settings.fgStochOS ?? 30
      const stochOB = settings.fgStochOB ?? 70
      const stochCrossUpOk = stochCrossUp && (!stochExtreme || (prevK !== null && prevD !== null && Math.min(prevK, prevD) <= stochOS))
      const stochCrossDownOk = stochCrossDown && (!stochExtreme || (prevK !== null && prevD !== null && Math.max(prevK, prevD) >= stochOB))
      const useMom = settings.fgUseMomentum ?? true
      const useDiv = settings.fgUseRsiDivergence ?? false
      const useStoch = settings.fgUseStochCross ?? true
      const momLong = (!useDiv || div.bullDiv) && (!useStoch || stochCrossUpOk)
      const momShort = (!useDiv || div.bearDiv) && (!useStoch || stochCrossDownOk)
      const gate5MomLong = !useMom || momLong
      const gate5MomShort = !useMom || momShort

      const volNow = Number(candles[lastIdx].volume || 0)
      const volPrev = Number(candles[lastIdx - 1]?.volume || 0)
      const vol20 = candles.slice(Math.max(0, lastIdx - 20), lastIdx).map((c) => Number(c.volume || 0))
      const sma20 = vol20.length > 0 ? vol20.reduce((a, b) => a + b, 0) / vol20.length : volNow
      const vol5 = candles.slice(Math.max(0, lastIdx - 5), lastIdx).map((c) => Number(c.volume || 0))
      const sma5 = vol5.length > 0 ? vol5.reduce((a, b) => a + b, 0) / vol5.length : volNow
      const volRatioGate = sma20 > 0 ? volNow / sma20 : 1
      const useVol = settings.fgUseVolume ?? true
      const minVolRatio = settings.fgMinVolumeRatio ?? 1.5
      const requireExpanding = settings.fgRequireVolumeExpanding ?? false
      const expandingOk = !requireExpanding || (volNow > volPrev && sma5 >= sma20)
      const gate6Volume = !useVol || (volRatioGate >= minVolRatio && expandingOk)

      const useCross = settings.fgUseCross ?? true
      const gate3Long = useCross ? flux.longCross : flux.scoreNow > flux.longThresholdNow
      const gate3Short = useCross ? flux.shortCross : flux.scoreNow < flux.shortThresholdNow
      const useHtf = settings.fgUseHTFAlign ?? true
      const gate8CorrLong = !useHtf || htfBiasBull
      const gate8CorrShort = !useHtf || !htfBiasBull

      const useCost = settings.fgUseCost ?? false
      const gate7Cost = !useCost || candleRange <= currentAtr * 2.0

      const useExec = settings.fgUseExecution ?? false
      const avgRange10 = (() => {
        const start = Math.max(0, lastIdx - 10)
        const slice = candles.slice(start, lastIdx + 1)
        if (slice.length === 0) return candleRange
        let sum = 0
        for (const c of slice) sum += Number(c.high || 0) - Number(c.low || 0)
        return sum / slice.length
      })()
      const gate9Execution = !useExec || avgRange10 <= currentAtr * 1.5

      const longAll = gate1Adx && gate2Session && gate3Long && gate4DemandFinal && gate5MomLong && gate6Volume && gate7Cost && gate8CorrLong && gate9Execution
      const shortAll = gate1Adx && gate2Session && gate3Short && gate4SupplyFinal && gate5MomShort && gate6Volume && gate7Cost && gate8CorrShort && gate9Execution
      if (!longAll && !shortAll) return []

      return [
        { active: longAll, direction: 'buy',  label: 'Regime',      quality: 4 },
        { active: longAll, direction: 'buy',  label: 'Session',     quality: 4 },
        { active: longAll, direction: 'buy',  label: 'FluxGate',    quality: 6 },
        { active: longAll, direction: 'buy',  label: 'Structure',   quality: 5 },
        { active: longAll, direction: 'buy',  label: 'Momentum',    quality: 4 },
        { active: longAll, direction: 'buy',  label: 'Volume',      quality: 4 },
        { active: longAll, direction: 'buy',  label: 'Cost',        quality: 3 },
        { active: longAll, direction: 'buy',  label: 'Correlation', quality: 4 },
        { active: longAll, direction: 'buy',  label: 'Execution',   quality: 3 },
        { active: shortAll, direction: 'sell', label: 'Regime',      quality: 4 },
        { active: shortAll, direction: 'sell', label: 'Session',     quality: 4 },
        { active: shortAll, direction: 'sell', label: 'FluxGate',    quality: 6 },
        { active: shortAll, direction: 'sell', label: 'Structure',   quality: 5 },
        { active: shortAll, direction: 'sell', label: 'Momentum',    quality: 4 },
        { active: shortAll, direction: 'sell', label: 'Volume',      quality: 4 },
        { active: shortAll, direction: 'sell', label: 'Cost',        quality: 3 },
        { active: shortAll, direction: 'sell', label: 'Correlation', quality: 4 },
        { active: shortAll, direction: 'sell', label: 'Execution',   quality: 3 },
      ]
    }

    if (strategyForSignals === bbssdStr) {
      const bbLen      = Math.max(5, Math.floor(settings.bbssdLength ?? 20))
      const bbSd       = Math.max(0.5, settings.bbssdStdDev ?? 2.0)
      const stK        = Math.max(3, Math.floor(settings.bbssdStochK ?? 14))
      const stD        = Math.max(1, Math.floor(settings.bbssdStochD ?? 3))
      const stSmooth   = Math.max(1, Math.floor(settings.bbssdStochSmooth ?? 3))
      const stOS       = Math.min(40, Math.max(5, settings.bbssdStochOS ?? 20))
      const stOB       = Math.max(60, Math.min(95, settings.bbssdStochOB ?? 80))
      const lookback   = Math.max(1, Math.floor(settings.bbssdLookbackBars ?? 3))
      const requireZone     = settings.bbssdRequireZone     ?? true
      const zoneFreshOnly   = settings.bbssdZoneFreshOnly   ?? true
      const requireBBTag    = settings.bbssdRequireBBTag    ?? true
      const requireBBReject = settings.bbssdRequireBBReject ?? true
      const requireStochX   = settings.bbssdRequireStochCross ?? true
      const requireRevCdl   = settings.bbssdRequireReversalCandle ?? true
      const useHtfEma200    = settings.bbssdHtfEma200       ?? false
      const useMaxAdx       = settings.bbssdUseMaxAdx       ?? true
      const maxAdx          = Math.max(15, settings.bbssdMaxAdx ?? 22)
      const useVol          = settings.bbssdUseVolume       ?? false
      const minVolRatio     = Math.max(0.5, settings.bbssdMinVolumeRatio ?? 1.2)
      const zoneTolAtr      = Math.max(0.05, settings.bbssdZoneTolAtrMult ?? 0.3)
      const minLegAtr       = Math.max(1.0, settings.bbssdMinLegAtr ?? 2.0)
      const rsiLongMin      = Math.max(0,  settings.bbssdRsiLongMin  ?? 30)
      const rsiLongMax      = Math.min(100, settings.bbssdRsiLongMax  ?? 45)
      const rsiShortMin     = Math.max(0,  settings.bbssdRsiShortMin ?? 55)
      const rsiShortMax     = Math.min(100, settings.bbssdRsiShortMax ?? 70)
      const freshZonesOnly  = settings.bbssdFreshZonesOnly  ?? false
      const requireRsiDiv   = settings.bbssdRequireRsiDiv   ?? false
      const allowObFvg      = settings.bbssdAllowObFvgFallback ?? true
      const revWickRatio    = Math.min(0.95, Math.max(0.3, (settings.bbssdRevWickPct ?? 70) / 100))
      const requireEntryConfirm = settings.bbssdRequireEntryConfirm ?? false

      if (useMaxAdx && currentAdx > maxAdx) return []

      const bb = calculateBollingerBands(closes.slice(0, effectiveLen), bbLen, bbSd)
      const upper = bb.upper[lastIdx]
      const lower = bb.lower[lastIdx]
      const middle = bb.middle[lastIdx]
      if (typeof upper !== 'number' || typeof lower !== 'number' || typeof middle !== 'number') return []

      // BB band condition: when requireBBReject, bar must tag AND close back inside (rejection);
      // otherwise tag-only (low<=lower / high>=upper) is sufficient.
      let bbTagBull = false, bbTagBear = false
      for (let i = Math.max(0, lastIdx - lookback + 1); i <= lastIdx; i++) {
        const lo = bb.lower[i], up = bb.upper[i]
        if (requireBBReject) {
          if (typeof lo === 'number' && lows[i] <= lo && closes[i] > lo) bbTagBull = true
          if (typeof up === 'number' && highs[i] >= up && closes[i] < up) bbTagBear = true
          if (i > 0) {
            const prevLo = bb.lower[i - 1], prevUp = bb.upper[i - 1]
            if (typeof prevLo === 'number' && lows[i - 1] <= prevLo && typeof lo === 'number' && closes[i] > lo) bbTagBull = true
            if (typeof prevUp === 'number' && highs[i - 1] >= prevUp && typeof up === 'number' && closes[i] < up) bbTagBear = true
          }
        } else {
          if (typeof lo === 'number' && lows[i] <= lo) bbTagBull = true
          if (typeof up === 'number' && highs[i] >= up) bbTagBear = true
        }
      }

      const stoch = calculateStochastic(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), stK, stD, stSmooth)
      let stochCrossUp = false, stochCrossDown = false
      let stochOSHit = false, stochOBHit = false
      for (let i = Math.max(1, lastIdx - lookback + 1); i <= lastIdx; i++) {
        const pK = stoch.k[i - 1], pD = stoch.d[i - 1], cK = stoch.k[i], cD = stoch.d[i]
        if (typeof pK !== 'number' || typeof pD !== 'number' || typeof cK !== 'number' || typeof cD !== 'number') continue
        if (pK <= pD && cK > cD && Math.min(pK, pD) <= stOS) stochCrossUp = true
        if (pK >= pD && cK < cD && Math.max(pK, pD) >= stOB) stochCrossDown = true
        if (pK <= stOS) stochOSHit = true
        if (pK >= stOB) stochOBHit = true
      }
      const stochBullOk = requireStochX ? stochCrossUp : stochOSHit
      const stochBearOk = requireStochX ? stochCrossDown : stochOBHit

      const sdZones = detectSupplyDemandZones(opens.slice(0, effectiveLen), highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), currentAtr, 80, minLegAtr, 3)
      const tol = currentAtr * zoneTolAtr
      const maxRetests = freshZonesOnly ? 0 : 2
      const inDemand = sdZones.some(z =>
        z.type === 'demand' &&
        currentPrice >= z.bottom - tol && currentPrice <= z.top + tol &&
        (!zoneFreshOnly || z.retests <= maxRetests),
      )
      const inSupply = sdZones.some(z =>
        z.type === 'supply' &&
        currentPrice >= z.bottom - tol && currentPrice <= z.top + tol &&
        (!zoneFreshOnly || z.retests <= maxRetests),
      )

      // Fallback location: Order Block or unmitigated FVG when no S/D zone matches
      const bbssdOBs = detectOrderBlocks(opens.slice(0, effectiveLen), highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), 60)
      const bbssdFVGs = detectFVGZones(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), 60)
      const inBullOB = !!bbssdOBs.bullOB &&
        currentPrice >= bbssdOBs.bullOB.low - tol && currentPrice <= bbssdOBs.bullOB.high + tol
      const inBearOB = !!bbssdOBs.bearOB &&
        currentPrice >= bbssdOBs.bearOB.low - tol && currentPrice <= bbssdOBs.bearOB.high + tol
      const inBullFVG = bbssdFVGs.some(z =>
        z.type === 'bull' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol,
      )
      const inBearFVG = bbssdFVGs.some(z =>
        z.type === 'bear' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol,
      )
      const inLocationBull = inDemand || (allowObFvg && (inBullOB || inBullFVG))
      const inLocationBear = inSupply || (allowObFvg && (inBearOB || inBearFVG))
      const bullLocLabel = inDemand ? 'Demand Zone' : (allowObFvg && inBullOB) ? 'Bull OB' : (allowObFvg && inBullFVG) ? 'Bull FVG' : 'Demand Zone'
      const bearLocLabel = inSupply ? 'Supply Zone' : (allowObFvg && inBearOB) ? 'Bear OB' : (allowObFvg && inBearFVG) ? 'Bear FVG' : 'Supply Zone'

      // Reversal candle detection — `i` is the index of the candle being tested (defaults to lastIdx)
      const detectBullRev = (i: number) => {
        if (i < 0 || i > lastIdx) return false
        const range = highs[i] - lows[i]
        const body = Math.abs(closes[i] - opens[i])
        if (range <= 0) return false
        const lowerWick = Math.min(opens[i], closes[i]) - lows[i]
        const isHammer = lowerWick >= range * revWickRatio && body <= range * 0.4 && closes[i] >= opens[i]
        const prevBear = i >= 1 && closes[i - 1] < opens[i - 1]
        const isEngulf = prevBear && closes[i] > opens[i] && closes[i] >= opens[i - 1] && opens[i] <= closes[i - 1]
        return isHammer || isEngulf
      }
      const detectBearRev = (i: number) => {
        if (i < 0 || i > lastIdx) return false
        const range = highs[i] - lows[i]
        const body = Math.abs(closes[i] - opens[i])
        if (range <= 0) return false
        const upperWick = highs[i] - Math.max(opens[i], closes[i])
        const isStar = upperWick >= range * revWickRatio && body <= range * 0.4 && closes[i] <= opens[i]
        const prevBull = i >= 1 && closes[i - 1] > opens[i - 1]
        const isEngulf = prevBull && closes[i] < opens[i] && closes[i] <= opens[i - 1] && opens[i] >= closes[i - 1]
        return isStar || isEngulf
      }
      const bullRevCandle = detectBullRev(lastIdx)
      const bearRevCandle = detectBearRev(lastIdx)
      // Entry confirmation (intra-bar, no next-bar delay): current close must break the prior bar's
      // high (longs) or low (shorts). Real price-action confirmation without sacrificing entry speed.
      const entryConfirmBull = !requireEntryConfirm || (lastIdx >= 1 && closes[lastIdx] > highs[lastIdx - 1])
      const entryConfirmBear = !requireEntryConfirm || (lastIdx >= 1 && closes[lastIdx] < lows[lastIdx - 1])

      const volNow = Number(candles[lastIdx].volume || 0)
      const volRatio = avgVol > 0 ? volNow / avgVol : 1
      const volOk = !useVol || volRatio >= minVolRatio

      const htfEma200Bull = (() => {
        if (!htfClosesArr || htfLen < 200 || !_htfEma200Lazy) return false
        const e = _htfEma200Lazy[htfLastIdx]
        return typeof e === 'number' && htfClosesArr[htfLastIdx] > e
      })()
      const htfEma200Bear = (() => {
        if (!htfClosesArr || htfLen < 200 || !_htfEma200Lazy) return false
        const e = _htfEma200Lazy[htfLastIdx]
        return typeof e === 'number' && htfClosesArr[htfLastIdx] < e
      })()
      const htfBullOk = !useHtfEma200 || htfEma200Bull
      const htfBearOk = !useHtfEma200 || htfEma200Bear

      const zoneBullOk = !requireZone || inLocationBull
      const zoneBearOk = !requireZone || inLocationBear
      const bbBullOk   = !requireBBTag || bbTagBull
      const bbBearOk   = !requireBBTag || bbTagBear
      const revBullOk  = !requireRevCdl || bullRevCandle
      const revBearOk  = !requireRevCdl || bearRevCandle

      const rsiLongOk  = currentRsi >= rsiLongMin  && currentRsi <= rsiLongMax
      const rsiShortOk = currentRsi >= rsiShortMin && currentRsi <= rsiShortMax

      const bbssdRsiDiv = requireRsiDiv ? detectSwingRSIDivergence(closes.slice(0, effectiveLen), rsi.slice(0, effectiveLen), 40, 5) : { bullDiv: false, bearDiv: false }
      const rsiDivBullOk = !requireRsiDiv || bbssdRsiDiv.bullDiv
      const rsiDivBearOk = !requireRsiDiv || bbssdRsiDiv.bearDiv

      const requireLiqSweep = settings.bbssdRequireLiqSweep ?? false
      const liqSweepBullOk = !requireLiqSweep || eliteLiquiditySweepBull
      const liqSweepBearOk = !requireLiqSweep || eliteLiquiditySweepBear

      const longAll  = zoneBullOk && bbBullOk && stochBullOk && revBullOk && htfBullOk && volOk && rsiLongOk  && rsiDivBullOk && entryConfirmBull && liqSweepBullOk
      const shortAll = zoneBearOk && bbBearOk && stochBearOk && revBearOk && htfBearOk && volOk && rsiShortOk && rsiDivBearOk && entryConfirmBear && liqSweepBearOk
      if (!longAll && !shortAll) return []

      return [
        { active: longAll && inLocationBull,  direction: 'buy',  label: bullLocLabel,      quality: 6 },
        { active: longAll && bbTagBull,       direction: 'buy',  label: requireBBReject ? 'BB Lower Reject' : 'BB Lower Tag', quality: 5 },
        { active: longAll && stochBullOk,     direction: 'buy',  label: 'Stoch Cross OS',  quality: 5 },
        { active: longAll && bullRevCandle,   direction: 'buy',  label: 'Reversal Candle', quality: 4 },
        { active: longAll && htfEma200Bull,   direction: 'buy',  label: 'HTF EMA200',      quality: 4 },
        { active: longAll && volRatio >= 1.2, direction: 'buy',  label: 'Volume',          quality: 3 },
        { active: longAll && currentAdx < 25, direction: 'buy',  label: 'Range Regime',    quality: 3 },
        { active: longAll && bbssdRsiDiv.bullDiv, direction: 'buy', label: 'RSI Bull Div', quality: 5 },
        { active: longAll && eliteLiquiditySweepBull, direction: 'buy', label: 'Liquidity Sweep', quality: 5 },
        { active: shortAll && inLocationBear, direction: 'sell', label: bearLocLabel,      quality: 6 },
        { active: shortAll && bbTagBear,      direction: 'sell', label: requireBBReject ? 'BB Upper Reject' : 'BB Upper Tag', quality: 5 },
        { active: shortAll && stochBearOk,    direction: 'sell', label: 'Stoch Cross OB',  quality: 5 },
        { active: shortAll && bearRevCandle,  direction: 'sell', label: 'Reversal Candle', quality: 4 },
        { active: shortAll && htfEma200Bear,  direction: 'sell', label: 'HTF EMA200',      quality: 4 },
        { active: shortAll && volRatio >= 1.2,direction: 'sell', label: 'Volume',          quality: 3 },
        { active: shortAll && currentAdx < 25,direction: 'sell', label: 'Range Regime',    quality: 3 },
        { active: shortAll && bbssdRsiDiv.bearDiv, direction: 'sell', label: 'RSI Bear Div', quality: 5 },
        { active: shortAll && eliteLiquiditySweepBear, direction: 'sell', label: 'Liquidity Sweep', quality: 5 },
      ]
    }

    if (strategyForSignals === errStr) {
      if (!eliteInSession) return []
      if (!eliteHtfStructureBull && !eliteHtfStructureBear) return []
      if (!errRetestRevBull && !errRetestRevBear) return []
      return [
        { active: errRetestRevBull,     direction: 'buy',  label: 'Retest Reversal', quality: 6 },
        { active: errRetestVolOkBull,   direction: 'buy',  label: 'RT Volume',       quality: 4 },
        { active: errEmaAlignBull,      direction: 'buy',  label: 'EMA Retest',      quality: 5 },
        { active: eliteIsAGradeBull,    direction: 'buy',  label: 'A-Grade Break',   quality: 5 },
        { active: eliteLiqPoolBull,     direction: 'buy',  label: 'Liq Pool',        quality: 5 },
        { active: eliteIsConsolidBull,  direction: 'buy',  label: 'Consolidation',   quality: 4 },
        { active: eliteHtfStructureBull,direction: 'buy',  label: 'HTF Structure',   quality: 5 },
        { active: eliteHtfEmaBull,      direction: 'buy',  label: 'HTF EMA',         quality: 5 },
        { active: eliteEmaBull,         direction: 'buy',  label: 'EMA50',           quality: 4 },
        { active: eliteEma200Bull,      direction: 'buy',  label: 'EMA200',          quality: 5 },
        { active: eliteRsiBull,         direction: 'buy',  label: 'RSI Zone',        quality: 4 },
        { active: eliteMacdBull,        direction: 'buy',  label: 'MACD',            quality: 4 },
        { active: settings.errHtfEma200 && eliteHtfEma200Bull, direction: 'buy', label: 'HTF EMA200', quality: 5 },
        { active: errRetestRevBear,     direction: 'sell', label: 'Retest Reversal', quality: 6 },
        { active: errRetestVolOkBear,   direction: 'sell', label: 'RT Volume',       quality: 4 },
        { active: errEmaAlignBear,      direction: 'sell', label: 'EMA Retest',      quality: 5 },
        { active: eliteIsAGradeBear,    direction: 'sell', label: 'A-Grade Break',   quality: 5 },
        { active: eliteLiqPoolBear,     direction: 'sell', label: 'Liq Pool',        quality: 5 },
        { active: eliteIsConsolidBear,  direction: 'sell', label: 'Consolidation',   quality: 4 },
        { active: eliteHtfStructureBear,direction: 'sell', label: 'HTF Structure',   quality: 5 },
        { active: eliteHtfEmaBear,      direction: 'sell', label: 'HTF EMA',         quality: 5 },
        { active: eliteEmaBear,         direction: 'sell', label: 'EMA50',           quality: 4 },
        { active: eliteEma200Bear,      direction: 'sell', label: 'EMA200',          quality: 5 },
        { active: eliteRsiBear,         direction: 'sell', label: 'RSI Zone',        quality: 4 },
        { active: eliteMacdBear,        direction: 'sell', label: 'MACD',            quality: 4 },
        { active: settings.errHtfEma200 && eliteHtfEma200Bear, direction: 'sell', label: 'HTF EMA200', quality: 5 },
      ]
    }

    // ── Breakout Retest Strategy Signals ────────────────────────────────────
    // Uses outer scope variables: brSwingHigh, brSwingLow, brBreakoutBullIdx, etc.
    if (strategyForSignals === brStr) {
      const brAtrPct = (currentAtr / currentPrice) * 100
      const brMinAtrPct = Math.max(0, Number(settings.brMinAtrPct ?? 0.4))
      const brVolOk = brAtrPct > brMinAtrPct
      const brRange = highs[lastIdx] - lows[lastIdx]
      const brMaxRangeAtrMult = Math.max(0.1, Number(settings.brMaxRangeAtrMult ?? 3))
      if (Number.isFinite(brRange) && brRange > currentAtr * brMaxRangeAtrMult) return []
      const brBullBias = eliteHtfEmaBull || (!!htfClosesArr && !!htfOpensArr && htfLen >= 20 && (htfClosesArr as number[])[htfLastIdx] > (htfOpensArr as number[])[htfLastIdx])
      const brBearBias = eliteHtfEmaBear || (!!htfClosesArr && !!htfOpensArr && htfLen >= 20 && (htfClosesArr as number[])[htfLastIdx] < (htfOpensArr as number[])[htfLastIdx])
      const brEmaSlopeBars = Math.max(1, Math.floor(Number(settings.brEmaSlopeLookback ?? 10)))
      const emaNow = ema50[lastIdx]
      const emaPrev = ema50[Math.max(0, lastIdx - brEmaSlopeBars)]
      const brEmaSlopeBull = typeof emaNow === 'number' && typeof emaPrev === 'number' && emaNow > emaPrev
      const brEmaSlopeBear = typeof emaNow === 'number' && typeof emaPrev === 'number' && emaNow < emaPrev
      const strongCloseMinPct = Math.max(1, Math.min(99, Number(settings.strongCloseBodyPct ?? 50)))
      const strongCloseOk = !settings.filterStrongClose || errCandleBodyPct >= strongCloseMinPct
      const brBullConfirm = isBullCandle && strongCloseOk
      const brBearConfirm = isBearCandle && strongCloseOk
      const brEntryModel = (['breakout_close', 'retest_hold', 'retest_confirm'] as const).includes(settings.entryModel as any)
        ? (settings.entryModel as 'breakout_close' | 'retest_hold' | 'retest_confirm')
        : 'retest_confirm'

      if (!brVolOk) return []
      const brAdxMin = Math.max(1, Number(settings.brAdxMin ?? 25))
      if (settings.filterADXRegime && currentAdx < brAdxMin) return []
      let bullReady =
        brEntryModel === 'breakout_close'
          ? brBreakoutBullIdx === lastIdx
          : brEntryModel === 'retest_hold'
            ? brRetestBull
            : (brRetestBull && brBullConfirm)
      let bearReady =
        brEntryModel === 'breakout_close'
          ? brBreakoutBearIdx === lastIdx
          : brEntryModel === 'retest_hold'
            ? brRetestBear
            : (brRetestBear && brBearConfirm)

      if (settings.filterHTFAlignment) {
        if (bullReady && !brBullBias) bullReady = false
        if (bearReady && !brBearBias) bearReady = false
        if (bullReady && !brEmaSlopeBull) bullReady = false
        if (bearReady && !brEmaSlopeBear) bearReady = false
      }
      if (settings.filterVolumeConfirmation) {
        if (bullReady && brBreakoutBullIdx >= 0 && brBreakVolBull <= 0) bullReady = false
        if (bearReady && brBreakoutBearIdx >= 0 && brBreakVolBear <= 0) bearReady = false
      }
      if (!bullReady && !bearReady) return []

      const brSignals: Signal[] = [
        { active: brBreakoutBullIdx >= 0, direction: 'buy', label: 'Breakout', quality: 5 },
        { active: brRetestBull, direction: 'buy', label: 'Retest Hold', quality: 6 },
        { active: brBullConfirm, direction: 'buy', label: 'Candle Confirm', quality: 5 },
        { active: brBullBias, direction: 'buy', label: 'HTF Bias', quality: 4 },
        { active: eliteEmaBull, direction: 'buy', label: 'EMA50 Align', quality: 4 },
        { active: currentRsi >= 45 && currentRsi <= 70, direction: 'buy', label: 'RSI Zone', quality: 4 },
        { active: currentMacdHist > 0, direction: 'buy', label: 'MACD Up', quality: 4 },
        { active: brBreakoutBearIdx >= 0, direction: 'sell', label: 'Breakout', quality: 5 },
        { active: brRetestBear, direction: 'sell', label: 'Retest Hold', quality: 6 },
        { active: brBearConfirm, direction: 'sell', label: 'Candle Confirm', quality: 5 },
        { active: brBearBias, direction: 'sell', label: 'HTF Bias', quality: 4 },
        { active: eliteEmaBear, direction: 'sell', label: 'EMA50 Align', quality: 4 },
        { active: currentRsi >= 30 && currentRsi <= 55, direction: 'sell', label: 'RSI Zone', quality: 4 },
        { active: currentMacdHist < 0, direction: 'sell', label: 'MACD Down', quality: 4 },
      ]

      return brSignals
    }

    // Elite Context Breakout
    if (!eliteInSession) return []
    if (!eliteHtfStructureBull && !eliteHtfStructureBear) return []
    if (eliteBreakGradeBull === 0 && eliteBreakGradeBear === 0) return []
    return [
      { active: eliteBreakoutBullIdx >= 0, direction: 'buy',  label: 'Swing Break',   quality: 4 },
      { active: eliteIsAGradeBull,         direction: 'buy',  label: 'A-Grade',        quality: 5 },
      { active: eliteFreshBull,            direction: 'buy',  label: 'Fresh',          quality: 5 },
      { active: eliteLiqPoolBull,          direction: 'buy',  label: 'Liq Pool',       quality: 5 },
      { active: eliteIsConsolidBull,       direction: 'buy',  label: 'Consolidation',  quality: 4 },
      { active: eliteHtfStructureBull,     direction: 'buy',  label: 'HTF Structure',  quality: 5 },
      { active: eliteHtfEmaBull,           direction: 'buy',  label: 'HTF EMA',        quality: 5 },
      { active: eliteRetestBull,           direction: 'buy',  label: 'Retest',         quality: 5 },
      { active: eliteRetestVolOkBull,      direction: 'buy',  label: 'RT Volume',      quality: 4 },
      { active: eliteRetestEmaAlignBull,   direction: 'buy',  label: 'EMA Retest',     quality: 5 },
      { active: eliteEmaBull,              direction: 'buy',  label: 'EMA50',          quality: 4 },
      { active: eliteEma200Bull,           direction: 'buy',  label: 'EMA200',         quality: 5 },
      { active: eliteRsiBull,              direction: 'buy',  label: 'RSI Zone',       quality: 4 },
      { active: eliteMacdBull,             direction: 'buy',  label: 'MACD',           quality: 4 },
      { active: eliteBreakoutBearIdx >= 0, direction: 'sell', label: 'Swing Break',    quality: 4 },
      { active: eliteIsAGradeBear,         direction: 'sell', label: 'A-Grade',        quality: 5 },
      { active: eliteFreshBear,            direction: 'sell', label: 'Fresh',          quality: 5 },
      { active: eliteLiqPoolBear,          direction: 'sell', label: 'Liq Pool',       quality: 5 },
      { active: eliteIsConsolidBear,       direction: 'sell', label: 'Consolidation',  quality: 4 },
      { active: eliteHtfStructureBear,     direction: 'sell', label: 'HTF Structure',  quality: 5 },
      { active: eliteHtfEmaBear,           direction: 'sell', label: 'HTF EMA',        quality: 5 },
      { active: eliteRetestBear,           direction: 'sell', label: 'Retest',         quality: 5 },
      { active: eliteRetestVolOkBear,      direction: 'sell', label: 'RT Volume',      quality: 4 },
      { active: eliteRetestEmaAlignBear,   direction: 'sell', label: 'EMA Retest',     quality: 5 },
      { active: eliteEmaBear,              direction: 'sell', label: 'EMA50',          quality: 4 },
      { active: eliteEma200Bear,           direction: 'sell', label: 'EMA200',         quality: 5 },
      { active: eliteRsiBear,              direction: 'sell', label: 'RSI Zone',       quality: 4 },
      { active: eliteMacdBear,             direction: 'sell', label: 'MACD',           quality: 4 },
    ]
  })()

  const indicatorSignals: Signal[] = detectedPattern
    ? [
        ...baseSignals,
        { active: detectedPattern.direction === 'buy',  direction: 'buy'  as const, label: detectedPattern.pattern, quality: 4 },
        { active: detectedPattern.direction === 'sell', direction: 'sell' as const, label: detectedPattern.pattern, quality: 4 },
      ]
    : baseSignals

  const activeBuySignals  = indicatorSignals.filter((s) => s.active && s.direction === 'buy')
  const activeSellSignals = indicatorSignals.filter((s) => s.active && s.direction === 'sell')

  const make = (signals: typeof indicatorSignals, direction: 'buy' | 'sell') => {
    if (strategyForSignals === fluxStr || strategyForSignals === stStr) {
      if (signals.length === 0) return null
      const avgQuality = signals.reduce((acc, s) => acc + s.quality, 0) / signals.length
      const confluence = signals.length
      const quality = Math.min(8, Math.floor(avgQuality + (confluence - 1)))
      if (quality < settings.minQuality) return null
      if (settings.isConfluence && confluence < settings.minConfluence) return null

      const entry = currentPrice
      const entryDistancePct = 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      // ST gets a wider target than FluxGate: a flip entry is ~3×ATR off the prior extreme by
      // construction, and SL 1.5 / TP 2.0 ATR capped every trend trade at 1.33R — below the
      // ~43% breakeven win rate before fees. 3×ATR ⇒ 2R at TP1.
      const stTp1AtrMult = strategyForSignals === stStr ? 3 : 2
      const stTp2AtrMult = strategyForSignals === stStr ? 5 : 4
      let sl = direction === 'buy' ? entry - currentAtr * 1.5 : entry + currentAtr * 1.5
      let tp1 = direction === 'buy' ? entry + currentAtr * stTp1AtrMult : entry - currentAtr * stTp1AtrMult
      let tp2 = direction === 'buy' ? entry + currentAtr * stTp2AtrMult : entry - currentAtr * stTp2AtrMult
      if (settings.stUseManualSlTp && entry > 0) {
        const slPct = Math.max(0.01, Number(settings.stManualSlPct ?? 1.5)) / 100
        const tp1Pct = Math.max(0.01, Number(settings.stManualTp1Pct ?? 2.0)) / 100
        const tp2Pct = Math.max(0.01, Number(settings.stManualTp2Pct ?? 4.0)) / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct)
        tp2 = direction === 'buy' ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct)
      } else if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = tp1
      }

      return {
        strategy: strategyForSignals,
        regime,
        direction,
        quality,
        confluence,
        notes: `${strategyForSignals}: ${signals.map((s) => s.label).join(' + ')}`,
        currentPrice,
        entry,
        entryDistancePct,
        sl,
        tp1,
        tp2,
      } satisfies ScanResult
    }

    if (strategyForSignals === sqzStr) {
      if (signals.length === 0) return null
      const avgQuality = signals.reduce((acc, s) => acc + s.quality, 0) / signals.length
      const confluence = signals.length
      const quality = Math.min(8, Math.floor(avgQuality + (confluence - 1)))
      if (quality < settings.minQuality) return null
      if (settings.isConfluence && confluence < settings.minConfluence) return null

      const entry = currentPrice
      const entryDistancePct = 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      const slMult = Math.max(0.1, Number(settings.sqzSlAtrMult ?? 1.5))
      const tp1Mult = Math.max(0.1, Number(settings.sqzTp1AtrMult ?? 3.0))
      const tp2Mult = Math.max(0.1, Number(settings.sqzTp2AtrMult ?? 5.0))
      let sl = direction === 'buy' ? entry - currentAtr * slMult : entry + currentAtr * slMult
      let tp1 = direction === 'buy' ? entry + currentAtr * tp1Mult : entry - currentAtr * tp1Mult
      let tp2 = direction === 'buy' ? entry + currentAtr * tp2Mult : entry - currentAtr * tp2Mult
      if (settings.sqzUseManualSlTp && entry > 0) {
        const slPct = Math.max(0.01, Number(settings.sqzManualSlPct ?? 1.5)) / 100
        const tp1Pct = Math.max(0.01, Number(settings.sqzManualTp1Pct ?? 3.0)) / 100
        const tp2Pct = Math.max(0.01, Number(settings.sqzManualTp2Pct ?? 5.0)) / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct)
        tp2 = direction === 'buy' ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct)
      } else if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = tp1
      }

      return {
        strategy: strategyForSignals,
        regime,
        direction,
        quality,
        confluence,
        notes: `${strategyForSignals}: ${signals.map((s) => s.label).join(' + ')}`,
        currentPrice,
        entry,
        entryDistancePct,
        sl,
        tp1,
        tp2,
      } satisfies ScanResult
    }

    if (strategyForSignals === cmStr) {
      const isBull = direction === 'buy'
      const isLtf = settings.timeframe === '1m' || settings.timeframe === '5m' || settings.timeframe === '15m'

      // CM session gate: NY/London only (08:00–11:00 + 13:00–17:00 UTC).
      if (settings.filterCmSession) {
        const ts = Number(candles[lastIdx]?.time ?? 0)
        if (ts) {
          const ms = ts < 1e12 ? ts * 1000 : ts
          const d = new Date(ms)
          const totalMins = d.getUTCHours() * 60 + d.getUTCMinutes()
          const inSession = (totalMins >= 480 && totalMins < 660) || (totalMins >= 780 && totalMins < 1020)
          if (!inSession) return null
        }
      }

      const sweepNow = detectLiquiditySweep(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), opens.slice(0, effectiveLen), 25)
      const sweepPrev =
        effectiveLen > 55
          ? detectLiquiditySweep(highs.slice(0, effectiveLen - 1), lows.slice(0, effectiveLen - 1), closes.slice(0, effectiveLen - 1), opens.slice(0, effectiveLen - 1), 25)
          : { bullSweep: false, bearSweep: false }
      const hasSweepCluster = isBull ? (sweepNow.bullSweep || sweepPrev.bullSweep) : (sweepNow.bearSweep || sweepPrev.bearSweep)
      const hasSweepPivot = isBull ? eliteLiquiditySweepBull : eliteLiquiditySweepBear
      const hasSweep = hasSweepCluster || hasSweepPivot

      const internalSweep = detectLiquiditySweep(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), opens.slice(0, effectiveLen), 10)
      const hasInternalSweep = isBull ? internalSweep.bullSweep : internalSweep.bearSweep

      const htfDelivery = (() => {
        const useHtfSrc = !!htfClosesArr && htfLen >= 10
        const baseLen   = useHtfSrc ? htfLen : effectiveLen
        if (baseLen < 10) return false
        const htfHighsLocal  = useHtfSrc ? (htfHighsArr  as number[]).slice(0, htfLen) : highs.slice(0, effectiveLen)
        const htfLowsLocal   = useHtfSrc ? (htfLowsArr   as number[]).slice(0, htfLen) : lows.slice(0, effectiveLen)
        const htfClosesLocal = useHtfSrc ? (htfClosesArr as number[]).slice(0, htfLen) : closes.slice(0, effectiveLen)
        const zones = detectFVGZones(htfHighsLocal, htfLowsLocal, 80)
        if (zones.length === 0) return false
        const lastIdxHtf = htfClosesLocal.length - 1
        const fromK = Math.max(2, lastIdxHtf - 5)
        for (let k = lastIdxHtf; k >= fromK; k--) {
          const lastH = htfHighsLocal[k]
          const lastL = htfLowsLocal[k]
          const lastC = htfClosesLocal[k]
          for (let i = zones.length - 1; i >= Math.max(0, zones.length - 10); i--) {
            const z = zones[i]
            if (Math.abs(k - z.index) < 2) continue
            if (isBull && z.type === 'bull') {
              const tapped = lastL <= z.top && lastH >= z.bottom
              const rejected = lastC > z.top
              if (tapped && rejected) return true
            }
            if (!isBull && z.type === 'bear') {
              const tapped = lastH >= z.bottom && lastL <= z.top
              const rejected = lastC < z.bottom
              if (tapped && rejected) return true
            }
          }
        }
        return false
      })()

      const ifvg = (() => {
        if (!isLtf) return false
        const zones = detectFVGZones(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), 80)
        if (zones.length === 0) return false
        const ifvgWindow = settings.timeframe === '15m' ? 12 : 6
        const fromK = Math.max(2, lastIdx - ifvgWindow)
        for (let k = lastIdx; k >= fromK; k--) {
          const o = opens[k] ?? closes[k]
          const h = highs[k]
          const l = lows[k]
          const c = closes[k]
          const prevC = closes[k - 1] ?? c
          const range = Math.max(h - l, 1e-8)
          const bodyPct = (Math.abs(c - o) / range) * 100
          const strong = settings.filterStrongClose ? bodyPct >= settings.strongCloseBodyPct : bodyPct >= 40

          for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i]
            if (Math.abs(k - z.index) < 2) continue

            if (isBull && z.type === 'bear') {
              const engaged = h >= z.bottom && l <= z.top
              const crossed = prevC <= z.top && c > z.top
              const through = c > z.top && (o <= z.top || prevC <= z.top)
              if (engaged && crossed && through && strong) return true
            }
            if (!isBull && z.type === 'bull') {
              const engaged = l <= z.top && h >= z.bottom
              const crossed = prevC >= z.bottom && c < z.bottom
              const through = c < z.bottom && (o >= z.bottom || prevC >= z.bottom)
              if (engaged && crossed && through && strong) return true
            }
          }
        }
        return false
      })()
      const ifvgAvailable = isLtf

      const cisd = (() => {
        const minBars = 2
        let count = 0
        let from = lastIdx - 1
        while (from >= 1 && count < 6) {
          const isOpp =
            isBull ? closes[from] < opens[from] : closes[from] > opens[from]
          if (!isOpp) break
          const candleRange = Math.max(highs[from] - lows[from], 1e-8)
          const candleBody  = Math.abs(closes[from] - opens[from])
          if ((candleBody / candleRange) * 100 < 30) break
          count++
          from--
        }
        if (count < minBars) return false
        const start = from + 1
        const end = lastIdx - 1
        if (start > end) return false
        const o = opens[lastIdx] ?? closes[lastIdx]
        const h = highs[lastIdx]
        const l = lows[lastIdx]
        const c = closes[lastIdx]
        const range = Math.max(h - l, 1e-8)
        const bodyPct = (Math.abs(c - o) / range) * 100
        if (settings.filterStrongClose && bodyPct < settings.strongCloseBodyPct) return false
        if (isBull && c <= o) return false
        if (!isBull && c >= o) return false
        if (isBull) {
          const level = Math.max(...highs.slice(start, end + 1))
          if (c <= level) return false
          return { start, end }
        } else {
          const level = Math.min(...lows.slice(start, end + 1))
          if (c >= level) return false
          return { start, end }
        }
      })()

      if (!cisd) return null
      if (settings.filterLiquiditySweep && !hasSweep) return null
      if (settings.filterFVG && !htfDelivery) return null
      if (settings.filterPapRequireRetest && ifvgAvailable && !ifvg) return null

      if (settings.filterHtfEma50 && htfClosesArr && htfLen >= 50) {
        const htfEma50Arr = _htfEma50Lazy ?? calculateEMA(htfClosesArr as number[], 50)
        const v = htfEma50Arr[htfLastIdx]
        const htfEma50 = typeof v === 'number' ? v : currentPrice
        if (isBull && currentPrice <= htfEma50) return null
        if (!isBull && currentPrice >= htfEma50) return null
      }

      const rsiDiv = detectSwingRSIDivergence(closes.slice(0, effectiveLen), rsi.slice(0, effectiveLen), 60, 5)
      const hasRsiDiv = isBull ? rsiDiv.bullDiv : rsiDiv.bearDiv

      const hasClearTarget = (() => {
        const w = Math.max(0, effectiveLen - 120)
        const hi = Math.max(...highs.slice(w, effectiveLen))
        const lo = Math.min(...lows.slice(w, effectiveLen))
        if (isBull) return hi > currentPrice * 1.005
        return lo < currentPrice * 0.995
      })()
      if (settings.filterClearTarget && !hasClearTarget) return null

      const checks: { key: string; ok: boolean }[] = [
        { key: 'Sweep', ok: hasSweep },
        { key: 'HTF Delivery', ok: htfDelivery },
        { key: 'iFVG', ok: ifvgAvailable ? ifvg : false },
        { key: 'CISD', ok: !!cisd },
        { key: 'RSI Div', ok: hasRsiDiv },
        { key: 'Internal Sweep', ok: hasInternalSweep },
        { key: 'Target', ok: hasClearTarget },
      ]

      const quality = checks.reduce((s, c) => s + (c.ok ? 1 : 0), 0)
      if (quality < settings.minQuality) return null

      const grade = quality >= 7 ? 'A+' : quality >= 6 ? 'A' : quality >= 4 ? 'B+' : 'B'

      const entry = currentPrice
      const cisdSequenceLow = Math.min(...lows.slice(cisd.start, cisd.end + 1))
      const cisdSequenceHigh = Math.max(...highs.slice(cisd.start, cisd.end + 1))
      const sl = isBull ? (cisdSequenceLow - currentAtr * 0.15) : (cisdSequenceHigh + currentAtr * 0.15)
      if (isBull && sl >= entry) return null
      if (!isBull && sl <= entry) return null
      const risk = Math.abs(entry - sl)
      if (risk <= 0) return null
      const tp1 = isBull ? entry + risk * 2.0 : entry - risk * 2.0
      const tp2 = isBull ? entry + risk * 4.0 : entry - risk * 4.0

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        finalSl = isBull ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = isBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        finalTp2 = isBull ? entry * (1 + tpPct * 2) : entry * (1 - tpPct * 2)
      }

      const notes = `${cmStr} [${grade} ${quality}/7]: ${checks.filter((c) => c.ok).map((c) => c.key).join(' + ')}`

      return {
        strategy: cmStr,
        regime,
        direction,
        quality: Math.min(8, quality),
        confluence: quality,
        notes,
        currentPrice,
        entry,
        entryDistancePct,
        sl: finalSl,
        tp1: finalTp1,
        tp2: finalTp2,
      } satisfies ScanResult
    }

    if (strategyForSignals === bbssdStr) {
      const directional = signals.filter(s => s.active && s.direction === direction)
      if (directional.length === 0) return null
      const avgQuality = directional.reduce((a, s) => a + s.quality, 0) / directional.length
      const confluence = directional.length
      const quality = Math.min(8, Math.floor(avgQuality + (confluence - 1)))
      if (quality < settings.minQuality) return null
      if (settings.isConfluence && confluence < settings.minConfluence) return null

      const isBull = direction === 'buy'
      const bbLen2 = Math.max(5, Math.floor(settings.bbssdLength ?? 20))
      const bbSd2  = Math.max(0.5, settings.bbssdStdDev ?? 2.0)
      const bb2 = calculateBollingerBands(closes.slice(0, effectiveLen), bbLen2, bbSd2)
      const upper2 = bb2.upper[lastIdx], lower2 = bb2.lower[lastIdx], middle2 = bb2.middle[lastIdx]
      if (typeof upper2 !== 'number' || typeof lower2 !== 'number' || typeof middle2 !== 'number') return null

      const minLegAtr2 = Math.max(1.0, settings.bbssdMinLegAtr ?? 2.0)
      const tolMult    = Math.max(0.05, settings.bbssdZoneTolAtrMult ?? 0.3)
      const zones      = detectSupplyDemandZones(_opensView, _highsView, _lowsView, _closesView, currentAtr, 80, minLegAtr2, 3)
      const obs2       = detectOrderBlocks(_opensView, _highsView, _lowsView, _closesView, 60)
      const fvgs2      = detectFVGZones(_highsView, _lowsView, 60)
      const tol2       = currentAtr * tolMult
      const matchedZone = zones.find(z =>
        ((isBull && z.type === 'demand') || (!isBull && z.type === 'supply')) &&
        currentPrice >= z.bottom - tol2 && currentPrice <= z.top + tol2,
      ) ?? null
      const matchedBullOB = isBull && obs2.bullOB &&
        currentPrice >= obs2.bullOB.low - tol2 && currentPrice <= obs2.bullOB.high + tol2
        ? obs2.bullOB : null
      const matchedBearOB = !isBull && obs2.bearOB &&
        currentPrice >= obs2.bearOB.low - tol2 && currentPrice <= obs2.bearOB.high + tol2
        ? obs2.bearOB : null
      const matchedBullFVG = isBull
        ? fvgs2.find(z => z.type === 'bull' && currentPrice >= z.bottom - tol2 && currentPrice <= z.top + tol2) ?? null
        : null
      const matchedBearFVG = !isBull
        ? fvgs2.find(z => z.type === 'bear' && currentPrice >= z.bottom - tol2 && currentPrice <= z.top + tol2) ?? null
        : null

      // Pick the lowest support (long) or highest resistance (short) from any matched location
      const locationLow = isBull
        ? Math.min(
            matchedZone?.bottom ?? Number.POSITIVE_INFINITY,
            matchedBullOB?.low ?? Number.POSITIVE_INFINITY,
            matchedBullFVG?.bottom ?? Number.POSITIVE_INFINITY,
          )
        : Number.POSITIVE_INFINITY
      const locationHigh = !isBull
        ? Math.max(
            matchedZone?.top ?? Number.NEGATIVE_INFINITY,
            matchedBearOB?.high ?? Number.NEGATIVE_INFINITY,
            matchedBearFVG?.top ?? Number.NEGATIVE_INFINITY,
          )
        : Number.NEGATIVE_INFINITY

      const entry = currentPrice
      const slMult = 0.7
      const sl = isBull
        ? Math.min(Number.isFinite(locationLow) ? locationLow : lower2, lower2) - currentAtr * slMult
        : Math.max(Number.isFinite(locationHigh) ? locationHigh : upper2, upper2) + currentAtr * slMult
      if (isBull && sl >= entry) return null
      if (!isBull && sl <= entry) return null
      const risk = Math.abs(entry - sl)
      if (risk <= 0) return null

      const middleTarget = middle2
      const oppBand = isBull ? upper2 : lower2
      const tp1 = isBull ? Math.max(entry + risk * 1.5, middleTarget) : Math.min(entry - risk * 1.5, middleTarget)
      const tp2 = isBull ? Math.max(entry + risk * 3.0, oppBand) : Math.min(entry - risk * 3.0, oppBand)

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        finalSl  = isBull ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = isBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        finalTp2 = isBull ? entry * (1 + tpPct * 2) : entry * (1 - tpPct * 2)
      }

      return {
        strategy: bbssdStr,
        regime, direction, quality, confluence,
        notes: `${bbssdStr}: ${directional.map(s => s.label).join(' + ')}`,
        currentPrice, entry, entryDistancePct, sl: finalSl, tp1: finalTp1, tp2: finalTp2,
      } satisfies ScanResult
    }

    if (signals.length === 0) return null
    const avgQuality = signals.reduce((acc, s) => acc + s.quality, 0) / signals.length
    const confluence = signals.length
    const quality    = Math.min(8, Math.floor(avgQuality + (confluence - 1)))

    const passDirectional = direction === 'buy' ? entryBuyOk : entrySellOk
    if (!passDirectional) return null
    if (quality < settings.minQuality) return null
    if (settings.isConfluence && confluence < settings.minConfluence) return null

    if (strategyForSignals === eliteContextStr || strategyForSignals === errStr) {
      if (!eliteInSession) return null
      if (settings.eliteMinVolRegime === 'medium' && eliteVolRegime === 'low') return null
      if (settings.eliteMinVolRegime === 'high' && eliteVolRegime !== 'high') return null
    }

    const isEliteBull = direction === 'buy'

    // ── Elite Retest Reversal SL/TP ──────────────────────────────────────────
    if (strategyForSignals === errStr) {
      const retestRevOk = isEliteBull ? errRetestRevBull : errRetestRevBear
      if (!retestRevOk) return null
      const htfOk = isEliteBull ? eliteHtfStructureBull : eliteHtfStructureBear
      if (!htfOk) return null
      if (settings.filterRequireOrderBlock) {
        if (isEliteBull  && !eliteBullOB) return null
        if (!isEliteBull && !eliteBearOB) return null
      }
      if (settings.filterFVG) {
        if (isEliteBull  && !eliteFVGBull) return null
        if (!isEliteBull && !eliteFVGBear) return null
      }
      if (settings.filterLiquiditySweep) {
        if (isEliteBull  && !eliteLiquiditySweepBull) return null
        if (!isEliteBull && !eliteLiquiditySweepBear) return null
      }

      if (settings.errAGradeRequired) {
        if (isEliteBull  && !eliteIsAGradeBull) return null
        if (!isEliteBull && !eliteIsAGradeBear) return null
      }

      if (settings.errHtfEma50Required) {
        if (isEliteBull  && !eliteHtfEmaBull) return null
        if (!isEliteBull && !eliteHtfEmaBear) return null
      }

      if (settings.errRetestMaxBarsEnabled) {
        const breakIdx = isEliteBull ? eliteBreakoutBullIdx : eliteBreakoutBearIdx
        if (breakIdx < 0) return null
        const barsSinceBreak = lastIdx - breakIdx
        if (barsSinceBreak > Math.max(1, Math.floor(settings.errRetestMaxBars))) return null
      }

      if (settings.errStochConfirm) {
        const stoch = calculateStochastic(highs.slice(0, effectiveLen), lows.slice(0, effectiveLen), closes.slice(0, effectiveLen), 14, 3, 3)
        const kArr = stoch.k
        const lastK = kArr[kArr.length - 1]
        const prevK = kArr.length >= 4 ? kArr[kArr.length - 4] : null
        const valid = typeof lastK === 'number' && typeof prevK === 'number'
        if (!valid) return null
        const os = Math.max(0, Math.min(50, Number(settings.errStochOS ?? 30)))
        const ob = Math.max(50, Math.min(100, Number(settings.errStochOB ?? 70)))
        if (isEliteBull && !(prevK! < os && lastK! > prevK!)) return null
        if (!isEliteBull && !(prevK! > ob && lastK! < prevK!)) return null
      }

      if (settings.errMultiRetest) {
        const swingLevel = isEliteBull ? eliteSwingHigh : eliteSwingLow
        const lookback = Math.min(Math.max(1, Math.floor(settings.errMultiRetestLookbackBars ?? 30)), lastIdx)
        const fromIdx = Math.max(0, lastIdx - lookback)
        const tolerance = currentAtr * Math.max(0.05, Number(settings.errRetestAtrTolMult ?? 0.3))
        let touches = 0
        for (let i = fromIdx; i <= lastIdx; i++) {
          const inZone = isEliteBull
            ? (highs[i] >= swingLevel - tolerance && highs[i] <= swingLevel + tolerance)
            : (lows[i]  >= swingLevel - tolerance && lows[i]  <= swingLevel + tolerance)
          if (inZone) touches++
        }
        const minTouches = Math.max(1, Math.floor(settings.errMultiRetestMinTouches ?? 2))
        if (touches < minTouches) return null
      }

      const swingLevel   = isEliteBull ? eliteSwingHigh : eliteSwingLow
      const slMult       = eliteVolRegime === 'high' ? 1.0 : 0.7
      const entry        = currentPrice
      const sl           = isEliteBull
        ? swingLevel - currentAtr * slMult
        : swingLevel + currentAtr * slMult
      if (isEliteBull  && sl >= entry) return null
      if (!isEliteBull && sl <= entry) return null
      const risk = Math.abs(entry - sl)
      if (risk <= 0) return null
      const consolidRange = isEliteBull ? eliteBullConsolidRange : eliteBearConsolidRange
      const measuredMove  = Math.max(consolidRange, currentAtr * 2.5)
      const aGradeActive = settings.errAGradeBoost && (isEliteBull ? eliteIsAGradeBull : eliteIsAGradeBear)
      const tp1Mult = aGradeActive ? (Number(settings.errTp1MultBoost ?? 3.0)) : (Number(settings.errTp1MultDefault ?? 2.5))
      const tp2Mult = aGradeActive ? (Number(settings.errTp2MultBoost ?? 6)) : (Number(settings.errTp2MultDefault ?? 5))
      const tp1 = isEliteBull ? entry + risk * tp1Mult : entry - risk * tp1Mult
      const tp2 = isEliteBull
        ? entry + Math.max(measuredMove, risk * tp2Mult)
        : entry - Math.max(measuredMove, risk * tp2Mult)

      if (settings.errMinRREnabled && risk > 0) {
        const tp1RR = Math.abs(tp1 - entry) / risk
        if (tp1RR < Math.max(0, settings.errMinRR)) return null
      }

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        const tpMult = aGradeActive ? 1.2 : 1.0
        finalSl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = direction === 'buy' ? entry * (1 + tpPct * tpMult) : entry * (1 - tpPct * tpMult)
        finalTp2 = direction === 'buy' ? entry * (1 + tpPct * tpMult * 2) : entry * (1 - tpPct * tpMult * 2)
      }
      const aGradeNote = aGradeActive ? ' | A-GRADE BOOST' : ''
      return {
        strategy: errStr,
        regime, direction, quality, confluence,
        notes: `${errStr} [${eliteVolRegime.toUpperCase()} VOL]: ${signals.map((s) => s.label).join(' + ')}${aGradeNote}`,
        currentPrice, entry, entryDistancePct, sl: finalSl, tp1: finalTp1, tp2: finalTp2,
      } satisfies ScanResult
    }

    // ── Breakout Retest SL/TP ───────────────────────────────────────────────
    if (strategyForSignals === brStr) {
      const isBrBull = direction === 'buy'
      const hasBreakout = isBrBull ? brBreakoutBullIdx >= 0 : brBreakoutBearIdx >= 0
      const hasRetest = isBrBull ? brRetestBull : brRetestBear

      if (!hasBreakout) return null
      if (settings.filterRetestConfirmation && !hasRetest) return null

      const swingLevel = isBrBull ? brSwingHigh : brSwingLow
      const entry = currentPrice
      const slMult = 0.5
      const sl = isBrBull
        ? swingLevel - currentAtr * slMult
        : swingLevel + currentAtr * slMult

      if (isBrBull && sl >= entry) return null
      if (!isBrBull && sl <= entry) return null

      const risk = Math.abs(entry - sl)
      if (risk <= 0) return null

      const tp1Mult = 2.0
      const tp2Mult = 4.0
      const tp1 = isBrBull ? entry + risk * tp1Mult : entry - risk * tp1Mult
      const tp2 = isBrBull ? entry + risk * tp2Mult : entry - risk * tp2Mult

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (settings.filterFixedPctSlTp && entry > 0) {
        const slPct = settings.fixedSlPct / 100
        const tpPct = settings.fixedTpPct / 100
        finalSl = isBrBull ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = isBrBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        finalTp2 = finalTp1
      }

      return {
        strategy: brStr,
        regime,
        direction,
        quality,
        confluence,
        notes: `${brStr}: ${signals.filter(s => s.active && s.direction === direction).map((s) => s.label).join(' + ')}`,
        currentPrice,
        entry,
        entryDistancePct,
        sl: finalSl,
        tp1: finalTp1,
        tp2: finalTp2,
      } satisfies ScanResult
    }

    // ── Elite Context Breakout SL/TP ─────────────────────────────────────────
    const swingLevel     = isEliteBull ? eliteSwingHigh : eliteSwingLow
    const consolidRange  = isEliteBull ? eliteBullConsolidRange : eliteBearConsolidRange
    const retestOccurred = isEliteBull ? eliteRetestBull : eliteRetestBear
    const isFresh        = isEliteBull ? eliteFreshBull : eliteFreshBear
    const htfOk          = isEliteBull ? eliteHtfStructureBull : eliteHtfStructureBear
    const htfEmaOk       = isEliteBull ? eliteHtfEmaBull : eliteHtfEmaBear
    const isConsolid     = isEliteBull ? eliteIsConsolidBull : eliteIsConsolidBear
    const breakGrade     = isEliteBull ? eliteBreakGradeBull : eliteBreakGradeBear

    if (settings.filterRequireOrderBlock) {
      if (isEliteBull  && !eliteBullOB) return null
      if (!isEliteBull && !eliteBearOB) return null
    }
    if (settings.filterFVG) {
      if (isEliteBull  && !eliteFVGBull) return null
      if (!isEliteBull && !eliteFVGBear) return null
    }
    if (isEliteBull  && currentPrice < swingLevel) return null
    if (!isEliteBull && currentPrice > swingLevel) return null
    if (!isFresh && !retestOccurred) return null
    if (eliteVolRegime === 'medium' && breakGrade === 2) {
      if (isEliteBull  && !eliteLiqPoolBull) return null
      if (!isEliteBull && !eliteLiqPoolBear) return null
    }
    if (!htfOk) return null
    if (!isConsolid) return null
    const consolidBars = isEliteBull ? eliteBullConsolidBars : eliteBearConsolidBars
    const minConsolidBars = Math.max(1, Math.floor(Number(settings.ecbMinConsolidBars ?? 5)))
    if (consolidBars < minConsolidBars) return null
    if (breakGrade === 0) return null
    if (!htfEmaOk && breakGrade < 2) return null
    if (settings.filterEliteHTFEMA && !htfEmaOk) return null
    if (!retestOccurred && breakGrade < 2) return null
    if (settings.filterEliteRequireRetest && !retestOccurred) return null
    const maxEmaDistAtr = Math.max(0.1, Number(settings.ecbMaxEma50DistanceAtrMult ?? 3))
    if (settings.filterEliteMaxEmaDistance && Math.abs(currentPrice - currentEma50) > currentAtr * maxEmaDistAtr) return null
    const retestEmaOk = isEliteBull ? eliteRetestEmaAlignBull : eliteRetestEmaAlignBear
    if (retestOccurred && !retestEmaOk) return null
    const rsiLongMin = eliteVolRegime === 'medium'
      ? (breakGrade === 2 ? Number(settings.ecbRsiLongMinMediumAGrade ?? 55) : Number(settings.ecbRsiLongMinMediumBGrade ?? 52))
      : Number(settings.ecbRsiLongMinOther ?? 50)
    const rsiShortMax = eliteVolRegime === 'medium'
      ? (breakGrade === 2 ? Number(settings.ecbRsiShortMaxMediumAGrade ?? 45) : Number(settings.ecbRsiShortMaxMediumBGrade ?? 48))
      : Number(settings.ecbRsiShortMaxOther ?? 50)
    if (isEliteBull  && currentRsi < rsiLongMin)  return null
    if (!isEliteBull && currentRsi > rsiShortMax) return null
    if (settings.filterLiquiditySweep) {
      if (isEliteBull  && !eliteLiquiditySweepBull) return null
      if (!isEliteBull && !eliteLiquiditySweepBear) return null
    }

    const isAGrade = breakGrade === 2
    const slMult = isAGrade
      ? (eliteVolRegime === 'high' ? Number(settings.ecbSlAtrMultAGradeHigh ?? 1.2) : Number(settings.ecbSlAtrMultAGradeOther ?? 1.0))
      : Number(settings.ecbSlAtrMultBGrade ?? 1.5)
    const tp1Mult = isAGrade
      ? (eliteVolRegime === 'high' ? Number(settings.ecbTp1RRMultAGradeHigh ?? 2.5) : Number(settings.ecbTp1RRMultAGradeOther ?? 2.0))
      : (eliteVolRegime === 'medium' ? Number(settings.ecbTp1RRMultBGradeMedium ?? 2.0) : Number(settings.ecbTp1RRMultBGradeOther ?? 1.5))
    const minRR    = isAGrade ? 2.0 : (eliteVolRegime === 'medium' ? 2.0 : 1.5)

    let entry: number, sl: number, tp1: number, tp2: number
    entry = currentPrice
    sl    = isEliteBull
      ? swingLevel - currentAtr * slMult
      : swingLevel + currentAtr * slMult
    if (isEliteBull  && sl >= entry) return null
    if (!isEliteBull && sl <= entry) return null
    const eliteRisk = Math.abs(entry - sl)
    if (eliteRisk <= 0) return null
    const mmMinAtrMult = Math.max(0.5, Number(settings.ecbMeasuredMoveMinAtrMult ?? 2.5))
    const measuredMove = Math.max(consolidRange, currentAtr * mmMinAtrMult)
    tp1 = isEliteBull ? entry + eliteRisk * tp1Mult : entry - eliteRisk * tp1Mult
    const tp2ExtraRR = Math.max(0, Number(settings.ecbTp2ExtraRR ?? 2))
    tp2 = isEliteBull
      ? entry + Math.max(measuredMove, eliteRisk * (minRR + tp2ExtraRR))
      : entry - Math.max(measuredMove, eliteRisk * (minRR + tp2ExtraRR))

    const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
    if (settings.nearEntryOnly && entryDistancePct > settings.nearEntryPct) return null

    if (settings.filterFixedPctSlTp && entry > 0) {
      const slPct = settings.fixedSlPct / 100
      const tpPct = settings.fixedTpPct / 100
      sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
      tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
      tp2 = tp1
    }

    return {
      strategy: eliteContextStr,
      regime,
      direction,
      quality,
      confluence,
      notes: `${eliteContextStr} [${eliteVolRegime.toUpperCase()} VOL]: ${signals.map((s) => s.label).join(' + ')}`,
      currentPrice,
      entry,
      entryDistancePct,
      sl,
      tp1,
      tp2,
    } satisfies ScanResult
  }

  const tfSeconds: Record<string, number> = {
    '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400,
  }
  const tfSec = tfSeconds[settings.timeframe] ?? 900
  const cooldownOk = (direction: 'buy' | 'sell') => {
    if (!settings.filterCooldown) return true
    if (!settings.lastSignalTimeSec) return true
    const delta = settings.lastCandleTimeSec - settings.lastSignalTimeSec
    if (settings.selectedStrategy === fluxStr) return delta >= settings.cooldownBars * tfSec
    if (settings.selectedStrategy === bbssdStr) return delta >= settings.cooldownBars * tfSec
    if (settings.selectedStrategy === stStr) return delta >= settings.cooldownBars * tfSec
    if (settings.selectedStrategy === sqzStr) return delta >= settings.cooldownBars * tfSec
    if (!settings.lastSignalDirection) return true
    if (settings.lastSignalDirection === direction) return true
    return delta >= settings.cooldownBars * tfSec
  }

  const buy  = cooldownOk('buy')  ? make(activeBuySignals,  'buy')  : null
  const sell = cooldownOk('sell') ? make(activeSellSignals, 'sell') : null

  if (!buy && !sell) return null
  if (buy && !sell) return buy
  if (sell && !buy) return sell

  return (buy!.quality > sell!.quality ? buy : sell) as ScanResult
}
