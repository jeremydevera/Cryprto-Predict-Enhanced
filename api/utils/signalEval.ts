import {
  calculateADX, calculateATR, calculateBollingerBands, calculateDI, calculateEMA,
  calculateMACD, calculateRSI, calculateStochastic, calculateSqueezeMomentum, calculateSupertrend,
  computeFluxGateDualEngine, detectFVGZones, detectLiquiditySweep, detectOrderBlocks, detectSupplyDemandZones, detectSwingRSIDivergence, detectChartPatterns,
  type OhlcvBar, type FVGZone,
} from './indicators.js'

export type BgSignal = {
  symbol: string; timeframe: string; direction: 'buy'|'sell'; strategy: string
  quality: number; confluence: number; entry: number; sl: number; tp1: number; tp2: number
  entryDistancePct: number; detectedAt: number
  currentPrice?: number
  regime?: string
  notes?: string
}

export type BgScanParams = {
  symbol: string
  timeframe: string
  strategy: string
  entryModel?: 'breakout_close' | 'retest_hold' | 'retest_confirm'
  minQuality: number
  minConfluence: number
  isConfluence: boolean
  nearEntryOnly: boolean
  nearEntryPct: number
  signalLookbackBars?: number
  includeLiveCandle?: boolean
  // All filter settings from the Filters tab
  enabledStrategies: string[]
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
  filterBTCAlignment: boolean
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
  htfCandles?: OhlcvBar[]
}

export function evaluateSignal(candles: OhlcvBar[], params: BgScanParams): BgSignal | null {
  if (candles.length < 50) return null

  const tfMs = (() => {
    const tf = params.timeframe
    if (tf.endsWith('m')) return Number(tf.slice(0, -1) || 1) * 60_000
    if (tf.endsWith('h')) return Number(tf.slice(0, -1) || 1) * 60 * 60_000
    if (tf.endsWith('d')) return Number(tf.slice(0, -1) || 1) * 24 * 60 * 60_000
    return 60_000
  })()

  let bars = candles
  if (bars.length >= 2) {
    const last = bars[bars.length - 1]
    const lastOpenMs = Number(last?.time ?? 0) * 1000
    if (!params.includeLiveCandle && lastOpenMs > 0 && Date.now() < lastOpenMs + tfMs) {
      bars = bars.slice(0, -1)
    }
  }
  if (bars.length < 50) return null
  const { symbol, timeframe, strategy, minQuality, minConfluence, isConfluence, nearEntryOnly, nearEntryPct } = params

  const closes = bars.map(c => c.close)
  const opens  = bars.map(c => c.open)
  const highs  = bars.map(c => c.high)
  const lows   = bars.map(c => c.low)

  const lastIdx      = closes.length - 1
  const currentPrice = closes[lastIdx]
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  const rsi    = calculateRSI(closes, 14)
  const ema20  = calculateEMA(closes, 20)
  const ema50  = calculateEMA(closes, 50)
  const ema200 = calculateEMA(closes, 200)
  const macd   = calculateMACD(closes)
  const adx    = calculateADX(highs, lows, closes, 14)
  const atr    = calculateATR(highs, lows, closes, 14)

  const currentRsi      = typeof rsi[lastIdx]            === 'number' ? rsi[lastIdx] as number            : 50
  const currentEma20    = typeof ema20[lastIdx]           === 'number' ? ema20[lastIdx] as number           : currentPrice
  const currentEma50    = typeof ema50[lastIdx]           === 'number' ? ema50[lastIdx] as number           : currentPrice
  const currentEma200   = typeof ema200[lastIdx]          === 'number' ? ema200[lastIdx] as number          : currentPrice
  const currentMacdHist = typeof macd.histogram[lastIdx]  === 'number' ? macd.histogram[lastIdx] as number  : 0
  const currentAdx      = typeof adx[lastIdx]             === 'number' ? adx[lastIdx] as number             : 20
  const currentAtr      = typeof atr[lastIdx]             === 'number' ? atr[lastIdx] as number             : currentPrice * 0.01

  const emaAligned    =
    (currentPrice > currentEma20 && currentEma20 > currentEma50) ||
    (currentPrice < currentEma20 && currentEma20 < currentEma50)
  const isTrending    = currentAdx > 25
  const isStrongTrend = currentAdx > 40
  let regime = 'Ranging'
  if (isStrongTrend)                 regime = 'Trending'
  else if (isTrending && emaAligned) regime = 'Trending'
  else if (currentAdx < 20)         regime = 'Ranging'
  else                               regime = 'Choppy'

  const eliteContextStr = 'Elite Context Breakout'
  const errStr          = 'Elite Retest Reversal'
  const brStr           = 'Breakout Retest'
  const cmStr           = 'Confirmation Model'
  const fluxStr         = 'FluxGate Dual Engine'
  const stStr           = 'Supertrend + RelVol'
  const bbssdStr        = 'BB Stoch S/D'
  const sqzStr          = 'Squeeze Momentum'

  const strategyForSignals = strategy
  if (!strategyForSignals || (strategyForSignals !== eliteContextStr && strategyForSignals !== errStr && strategyForSignals !== cmStr && strategyForSignals !== brStr && strategyForSignals !== fluxStr && strategyForSignals !== stStr && strategyForSignals !== bbssdStr && strategyForSignals !== sqzStr)) return null

  const isBullCandle = closes[lastIdx] > opens[lastIdx]
  const isBearCandle = closes[lastIdx] < opens[lastIdx]

  const recentVol = bars.slice(Math.max(0, bars.length - 20), bars.length - 1)
  const avgVol    =
    recentVol.length > 0
      ? recentVol.reduce((acc, c) => acc + Number(c.volume || 0), 0) / recentVol.length
      : Number(bars[lastIdx].volume || 0)

  const brMaxRetestCandles = 12
  const brVolumeMultiplier =
    (params.filterVolumeConfirmation ?? false)
      ? Math.max(1.8, Number(params.minVolumeRatio ?? 2.0))
      : 1.0
  const brAtrBufferMult = Math.max(0.1, Number(params.entryAtrBufferAtrMult ?? 0.5))

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
    : Number(bars[lastIdx].volume || 0)

  const brBreakoutBullIdx = (() => {
    if (brSwingHighIdx < 0) return -1
    const from = Math.max(brSwingHighIdx + 1, lastIdx - 20)
    for (let i = from; i <= lastIdx; i++) {
      const volMult = brAvgVol > 0 ? Number(bars[i]?.volume ?? 0) / brAvgVol : 1
      if (closes[i] > brSwingHigh && volMult >= brVolumeMultiplier) return i
    }
    return -1
  })()
  const brBreakoutBearIdx = (() => {
    if (brSwingLowIdx < 0) return -1
    const from = Math.max(brSwingLowIdx + 1, lastIdx - 20)
    for (let i = from; i <= lastIdx; i++) {
      const volMult = brAvgVol > 0 ? Number(bars[i]?.volume ?? 0) / brAvgVol : 1
      if (closes[i] < brSwingLow && volMult >= brVolumeMultiplier) return i
    }
    return -1
  })()

  const brBreakVolBull = brBreakoutBullIdx >= 0 ? Number(bars[brBreakoutBullIdx]?.volume ?? 0) : 0
  const brBreakVolBear = brBreakoutBearIdx >= 0 ? Number(bars[brBreakoutBearIdx]?.volume ?? 0) : 0

  const brRetestBull = (() => {
    if (brBreakoutBullIdx < 0 || brBreakoutBullIdx >= lastIdx) return false
    const breakoutMove = closes[brBreakoutBullIdx] - brSwingHigh
    if (breakoutMove <= 0) return false
    const atrBuffer = (params.filterAtrEntryBuffer ?? false) ? currentAtr * brAtrBufferMult : currentAtr * 0.5
    for (let i = brBreakoutBullIdx + 1; i <= Math.min(lastIdx, brBreakoutBullIdx + brMaxRetestCandles); i++) {
      const retestDepth = (closes[brBreakoutBullIdx] - lows[i]) / breakoutMove
      const volAtRetest = Number(bars[i]?.volume ?? 0)
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
    const atrBuffer = (params.filterAtrEntryBuffer ?? false) ? currentAtr * brAtrBufferMult : currentAtr * 0.5
    for (let i = brBreakoutBearIdx + 1; i <= Math.min(lastIdx, brBreakoutBearIdx + brMaxRetestCandles); i++) {
      const retestDepth = (highs[i] - closes[brBreakoutBearIdx]) / breakoutMove
      const volAtRetest = Number(bars[i]?.volume ?? 0)
      const volOk = brBreakVolBear > 0 && volAtRetest <= brBreakVolBear * 0.7
      if (highs[i] >= brSwingLow - atrBuffer && highs[i] <= brSwingLow + atrBuffer && retestDepth >= 0 && retestDepth <= 0.618 && volOk) {
        return true
      }
    }
    return false
  })()

  const htfCandles = params.htfCandles

  if (strategyForSignals === cmStr) {
    const isLtf = timeframe === '1m' || timeframe === '5m'

    const latestPrice = currentPrice
    const scanWindow = (() => {
      if (timeframe === '1m') return 60
      if (timeframe === '5m') return 48
      if (timeframe === '15m') return 32
      if (timeframe === '1h') return 24
      if (timeframe === '4h') return 12
      if (timeframe === '1d') return 6
      return 24
    })()
    const scanFrom = Math.max(50, lastIdx - scanWindow)

    for (let evalIdx = lastIdx; evalIdx >= scanFrom; evalIdx--) {
      // CM session gate: NY/London only (08:00–11:00 + 13:00–17:00 UTC).
      if (params.filterCmSession && strategyForSignals === cmStr) {
        const ts = Number(bars[evalIdx]?.time ?? 0)
        if (ts) {
          const ms = ts < 1e12 ? ts * 1000 : ts
          const d = new Date(ms)
          const totalMins = d.getUTCHours() * 60 + d.getUTCMinutes()
          const inSession = (totalMins >= 480 && totalMins < 660) || (totalMins >= 780 && totalMins < 1020)
          if (!inSession) continue
        }
      }

      const sCloses = closes.slice(0, evalIdx + 1)
      const sOpens = opens.slice(0, evalIdx + 1)
      const sHighs = highs.slice(0, evalIdx + 1)
      const sLows = lows.slice(0, evalIdx + 1)
      const sLastIdx = evalIdx

      const sweepNow = detectLiquiditySweep(sHighs, sLows, sCloses, sOpens, 25)
      const sweepPrev =
        sCloses.length > 55
          ? detectLiquiditySweep(sHighs.slice(0, -1), sLows.slice(0, -1), sCloses.slice(0, -1), sOpens.slice(0, -1), 25)
          : { bullSweep: false, bearSweep: false }
      const bullSweep = sweepNow.bullSweep || sweepPrev.bullSweep
      const bearSweep = sweepNow.bearSweep || sweepPrev.bearSweep

      const cisdOk = (dir: 'buy' | 'sell'): { ok: boolean; level: number } => {
        const isBull = dir === 'buy'
        const minBars = 2
        let count = 0
        let from = sLastIdx - 1
        while (from >= 1 && count < 6) {
          const isOpp = isBull ? sCloses[from] < sOpens[from] : sCloses[from] > sOpens[from]
          if (!isOpp) break
          count++
          from--
        }
        if (count < minBars) return { ok: false, level: 0 }
        const start = from + 1
        const end = sLastIdx - 1
        if (start > end) return { ok: false, level: 0 }
        const o = sOpens[sLastIdx] ?? sCloses[sLastIdx]
        const h = sHighs[sLastIdx]
        const l = sLows[sLastIdx]
        const c = sCloses[sLastIdx]
        const range = Math.max(h - l, 1e-8)
        const bodyPct = (Math.abs(c - o) / range) * 100
        if (params.filterStrongClose && bodyPct < params.strongCloseBodyPct) return { ok: false, level: 0 }
        if (isBull && c <= o) return { ok: false, level: 0 }
        if (!isBull && c >= o) return { ok: false, level: 0 }
        if (isBull) {
          const level = Math.max(...sHighs.slice(start, end + 1))
          return { ok: c > level, level }
        } else {
          const level = Math.min(...sLows.slice(start, end + 1))
          return { ok: c < level, level }
        }
      }

      const bullCisdResult = cisdOk('buy')
      const bearCisdResult = cisdOk('sell')
      const bullCisd = bullCisdResult.ok
      const bearCisd = bearCisdResult.ok
      if (!bullCisd && !bearCisd) continue

      const candleBull = sCloses[sLastIdx] > sOpens[sLastIdx]
      const direction: 'buy' | 'sell' = bullCisd && !bearCisd ? 'buy' : !bullCisd && bearCisd ? 'sell' : (candleBull ? 'buy' : 'sell')
      const cisdBrokenLevel = direction === 'buy' ? bullCisdResult.level : bearCisdResult.level
      const isBull = direction === 'buy'

      // Post-CISD retest: price must pull back to the broken level within 5 bars and close holding it
      if (params.filterCisdRetest) {
        if (evalIdx >= lastIdx) continue  // CISD on current bar — retest hasn't had time to form
        const atrNow = typeof atr[sLastIdx] === 'number' ? (atr[sLastIdx] as number) : currentPrice * 0.01
        const tolerance = atrNow * 0.5
        const retestEnd = Math.min(evalIdx + 5, lastIdx)
        let retestFound = false
        for (let r = evalIdx + 1; r <= retestEnd; r++) {
          if (isBull) {
            const touched = lows[r] <= cisdBrokenLevel + tolerance
            const holds   = closes[r] >= cisdBrokenLevel - atrNow * 0.15
            if (touched && holds) { retestFound = true; break }
          } else {
            const touched = highs[r] >= cisdBrokenLevel - tolerance
            const holds   = closes[r] <= cisdBrokenLevel + atrNow * 0.15
            if (touched && holds) { retestFound = true; break }
          }
        }
        if (!retestFound) continue
      }

      const hasSweep = isBull ? bullSweep : bearSweep
      const internalSweepNow = detectLiquiditySweep(sHighs, sLows, sCloses, sOpens, 10)
      const hasInternalSweep = isBull ? internalSweepNow.bullSweep : internalSweepNow.bearSweep

      const htfDelivery = (() => {
        const src = Array.isArray(htfCandles) && htfCandles.length >= 10 ? htfCandles : bars
        if (!src || src.length < 10) return false
        const srcHighs = src.map((c) => Number(c.high || 0))
        const srcLows = src.map((c) => Number(c.low || 0))
        const srcCloses = src.map((c) => Number(c.close || 0))
        const zones = detectFVGZones(srcHighs, srcLows, 80)
        if (zones.length === 0) return false
        const lastIdx2 = srcCloses.length - 1
        const fromK = Math.max(2, lastIdx2 - 5)
        for (let k = lastIdx2; k >= fromK; k--) {
          const h = srcHighs[k]
          const l = srcLows[k]
          const c = srcCloses[k]
          for (let i = zones.length - 1; i >= Math.max(0, zones.length - 10); i--) {
            const z = zones[i]
            if (Math.abs(k - z.index) < 2) continue
            if (isBull && z.type === 'bull') {
              const tapped = l <= z.top && h >= z.bottom
              const rejected = c > z.midpoint
              if (tapped && rejected) return true
            }
            if (!isBull && z.type === 'bear') {
              const tapped = h >= z.bottom && l <= z.top
              const rejected = c < z.midpoint
              if (tapped && rejected) return true
            }
          }
        }
        return false
      })()

      const ifvg = (() => {
        if (!isLtf && !params.filterIFVG) return false
        const zones = detectFVGZones(sHighs, sLows, 80)
        if (zones.length === 0) return false
        const fromK = Math.max(2, sLastIdx - 6)
        for (let k = sLastIdx; k >= fromK; k--) {
          const o = sOpens[k] ?? sCloses[k]
          const h = sHighs[k]
          const l = sLows[k]
          const c = sCloses[k]
          const prevC = sCloses[k - 1] ?? c
          const range = Math.max(h - l, 1e-8)
          const bodyPct = (Math.abs(c - o) / range) * 100
          const strong = params.filterStrongClose ? bodyPct >= params.strongCloseBodyPct : bodyPct >= 40
          for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i]
            if (Math.abs(k - z.index) < 2) continue
            if (isBull && z.type === 'bear') {
              const engaged = h >= z.bottom && l <= z.top
            const crossed = prevC <= z.midpoint && c > z.midpoint
            const through = c > z.midpoint && (o <= z.midpoint || prevC <= z.midpoint)
              if (engaged && crossed && through && strong) return true
            }
            if (!isBull && z.type === 'bull') {
              const engaged = l <= z.top && h >= z.bottom
            const crossed = prevC >= z.midpoint && c < z.midpoint
            const through = c < z.midpoint && (o >= z.midpoint || prevC >= z.midpoint)
              if (engaged && crossed && through && strong) return true
            }
          }
        }
        return false
      })()

      if (params.filterLiquiditySweep && !hasSweep) continue
      if (params.filterFVG && !htfDelivery) continue
      if (params.filterPapRequireRetest && isLtf && !ifvg) continue
      if (params.filterIFVG && !ifvg) continue

      if (params.filterHtfEma50 && htfCandles && htfCandles.length >= 50) {
        const htfCloses = htfCandles.map((c) => Number(c.close || 0))
        const htfEma50Arr = calculateEMA(htfCloses, 50)
        const htfEma50 = typeof htfEma50Arr[htfEma50Arr.length - 1] === 'number' ? htfEma50Arr[htfEma50Arr.length - 1] as number : latestPrice
        if (isBull && latestPrice <= htfEma50) continue
        if (!isBull && latestPrice >= htfEma50) continue
      }

      if (params.filterRequireOrderBlock) {
        const ob = detectOrderBlocks(sOpens, sHighs, sLows, sCloses, 40)
        if (isBull && !ob.bullOB) continue
        if (!isBull && !ob.bearOB) continue
      }
      if (params.filterVolumeConfirmation) {
        const w0 = Math.max(0, sLastIdx - 20)
        const recent = bars.slice(w0, sLastIdx)
        const avg = recent.length > 0 ? recent.reduce((acc, c) => acc + Number(c.volume || 0), 0) / recent.length : Number(bars[sLastIdx]?.volume ?? 0)
        const vol = Number(bars[sLastIdx]?.volume ?? 0)
        const volOk = avg > 0 ? vol >= avg * Math.max(1.0, params.minVolumeRatio) : true
        if (!volOk) continue
      }

      const rsiDiv = detectSwingRSIDivergence(sCloses, rsi.slice(0, sLastIdx + 1), 60, 5)
      const hasRsiDiv = isBull ? rsiDiv.bullDiv : rsiDiv.bearDiv

      const hasClearTarget = (() => {
        const w = Math.max(0, sCloses.length - 120)
        const hi = Math.max(...sHighs.slice(w))
        const lo = Math.min(...sLows.slice(w))
        const e = sCloses[sLastIdx]
        return isBull ? hi > e * 1.005 : lo < e * 0.995
      })()
      if (params.filterClearTarget && !hasClearTarget) continue

      const checks = [
        { key: 'Sweep', ok: hasSweep },
        { key: 'HTF Delivery', ok: htfDelivery },
        { key: 'iFVG', ok: (isLtf || params.filterIFVG) ? ifvg : false },
        { key: 'CISD', ok: true },
        { key: 'RSI Div', ok: hasRsiDiv },
        { key: 'Internal Sweep', ok: hasInternalSweep },
        { key: 'Target', ok: hasClearTarget },
      ]

      const checkCount = checks.reduce((s, c) => s + (c.ok ? 1 : 0), 0)
      if (checkCount < minQuality) continue
      if (isConfluence && checkCount < minConfluence) continue

      const detectionEntry = sCloses[sLastIdx]
      const entryDistancePct = detectionEntry > 0 ? (Math.abs(latestPrice - detectionEntry) / detectionEntry) * 100 : 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) continue

      const entry = latestPrice

      const atrVal = typeof atr[sLastIdx] === 'number' ? (atr[sLastIdx] as number) : entry * 0.01
      const lookback = 20
      const wStart = Math.max(0, sLastIdx - lookback)
      const recentLow = Math.min(...sLows.slice(wStart))
      const recentHigh = Math.max(...sHighs.slice(wStart))
      let sl = isBull ? (recentLow - atrVal * 0.2) : (recentHigh + atrVal * 0.2)
      if (isBull && sl >= entry) continue
      if (!isBull && sl <= entry) continue
      const risk = Math.abs(entry - sl)
      if (risk <= 0) continue
      let tp1 = isBull ? entry + risk * 2.0 : entry - risk * 2.0
      let tp2 = isBull ? entry + risk * 4.0 : entry - risk * 4.0

      if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        sl = isBull ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = isBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = isBull ? entry * (1 + tpPct * 2) : entry * (1 - tpPct * 2)
      }

      const notes = checks.filter(c => c.ok).map(c => c.key).join(' | ')

      return {
        symbol,
        timeframe,
        direction,
        strategy: strategyForSignals,
        quality: Math.min(8, checkCount),
        confluence: checkCount,
        currentPrice: latestPrice,
        regime,
        entry,
        sl,
        tp1,
        tp2,
        entryDistancePct,
        detectedAt: Date.now(),
        notes,
      }
    }

    return null
  }

  // ── Elite Context Breakout ────────────────────────────────────────────────

  // Session filter: 08:00–11:00 UTC (London) and 13:00–17:00 UTC (NY)
  const eliteInSession = (() => {
    if (!params.filterEliteSession) return true
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
  const eliteHtfStructureBull = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 20) return false
    const htfHighs = htfCandles.map(c => Number(c.high || 0))
    const htfLows  = htfCandles.map(c => Number(c.low  || 0))
    const len = htfHighs.length
    const swHs: number[] = [], swLs: number[] = []
    for (let i = len - 3; i >= 2; i--) {
      if (swHs.length < 2 && htfHighs[i] > htfHighs[i - 1] && htfHighs[i] > htfHighs[i + 1]) swHs.push(htfHighs[i])
      if (swLs.length < 2 && htfLows[i]  < htfLows[i - 1]  && htfLows[i]  < htfLows[i + 1])  swLs.push(htfLows[i])
      if (swHs.length >= 2 && swLs.length >= 2) break
    }
    return swHs.length >= 2 && swLs.length >= 2 && swHs[0] > swHs[1] && swLs[0] > swLs[1]
  })()
  const eliteHtfStructureBear = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 20) return false
    const htfHighs = htfCandles.map(c => Number(c.high || 0))
    const htfLows  = htfCandles.map(c => Number(c.low  || 0))
    const len = htfHighs.length
    const swHs: number[] = [], swLs: number[] = []
    for (let i = len - 3; i >= 2; i--) {
      if (swHs.length < 2 && htfHighs[i] > htfHighs[i - 1] && htfHighs[i] > htfHighs[i + 1]) swHs.push(htfHighs[i])
      if (swLs.length < 2 && htfLows[i]  < htfLows[i - 1]  && htfLows[i]  < htfLows[i + 1])  swLs.push(htfLows[i])
      if (swHs.length >= 2 && swLs.length >= 2) break
    }
    return swHs.length >= 2 && swLs.length >= 2 && swHs[0] < swHs[1] && swLs[0] < swLs[1]
  })()

  // HTF EMA50 directional bias
  const eliteHtfEmaBull = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 55) return false
    const htfCloses = htfCandles.map(c => Number(c.close || 0))
    const htfEma50  = calculateEMA(htfCloses, 50)
    const e50 = htfEma50[htfEma50.length - 1]
    return typeof e50 === 'number' && htfCloses[htfCloses.length - 1] > e50
  })()
  const eliteHtfEmaBear = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 55) return false
    const htfCloses = htfCandles.map(c => Number(c.close || 0))
    const htfEma50  = calculateEMA(htfCloses, 50)
    const e50 = htfEma50[htfEma50.length - 1]
    return typeof e50 === 'number' && htfCloses[htfCloses.length - 1] < e50
  })()

  const eliteHtfEma200Bull = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 200) return false
    const htfCloses = htfCandles.map(c => Number(c.close || 0))
    const htfEma200 = calculateEMA(htfCloses, 200)
    const e200 = htfEma200[htfEma200.length - 1]
    return typeof e200 === 'number' && htfCloses[htfCloses.length - 1] > e200
  })()
  const eliteHtfEma200Bear = (() => {
    if (!Array.isArray(htfCandles) || htfCandles.length < 200) return false
    const htfCloses = htfCandles.map(c => Number(c.close || 0))
    const htfEma200 = calculateEMA(htfCloses, 200)
    const e200 = htfEma200[htfEma200.length - 1]
    return typeof e200 === 'number' && htfCloses[htfCloses.length - 1] < e200
  })()

  // Swing detection: 3-bar pivot, exclude last 3 bars, scan 60 bars back
  const eliteSwingLookback  = 60
  const eliteFreshLimit     = eliteVolRegime === 'medium' ? 4 : 6
  const eliteExtendPct      = eliteVolRegime === 'medium' ? 0.005 : 0.003
  const eliteRetestAtrMult  = params.strategy === 'Elite Retest Reversal'
    ? Math.max(0.05, Number(params.errRetestAtrTolMult ?? 0.3))
    : params.strategy === 'Elite Context Breakout'
      ? Math.max(0.05, Number(params.ecbRetestAtrTolMult ?? 0.3))
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
  const errAGradeBodyMinPct = Math.max(10, Math.min(90, Number(params.errAGradeBodyMinPct ?? 65)))
  const errAGradeVolMinMult = Math.max(0.1, Number(params.errAGradeVolMinMult ?? 2.5))
  const ecbAGradeBodyHigh = Math.max(10, Math.min(90, Number(params.ecbAGradeBodyMinPctHighVol ?? 70)))
  const ecbAGradeBodyOther = Math.max(10, Math.min(90, Number(params.ecbAGradeBodyMinPctOther ?? 65)))
  const ecbAGradeVolMinMult = Math.max(0.1, Number(params.ecbAGradeVolMinMult ?? 2.5))
  const ecbBGradeBodyMedium = Math.max(10, Math.min(90, Number(params.ecbBGradeBodyMinPctMedium ?? 55)))
  const ecbBGradeBodyOther = Math.max(10, Math.min(90, Number(params.ecbBGradeBodyMinPctOther ?? 45)))
  const ecbBGradeVolMedium = Math.max(0.1, Number(params.ecbBGradeVolMinMultMedium ?? 2.0))
  const ecbBGradeVolOther = Math.max(0.1, Number(params.ecbBGradeVolMinMultOther ?? 1.5))

  const aGradeBodyThresh =
    params.strategy === 'Elite Retest Reversal'
      ? errAGradeBodyMinPct
      : params.strategy === 'Elite Context Breakout'
        ? (eliteVolRegime === 'high' ? ecbAGradeBodyHigh : ecbAGradeBodyOther)
        : (eliteVolRegime === 'high' ? 70 : 65)
  const aGradeVolThresh =
    params.strategy === 'Elite Retest Reversal'
      ? errAGradeVolMinMult
      : params.strategy === 'Elite Context Breakout'
        ? ecbAGradeVolMinMult
        : 2.5
  const bGradeBodyThresh =
    params.strategy === 'Elite Context Breakout'
      ? (eliteVolRegime === 'medium' ? ecbBGradeBodyMedium : ecbBGradeBodyOther)
      : (eliteVolRegime === 'medium' ? 55 : 45)
  const bGradeVolThresh =
    params.strategy === 'Elite Context Breakout'
      ? (eliteVolRegime === 'medium' ? ecbBGradeVolMedium : ecbBGradeVolOther)
      : (eliteVolRegime === 'medium' ? 2.0 : 1.5)

  const ecbMaxBreakRangeAtrMult = Math.max(0.5, Number(params.ecbMaxBreakCandleRangeAtrMult ?? 4))
  const ecbBreakClosePosBullMin = Math.max(50, Math.min(99, Number(params.ecbBreakClosePosBullMinPct ?? 75))) / 100
  const ecbBreakClosePosBearMax = Math.max(1, Math.min(50, Number(params.ecbBreakClosePosBearMaxPct ?? 25))) / 100
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
        const maxPct = Math.max(0.01, Number(params.ecbRetestEma20MaxDistPct ?? 0.3)) / 100
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
        const maxPct = Math.max(0.01, Number(params.ecbRetestEma20MaxDistPct ?? 0.3)) / 100
        eliteRetestEmaAlignBear = typeof e20i === 'number' && Math.abs(highs[i] - e20i) / e20i <= maxPct
        break
      }
    }
  }
  const retestVolMaxFrac = Math.max(0.05, Number(params.ecbRetestVolMaxFracOfBreak ?? 0.7))
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
    closes[lastIdx] > eliteSwingHigh && isBullCandle && errCandleBodyPct >= Math.max(10, Math.min(90, Number(params.errReversalBodyMinPct ?? 50)))
  const errRetestRevBear =
    eliteBreakoutBearIdx >= 0 && eliteSwingLow < Infinity &&
    highs[lastIdx] >= eliteSwingLow - currentAtr * eliteRetestAtrMult &&
    highs[lastIdx] <= eliteSwingLow + currentAtr * eliteRetestAtrMult &&
    closes[lastIdx] < eliteSwingLow && isBearCandle && errCandleBodyPct >= Math.max(10, Math.min(90, Number(params.errReversalBodyMinPct ?? 50)))
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

  // Order Blocks and FVG
  const eliteOBs    = detectOrderBlocks(opens, highs, lows, closes, 60)
  const eliteBullOB = eliteOBs.bullOB
  const eliteBearOB = eliteOBs.bearOB
  const eliteFVGZones: FVGZone[] = detectFVGZones(highs, lows, 60)
  const eliteFVGBull = eliteFVGZones.some(z => z.type === 'bull' && z.top < currentPrice)
  const eliteFVGBear = eliteFVGZones.some(z => z.type === 'bear' && z.bottom > currentPrice)

  const entryBuyOk  = !params.filterEntryConfirmation || eliteBreakoutBullIdx >= 0 || isBullCandle
  const entrySellOk = !params.filterEntryConfirmation || eliteBreakoutBearIdx >= 0 || isBearCandle

  type Signal = { active: boolean; direction: 'buy' | 'sell'; label: string; quality: number }

  const detectedPattern = detectChartPatterns(highs, lows, closes)

  const baseSignals: Signal[] = (() => {
    if (strategyForSignals === brStr) {
      const brAtrPct = (currentAtr / currentPrice) * 100
      const brMinAtrPct = Math.max(0, Number(params.brMinAtrPct ?? 0.4))
      const brVolOk = brAtrPct > brMinAtrPct
      const brRange = highs[lastIdx] - lows[lastIdx]
      const brMaxRangeAtrMult = Math.max(0.1, Number(params.brMaxRangeAtrMult ?? 3))
      if (Number.isFinite(brRange) && brRange > currentAtr * brMaxRangeAtrMult) return []

      const brBullBias = eliteHtfEmaBull || (
        Array.isArray(htfCandles) && htfCandles.length >= 20 &&
        Number(htfCandles[htfCandles.length - 1]?.close ?? 0) > Number(htfCandles[htfCandles.length - 1]?.open ?? 0)
      )
      const brBearBias = eliteHtfEmaBear || (
        Array.isArray(htfCandles) && htfCandles.length >= 20 &&
        Number(htfCandles[htfCandles.length - 1]?.close ?? 0) < Number(htfCandles[htfCandles.length - 1]?.open ?? 0)
      )

      const brEmaSlopeBars = Math.max(1, Math.floor(Number(params.brEmaSlopeLookback ?? 10)))
      const emaNow = ema50[lastIdx]
      const emaPrev = ema50[Math.max(0, lastIdx - brEmaSlopeBars)]
      const brEmaSlopeBull = typeof emaNow === 'number' && typeof emaPrev === 'number' && emaNow > emaPrev
      const brEmaSlopeBear = typeof emaNow === 'number' && typeof emaPrev === 'number' && emaNow < emaPrev

      const strongCloseMinPct = Math.max(1, Math.min(99, Number(params.strongCloseBodyPct ?? 50)))
      const strongCloseOk = !(params.filterStrongClose ?? false) || errCandleBodyPct >= strongCloseMinPct
      const brBullConfirm = isBullCandle && strongCloseOk
      const brBearConfirm = isBearCandle && strongCloseOk

      const brEntryModel = (['breakout_close', 'retest_hold', 'retest_confirm'] as const).includes(params.entryModel as any)
        ? (params.entryModel as 'breakout_close' | 'retest_hold' | 'retest_confirm')
        : 'retest_confirm'

      if (!brVolOk) return []
      const brAdxMin = Math.max(1, Number(params.brAdxMin ?? 25))
      if ((params.filterADXRegime ?? false) && currentAdx < brAdxMin) return []

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

      if (params.filterHTFAlignment ?? false) {
        if (bullReady && !brBullBias) bullReady = false
        if (bearReady && !brBearBias) bearReady = false
        if (bullReady && !brEmaSlopeBull) bullReady = false
        if (bearReady && !brEmaSlopeBear) bearReady = false
      }

      if (!bullReady && !bearReady) return []

      return [
        { active: brBreakoutBullIdx >= 0, direction: 'buy',  label: 'Breakout',       quality: 5 },
        { active: brRetestBull,           direction: 'buy',  label: 'Retest Hold',    quality: 6 },
        { active: brBullConfirm,          direction: 'buy',  label: 'Candle Confirm', quality: 5 },
        { active: brBullBias,             direction: 'buy',  label: 'HTF Bias',       quality: 4 },
        { active: eliteEmaBull,           direction: 'buy',  label: 'EMA50 Align',    quality: 4 },
        { active: currentRsi >= 45 && currentRsi <= 70, direction: 'buy',  label: 'RSI Zone',      quality: 4 },
        { active: currentMacdHist > 0,    direction: 'buy',  label: 'MACD Up',        quality: 4 },
        { active: brBreakoutBearIdx >= 0, direction: 'sell', label: 'Breakout',       quality: 5 },
        { active: brRetestBear,           direction: 'sell', label: 'Retest Hold',    quality: 6 },
        { active: brBearConfirm,          direction: 'sell', label: 'Candle Confirm', quality: 5 },
        { active: brBearBias,             direction: 'sell', label: 'HTF Bias',       quality: 4 },
        { active: eliteEmaBear,           direction: 'sell', label: 'EMA50 Align',    quality: 4 },
        { active: currentRsi >= 30 && currentRsi <= 55, direction: 'sell', label: 'RSI Zone',      quality: 4 },
        { active: currentMacdHist < 0,    direction: 'sell', label: 'MACD Down',      quality: 4 },
      ]
    }

    if (strategyForSignals === stStr) {
      const atrPeriod = params.stAtrPeriod ?? 10
      const mult = params.stAtrMult ?? 3
      const requireFlip = params.stRequireFlip ?? true
      const useRelVol = params.stUseRelVol ?? true
      const relVolLen = params.stRelVolLen ?? 20
      const relVolMin = params.stRelVolMin ?? 1.5
      const useKernel = params.stUseKernel ?? false
      const kLookback = params.stKernelLookback ?? 20
      const kBandwidth = params.stKernelBandwidth ?? 6
      const useHtf = params.stUseHTFAlign ?? true
      const htfEmaLen = params.stHtfEmaLen ?? 200
      const useHtfSlope = params.stUseHtfEmaSlope ?? false
      const htfSlopeLookback = params.stHtfEmaSlopeLookback ?? 3
      const htfSlopeMinPctPerBar = params.stHtfEmaSlopeMinPctPerBar ?? 0
      const useEmaDistance = params.stUseEmaDistance ?? false
      const emaDistAtrMin = params.stEmaDistAtrMin ?? 0.6
      const useImpulse = params.stUseImpulse ?? false
      const impulseBodyMinPct = params.stImpulseBodyMinPct ?? 55
      const impulseWickMaxPct = params.stImpulseWickMaxPct ?? 30
      const useKdeRegime = params.stUseKdeRegime ?? false
      const kdeRegimeLookback = params.stKdeRegimeLookback ?? 200
      const kdeRegimeBw = params.stKdeRegimeBandwidth ?? 0.8
      const kdeRegimeMaxConc = params.stKdeRegimeMaxConcentration ?? 0.55
      const useKdeVa = params.stUseKdeValueArea ?? false
      const kdeVaLookback = params.stKdeValueAreaLookback ?? 260
      const kdeVaBw = params.stKdeValueAreaBandwidth ?? 0.8
      const kdeVaMaxDensity = params.stKdeValueAreaMaxDensity ?? 0.6

      const st = calculateSupertrend({
        highs,
        lows,
        closes,
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
        const slice = bars.slice(start, lastIdx)
        if (slice.length === 0) return 1
        const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
        const now = Number(bars[lastIdx].volume || 0)
        const hasVol = avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
        return hasVol ? now / avg : 1
      })()
      const avgVolOk = (() => {
        const len = Math.max(5, Math.floor(relVolLen))
        const start = Math.max(0, lastIdx - len)
        const slice = bars.slice(start, lastIdx)
        if (slice.length === 0) return false
        const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
        const now = Number(bars[lastIdx].volume || 0)
        return avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
      })()
      // Fail CLOSED: zero/missing volume must not pass the strategy's namesake filter.
      const gateRelVol = !useRelVol || (avgVolOk && relVol >= relVolMin)

      const htfSource = Array.isArray(htfCandles) && htfCandles.length >= Math.max(60, htfEmaLen + 5) ? htfCandles : bars
      const htfCloses = htfSource.map((c) => Number(c.close || 0))
      const htfEma = calculateEMA(htfCloses, htfEmaLen)
      const htfLast = htfCloses.length - 1
      const htfClose = htfCloses[htfLast]
      const htfEmaV = htfEma[htfLast]
      const hasHtfEma = typeof htfEmaV === 'number' && Number.isFinite(htfEmaV)
      const htfBull = hasHtfEma && Number.isFinite(htfClose) ? htfClose > htfEmaV : null
      // Fail CLOSED: when the HTF EMA can't be computed the enabled gate blocks BOTH sides.
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

      const stAtrArr = calculateATR(highs, lows, closes, Math.max(2, Math.floor(atrPeriod)))
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
        if (!(range > 0) || !Number.isFinite(range)) return { longOk: true, shortOk: true }
        const bodyPct = (Math.abs(c - o) / range) * 100
        const upperWick = h - Math.max(o, c)
        const lowerWick = Math.min(o, c) - l
        const upperWickPct = (upperWick / range) * 100
        const lowerWickPct = (lowerWick / range) * 100
        const longOk = isBullCandle && bodyPct >= impulseBodyMinPct && upperWickPct <= impulseWickMaxPct
        const shortOk = isBearCandle && bodyPct >= impulseBodyMinPct && lowerWickPct <= impulseWickMaxPct
        return { longOk, shortOk }
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

      const useAdx = params.stUseAdx ?? false
      const adxPeriod = params.stAdxPeriod ?? 14
      const adxMin = params.stAdxMin ?? 22
      const stAdxArr = calculateADX(highs, lows, closes, Math.max(2, Math.floor(adxPeriod)))
      const stAdxNow = stAdxArr[lastIdx]
      const gateAdx = !useAdx || (typeof stAdxNow === 'number' && Number.isFinite(stAdxNow) && stAdxNow >= adxMin)

      const useDiAlign = params.stUseDiAlign ?? false
      const diPeriod = params.stDiPeriod ?? adxPeriod
      const di = calculateDI(highs, lows, closes, Math.max(2, Math.floor(diPeriod)))
      const diPlus = di.plus[lastIdx]
      const diMinus = di.minus[lastIdx]
      const hasDi = typeof diPlus === 'number' && typeof diMinus === 'number' && Number.isFinite(diPlus) && Number.isFinite(diMinus)
      // Fail CLOSED: missing DI data blocks both sides while the gate is enabled.
      const gateDiLong = !useDiAlign || (hasDi && diPlus > diMinus)
      const gateDiShort = !useDiAlign || (hasDi && diMinus > diPlus)

      // Enabled filters are HARD GATES in BOTH modes (mirrors signalScan.ts). Confluence mode
      // previously gated only on the flip, demoting RelVol/HTF/ADX to optional score boosters.
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
      const bbLen = params.sqzBbLen ?? 20
      const bbStd = params.sqzBbStd ?? 2.0
      const kcLen = params.sqzKcLen ?? 20
      const kcMult = params.sqzKcMult ?? 1.5
      const momLen = params.sqzMomLen ?? 20
      const requireRelease = params.sqzRequireRelease ?? true
      const minSqueezeBars = Math.max(1, Math.floor(params.sqzMinSqueezeBars ?? 2))
      const requireMomRising = params.sqzRequireMomRising ?? true
      const useHtf = params.sqzUseHtfAlign ?? false
      const htfEmaLen = params.sqzHtfEmaLen ?? 200
      const useAdx = params.sqzUseAdx ?? false
      const adxMin = params.sqzAdxMin ?? 18
      const useVol = params.sqzUseVolume ?? false
      const volLen = params.sqzVolLen ?? 20
      const minVolRatio = params.sqzMinVolumeRatio ?? 1.2

      const sqz = calculateSqueezeMomentum(highs, lows, closes, { bbLen, bbStd, kcLen, kcMult, momLen })

      const onNow = sqz.squeezeOn[lastIdx]
      const onPrev = sqz.squeezeOn[lastIdx - 1]
      const momNow = sqz.momentum[lastIdx]
      const momPrev = sqz.momentum[lastIdx - 1]
      if (typeof momNow !== 'number' || !Number.isFinite(momNow)) return []

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

      const htfSource = Array.isArray(htfCandles) && htfCandles.length >= Math.max(60, htfEmaLen + 5) ? htfCandles : bars
      const htfCloses = htfSource.map((c) => Number(c.close || 0))
      const htfEma = calculateEMA(htfCloses, htfEmaLen)
      const htfLast = htfCloses.length - 1
      const htfClose = htfCloses[htfLast]
      const htfEmaV = htfEma[htfLast]
      const hasHtfEma = typeof htfEmaV === 'number' && Number.isFinite(htfEmaV)
      const htfBull = hasHtfEma && Number.isFinite(htfClose) ? htfClose > (htfEmaV as number) : null
      const gateHtfLong = !useHtf || htfBull === null || htfBull
      const gateHtfShort = !useHtf || htfBull === null || !htfBull

      const sqzAdxArr = calculateADX(highs, lows, closes, 14)
      const adxNow = sqzAdxArr[lastIdx]
      const gateAdx = !useAdx || (typeof adxNow === 'number' && Number.isFinite(adxNow) && adxNow >= adxMin)

      const relVol = (() => {
        const len = Math.max(5, Math.floor(volLen))
        const start = Math.max(0, lastIdx - len)
        const slice = bars.slice(start, lastIdx)
        if (slice.length === 0) return 1
        const avg = slice.reduce((a, c) => a + Number(c.volume || 0), 0) / slice.length
        const now = Number(bars[lastIdx].volume || 0)
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
        opens,
        highs,
        lows,
        closes,
        baseLenLong: params.fgBaseLenLong,
        baseLenShort: params.fgBaseLenShort,
        guideEmaLen: params.fgGuideEmaLen,
        volLen: params.fgVolLen,
        persLen: params.fgPersLen,
        curvLen: params.fgCurvLen,
        thresholdKLong: params.fgThresholdKLong,
        thresholdKShort: params.fgThresholdKShort,
      })
      if (!flux) return []

      const useADX = params.fgUseADX ?? true
      const adxMin = params.fgAdxMin ?? 22
      const gate1Adx = !useADX || currentAdx >= adxMin

      const useSession = params.fgUseSession ?? true
      const sessionStartUtc = params.fgSessionStartUtc ?? 8
      const sessionEndUtc = params.fgSessionEndUtc ?? 12
      const utcHour = (() => {
        const t = bars[lastIdx]?.time
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

      const htfSource = Array.isArray(htfCandles) && htfCandles.length >= 60 ? htfCandles : bars
      const htfOpens  = htfSource.map((c) => Number(c.open || 0))
      const htfHighs  = htfSource.map((c) => Number(c.high || 0))
      const htfLows   = htfSource.map((c) => Number(c.low || 0))
      const htfCloses = htfSource.map((c) => Number(c.close || 0))
      const htfAtrArr = calculateATR(htfHighs, htfLows, htfCloses, 14)
      const htfAtr = typeof htfAtrArr[htfAtrArr.length - 1] === 'number'
        ? (htfAtrArr[htfAtrArr.length - 1] as number)
        : currentAtr
      const tolMult = params.fgStructureTolAtrMult ?? 0.25
      const tol = htfAtr * tolMult

      const htfEma200 = calculateEMA(htfCloses, 200)
      const htfLast = htfCloses.length - 1
      const htfClose = htfCloses[htfLast]
      const htfEma200v = typeof htfEma200[htfLast] === 'number' ? (htfEma200[htfLast] as number) : htfClose
      const htfBiasBull = Number.isFinite(htfClose) && Number.isFinite(htfEma200v) && htfEma200v > 0 ? htfClose > htfEma200v : currentPrice > currentEma200

      const obs = detectOrderBlocks(htfOpens, htfHighs, htfLows, htfCloses, 60)
      const bullOB = obs.bullOB
      const bearOB = obs.bearOB
      const fvgZones = detectFVGZones(htfHighs, htfLows, 80)
      const nearBullFvg = fvgZones.some((z) => z.type === 'bull' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol)
      const nearBearFvg = fvgZones.some((z) => z.type === 'bear' && currentPrice >= z.bottom - tol && currentPrice <= z.top + tol)
      const gate4Demand = !!bullOB
        ? currentPrice >= bullOB.low - tol && currentPrice <= bullOB.high + tol
        : nearBullFvg
      const gate4Supply = !!bearOB
        ? currentPrice >= bearOB.low - tol && currentPrice <= bearOB.high + tol
        : nearBearFvg
      const useStructure = params.fgUseStructure ?? true
      const gate4DemandFinal = !useStructure || gate4Demand
      const gate4SupplyFinal = !useStructure || gate4Supply

      const div = detectSwingRSIDivergence(closes, rsi, 40, 5)
      const stoch = calculateStochastic(highs, lows, closes, 14, 3, 3)
      const prevK = typeof stoch.k[lastIdx - 1] === 'number' ? (stoch.k[lastIdx - 1] as number) : null
      const prevD = typeof stoch.d[lastIdx - 1] === 'number' ? (stoch.d[lastIdx - 1] as number) : null
      const curK = typeof stoch.k[lastIdx] === 'number' ? (stoch.k[lastIdx] as number) : null
      const curD = typeof stoch.d[lastIdx] === 'number' ? (stoch.d[lastIdx] as number) : null
      const stochCrossUp = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK <= prevD && curK > curD
      const stochCrossDown = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK >= prevD && curK < curD
      const stochExtreme = params.fgStochExtreme ?? false
      const stochOS = params.fgStochOS ?? 30
      const stochOB = params.fgStochOB ?? 70
      const stochCrossUpOk = stochCrossUp && (!stochExtreme || (prevK !== null && prevD !== null && Math.min(prevK, prevD) <= stochOS))
      const stochCrossDownOk = stochCrossDown && (!stochExtreme || (prevK !== null && prevD !== null && Math.max(prevK, prevD) >= stochOB))
      const useMom = params.fgUseMomentum ?? true
      const useDiv = params.fgUseRsiDivergence ?? false
      const useStoch = params.fgUseStochCross ?? true
      const momLong = (!useDiv || div.bullDiv) && (!useStoch || stochCrossUpOk)
      const momShort = (!useDiv || div.bearDiv) && (!useStoch || stochCrossDownOk)
      const gate5MomLong = !useMom || momLong
      const gate5MomShort = !useMom || momShort

      const volNow = Number(bars[lastIdx].volume || 0)
      const volPrev = Number(bars[lastIdx - 1]?.volume || 0)
      const vol20 = bars.slice(Math.max(0, bars.length - 21), bars.length - 1).map((c) => Number(c.volume || 0))
      const sma20 = vol20.length > 0 ? vol20.reduce((a, b) => a + b, 0) / vol20.length : volNow
      const vol5 = bars.slice(Math.max(0, bars.length - 6), bars.length - 1).map((c) => Number(c.volume || 0))
      const sma5 = vol5.length > 0 ? vol5.reduce((a, b) => a + b, 0) / vol5.length : volNow
      const volRatioGate = sma20 > 0 ? volNow / sma20 : 1
      const useVol = params.fgUseVolume ?? true
      const minVolRatio = params.fgMinVolumeRatio ?? 1.5
      const requireExpanding = params.fgRequireVolumeExpanding ?? false
      const expandingOk = !requireExpanding || (volNow > volPrev && sma5 >= sma20)
      const gate6Volume = !useVol || (volRatioGate >= minVolRatio && expandingOk)

      const useCross = params.fgUseCross ?? true
      const gate3Long = useCross ? flux.longCross : flux.scoreNow > flux.longThresholdNow
      const gate3Short = useCross ? flux.shortCross : flux.scoreNow < flux.shortThresholdNow
      const useHtf = params.fgUseHTFAlign ?? true
      const gate8CorrLong = !useHtf || htfBiasBull
      const gate8CorrShort = !useHtf || !htfBiasBull

      const useCost = params.fgUseCost ?? false
      const gate7Cost = !useCost || candleRange <= currentAtr * 2.0

      const useExec = params.fgUseExecution ?? false
      const avgRange10 = (() => {
        const start = Math.max(0, lastIdx - 10)
        const slice = bars.slice(start, lastIdx + 1)
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
      const bbLen      = Math.max(5, Math.floor(params.bbssdLength ?? 20))
      const bbSd       = Math.max(0.5, params.bbssdStdDev ?? 2.0)
      const stK        = Math.max(3, Math.floor(params.bbssdStochK ?? 14))
      const stD        = Math.max(1, Math.floor(params.bbssdStochD ?? 3))
      const stSmooth   = Math.max(1, Math.floor(params.bbssdStochSmooth ?? 3))
      const stOS       = Math.min(40, Math.max(5, params.bbssdStochOS ?? 20))
      const stOB       = Math.max(60, Math.min(95, params.bbssdStochOB ?? 80))
      const lookback   = Math.max(1, Math.floor(params.bbssdLookbackBars ?? 3))
      const requireZone     = params.bbssdRequireZone     ?? true
      const zoneFreshOnly   = params.bbssdZoneFreshOnly   ?? true
      const requireBBTag    = params.bbssdRequireBBTag    ?? true
      const requireBBReject = params.bbssdRequireBBReject ?? true
      const requireStochX   = params.bbssdRequireStochCross ?? true
      const requireRevCdl   = params.bbssdRequireReversalCandle ?? true
      const useHtfEma200    = params.bbssdHtfEma200       ?? false
      const useMaxAdx       = params.bbssdUseMaxAdx       ?? true
      const maxAdx          = Math.max(15, params.bbssdMaxAdx ?? 22)
      const useVol          = params.bbssdUseVolume       ?? false
      const minVolRatio     = Math.max(0.5, params.bbssdMinVolumeRatio ?? 1.2)
      const zoneTolAtr      = Math.max(0.05, params.bbssdZoneTolAtrMult ?? 0.3)
      const minLegAtr       = Math.max(1.0, params.bbssdMinLegAtr ?? 2.0)
      const rsiLongMin      = Math.max(0,  params.bbssdRsiLongMin  ?? 30)
      const rsiLongMax      = Math.min(100, params.bbssdRsiLongMax  ?? 45)
      const rsiShortMin     = Math.max(0,  params.bbssdRsiShortMin ?? 55)
      const rsiShortMax     = Math.min(100, params.bbssdRsiShortMax ?? 70)
      const freshZonesOnly  = params.bbssdFreshZonesOnly  ?? false
      const requireRsiDiv   = params.bbssdRequireRsiDiv   ?? false
      const allowObFvg      = params.bbssdAllowObFvgFallback ?? true
      const revWickRatio    = Math.min(0.95, Math.max(0.3, (params.bbssdRevWickPct ?? 70) / 100))
      const requireEntryConfirm = params.bbssdRequireEntryConfirm ?? false

      if (useMaxAdx && currentAdx > maxAdx) return []

      const bb = calculateBollingerBands(closes, bbLen, bbSd)
      const upper = bb.upper[lastIdx], lower = bb.lower[lastIdx], middle = bb.middle[lastIdx]
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

      const stoch = calculateStochastic(highs, lows, closes, stK, stD, stSmooth)
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

      const sdZones = detectSupplyDemandZones(opens, highs, lows, closes, currentAtr, 80, minLegAtr, 3)
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
      const bbssdOBs = detectOrderBlocks(opens, highs, lows, closes, 60)
      const bbssdFVGs = detectFVGZones(highs, lows, 60)
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

      const detectBullRev = (i: number) => {
        if (i < 0 || i >= closes.length) return false
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
        if (i < 0 || i >= closes.length) return false
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
      // Entry confirmation (intra-bar): current close must break prior bar's high (long) / low (short).
      const entryConfirmBull = !requireEntryConfirm || (lastIdx >= 1 && closes[lastIdx] > highs[lastIdx - 1])
      const entryConfirmBear = !requireEntryConfirm || (lastIdx >= 1 && closes[lastIdx] < lows[lastIdx - 1])

      const volNow = Number(bars[lastIdx].volume || 0)
      const volRatio = avgVol > 0 ? volNow / avgVol : 1
      const volOk = !useVol || volRatio >= minVolRatio

      const htfEma200Bull = (() => {
        if (!Array.isArray(htfCandles) || htfCandles.length < 200) return false
        const htfCloses = htfCandles.map(c => Number(c.close || 0))
        const htfEma200Arr = calculateEMA(htfCloses, 200)
        const e = htfEma200Arr[htfEma200Arr.length - 1]
        return typeof e === 'number' && htfCloses[htfCloses.length - 1] > e
      })()
      const htfEma200Bear = (() => {
        if (!Array.isArray(htfCandles) || htfCandles.length < 200) return false
        const htfCloses = htfCandles.map(c => Number(c.close || 0))
        const htfEma200Arr = calculateEMA(htfCloses, 200)
        const e = htfEma200Arr[htfEma200Arr.length - 1]
        return typeof e === 'number' && htfCloses[htfCloses.length - 1] < e
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

      const bbssdRsiDiv = requireRsiDiv ? detectSwingRSIDivergence(closes, rsi, 40, 5) : { bullDiv: false, bearDiv: false }
      const rsiDivBullOk = !requireRsiDiv || bbssdRsiDiv.bullDiv
      const rsiDivBearOk = !requireRsiDiv || bbssdRsiDiv.bearDiv

      const requireLiqSweep = params.bbssdRequireLiqSweep ?? false
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

    if (!eliteInSession) return []
    if (!eliteHtfStructureBull && !eliteHtfStructureBear) return []

    if (strategyForSignals === errStr) {
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
        { active: !!params.errHtfEma200 && eliteHtfEma200Bull, direction: 'buy', label: 'HTF EMA200', quality: 5 },
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
        { active: !!params.errHtfEma200 && eliteHtfEma200Bear, direction: 'sell', label: 'HTF EMA200', quality: 5 },
      ]
    }

    // Elite Context Breakout
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

  const activeBuySignals  = indicatorSignals.filter(s => s.active && s.direction === 'buy')
  const activeSellSignals = indicatorSignals.filter(s => s.active && s.direction === 'sell')

  const make = (signals: Signal[], direction: 'buy' | 'sell') => {
    if (signals.length === 0) return null
    const avgQuality = signals.reduce((acc, s) => acc + s.quality, 0) / signals.length
    const confluence = signals.length
    const quality    = Math.min(8, Math.floor(avgQuality + (confluence - 1)))

    if (quality < minQuality) return null
    if (isConfluence && confluence < minConfluence) return null

    if (strategyForSignals !== fluxStr && strategyForSignals !== bbssdStr && strategyForSignals !== stStr && strategyForSignals !== sqzStr) {
      const passDirectional = direction === 'buy' ? entryBuyOk : entrySellOk
      if (!passDirectional) return null
      if (!eliteInSession) return null
      if (params.eliteMinVolRegime === 'medium' && eliteVolRegime === 'low') return null
      if (params.eliteMinVolRegime === 'high' && eliteVolRegime !== 'high') return null
    }

    const isEliteBull = direction === 'buy'

    if (strategyForSignals === bbssdStr) {
      const isBull = direction === 'buy'
      const bbLen2 = Math.max(5, Math.floor(params.bbssdLength ?? 20))
      const bbSd2  = Math.max(0.5, params.bbssdStdDev ?? 2.0)
      const bb2 = calculateBollingerBands(closes, bbLen2, bbSd2)
      const upper2 = bb2.upper[lastIdx], lower2 = bb2.lower[lastIdx], middle2 = bb2.middle[lastIdx]
      if (typeof upper2 !== 'number' || typeof lower2 !== 'number' || typeof middle2 !== 'number') return null

      const minLegAtr2 = Math.max(1.0, params.bbssdMinLegAtr ?? 2.0)
      const tolMult    = Math.max(0.05, params.bbssdZoneTolAtrMult ?? 0.3)
      const zones      = detectSupplyDemandZones(opens, highs, lows, closes, currentAtr, 80, minLegAtr2, 3)
      const obs2       = detectOrderBlocks(opens, highs, lows, closes, 60)
      const fvgs2      = detectFVGZones(highs, lows, 60)
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
      let tp1 = isBull ? Math.max(entry + risk * 1.5, middleTarget) : Math.min(entry - risk * 1.5, middleTarget)
      let tp2 = isBull ? Math.max(entry + risk * 3.0, oppBand) : Math.min(entry - risk * 3.0, oppBand)

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null

      let finalSl = sl
      if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        finalSl = isBull ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = isBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = isBull ? entry * (1 + tpPct * 2) : entry * (1 - tpPct * 2)
      }

      return {
        symbol, timeframe, direction,
        strategy: bbssdStr,
        quality, confluence,
        entry, sl: finalSl, tp1, tp2,
        entryDistancePct,
        detectedAt: Date.now(),
        currentPrice, regime,
        notes: `${bbssdStr}: ${signals.filter(s => s.active && s.direction === direction).map((s) => s.label).join(' + ')}`,
      } satisfies BgSignal
    }

    if (strategyForSignals === fluxStr) {
      const entry = currentPrice
      const entryDistancePct = 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null
      let sl = direction === 'buy' ? entry - currentAtr * 1.5 : entry + currentAtr * 1.5
      let tp1 = direction === 'buy' ? entry + currentAtr * 2 : entry - currentAtr * 2
      let tp2 = direction === 'buy' ? entry + currentAtr * 4 : entry - currentAtr * 4
      if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = tp1
      }
      return {
        symbol,
        timeframe,
        direction,
        strategy: fluxStr,
        quality,
        confluence,
        entry,
        sl,
        tp1,
        tp2,
        entryDistancePct,
        detectedAt: Date.now(),
        currentPrice,
        regime,
        notes: `${fluxStr}: ${signals.map((s) => s.label).join(' + ')}`,
      } satisfies BgSignal
    }

    if (strategyForSignals === brStr) {
      const isBrBull = direction === 'buy'
      const hasBreakout = isBrBull ? brBreakoutBullIdx >= 0 : brBreakoutBearIdx >= 0
      const hasRetest = isBrBull ? brRetestBull : brRetestBear
      if (!hasBreakout) return null
      if ((params.filterRetestConfirmation ?? false) && !hasRetest) return null

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
      let tp1 = isBrBull ? entry + risk * tp1Mult : entry - risk * tp1Mult
      let tp2 = isBrBull ? entry + risk * tp2Mult : entry - risk * tp2Mult

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        finalSl = isBrBull ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = isBrBull ? entry * (1 + tpPct) : entry * (1 - tpPct)
        finalTp2 = finalTp1
      }

      return {
        symbol,
        timeframe,
        direction,
        strategy: brStr,
        quality,
        confluence,
        entry,
        sl: finalSl,
        tp1: finalTp1,
        tp2: finalTp2,
        entryDistancePct,
        detectedAt: Date.now(),
        currentPrice,
        regime,
        notes: `${brStr}: ${signals.map((s) => s.label).join(' + ')}`,
      } satisfies BgSignal
    }

    if (strategyForSignals === stStr) {
      const entry = currentPrice
      const entryDistancePct = 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null
      // 3×ATR TP1 ⇒ 2R (was 2×ATR = 1.33R, below breakeven for an all-in/all-out trend
      // strategy). Mirrors signalScan.ts make() — FluxGate keeps its own 2/4 block.
      let sl = direction === 'buy' ? entry - currentAtr * 1.5 : entry + currentAtr * 1.5
      let tp1 = direction === 'buy' ? entry + currentAtr * 3 : entry - currentAtr * 3
      let tp2 = direction === 'buy' ? entry + currentAtr * 5 : entry - currentAtr * 5
      if (params.stUseManualSlTp && entry > 0) {
        const slPct = Math.max(0.01, Number(params.stManualSlPct ?? 1.5)) / 100
        const tp1Pct = Math.max(0.01, Number(params.stManualTp1Pct ?? 2.0)) / 100
        const tp2Pct = Math.max(0.01, Number(params.stManualTp2Pct ?? 4.0)) / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct)
        tp2 = direction === 'buy' ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct)
      } else if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = tp1
      }
      return {
        symbol,
        timeframe,
        direction,
        strategy: stStr,
        quality,
        confluence,
        entry,
        sl,
        tp1,
        tp2,
        entryDistancePct,
        detectedAt: Date.now(),
        currentPrice,
        regime,
        notes: `${stStr}: ${signals.map((s) => s.label).join(' + ')}`,
      } satisfies BgSignal
    }

    if (strategyForSignals === sqzStr) {
      const entry = currentPrice
      const entryDistancePct = 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null
      const slMult = Math.max(0.1, Number(params.sqzSlAtrMult ?? 1.5))
      const tp1Mult = Math.max(0.1, Number(params.sqzTp1AtrMult ?? 3.0))
      const tp2Mult = Math.max(0.1, Number(params.sqzTp2AtrMult ?? 5.0))
      let sl = direction === 'buy' ? entry - currentAtr * slMult : entry + currentAtr * slMult
      let tp1 = direction === 'buy' ? entry + currentAtr * tp1Mult : entry - currentAtr * tp1Mult
      let tp2 = direction === 'buy' ? entry + currentAtr * tp2Mult : entry - currentAtr * tp2Mult
      if (params.sqzUseManualSlTp && entry > 0) {
        const slPct = Math.max(0.01, Number(params.sqzManualSlPct ?? 1.5)) / 100
        const tp1Pct = Math.max(0.01, Number(params.sqzManualTp1Pct ?? 3.0)) / 100
        const tp2Pct = Math.max(0.01, Number(params.sqzManualTp2Pct ?? 5.0)) / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct)
        tp2 = direction === 'buy' ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct)
      } else if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
        tp2 = tp1
      }
      return {
        symbol,
        timeframe,
        direction,
        strategy: sqzStr,
        quality,
        confluence,
        entry,
        sl,
        tp1,
        tp2,
        entryDistancePct,
        detectedAt: Date.now(),
        currentPrice,
        regime,
        notes: `${sqzStr}: ${signals.map((s) => s.label).join(' + ')}`,
      } satisfies BgSignal
    }

    // ── Elite Retest Reversal SL/TP ──────────────────────────────────────────
    if (strategyForSignals === errStr) {
      const retestRevOk = isEliteBull ? errRetestRevBull : errRetestRevBear
      if (!retestRevOk) return null
      const htfOk = isEliteBull ? eliteHtfStructureBull : eliteHtfStructureBear
      if (!htfOk) return null
      if (params.filterRequireOrderBlock) {
        if (isEliteBull  && !eliteBullOB) return null
        if (!isEliteBull && !eliteBearOB) return null
      }
      if (params.filterFVG) {
        if (isEliteBull  && !eliteFVGBull) return null
        if (!isEliteBull && !eliteFVGBear) return null
      }
      if (params.filterLiquiditySweep) {
        if (isEliteBull  && !eliteLiquiditySweepBull) return null
        if (!isEliteBull && !eliteLiquiditySweepBear) return null
      }

      if (params.errAGradeRequired) {
        if (isEliteBull  && !eliteIsAGradeBull) return null
        if (!isEliteBull && !eliteIsAGradeBear) return null
      }

      if (params.errHtfEma50Required) {
        if (isEliteBull  && !eliteHtfEmaBull) return null
        if (!isEliteBull && !eliteHtfEmaBear) return null
      }

      if (params.errRetestMaxBarsEnabled) {
        const breakIdx = isEliteBull ? eliteBreakoutBullIdx : eliteBreakoutBearIdx
        if (breakIdx < 0) return null
        const barsSinceBreak = lastIdx - breakIdx
        const maxBars = Math.max(1, Math.floor(params.errRetestMaxBars ?? 8))
        if (barsSinceBreak > maxBars) return null
      }

      if (params.errStochConfirm) {
        const stoch = calculateStochastic(highs, lows, closes, 14, 3, 3)
        const kArr = stoch.k
        const lastK = kArr[kArr.length - 1]
        const prevK = kArr.length >= 4 ? kArr[kArr.length - 4] : null
        const valid = typeof lastK === 'number' && typeof prevK === 'number'
        if (!valid) return null
        const os = Math.max(0, Math.min(50, Number(params.errStochOS ?? 30)))
        const ob = Math.max(50, Math.min(100, Number(params.errStochOB ?? 70)))
        if (isEliteBull && !(prevK! < os && lastK! > prevK!)) return null
        if (!isEliteBull && !(prevK! > ob && lastK! < prevK!)) return null
      }

      if (params.errMultiRetest) {
        const swingLvl = isEliteBull ? eliteSwingHigh : eliteSwingLow
        const lookback = Math.min(Math.max(1, Math.floor(Number(params.errMultiRetestLookbackBars ?? 30))), lows.length - 1)
        const fromIdx = Math.max(0, lows.length - 1 - lookback)
        const tolerance = currentAtr * Math.max(0.05, Number(params.errRetestAtrTolMult ?? 0.3))
        let touches = 0
        for (let i = fromIdx; i < lows.length; i++) {
          const inZone = isEliteBull
            ? (highs[i] >= swingLvl - tolerance && highs[i] <= swingLvl + tolerance)
            : (lows[i]  >= swingLvl - tolerance && lows[i]  <= swingLvl + tolerance)
          if (inZone) touches++
        }
        const minTouches = Math.max(1, Math.floor(Number(params.errMultiRetestMinTouches ?? 2)))
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
      const aGradeActive = !!params.errAGradeBoost && (isEliteBull ? eliteIsAGradeBull : eliteIsAGradeBear)
      const tp1Mult = aGradeActive ? (Number(params.errTp1MultBoost ?? 3.0)) : (Number(params.errTp1MultDefault ?? 2.5))
      const tp2Mult = aGradeActive ? (Number(params.errTp2MultBoost ?? 6)) : (Number(params.errTp2MultDefault ?? 5))
      const tp1 = isEliteBull ? entry + risk * tp1Mult : entry - risk * tp1Mult
      const tp2 = isEliteBull
        ? entry + Math.max(measuredMove, risk * tp2Mult)
        : entry - Math.max(measuredMove, risk * tp2Mult)

      if (params.errMinRREnabled && risk > 0) {
        const tp1RR = Math.abs(tp1 - entry) / risk
        if (tp1RR < Math.max(0, params.errMinRR ?? 2.5)) return null
      }

      const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
      if (nearEntryOnly && entryDistancePct > nearEntryPct) return null

      let finalSl = sl, finalTp1 = tp1, finalTp2 = tp2
      if (params.filterFixedPctSlTp && entry > 0) {
        const slPct = params.fixedSlPct / 100
        const tpPct = params.fixedTpPct / 100
        const tpMult = aGradeActive ? 1.2 : 1.0
        finalSl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
        finalTp1 = direction === 'buy' ? entry * (1 + tpPct * tpMult) : entry * (1 - tpPct * tpMult)
        finalTp2 = direction === 'buy' ? entry * (1 + tpPct * tpMult * 2) : entry * (1 - tpPct * tpMult * 2)
      }
      return { direction, quality, confluence, entry, sl: finalSl, tp1: finalTp1, tp2: finalTp2, entryDistancePct }
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

    if (params.filterRequireOrderBlock) {
      if (isEliteBull  && !eliteBullOB) return null
      if (!isEliteBull && !eliteBearOB) return null
    }
    if (params.filterFVG) {
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
    const minConsolidBars = Math.max(1, Math.floor(Number(params.ecbMinConsolidBars ?? 5)))
    if (consolidBars < minConsolidBars) return null
    if (breakGrade === 0) return null
    if (!htfEmaOk && breakGrade < 2) return null
    if (params.filterEliteHTFEMA && !htfEmaOk) return null
    if (!retestOccurred && breakGrade < 2) return null
    if (params.filterEliteRequireRetest && !retestOccurred) return null
    const maxEmaDistAtr = Math.max(0.1, Number(params.ecbMaxEma50DistanceAtrMult ?? 3))
    if (params.filterEliteMaxEmaDistance && Math.abs(currentPrice - currentEma50) > currentAtr * maxEmaDistAtr) return null
    const retestEmaOk = isEliteBull ? eliteRetestEmaAlignBull : eliteRetestEmaAlignBear
    if (retestOccurred && !retestEmaOk) return null
    const rsiLongMin = eliteVolRegime === 'medium'
      ? (breakGrade === 2 ? Number(params.ecbRsiLongMinMediumAGrade ?? 55) : Number(params.ecbRsiLongMinMediumBGrade ?? 52))
      : Number(params.ecbRsiLongMinOther ?? 50)
    const rsiShortMax = eliteVolRegime === 'medium'
      ? (breakGrade === 2 ? Number(params.ecbRsiShortMaxMediumAGrade ?? 45) : Number(params.ecbRsiShortMaxMediumBGrade ?? 48))
      : Number(params.ecbRsiShortMaxOther ?? 50)
    if (isEliteBull  && currentRsi < rsiLongMin)  return null
    if (!isEliteBull && currentRsi > rsiShortMax) return null
    if (params.filterLiquiditySweep) {
      if (isEliteBull  && !eliteLiquiditySweepBull) return null
      if (!isEliteBull && !eliteLiquiditySweepBear) return null
    }

    const isAGrade = breakGrade === 2
    const slMult = isAGrade
      ? (eliteVolRegime === 'high' ? Number(params.ecbSlAtrMultAGradeHigh ?? 1.2) : Number(params.ecbSlAtrMultAGradeOther ?? 1.0))
      : Number(params.ecbSlAtrMultBGrade ?? 1.5)
    const tp1Mult = isAGrade
      ? (eliteVolRegime === 'high' ? Number(params.ecbTp1RRMultAGradeHigh ?? 2.5) : Number(params.ecbTp1RRMultAGradeOther ?? 2.0))
      : (eliteVolRegime === 'medium' ? Number(params.ecbTp1RRMultBGradeMedium ?? 2.0) : Number(params.ecbTp1RRMultBGradeOther ?? 1.5))
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
    const mmMinAtrMult = Math.max(0.5, Number(params.ecbMeasuredMoveMinAtrMult ?? 2.5))
    const measuredMove = Math.max(consolidRange, currentAtr * mmMinAtrMult)
    tp1 = isEliteBull ? entry + eliteRisk * tp1Mult : entry - eliteRisk * tp1Mult
    const tp2ExtraRR = Math.max(0, Number(params.ecbTp2ExtraRR ?? 2))
    tp2 = isEliteBull
      ? entry + Math.max(measuredMove, eliteRisk * (minRR + tp2ExtraRR))
      : entry - Math.max(measuredMove, eliteRisk * (minRR + tp2ExtraRR))

    const entryDistancePct = entry > 0 ? (Math.abs(currentPrice - entry) / entry) * 100 : 0
    if (nearEntryOnly && entryDistancePct > nearEntryPct) return null

    if (params.filterFixedPctSlTp && entry > 0) {
      const slPct = params.fixedSlPct / 100
      const tpPct = params.fixedTpPct / 100
      sl  = direction === 'buy' ? entry * (1 - slPct) : entry * (1 + slPct)
      tp1 = direction === 'buy' ? entry * (1 + tpPct) : entry * (1 - tpPct)
      tp2 = tp1
    }

    return { direction, quality, confluence, entry, sl, tp1, tp2, entryDistancePct }
  }

  const buy  = make(activeBuySignals,  'buy')
  const sell = make(activeSellSignals, 'sell')

  if (!buy && !sell) return null
  const best = buy && sell ? (buy.quality >= sell.quality ? buy : sell) : buy ?? sell!

  // FluxGate and BB Stoch S/D return a full BgSignal from make() — pass through unchanged.
  // Other strategies return a partial result and need the regime-suffixed label rebuilt here.
  if (strategyForSignals === fluxStr || strategyForSignals === bbssdStr || strategyForSignals === stStr) {
    return best as BgSignal
  }

  return {
    symbol, timeframe,
    strategy: `${strategyForSignals} [${eliteVolRegime.toUpperCase()} VOL]`,
    direction: best.direction, quality: best.quality, confluence: best.confluence,
    currentPrice,
    regime,
    entry: best.entry, sl: best.sl, tp1: best.tp1, tp2: best.tp2,
    entryDistancePct: best.entryDistancePct, detectedAt: Date.now(),
  }
}
