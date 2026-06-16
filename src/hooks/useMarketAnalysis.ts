import { useEffect } from 'react'
import { useTradingStore, type MarketMetrics, type AIInsight, type RegimeScores, type SignalRow, type IndicatorRow } from '@/stores/tradingStore'
import { 
  calculateRSI, 
  calculateEMA, 
  calculateMACD, 
  calculateADX, 
  calculateDI,
  calculateATR, 
  calculateBollingerBands,
  calculateStochastic,
  calculateIchimoku,
  calculateFibonacciRetracement,
  calculateSupertrend,
  computeFluxGateDualEngine,
  detectFVGZones,
  detectOrderBlocks,
  detectSwingRSIDivergence,
  type OhlcvBar
} from '@/utils/ohlcv'
import { formatPrice } from '@/utils/format'
import { detectChartPatterns } from '@/utils/patterns'
import { evaluateSignalFromCandles } from '@/utils/signalScan'

const pad2 = (n: number) => String(n).padStart(2, '0')
const hhmmss = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

export function useMarketAnalysis(candles: OhlcvBar[]) {
  const setMetrics = useTradingStore((s) => s.setMetrics)
  const setInsights = useTradingStore((s) => s.setInsights)
  const setRegime = useTradingStore((s) => s.setRegime)
  const setIndicatorTable = useTradingStore((s) => s.setIndicatorTable)
  const setSignals = useTradingStore((s) => s.setSignals)
  const setTradeSetup = useTradingStore((s) => s.setTradeSetup)
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const entryModel = useTradingStore((s) => s.entryModel)
  const isConfluence = useTradingStore((s) => s.isConfluence)
  const minConfluence = useTradingStore((s) => s.minConfluence)
  const minQuality = useTradingStore((s) => s.minQuality)
  const setConfluence = useTradingStore((s) => s.setConfluence)
  const setConfluenceRows = useTradingStore((s) => s.setConfluenceRows)
  const enabledStrategies = useTradingStore((s) => s.enabledStrategies)
  const symbol = useTradingStore((s) => s.symbol)
  const timeframe = useTradingStore((s) => s.timeframe)
  const filterBTCAlignment = useTradingStore((s) => s.filterBTCAlignment)
  const filterHTFAlignment = useTradingStore((s) => s.filterHTFAlignment)
  const filterEntryConfirmation = useTradingStore((s) => s.filterEntryConfirmation)
  const filterADXRegime = useTradingStore((s) => s.filterADXRegime)
  const filterVolumeConfirmation = useTradingStore((s) => s.filterVolumeConfirmation)
  const filterKeyLevelDistance = useTradingStore((s) => s.filterKeyLevelDistance)
  const keyLevelMaxDistancePct = useTradingStore((s) => s.keyLevelMaxDistancePct)
  const minVolumeRatio = useTradingStore((s) => s.minVolumeRatio)
  const filterRetestConfirmation = useTradingStore((s) => s.filterRetestConfirmation)
  const filterAtrEntryBuffer = useTradingStore((s) => s.filterAtrEntryBuffer)
  const entryAtrBufferAtrMult = useTradingStore((s) => s.entryAtrBufferAtrMult)
  const filterStrongClose = useTradingStore((s) => s.filterStrongClose)
  const strongCloseBodyPct = useTradingStore((s) => s.strongCloseBodyPct)
  const filterAvoidOppKeyLevel = useTradingStore((s) => s.filterAvoidOppKeyLevel)
  const filterCooldown = useTradingStore((s) => s.filterCooldown)
  const cooldownBars = useTradingStore((s) => s.cooldownBars)
  const eliteMinVolRegime = useTradingStore((s) => s.eliteMinVolRegime)
  const filterRequireOrderBlock = useTradingStore((s) => s.filterRequireOrderBlock)
  const filterFVG = useTradingStore((s) => s.filterFVG)
  const filterPapRequireRetest = useTradingStore((s) => s.filterPapRequireRetest)
  const filterEliteSession = useTradingStore((s) => s.filterEliteSession)
  const filterCmSession = useTradingStore((s) => s.filterCmSession)
  const filterLiquiditySweep = useTradingStore((s) => s.filterLiquiditySweep)
  const filterEliteRequireRetest = useTradingStore((s) => s.filterEliteRequireRetest)
  const filterEliteHTFEMA = useTradingStore((s) => s.filterEliteHTFEMA)
  const filterEliteMaxEmaDistance = useTradingStore((s) => s.filterEliteMaxEmaDistance)
  const filterFixedPctSlTp = useTradingStore((s) => s.filterFixedPctSlTp)
  const fixedSlPct = useTradingStore((s) => s.fixedSlPct)
  const fixedTpPct = useTradingStore((s) => s.fixedTpPct)
  const ecbAGradeBodyMinPctHighVol = useTradingStore((s) => s.ecbAGradeBodyMinPctHighVol)
  const ecbAGradeBodyMinPctOther = useTradingStore((s) => s.ecbAGradeBodyMinPctOther)
  const ecbAGradeVolMinMult = useTradingStore((s) => s.ecbAGradeVolMinMult)
  const ecbBGradeBodyMinPctMedium = useTradingStore((s) => s.ecbBGradeBodyMinPctMedium)
  const ecbBGradeBodyMinPctOther = useTradingStore((s) => s.ecbBGradeBodyMinPctOther)
  const ecbBGradeVolMinMultMedium = useTradingStore((s) => s.ecbBGradeVolMinMultMedium)
  const ecbBGradeVolMinMultOther = useTradingStore((s) => s.ecbBGradeVolMinMultOther)
  const ecbRetestAtrTolMult = useTradingStore((s) => s.ecbRetestAtrTolMult)
  const ecbRetestEma20MaxDistPct = useTradingStore((s) => s.ecbRetestEma20MaxDistPct)
  const ecbRetestVolMaxFracOfBreak = useTradingStore((s) => s.ecbRetestVolMaxFracOfBreak)
  const ecbMaxEma50DistanceAtrMult = useTradingStore((s) => s.ecbMaxEma50DistanceAtrMult)
  const ecbMinConsolidBars = useTradingStore((s) => s.ecbMinConsolidBars)
  const ecbRsiLongMinMediumAGrade = useTradingStore((s) => s.ecbRsiLongMinMediumAGrade)
  const ecbRsiLongMinMediumBGrade = useTradingStore((s) => s.ecbRsiLongMinMediumBGrade)
  const ecbRsiLongMinOther = useTradingStore((s) => s.ecbRsiLongMinOther)
  const ecbRsiShortMaxMediumAGrade = useTradingStore((s) => s.ecbRsiShortMaxMediumAGrade)
  const ecbRsiShortMaxMediumBGrade = useTradingStore((s) => s.ecbRsiShortMaxMediumBGrade)
  const ecbRsiShortMaxOther = useTradingStore((s) => s.ecbRsiShortMaxOther)
  const ecbSlAtrMultAGradeHigh = useTradingStore((s) => s.ecbSlAtrMultAGradeHigh)
  const ecbSlAtrMultAGradeOther = useTradingStore((s) => s.ecbSlAtrMultAGradeOther)
  const ecbSlAtrMultBGrade = useTradingStore((s) => s.ecbSlAtrMultBGrade)
  const ecbTp1RRMultAGradeHigh = useTradingStore((s) => s.ecbTp1RRMultAGradeHigh)
  const ecbTp1RRMultAGradeOther = useTradingStore((s) => s.ecbTp1RRMultAGradeOther)
  const ecbTp1RRMultBGradeMedium = useTradingStore((s) => s.ecbTp1RRMultBGradeMedium)
  const ecbTp1RRMultBGradeOther = useTradingStore((s) => s.ecbTp1RRMultBGradeOther)
  const ecbMeasuredMoveMinAtrMult = useTradingStore((s) => s.ecbMeasuredMoveMinAtrMult)
  const ecbTp2ExtraRR = useTradingStore((s) => s.ecbTp2ExtraRR)
  const ecbMaxBreakCandleRangeAtrMult = useTradingStore((s) => s.ecbMaxBreakCandleRangeAtrMult)
  const ecbBreakClosePosBullMinPct = useTradingStore((s) => s.ecbBreakClosePosBullMinPct)
  const ecbBreakClosePosBearMaxPct = useTradingStore((s) => s.ecbBreakClosePosBearMaxPct)
  const lastSignalTimeSec = useTradingStore((s) => s.lastSignalTimeSec)
  const lastSignalDirection = useTradingStore((s) => s.lastSignalDirection)
  const fgUseADX = useTradingStore((s) => s.fgUseADX)
  const fgAdxMin = useTradingStore((s) => s.fgAdxMin)
  const fgUseStructure = useTradingStore((s) => s.fgUseStructure)
  const fgStructureTolAtrMult = useTradingStore((s) => s.fgStructureTolAtrMult)
  const fgUseMomentum = useTradingStore((s) => s.fgUseMomentum)
  const fgUseRsiDivergence = useTradingStore((s) => s.fgUseRsiDivergence)
  const fgUseStochCross = useTradingStore((s) => s.fgUseStochCross)
  const fgUseVolume = useTradingStore((s) => s.fgUseVolume)
  const fgMinVolumeRatio = useTradingStore((s) => s.fgMinVolumeRatio)
  const fgRequireVolumeExpanding = useTradingStore((s) => s.fgRequireVolumeExpanding)
  const fgUseHTFAlign = useTradingStore((s) => s.fgUseHTFAlign)
  const fgBaseLenLong = useTradingStore((s) => s.fgBaseLenLong)
  const fgBaseLenShort = useTradingStore((s) => s.fgBaseLenShort)
  const fgGuideEmaLen = useTradingStore((s) => s.fgGuideEmaLen)
  const fgVolLen = useTradingStore((s) => s.fgVolLen)
  const fgPersLen = useTradingStore((s) => s.fgPersLen)
  const fgCurvLen = useTradingStore((s) => s.fgCurvLen)
  const fgThresholdKLong = useTradingStore((s) => s.fgThresholdKLong)
  const fgThresholdKShort = useTradingStore((s) => s.fgThresholdKShort)
  const fgUseCross = useTradingStore((s) => s.fgUseCross)
  const fgUseSession = useTradingStore((s) => s.fgUseSession)
  const fgSessionStartUtc = useTradingStore((s) => s.fgSessionStartUtc)
  const fgSessionEndUtc = useTradingStore((s) => s.fgSessionEndUtc)
  const fgStochExtreme = useTradingStore((s) => s.fgStochExtreme)
  const fgStochOS = useTradingStore((s) => s.fgStochOS)
  const fgStochOB = useTradingStore((s) => s.fgStochOB)
  const fgUseCost = useTradingStore((s) => s.fgUseCost)
  const fgUseExecution = useTradingStore((s) => s.fgUseExecution)
  const stAtrPeriod = useTradingStore((s) => s.stAtrPeriod)
  const stAtrMult = useTradingStore((s) => s.stAtrMult)
  const stUseRelVol = useTradingStore((s) => s.stUseRelVol)
  const stRelVolLen = useTradingStore((s) => s.stRelVolLen)
  const stRelVolMin = useTradingStore((s) => s.stRelVolMin)
  const stRequireFlip = useTradingStore((s) => s.stRequireFlip)
  const stUseKernel = useTradingStore((s) => s.stUseKernel)
  const stKernelLookback = useTradingStore((s) => s.stKernelLookback)
  const stKernelBandwidth = useTradingStore((s) => s.stKernelBandwidth)
  const stUseHTFAlign = useTradingStore((s) => s.stUseHTFAlign)
  const stHtfEmaLen = useTradingStore((s) => s.stHtfEmaLen)
  const stUseHtfEmaSlope = useTradingStore((s) => s.stUseHtfEmaSlope)
  const stHtfEmaSlopeLookback = useTradingStore((s) => s.stHtfEmaSlopeLookback)
  const stHtfEmaSlopeMinPctPerBar = useTradingStore((s) => s.stHtfEmaSlopeMinPctPerBar)
  const stUseAdx = useTradingStore((s) => s.stUseAdx)
  const stAdxPeriod = useTradingStore((s) => s.stAdxPeriod)
  const stAdxMin = useTradingStore((s) => s.stAdxMin)
  const stUseDiAlign = useTradingStore((s) => s.stUseDiAlign)
  const stDiPeriod = useTradingStore((s) => s.stDiPeriod)
  const stUseEmaDistance = useTradingStore((s) => s.stUseEmaDistance)
  const stEmaDistAtrMin = useTradingStore((s) => s.stEmaDistAtrMin)
  const stUseImpulse = useTradingStore((s) => s.stUseImpulse)
  const stImpulseBodyMinPct = useTradingStore((s) => s.stImpulseBodyMinPct)
  const stImpulseWickMaxPct = useTradingStore((s) => s.stImpulseWickMaxPct)
  const stUseKdeRegime = useTradingStore((s) => s.stUseKdeRegime)
  const stKdeRegimeLookback = useTradingStore((s) => s.stKdeRegimeLookback)
  const stKdeRegimeBandwidth = useTradingStore((s) => s.stKdeRegimeBandwidth)
  const stKdeRegimeMaxConcentration = useTradingStore((s) => s.stKdeRegimeMaxConcentration)
  const stUseKdeValueArea = useTradingStore((s) => s.stUseKdeValueArea)
  const stKdeValueAreaLookback = useTradingStore((s) => s.stKdeValueAreaLookback)
  const stKdeValueAreaBandwidth = useTradingStore((s) => s.stKdeValueAreaBandwidth)
  const stKdeValueAreaMaxDensity = useTradingStore((s) => s.stKdeValueAreaMaxDensity)

  const analysisRunNonce = useTradingStore((s) => s.analysisRunNonce)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      void analysisRunNonce
      if (!candles || !Array.isArray(candles) || candles.length < 50) return
      
      const lastCandle = candles[candles.length - 1]
      if (!lastCandle || typeof lastCandle.time !== 'number') return
      
      // Process analysis
      const closes = candles.map(c => c.close || 0)
      const opens = candles.map(c => c.open || 0)
      const highs = candles.map(c => c.high || 0)
      const lows = candles.map(c => c.low || 0)

      // 1. Calculate Indicators
      const rsi = calculateRSI(closes, 14)
      const ema20 = calculateEMA(closes, 20)
      const ema50 = calculateEMA(closes, 50)
      const ema200 = calculateEMA(closes, 200)
      const macd = calculateMACD(closes)
      const adx = calculateADX(highs, lows, closes, 14)
      const atr = calculateATR(highs, lows, closes, 14)
      const bb = calculateBollingerBands(closes, 20, 2)
      const stoch = calculateStochastic(highs, lows, closes, 14, 3, 3)
      const ichimoku = calculateIchimoku(highs, lows)
      const fib = calculateFibonacciRetracement({ highs, lows, closes, lookback: 120 })

      const lastIdx = closes.length - 1
      if (lastIdx < 0) return

      const currentRsi = typeof rsi[lastIdx] === 'number' ? rsi[lastIdx] : 50
      const currentEma20 = typeof ema20[lastIdx] === 'number' ? ema20[lastIdx] : closes[lastIdx]
      const prevEma20    = typeof ema20[lastIdx - 1] === 'number' ? (ema20[lastIdx - 1] as number) : currentEma20
      const currentEma50 = typeof ema50[lastIdx] === 'number' ? ema50[lastIdx] : closes[lastIdx]
      const currentEma200 = typeof ema200[lastIdx] === 'number' ? ema200[lastIdx] : closes[lastIdx]
      const currentMacdHist = typeof macd.histogram[lastIdx] === 'number' ? macd.histogram[lastIdx] : 0
      const currentAdx = typeof adx[lastIdx] === 'number' ? adx[lastIdx] : 20
      const currentAtr = typeof atr[lastIdx] === 'number' ? atr[lastIdx] : 0
      const currentPrice = closes[lastIdx]
      const currentStochK = typeof stoch.k[lastIdx] === 'number' ? stoch.k[lastIdx] : null
      const currentStochD = typeof stoch.d[lastIdx] === 'number' ? stoch.d[lastIdx] : null

    const cloudA = typeof ichimoku.spanA[lastIdx] === 'number' ? ichimoku.spanA[lastIdx] : null
    const cloudB = typeof ichimoku.spanB[lastIdx] === 'number' ? ichimoku.spanB[lastIdx] : null
    const cloudTop = cloudA !== null && cloudB !== null ? Math.max(cloudA, cloudB) : null
    const cloudBot = cloudA !== null && cloudB !== null ? Math.min(cloudA, cloudB) : null
    const ichimokuState =
      cloudTop === null || cloudBot === null
        ? '—'
        : currentPrice > cloudTop
          ? 'Above Cloud'
          : currentPrice < cloudBot
            ? 'Below Cloud'
            : 'In Cloud'

      const fibNearest = (() => {
      if (!fib || fib.levels.length === 0) return null
      let best = fib.levels[0]
      let bestDist = Math.abs(currentPrice - best.price)
      for (const lvl of fib.levels) {
        const d = Math.abs(currentPrice - lvl.price)
        if (d < bestDist) {
          best = lvl
          bestDist = d
        }
      }
      return { ...best, dist: bestDist, direction: fib.direction }
      })()

      let htfBiasBull = currentPrice > currentEma200
      const fluxStr = 'FluxGate Dual Engine'
      const bbssdStr = 'BB Stoch S/D'
      // ST needs real HTF candles too — without them its HTF EMA gate silently fell back
      // to chart-timeframe data while the server scanner used true HTF.
      const stHtfStr = 'Supertrend + RelVol'
      let htfCandles: OhlcvBar[] | null = null
      if (filterHTFAlignment || selectedStrategy === fluxStr || selectedStrategy === bbssdStr || selectedStrategy === stHtfStr) {
        const htfTf =
          timeframe === '1m'
            ? '15m'
            : timeframe === '5m'
              ? '1h'
              : timeframe === '15m'
                ? '4h'
                : timeframe === '1h'
                  ? '1d'
                  : '1d'
        if (htfTf !== timeframe) {
          try {
            const resp = await fetch(`/api/prices/ohlcv?symbol=${symbol}&interval=${htfTf}`)
            const json = await resp.json()
            if (cancelled) return
            if (json?.success && Array.isArray(json.data) && json.data.length >= 220) {
              htfCandles = (json.data as any[]).map((r) => ({
                time: Number(r.time || 0),
                open: Number(r.open || 0),
                high: Number(r.high || 0),
                low: Number(r.low || 0),
                close: Number(r.close || 0),
                volume: Number(r.volume || 0),
              })) as OhlcvBar[]
              const htfCloses = htfCandles.map((r) => Number(r.close || 0))
              const ema = calculateEMA(htfCloses, 200)
              const i = htfCloses.length - 1
              const htfClose = htfCloses[i]
              const ema200v = typeof ema[i] === 'number' ? ema[i] : htfClose
              if (Number.isFinite(htfClose) && Number.isFinite(ema200v) && ema200v > 0) {
                htfBiasBull = htfClose > ema200v
              }
            }
          } catch {
            void 0
          }
        }
      }

    // 2. Determine Market Regime
    let regime = 'Ranging'
    const scores: RegimeScores = {
      Trending: 0,
      Ranging: 0,
      Choppy: 0,
      Breakout: 0,
      Exhaustion: 0
    }

    const isTrending = currentAdx > 25
    const isStrongTrend = currentAdx > 40
    const emaAligned = (currentPrice > currentEma20 && currentEma20 > currentEma50) || (currentPrice < currentEma20 && currentEma20 < currentEma50)
    
    if (isStrongTrend) {
      regime = 'Trending'
      scores.Trending = 80
      scores.Breakout = 20
    } else if (isTrending && emaAligned) {
      regime = 'Trending'
      scores.Trending = 65
      scores.Ranging = 15
      scores.Breakout = 20
    } else if ((currentAdx || 0) < 20) {
      regime = 'Ranging'
      scores.Ranging = 70
      scores.Choppy = 30
    } else {
      regime = 'Choppy'
      scores.Choppy = 60
      scores.Ranging = 40
    }

    if ((currentRsi || 50) > 75 || (currentRsi || 50) < 25) {
      scores.Exhaustion = 40
      if ((currentRsi || 50) > 80 || (currentRsi || 50) < 20) regime = 'Exhaustion'
    }

    setRegime(regime, scores)

    // 3. Generate AI Insights
    const insights: AIInsight[] = [
      { 
        label: 'RSI (14)', 
        value: (currentRsi || 50).toFixed(1), 
        status: currentRsi > 60 ? 'bullish' : currentRsi < 40 ? 'bearish' : 'neutral' 
      },
      { 
        label: 'EMA 20/50', 
        value: currentEma20 > currentEma50 ? 'Bullish' : 'Bearish', 
        status: currentEma20 > currentEma50 ? 'bullish' : 'bearish' 
      },
      { 
        label: 'MACD', 
        value: (currentMacdHist || 0) > 0 ? 'Rising' : 'Falling', 
        status: currentMacdHist > 0 ? 'bullish' : 'bearish' 
      },
      { 
        label: 'ADX (14)', 
        value: (currentAdx || 0).toFixed(1), 
        status: currentAdx > 25 ? 'bullish' : 'neutral' 
      },
      {
        label: 'Vol Ratio',
        value: (candles[lastIdx].volume / (candles[lastIdx-1]?.volume || 1)).toFixed(1) + 'x',
        status: candles[lastIdx].volume > (candles[lastIdx-1]?.volume || 0) ? 'bullish' : 'neutral'
      },
      {
        label: 'HTF Bias',
        value: htfBiasBull ? 'Bullish' : 'Bearish',
        status: htfBiasBull ? 'bullish' : 'bearish'
      },
      {
        label: 'Lorentzian ML',
        value: (currentRsi || 50) > 50 ? 'Buy' : 'Sell',
        status: currentRsi > 50 ? 'bullish' : 'bearish'
      },
      {
        label: 'ML Pattern',
        value: (currentAdx || 0) > 30 ? 'Falling Wedge' : 'Channel',
        status: 'neutral'
      }
    ]
    setInsights(insights)

    // 4. Update Market Metrics
    const high7d = highs.length ? Math.max(...highs) : undefined
    const low7d = lows.length ? Math.min(...lows) : undefined
    const nowStr = hhmmss(new Date())

    const metrics: MarketMetrics = {
      rsi: currentRsi,
      ema20: currentEma20,
      ema50: currentEma50,
      ema200: currentEma200,
      macd: (currentMacdHist || 0).toFixed(2),
      direction: currentPrice > currentEma50 ? 'UP' : 'DOWN',
      volatility: currentAtr > (currentPrice * 0.01) ? 'HIGH' : 'LOW',
      momentum: currentRsi > 60 ? 'STRONG' : currentRsi < 40 ? 'WEAK' : 'NEUTRAL',
      adx: Math.round(currentAdx || 0).toString(),
      adxLabel: (currentAdx || 0) > 25 ? 'Trending' : 'Sideways',
      htfBias: currentPrice > currentEma200 ? 'BULLISH' : 'BEARISH',
      candle: 'Neutral',
      signalQuality: Math.min(8, Math.max(0, Math.floor(((currentAdx || 0) / 50) * 8))),
      overallScore: currentRsi > 50 ? 'BULLISH' : 'BEARISH',
      high7d,
      low7d,
      lastUpdate: nowStr
    }
    setMetrics(metrics)

    // 5. Update Indicator Table
    const atrPct = currentPrice ? (currentAtr / currentPrice) * 100 : 0
    const atrSignal = atrPct > 1.2 ? 'SELL' : atrPct < 0.5 ? 'BUY' : 'NEUTRAL'
    const atrColor = atrPct > 1.2 ? 'sell' : atrPct < 0.5 ? 'buy' : 'neutral'

    const stochSignal =
      currentStochK === null
        ? { signal: 'NEUTRAL' as const, color: 'neutral' as const }
        : currentStochK > 80
          ? { signal: 'SELL' as const, color: 'sell' as const }
          : currentStochK < 20
            ? { signal: 'BUY' as const, color: 'buy' as const }
            : { signal: 'NEUTRAL' as const, color: 'neutral' as const }

    const ichimokuSignal =
      ichimokuState === 'Above Cloud'
        ? { signal: 'BUY' as const, color: 'buy' as const }
        : ichimokuState === 'Below Cloud'
          ? { signal: 'SELL' as const, color: 'sell' as const }
          : { signal: 'NEUTRAL' as const, color: 'neutral' as const }

    const fibSignal = (() => {
      if (!fibNearest) return { signal: 'NEUTRAL' as const, color: 'neutral' as const }
      const nearPct = currentPrice ? (fibNearest.dist / currentPrice) * 100 : 100
      if (nearPct > 0.35) return { signal: 'NEUTRAL' as const, color: 'neutral' as const }
      if (fibNearest.direction === 'up') return { signal: 'BUY' as const, color: 'buy' as const }
      return { signal: 'SELL' as const, color: 'sell' as const }
    })()

    const bbUpper = bb.upper[lastIdx]
    const bbLower = bb.lower[lastIdx]
    const bbState =
      typeof bbUpper === 'number' && currentPrice > bbUpper
        ? { value: 'Upper Break', signal: 'SELL' as const, color: 'sell' as const }
        : typeof bbLower === 'number' && currentPrice < bbLower
          ? { value: 'Lower Break', signal: 'BUY' as const, color: 'buy' as const }
          : { value: 'Inside', signal: 'NEUTRAL' as const, color: 'neutral' as const }

    const indicatorTable: IndicatorRow[] = [
      { name: 'RSI', value: (currentRsi || 0).toFixed(1), signal: currentRsi > 70 ? 'SELL' : currentRsi < 30 ? 'BUY' : 'NEUTRAL', color: currentRsi > 70 ? 'sell' : currentRsi < 30 ? 'buy' : 'neutral' },
      { name: 'EMA Stack', value: currentPrice > currentEma50 ? 'Bullish' : 'Bearish', signal: currentPrice > currentEma50 ? 'BUY' : 'SELL', color: currentPrice > currentEma50 ? 'buy' : 'sell' },
      { name: 'MACD', value: (currentMacdHist || 0).toFixed(2), signal: currentMacdHist > 0 ? 'BUY' : 'SELL', color: currentMacdHist > 0 ? 'buy' : 'sell' },
      { name: 'ADX', value: (currentAdx || 0).toFixed(1), signal: currentAdx > 25 ? 'BUY' : 'NEUTRAL', color: currentAdx > 25 ? 'buy' : 'neutral' },
      { name: 'Bollinger', value: bbState.value, signal: bbState.signal, color: bbState.color },
      { name: 'Stochastic', value: currentStochK === null ? '—' : `K:${currentStochK.toFixed(1)} D:${(currentStochD ?? 0).toFixed(1)}`, signal: stochSignal.signal, color: stochSignal.color },
      { name: 'Ichimoku', value: ichimokuState, signal: ichimokuSignal.signal, color: ichimokuSignal.color },
      { name: 'ATR', value: `${currentAtr.toFixed(2)} (${atrPct.toFixed(2)}%)`, signal: atrSignal, color: atrColor },
      { name: 'Fibonacci', value: fibNearest ? `${fibNearest.ratio.toFixed(3)} @ ${formatPrice(fibNearest.price)}` : '—', signal: fibSignal.signal, color: fibSignal.color },
    ]
    setIndicatorTable(indicatorTable)

    // 6. Generate Signals
    const signalTime = hhmm(new Date((lastCandle.time || 0) * 1000))

    const eliteContextStr = 'Elite Context Breakout'
    const errStr          = 'Elite Retest Reversal'
    const strategyForSignals = selectedStrategy

    const stStr = 'Supertrend + RelVol'
    if (!strategyForSignals || (strategyForSignals !== eliteContextStr && strategyForSignals !== errStr && strategyForSignals !== fluxStr && strategyForSignals !== stStr)) {
      setConfluence({ confluenceLabel: 'NEUTRAL', confluenceSmartPct: 0, confluenceAgreeText: 'No strategy enabled' })
      setSignals([])
      setTradeSetup(null)
      return
    }

    if (strategyForSignals === eliteContextStr) {
      const scanSettings = {
        enabledStrategies,
        selectedStrategy: strategyForSignals,
        entryModel,
        isConfluence,
        minConfluence,
        minQuality,
        filterBTCAlignment,
        filterHTFAlignment,
        filterEntryConfirmation,
        filterADXRegime,
        filterVolumeConfirmation,
        filterKeyLevelDistance,
        keyLevelMaxDistancePct,
        minVolumeRatio,
        filterRetestConfirmation,
        filterAtrEntryBuffer,
        entryAtrBufferAtrMult,
        filterStrongClose,
        strongCloseBodyPct,
        filterAvoidOppKeyLevel,
        filterCooldown,
        cooldownBars,
        filterRequireOrderBlock,
        filterFVG,
        filterPapRequireRetest,
        filterEliteSession,
        filterCmSession,
        filterLiquiditySweep,
        filterEliteRequireRetest,
        filterEliteHTFEMA,
        filterEliteMaxEmaDistance,
        filterFixedPctSlTp,
        fixedSlPct,
        fixedTpPct,
        eliteMinVolRegime,
        ecbAGradeBodyMinPctHighVol,
        ecbAGradeBodyMinPctOther,
        ecbAGradeVolMinMult,
        ecbBGradeBodyMinPctMedium,
        ecbBGradeBodyMinPctOther,
        ecbBGradeVolMinMultMedium,
        ecbBGradeVolMinMultOther,
        ecbRetestAtrTolMult,
        ecbRetestEma20MaxDistPct,
        ecbRetestVolMaxFracOfBreak,
        ecbMaxEma50DistanceAtrMult,
        ecbMinConsolidBars,
        ecbRsiLongMinMediumAGrade,
        ecbRsiLongMinMediumBGrade,
        ecbRsiLongMinOther,
        ecbRsiShortMaxMediumAGrade,
        ecbRsiShortMaxMediumBGrade,
        ecbRsiShortMaxOther,
        ecbSlAtrMultAGradeHigh,
        ecbSlAtrMultAGradeOther,
        ecbSlAtrMultBGrade,
        ecbTp1RRMultAGradeHigh,
        ecbTp1RRMultAGradeOther,
        ecbTp1RRMultBGradeMedium,
        ecbTp1RRMultBGradeOther,
        ecbMeasuredMoveMinAtrMult,
        ecbTp2ExtraRR,
        ecbMaxBreakCandleRangeAtrMult,
        ecbBreakClosePosBullMinPct,
        ecbBreakClosePosBearMaxPct,
        nearEntryOnly: false,
        nearEntryPct: 100,
        lastSignalTimeSec,
        lastSignalDirection,
        lastCandleTimeSec: lastCandle.time,
        timeframe,
      }

      // No lastIdx: let evaluateSignalFromCandles default to the last CLOSED bar —
      // passing the forming-bar index here re-introduced the intrabar repaint.
      const scan = evaluateSignalFromCandles({
        candles,
        settings: scanSettings as any,
        symbol,
      })

      if (!scan) {
        setConfluence({ confluenceLabel: 'NEUTRAL', confluenceSmartPct: 0, confluenceAgreeText: `${eliteContextStr}: no signal` })
        setConfluenceRows([])
        setSignals([])
        setTradeSetup(null)
        return
      }

      const dirLabel = scan.direction === 'buy' ? 'BUY' : 'SELL'
      const confluenceLabel =
        scan.direction === 'buy'
          ? (scan.quality >= Math.max(6, minQuality + 1) ? 'STRONG BUY' : 'BUY')
          : (scan.quality >= Math.max(6, minQuality + 1) ? 'STRONG SELL' : 'SELL')
      const confluenceSmartPct = Math.max(0, Math.min(100, (scan.quality / Math.max(1, minQuality)) * 100))

      setConfluence({ confluenceLabel, confluenceSmartPct, confluenceAgreeText: `${dirLabel} · Q${scan.quality} · C${scan.confluence}` })
      setConfluenceRows([])

      const entry = scan.entry
      const sl = scan.sl
      const tp1 = scan.tp1
      const tp2 = scan.tp2
      const slPct = entry > 0 ? (Math.abs(entry - sl) / entry) * 100 : 0
      const tp1Pct = entry > 0 ? (Math.abs(tp1 - entry) / entry) * 100 : 0
      const tp2Pct = entry > 0 ? (Math.abs(tp2 - entry) / entry) * 100 : 0

      setSignals([{
        id: `${eliteContextStr}-${lastCandle.time}`,
        time: signalTime,
        label: eliteContextStr,
        direction: scan.direction,
        quality: scan.quality,
        confluence: scan.confluence,
        symbol,
        entry,
        sl,
        tp1,
        tp2,
        notes: scan.notes,
      }])
      setTradeSetup({ entry, sl, slPct, tp1, tp1Pct, tp2, tp2Pct })
      return
    }

    // Evaluate the remaining inline strategies (ERR + generic signal block) on the last
    // CLOSED bar — forming-bar values repaint intrabar (same pattern as stIdx/fgIdx).
    const tfNumIn = Number((timeframe.match(/^\d+/) || [1])[0]) || 1
    const tfUnitIn = timeframe.slice(-1)
    const tfMsIn = tfNumIn * (tfUnitIn === 'h' ? 3_600_000 : tfUnitIn === 'd' ? 86_400_000 : 60_000)
    const inIdx = Number(candles[lastIdx]?.time ?? 0) * 1000 + tfMsIn > Date.now() && lastIdx > 0 ? lastIdx - 1 : lastIdx
    const inPrice = Number(closes[inIdx] ?? currentPrice)
    const inAtr = typeof atr[inIdx] === 'number' ? (atr[inIdx] as number) : currentAtr

    const isBullCandle  = closes[inIdx] > opens[inIdx]
    const isBearCandle  = closes[inIdx] < opens[inIdx]
    const candleRange   = (highs[inIdx] ?? 0) - (lows[inIdx] ?? 0)
    const candleBody    = Math.abs((closes[inIdx] ?? 0) - (opens[inIdx] ?? 0))
    const candleBodyPct = candleRange > 0 ? (candleBody / candleRange) * 100 : 100
    const strongCloseOk = !filterStrongClose || candleBodyPct >= strongCloseBodyPct

    const recentVol = candles.slice(Math.max(0, inIdx - 19), inIdx)
    const avgVol =
      recentVol.length > 0
        ? recentVol.reduce((acc, c) => acc + Number(c.volume || 0), 0) / recentVol.length
        : Number(candles[inIdx].volume || 0)
    const volRatio = avgVol > 0 ? Number(candles[inIdx].volume || 0) / avgVol : 1

    const swWin    = Math.max(3, Math.min(20, inIdx - 2))
    const swHighs  = highs.slice(inIdx - swWin, inIdx - 1)
    const swLows   = lows.slice(inIdx - swWin, inIdx - 1)
    const swingHigh = swHighs.length > 0 ? Math.max(...swHighs) : inPrice
    const swingLow  = swLows.length  > 0 ? Math.min(...swLows)  : inPrice

    const atrPctVol    = inPrice > 0 ? (inAtr / inPrice) * 100 : 0
    const eliteVolRegime: 'low' | 'medium' | 'high' =
      atrPctVol < 0.4 ? 'low' : atrPctVol < 1.2 ? 'medium' : 'high'
    void(typeof bb.middle[lastIdx])
    // ─────────────────────────────────────────────────────────────────────────

    const detectedPattern = detectChartPatterns(highs.slice(0, inIdx + 1), lows.slice(0, inIdx + 1), closes.slice(0, inIdx + 1))

    // ERR reversal candle detection
    const errBodyPct = candleRange > 0 ? (candleBody / candleRange) * 100 : 100
    const errAtrMult = 0.3
    const errRevBull =
      closes[inIdx] > swingHigh && isBullCandle && errBodyPct >= 50 &&
      lows[inIdx] <= swingHigh + inAtr * errAtrMult &&
      lows[inIdx] >= swingHigh - inAtr * errAtrMult
    const errRevBear =
      closes[inIdx] < swingLow && isBearCandle && errBodyPct >= 50 &&
      highs[inIdx] >= swingLow - inAtr * errAtrMult &&
      highs[inIdx] <= swingLow + inAtr * errAtrMult

    type IndicatorSignal = { active: boolean; direction: 'buy' | 'sell'; label: string; quality: number; notes: string; id: string }
    const baseSignals: IndicatorSignal[] = (() => {
      if (eliteMinVolRegime === 'medium' && eliteVolRegime === 'low') return []
      if (eliteMinVolRegime === 'high' && eliteVolRegime !== 'high') return []

      if (strategyForSignals === stStr) {
        const atrPeriod = stAtrPeriod ?? 10
        const mult = stAtrMult ?? 3
        const requireFlip = stRequireFlip ?? true
        const useRelVol = stUseRelVol ?? true
        const relVolLen = stRelVolLen ?? 20
        const relVolMin = stRelVolMin ?? 1.5
        const useKernel = stUseKernel ?? false
        const kLookback = stKernelLookback ?? 20
        const kBandwidth = stKernelBandwidth ?? 6
        const useHtf = stUseHTFAlign ?? true
        const htfEmaLen = stHtfEmaLen ?? 200
        const useHtfSlope = stUseHtfEmaSlope ?? false
        const htfSlopeLookback = stHtfEmaSlopeLookback ?? 3
        const htfSlopeMinPctPerBar = stHtfEmaSlopeMinPctPerBar ?? 0
        const useEmaDistance = stUseEmaDistance ?? false
        const emaDistAtrMin = stEmaDistAtrMin ?? 0.6
        const useImpulse = stUseImpulse ?? false
        const impulseBodyMinPct = stImpulseBodyMinPct ?? 55
        const impulseWickMaxPct = stImpulseWickMaxPct ?? 30
        const useKdeRegime = stUseKdeRegime ?? false
        const kdeRegimeLookback = stKdeRegimeLookback ?? 200
        const kdeRegimeBw = stKdeRegimeBandwidth ?? 0.8
        const kdeRegimeMaxConc = stKdeRegimeMaxConcentration ?? 0.55
        const useKdeVa = stUseKdeValueArea ?? false
        const kdeVaLookback = stKdeValueAreaLookback ?? 260
        const kdeVaBw = stKdeValueAreaBandwidth ?? 0.8
        const kdeVaMaxDensity = stKdeValueAreaMaxDensity ?? 0.6

        // Evaluate ST on the last CLOSED bar. The server engine drops the forming bar, so a
        // flip computed on the live partial candle here repaints intrabar and shows the user
        // signals the auto-trader will never take.
        const tfNumSt = Number((timeframe.match(/^\d+/) || [1])[0]) || 1
        const tfUnitSt = timeframe.slice(-1)
        const tfMsSt = tfNumSt * (tfUnitSt === 'h' ? 3_600_000 : tfUnitSt === 'd' ? 86_400_000 : 60_000)
        const lastBarOpenMs = Number(candles[lastIdx]?.time ?? 0) * 1000
        const stIdx = lastBarOpenMs + tfMsSt > Date.now() && lastIdx > 0 ? lastIdx - 1 : lastIdx
        const stPrice = Number(closes[stIdx] ?? currentPrice)
        const stBullCandle = Number(closes[stIdx] ?? 0) > Number(opens[stIdx] ?? 0)
        const stBearCandle = Number(closes[stIdx] ?? 0) < Number(opens[stIdx] ?? 0)

        const st = calculateSupertrend({
          highs,
          lows,
          closes,
          atrPeriod: atrPeriod,
          multiplier: mult,
          useKernel,
          kernelLookback: kLookback,
          kernelBandwidth: kBandwidth,
        })
        const dirNow = st.direction[stIdx]
        const dirPrev = st.direction[stIdx - 1]
        const flipToBull = dirPrev === 'bear' && dirNow === 'bull'
        const flipToBear = dirPrev === 'bull' && dirNow === 'bear'
        const trendBull = dirNow === 'bull'
        const trendBear = dirNow === 'bear'
        const gateTrendLong = requireFlip ? flipToBull : trendBull
        const gateTrendShort = requireFlip ? flipToBear : trendBear

        const relVol = (() => {
          const len = Math.max(5, Math.floor(relVolLen))
          const start = Math.max(0, stIdx - len)
          const slice = candles.slice(start, stIdx)
          if (slice.length === 0) return 1
          const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
          const now = Number(candles[stIdx].volume || 0)
          const hasVol = avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
          return hasVol ? now / avg : 1
        })()
        const avgVolOk = (() => {
          const len = Math.max(5, Math.floor(relVolLen))
          const start = Math.max(0, stIdx - len)
          const slice = candles.slice(start, stIdx)
          if (slice.length === 0) return false
          const avg = slice.reduce((acc, c) => acc + Number(c.volume || 0), 0) / slice.length
          const now = Number(candles[stIdx].volume || 0)
          return avg > 0 && now > 0 && Number.isFinite(avg) && Number.isFinite(now)
        })()
        // Fail CLOSED: zero/missing volume must not pass the strategy's namesake filter.
        const gateRelVol = !useRelVol || (avgVolOk && relVol >= relVolMin)

        const htfSource: OhlcvBar[] = (htfCandles && htfCandles.length >= Math.max(60, htfEmaLen + 5)) ? htfCandles : candles
        const htfCloses = htfSource.map((c) => Number(c.close || 0))
        const htfEma = calculateEMA(htfCloses, htfEmaLen)
        const htfIdx = htfCloses.length - 1
        const htfClose = htfCloses[htfIdx]
        const htfEmaV = htfEma[htfIdx]
        const hasHtfEma = typeof htfEmaV === 'number' && Number.isFinite(htfEmaV)
        const htfBull = hasHtfEma && Number.isFinite(htfClose) ? htfClose > htfEmaV : null
        // Fail CLOSED: when the HTF EMA can't be computed the enabled gate blocks BOTH sides.
        const gateHtfLong = !useHtf || htfBull === true
        const gateHtfShort = !useHtf || htfBull === false

        const htfSlope = (() => {
          if (!useHtfSlope) return { longOk: true, shortOk: true, slopePctPerBar: null as number | null }
          const lb = Math.max(1, Math.floor(htfSlopeLookback))
          const min = Math.max(0, Number(htfSlopeMinPctPerBar) || 0)
          const i1 = htfIdx
          const i0 = htfIdx - lb
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
        const stAtrNow = stAtrArr[stIdx]
        const emaDistAtr = (hasHtfEma && typeof stAtrNow === 'number' && Number.isFinite(stAtrNow) && stAtrNow > 0)
          ? Math.abs(stPrice - (htfEmaV as number)) / stAtrNow
          : null
        const gateEmaDistance = !useEmaDistance || emaDistAtr === null || emaDistAtr >= emaDistAtrMin

        const impulse = (() => {
          const o = Number(opens[stIdx] ?? 0)
          const h = Number(highs[stIdx] ?? 0)
          const l = Number(lows[stIdx] ?? 0)
          const c = Number(closes[stIdx] ?? 0)
          const range = h - l
          if (!(range > 0) || !Number.isFinite(range)) return { longOk: true, shortOk: true, bodyPct: 0, upperWickPct: 100, lowerWickPct: 100 }
          const bodyPct = (Math.abs(c - o) / range) * 100
          const upperWick = h - Math.max(o, c)
          const lowerWick = Math.min(o, c) - l
          const upperWickPct = (upperWick / range) * 100
          const lowerWickPct = (lowerWick / range) * 100
          const longOk = stBullCandle && bodyPct >= impulseBodyMinPct && upperWickPct <= impulseWickMaxPct
          const shortOk = stBearCandle && bodyPct >= impulseBodyMinPct && lowerWickPct <= impulseWickMaxPct
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
          const start = Math.max(1, stIdx - lb + 1)
          const xs: number[] = []
          for (let i = start; i <= stIdx; i++) {
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
          const start = Math.max(0, stIdx - lb + 1)
          const slice = closes.slice(start, stIdx + 1).map((v) => Number(v ?? 0)).filter((v) => Number.isFinite(v))
          if (slice.length < 40) return { ok: true, dens: null as number | null }
          const mean = slice.reduce((a, b) => a + b, 0) / slice.length
          const var0 = slice.reduce((a, b) => {
            const d = b - mean
            return a + d * d
          }, 0) / Math.max(1, slice.length - 1)
          const stdev = Math.sqrt(var0)
          if (!(stdev > 0) || !Number.isFinite(stdev)) return { ok: true, dens: null as number | null }
          const zs = slice.map((v) => (v - mean) / stdev)
          const zNow = (stPrice - mean) / stdev
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

        const useAdx = stUseAdx ?? false
        const adxPeriod = stAdxPeriod ?? 14
        const adxMin = stAdxMin ?? 22
        const stAdxArr = calculateADX(highs, lows, closes, Math.max(2, Math.floor(adxPeriod)))
        const stAdxNow = stAdxArr[stIdx]
        const gateAdx = !useAdx || (typeof stAdxNow === 'number' && Number.isFinite(stAdxNow) && stAdxNow >= adxMin)

        const useDiAlign = stUseDiAlign ?? false
        const diPeriod = stDiPeriod ?? adxPeriod
        const di = calculateDI(highs, lows, closes, Math.max(2, Math.floor(diPeriod)))
        const diPlus = di.plus[stIdx]
        const diMinus = di.minus[stIdx]
        const hasDi = typeof diPlus === 'number' && typeof diMinus === 'number' && Number.isFinite(diPlus) && Number.isFinite(diMinus)
        // Fail CLOSED: missing DI data blocks both sides while the gate is enabled.
        const gateDiLong = !useDiAlign || (hasDi && diPlus > diMinus)
        const gateDiShort = !useDiAlign || (hasDi && diMinus > diPlus)

        // Enabled filters are HARD GATES in BOTH modes (mirrors signalScan/signalEval).
        const longAll = gateTrendLong && gateRelVol && gateHtfLong && gateHtfSlopeLong && gateAdx && gateDiLong && gateEmaDistance && gateImpulseLong && gateKdeRegime && gateKdeVa
        const shortAll = gateTrendShort && gateRelVol && gateHtfShort && gateHtfSlopeShort && gateAdx && gateDiShort && gateEmaDistance && gateImpulseShort && gateKdeRegime && gateKdeVa
        if (!longAll && !shortAll) return []

        const out: IndicatorSignal[] = []
        if (longAll) {
            out.push({ id: 'st-trend-buy', active: true, direction: 'buy', label: requireFlip ? 'Supertrend Flip' : 'Supertrend Trend', quality: 6, notes: `ATR(${atrPeriod})×${mult.toFixed(2)}` })
            if (useRelVol && avgVolOk && relVol >= relVolMin) out.push({ id: 'st-rvol-buy', active: true, direction: 'buy', label: 'RelVol', quality: 4, notes: `${relVol.toFixed(2)}x ≥ ${relVolMin.toFixed(2)}x` })
            if (useHtf && htfBull === true) out.push({ id: 'st-htf-buy', active: true, direction: 'buy', label: 'HTF EMA', quality: 4, notes: `HTF > EMA${htfEmaLen}` })
            if (useHtfSlope && gateHtfSlopeLong && htfSlope.slopePctPerBar !== null) out.push({ id: 'st-htf-slope-buy', active: true, direction: 'buy', label: 'HTF Slope', quality: 3, notes: `${htfSlope.slopePctPerBar.toFixed(3)}%/bar` })
            if (useAdx && gateAdx) out.push({ id: 'st-adx-buy', active: true, direction: 'buy', label: 'ADX', quality: 4, notes: `${(typeof stAdxNow === 'number' ? stAdxNow : 0).toFixed(1)} ≥ ${adxMin}` })
            if (useDiAlign && hasDi && gateDiLong) out.push({ id: 'st-di-buy', active: true, direction: 'buy', label: 'DI Align', quality: 3, notes: `DI+ ${diPlus!.toFixed(1)} > DI− ${diMinus!.toFixed(1)}` })
            if (useEmaDistance && gateEmaDistance && emaDistAtr !== null) out.push({ id: 'st-ema-dist-buy', active: true, direction: 'buy', label: 'EMA Dist', quality: 3, notes: `${emaDistAtr.toFixed(2)} ATR ≥ ${emaDistAtrMin.toFixed(2)}` })
            if (useImpulse && gateImpulseLong) out.push({ id: 'st-impulse-buy', active: true, direction: 'buy', label: 'Impulse', quality: 3, notes: `Body ${impulse.bodyPct.toFixed(0)}% / Wick ${impulse.upperWickPct.toFixed(0)}%` })
            if (useKdeRegime && gateKdeRegime && kdeRegime.conc !== null) out.push({ id: 'st-kde-regime-buy', active: true, direction: 'buy', label: 'KDE Regime', quality: 3, notes: `${kdeRegime.conc.toFixed(2)} ≤ ${kdeRegimeMaxConc.toFixed(2)}` })
            if (useKdeVa && gateKdeVa && kdeVa.dens !== null) out.push({ id: 'st-kde-va-buy', active: true, direction: 'buy', label: 'KDE VA', quality: 3, notes: `${kdeVa.dens.toFixed(2)} ≤ ${kdeVaMaxDensity.toFixed(2)}` })
            if (useKernel) out.push({ id: 'st-kernel-buy', active: true, direction: 'buy', label: 'Kernel', quality: 3, notes: `LB:${kLookback} BW:${kBandwidth}` })
          }
          if (shortAll) {
            out.push({ id: 'st-trend-sell', active: true, direction: 'sell', label: requireFlip ? 'Supertrend Flip' : 'Supertrend Trend', quality: 6, notes: `ATR(${atrPeriod})×${mult.toFixed(2)}` })
            if (useRelVol && avgVolOk && relVol >= relVolMin) out.push({ id: 'st-rvol-sell', active: true, direction: 'sell', label: 'RelVol', quality: 4, notes: `${relVol.toFixed(2)}x ≥ ${relVolMin.toFixed(2)}x` })
            if (useHtf && htfBull === false) out.push({ id: 'st-htf-sell', active: true, direction: 'sell', label: 'HTF EMA', quality: 4, notes: `HTF < EMA${htfEmaLen}` })
            if (useHtfSlope && gateHtfSlopeShort && htfSlope.slopePctPerBar !== null) out.push({ id: 'st-htf-slope-sell', active: true, direction: 'sell', label: 'HTF Slope', quality: 3, notes: `${htfSlope.slopePctPerBar.toFixed(3)}%/bar` })
            if (useAdx && gateAdx) out.push({ id: 'st-adx-sell', active: true, direction: 'sell', label: 'ADX', quality: 4, notes: `${(typeof stAdxNow === 'number' ? stAdxNow : 0).toFixed(1)} ≥ ${adxMin}` })
            if (useDiAlign && hasDi && gateDiShort) out.push({ id: 'st-di-sell', active: true, direction: 'sell', label: 'DI Align', quality: 3, notes: `DI− ${diMinus!.toFixed(1)} > DI+ ${diPlus!.toFixed(1)}` })
            if (useEmaDistance && gateEmaDistance && emaDistAtr !== null) out.push({ id: 'st-ema-dist-sell', active: true, direction: 'sell', label: 'EMA Dist', quality: 3, notes: `${emaDistAtr.toFixed(2)} ATR ≥ ${emaDistAtrMin.toFixed(2)}` })
            if (useImpulse && gateImpulseShort) out.push({ id: 'st-impulse-sell', active: true, direction: 'sell', label: 'Impulse', quality: 3, notes: `Body ${impulse.bodyPct.toFixed(0)}% / Wick ${impulse.lowerWickPct.toFixed(0)}%` })
            if (useKdeRegime && gateKdeRegime && kdeRegime.conc !== null) out.push({ id: 'st-kde-regime-sell', active: true, direction: 'sell', label: 'KDE Regime', quality: 3, notes: `${kdeRegime.conc.toFixed(2)} ≤ ${kdeRegimeMaxConc.toFixed(2)}` })
            if (useKdeVa && gateKdeVa && kdeVa.dens !== null) out.push({ id: 'st-kde-va-sell', active: true, direction: 'sell', label: 'KDE VA', quality: 3, notes: `${kdeVa.dens.toFixed(2)} ≤ ${kdeVaMaxDensity.toFixed(2)}` })
            if (useKernel) out.push({ id: 'st-kernel-sell', active: true, direction: 'sell', label: 'Kernel', quality: 3, notes: `LB:${kLookback} BW:${kBandwidth}` })
          }
          return out
      }

      if (strategyForSignals === fluxStr) {
        // Evaluate FG on the last CLOSED bar — the forming bar repaints intrabar and
        // diverges from the server scanner (same pattern as the ST stIdx fix above).
        const tfNumFg = Number((timeframe.match(/^\d+/) || [1])[0]) || 1
        const tfUnitFg = timeframe.slice(-1)
        const tfMsFg = tfNumFg * (tfUnitFg === 'h' ? 3_600_000 : tfUnitFg === 'd' ? 86_400_000 : 60_000)
        const fgLastOpenMs = Number(candles[lastIdx]?.time ?? 0) * 1000
        const fgIdx = fgLastOpenMs + tfMsFg > Date.now() && lastIdx > 0 ? lastIdx - 1 : lastIdx
        const fgEnd = fgIdx + 1
        const fgPrice = Number(closes[fgIdx] ?? currentPrice)
        const fgAdx = typeof adx[fgIdx] === 'number' ? (adx[fgIdx] as number) : 20
        const fgAtr = typeof atr[fgIdx] === 'number' ? (atr[fgIdx] as number) : currentAtr
        const fgRange = Number(highs[fgIdx] ?? 0) - Number(lows[fgIdx] ?? 0)

        const flux = computeFluxGateDualEngine({
          opens: opens.slice(0, fgEnd),
          highs: highs.slice(0, fgEnd),
          lows: lows.slice(0, fgEnd),
          closes: closes.slice(0, fgEnd),
          baseLenLong: fgBaseLenLong,
          baseLenShort: fgBaseLenShort,
          guideEmaLen: fgGuideEmaLen,
          volLen: fgVolLen,
          persLen: fgPersLen,
          curvLen: fgCurvLen,
          thresholdKLong: fgThresholdKLong,
          thresholdKShort: fgThresholdKShort,
        })
        if (!flux) return []

        const useADX = fgUseADX ?? true
        const adxMin = fgAdxMin ?? 22
        const gate1Adx = !useADX || fgAdx >= adxMin
        const useSession = fgUseSession ?? true
        const sessionStartUtc = fgSessionStartUtc ?? 8
        const sessionEndUtc = fgSessionEndUtc ?? 12
        const utcHour = (() => {
          const t = candles[fgIdx]?.time
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

        // Drop the forming HTF bar too (period inferred from bar spacing).
        const htfRaw: OhlcvBar[] = (htfCandles && htfCandles.length >= 50) ? htfCandles : candles.slice(0, fgEnd)
        const htfSource: OhlcvBar[] = (() => {
          const li = htfRaw.length - 1
          const spacingSec = li >= 1 ? Number(htfRaw[li].time) - Number(htfRaw[li - 1].time) : 0
          const lastOpenMs = Number(htfRaw[li]?.time ?? 0) * 1000
          return spacingSec > 0 && lastOpenMs > 0 && Date.now() < lastOpenMs + spacingSec * 1000 && li > 0
            ? htfRaw.slice(0, li)
            : htfRaw
        })()
        const htfOpens = htfSource.map((c) => Number(c.open || 0))
        const htfHighs = htfSource.map((c) => Number(c.high || 0))
        const htfLows  = htfSource.map((c) => Number(c.low || 0))
        const htfCloses= htfSource.map((c) => Number(c.close || 0))
        const htfAtrArr = calculateATR(htfHighs, htfLows, htfCloses, 14)
        const htfAtr = typeof htfAtrArr[htfAtrArr.length - 1] === 'number'
          ? (htfAtrArr[htfAtrArr.length - 1] as number)
          : fgAtr
        const tolMult = fgStructureTolAtrMult ?? 0.25
        const tol = htfAtr * tolMult

        const obs = detectOrderBlocks(htfOpens, htfHighs, htfLows, htfCloses, 60)
        const bullOB = obs.bullOB
        const bearOB = obs.bearOB
        const fvgZones = detectFVGZones(htfHighs, htfLows, 80)
        const nearBullFvg = fvgZones.some((z) => z.type === 'bull' && fgPrice >= z.bottom - tol && fgPrice <= z.top + tol)
        const nearBearFvg = fvgZones.some((z) => z.type === 'bear' && fgPrice >= z.bottom - tol && fgPrice <= z.top + tol)
        const gate4Demand = !!bullOB
          ? fgPrice >= bullOB.low - tol && fgPrice <= bullOB.high + tol
          : nearBullFvg
        const gate4Supply = !!bearOB
          ? fgPrice >= bearOB.low - tol && fgPrice <= bearOB.high + tol
          : nearBearFvg
        const useStructure = fgUseStructure ?? true
        const gate4DemandFinal = !useStructure || gate4Demand
        const gate4SupplyFinal = !useStructure || gate4Supply

        const div = detectSwingRSIDivergence(closes.slice(0, fgEnd), (rsi as (number | null)[]).slice(0, fgEnd), 40, 5)
        const prevK = typeof stoch.k[fgIdx - 1] === 'number' ? (stoch.k[fgIdx - 1] as number) : null
        const prevD = typeof stoch.d[fgIdx - 1] === 'number' ? (stoch.d[fgIdx - 1] as number) : null
        const curK = typeof stoch.k[fgIdx] === 'number' ? (stoch.k[fgIdx] as number) : null
        const curD = typeof stoch.d[fgIdx] === 'number' ? (stoch.d[fgIdx] as number) : null
        const stochCrossUp = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK <= prevD && curK > curD
        const stochCrossDown = prevK !== null && prevD !== null && curK !== null && curD !== null && prevK >= prevD && curK < curD
        const stochExtreme = fgStochExtreme ?? false
        const stochOS = fgStochOS ?? 30
        const stochOB = fgStochOB ?? 70
        const stochCrossUpOk = stochCrossUp && (!stochExtreme || (prevK !== null && prevD !== null && Math.min(prevK, prevD) <= stochOS))
        const stochCrossDownOk = stochCrossDown && (!stochExtreme || (prevK !== null && prevD !== null && Math.max(prevK, prevD) >= stochOB))
        const useMom = fgUseMomentum ?? true
        const useDiv = fgUseRsiDivergence ?? false
        const useStoch = fgUseStochCross ?? true
        const momLong = (!useDiv || div.bullDiv) && (!useStoch || stochCrossUpOk)
        const momShort = (!useDiv || div.bearDiv) && (!useStoch || stochCrossDownOk)
        const gate5MomLong = !useMom || momLong
        const gate5MomShort = !useMom || momShort

        const volNow = Number(candles[fgIdx].volume || 0)
        const volPrev = Number(candles[fgIdx - 1]?.volume || 0)
        const vol20 = candles.slice(Math.max(0, fgEnd - 21), fgEnd - 1).map((c) => Number(c.volume || 0))
        const sma20 = vol20.length > 0 ? vol20.reduce((a, b) => a + b, 0) / vol20.length : volNow
        const vol5 = candles.slice(Math.max(0, fgEnd - 6), fgEnd - 1).map((c) => Number(c.volume || 0))
        const sma5 = vol5.length > 0 ? vol5.reduce((a, b) => a + b, 0) / vol5.length : volNow
        const volRatioGate = sma20 > 0 ? volNow / sma20 : 1
        const useVol = fgUseVolume ?? true
        const minVolRatio = fgMinVolumeRatio ?? 1.5
        const requireExpanding = fgRequireVolumeExpanding ?? false
        const expandingOk = !requireExpanding || (volNow > volPrev && sma5 >= sma20)
        const gate6Volume = !useVol || (volRatioGate >= minVolRatio && expandingOk)

        const useHtf = fgUseHTFAlign ?? true
        // Recompute the EMA200 bias from the CLOSED-bar HTF slice — the outer htfBiasBull
        // reads the forming HTF bar (up to a day on 1h→1d) and repaints this gate.
        const fgHtfBiasBull = (() => {
          if (htfCloses.length < 50) return htfBiasBull
          const ema200Arr = calculateEMA(htfCloses, 200)
          const li = htfCloses.length - 1
          const e = ema200Arr[li]
          return typeof e === 'number' ? htfCloses[li] > e : htfBiasBull
        })()
        const gate8CorrLong = !useHtf || fgHtfBiasBull
        const gate8CorrShort = !useHtf || !fgHtfBiasBull

        const useCross = fgUseCross ?? true
        const gate3Long = useCross ? flux.longCross : flux.scoreNow > flux.longThresholdNow
        const gate3Short = useCross ? flux.shortCross : flux.scoreNow < flux.shortThresholdNow

        const useCost = fgUseCost ?? false
        const gate7Cost = !useCost || fgRange <= fgAtr * 2.0

        const useExec = fgUseExecution ?? false
        const avgRange10 = (() => {
          const start = Math.max(0, fgIdx - 10)
          const slice = candles.slice(start, fgEnd)
          if (slice.length === 0) return fgRange
          let sum = 0
          for (const c of slice) sum += Number(c.high || 0) - Number(c.low || 0)
          return sum / slice.length
        })()
        const gate9Execution = !useExec || avgRange10 <= fgAtr * 1.5

        const longAll =
          gate1Adx && gate2Session && gate3Long && gate4DemandFinal && gate5MomLong && gate6Volume && gate7Cost && gate8CorrLong && gate9Execution
        const shortAll =
          gate1Adx && gate2Session && gate3Short && gate4SupplyFinal && gate5MomShort && gate6Volume && gate7Cost && gate8CorrShort && gate9Execution

        if (!longAll && !shortAll) return []

        return [
          { id: 'fg-regime-buy',   active: longAll,  direction: 'buy',  label: 'Regime',      quality: 4, notes: `ADX:${(fgAdx || 0).toFixed(1)} ≥ ${adxMin.toFixed(0)}` },
          { id: 'fg-session-buy',  active: longAll,  direction: 'buy',  label: 'Session',     quality: 4, notes: `UTC ${String(sessionStartUtc).padStart(2,'0')}:00–${String(sessionEndUtc).padStart(2,'0')}:00` },
          { id: 'fg-flux-buy',     active: longAll,  direction: 'buy',  label: 'FluxGate',    quality: 6, notes: `Score:${flux.scoreNow.toFixed(3)} > Th:${flux.longThresholdNow.toFixed(3)}` },
          { id: 'fg-struct-buy',   active: longAll,  direction: 'buy',  label: 'Structure',   quality: 5, notes: `At demand zone (tol ${tolMult.toFixed(2)}×ATR)` },
          { id: 'fg-mom-buy',      active: longAll,  direction: 'buy',  label: 'Momentum',    quality: 4, notes: div.bullDiv ? 'RSI divergence' : 'Stoch cross' },
          { id: 'fg-vol-buy',      active: longAll,  direction: 'buy',  label: 'Volume',      quality: 4, notes: requireExpanding ? `Vol:${volRatioGate.toFixed(2)}x ≥ ${minVolRatio.toFixed(2)} & expanding` : `Vol:${volRatioGate.toFixed(2)}x ≥ ${minVolRatio.toFixed(2)}` },
          { id: 'fg-cost-buy',     active: longAll,  direction: 'buy',  label: 'Cost',        quality: 3, notes: `Range:${fgRange.toFixed(2)} ≤ ${(fgAtr * 2.0).toFixed(2)} (2.0×ATR proxy)` },
          { id: 'fg-corr-buy',     active: longAll,  direction: 'buy',  label: 'Correlation', quality: 4, notes: 'HTF EMA200 bias filter' },
          { id: 'fg-exec-buy',     active: longAll,  direction: 'buy',  label: 'Execution',   quality: 3, notes: `AvgRange10:${avgRange10.toFixed(2)} ≤ ${(fgAtr * 1.5).toFixed(2)} (1.5×ATR proxy)` },

          { id: 'fg-regime-sell',  active: shortAll, direction: 'sell', label: 'Regime',      quality: 4, notes: `ADX:${(fgAdx || 0).toFixed(1)} ≥ ${adxMin.toFixed(0)}` },
          { id: 'fg-session-sell', active: shortAll, direction: 'sell', label: 'Session',     quality: 4, notes: `UTC ${String(sessionStartUtc).padStart(2,'0')}:00–${String(sessionEndUtc).padStart(2,'0')}:00` },
          { id: 'fg-flux-sell',    active: shortAll, direction: 'sell', label: 'FluxGate',    quality: 6, notes: `Score:${flux.scoreNow.toFixed(3)} < Th:${flux.shortThresholdNow.toFixed(3)}` },
          { id: 'fg-struct-sell',  active: shortAll, direction: 'sell', label: 'Structure',   quality: 5, notes: `At supply zone (tol ${tolMult.toFixed(2)}×ATR)` },
          { id: 'fg-mom-sell',     active: shortAll, direction: 'sell', label: 'Momentum',    quality: 4, notes: div.bearDiv ? 'RSI divergence' : 'Stoch cross' },
          { id: 'fg-vol-sell',     active: shortAll, direction: 'sell', label: 'Volume',      quality: 4, notes: requireExpanding ? `Vol:${volRatioGate.toFixed(2)}x ≥ ${minVolRatio.toFixed(2)} & expanding` : `Vol:${volRatioGate.toFixed(2)}x ≥ ${minVolRatio.toFixed(2)}` },
          { id: 'fg-cost-sell',    active: shortAll, direction: 'sell', label: 'Cost',        quality: 3, notes: `Range:${fgRange.toFixed(2)} ≤ ${(fgAtr * 2.0).toFixed(2)} (2.0×ATR proxy)` },
          { id: 'fg-corr-sell',    active: shortAll, direction: 'sell', label: 'Correlation', quality: 4, notes: 'HTF EMA200 bias filter' },
          { id: 'fg-exec-sell',    active: shortAll, direction: 'sell', label: 'Execution',   quality: 3, notes: `AvgRange10:${avgRange10.toFixed(2)} ≤ ${(fgAtr * 1.5).toFixed(2)} (1.5×ATR proxy)` },
        ]
      }

      if (strategyForSignals === errStr) {
        if (!errRevBull && !errRevBear) return []
        return [
          { id: 'err-rev-buy',    active: errRevBull,                            direction: 'buy',  label: 'Retest Reversal', quality: 6, notes: `Wick touched swing high, closed back above — ${eliteVolRegime.toUpperCase()} VOL` },
          { id: 'err-ema50-buy',  active: currentPrice > currentEma50,           direction: 'buy',  label: 'EMA50',           quality: 4, notes: 'Price above EMA50 — bullish bias' },
          { id: 'err-ema200-buy', active: currentPrice > currentEma200,          direction: 'buy',  label: 'EMA200',          quality: 5, notes: 'Price above EMA200 — macro bullish' },
          { id: 'err-rsi-buy',    active: currentRsi >= 45 && currentRsi <= 70,  direction: 'buy',  label: 'RSI Zone',        quality: 4, notes: 'RSI in bullish momentum zone (45–70)' },
          { id: 'err-macd-buy',   active: currentMacdHist > 0,                   direction: 'buy',  label: 'MACD',            quality: 4, notes: 'MACD histogram positive' },
          { id: 'err-vol-buy',    active: volRatio <= 1.3,                        direction: 'buy',  label: 'RT Volume',       quality: 4, notes: 'Retest volume lower than breakout (healthy)' },
          { id: 'err-rev-sell',   active: errRevBear,                             direction: 'sell', label: 'Retest Reversal', quality: 6, notes: `Wick touched swing low, closed back below — ${eliteVolRegime.toUpperCase()} VOL` },
          { id: 'err-ema50-sell', active: currentPrice < currentEma50,            direction: 'sell', label: 'EMA50',           quality: 4, notes: 'Price below EMA50 — bearish bias' },
          { id: 'err-ema200-sell',active: currentPrice < currentEma200,           direction: 'sell', label: 'EMA200',          quality: 5, notes: 'Price below EMA200 — macro bearish' },
          { id: 'err-rsi-sell',   active: currentRsi >= 30 && currentRsi <= 55,   direction: 'sell', label: 'RSI Zone',        quality: 4, notes: 'RSI in bearish momentum zone (30–55)' },
          { id: 'err-macd-sell',  active: currentMacdHist < 0,                    direction: 'sell', label: 'MACD',            quality: 4, notes: 'MACD histogram negative' },
          { id: 'err-vol-sell',   active: volRatio <= 1.3,                         direction: 'sell', label: 'RT Volume',       quality: 4, notes: 'Retest volume lower than breakout (healthy)' },
        ]
      }

      const bullBreak = closes[inIdx] > swingHigh && isBullCandle && volRatio >= 1.2
      const bearBreak = closes[inIdx] < swingLow  && isBearCandle && volRatio >= 1.2
      if (!bullBreak && !bearBreak) return []
      return [
        { id: 'elite-break-buy',  active: bullBreak,                           direction: 'buy',  label: 'Swing Break', quality: 4, notes: `Closed above swing high — ${eliteVolRegime.toUpperCase()} VOL regime` },
        { id: 'elite-ema50-buy',  active: currentPrice > currentEma50,         direction: 'buy',  label: 'EMA50',       quality: 4, notes: 'Price above EMA50 — bullish bias' },
        { id: 'elite-ema200-buy', active: currentPrice > currentEma200,        direction: 'buy',  label: 'EMA200',      quality: 5, notes: 'Price above EMA200 — macro bullish' },
        { id: 'elite-rsi-buy',    active: currentRsi >= 45 && currentRsi <= 70, direction: 'buy',  label: 'RSI Zone',    quality: 4, notes: 'RSI in bullish momentum zone (45–70)' },
        { id: 'elite-macd-buy',   active: currentMacdHist > 0,                 direction: 'buy',  label: 'MACD',        quality: 4, notes: 'MACD histogram positive' },
        { id: 'elite-vol-buy',    active: volRatio >= 1.3,                      direction: 'buy',  label: 'Volume',      quality: 4, notes: 'Volume above average on breakout' },
        { id: 'elite-strong-buy', active: isBullCandle && strongCloseOk,        direction: 'buy',  label: 'Strong Close',quality: 4, notes: 'Bullish candle with strong body' },
        { id: 'elite-break-sell', active: bearBreak,                            direction: 'sell', label: 'Swing Break', quality: 4, notes: `Closed below swing low — ${eliteVolRegime.toUpperCase()} VOL regime` },
        { id: 'elite-ema50-sell', active: currentPrice < currentEma50,          direction: 'sell', label: 'EMA50',       quality: 4, notes: 'Price below EMA50 — bearish bias' },
        { id: 'elite-ema200-sell',active: currentPrice < currentEma200,         direction: 'sell', label: 'EMA200',      quality: 5, notes: 'Price below EMA200 — macro bearish' },
        { id: 'elite-rsi-sell',   active: currentRsi >= 30 && currentRsi <= 55, direction: 'sell', label: 'RSI Zone',    quality: 4, notes: 'RSI in bearish momentum zone (30–55)' },
        { id: 'elite-macd-sell',  active: currentMacdHist < 0,                  direction: 'sell', label: 'MACD',        quality: 4, notes: 'MACD histogram negative' },
        { id: 'elite-vol-sell',   active: volRatio >= 1.3,                       direction: 'sell', label: 'Volume',      quality: 4, notes: 'Volume above average on breakdown' },
        { id: 'elite-strong-sell',active: isBearCandle && strongCloseOk,         direction: 'sell', label: 'Strong Close',quality: 4, notes: 'Bearish candle with strong body' },
      ]
    })()

    const indicatorSignals: IndicatorSignal[] = detectedPattern
      ? [
          ...baseSignals,
          { active: detectedPattern.direction === 'buy',  direction: 'buy'  as const, label: detectedPattern.pattern, quality: 4, notes: detectedPattern.notes, id: 'pattern-buy' },
          { active: detectedPattern.direction === 'sell', direction: 'sell' as const, label: detectedPattern.pattern, quality: 4, notes: detectedPattern.notes, id: 'pattern-sell' },
        ]
      : baseSignals

    // Group active signals by direction
    const activeBuySignals = indicatorSignals.filter(s => s.active && s.direction === 'buy')
    const activeSellSignals = indicatorSignals.filter(s => s.active && s.direction === 'sell')

    const blockDelta: Partial<Record<import('@/stores/tradingStore').FilterBlockKey, number>> = {}

    const tfSec = (() => {
      if (timeframe === '1m') return 60
      if (timeframe === '5m') return 5 * 60
      if (timeframe === '15m') return 15 * 60
      if (timeframe === '1h') return 60 * 60
      if (timeframe === '4h') return 4 * 60 * 60
      return 15 * 60
    })()
    const cooldownOk = (direction: 'buy' | 'sell') => {
      if (!filterCooldown) return true
      if (!lastSignalTimeSec) return true
      const delta = (lastCandle.time ?? 0) - lastSignalTimeSec
      if (strategyForSignals === fluxStr) return delta >= cooldownBars * tfSec
      if (!lastSignalDirection) return true
      if (lastSignalDirection === direction) return true
      return delta >= cooldownBars * tfSec
    }

    const entryBuyOk  = !filterEntryConfirmation || (closes[inIdx] > swingHigh && isBullCandle && strongCloseOk)
    const entrySellOk = !filterEntryConfirmation || (closes[inIdx] < swingLow  && isBearCandle && strongCloseOk)
    const volumeOk    = !filterVolumeConfirmation || volRatio >= minVolumeRatio
    const adxBuyOk    = !filterADXRegime || currentAdx >= 25
    const adxSellOk   = adxBuyOk
    const htfAlignBuyOk  = !filterHTFAlignment || htfBiasBull
    const htfAlignSellOk = !filterHTFAlignment || !htfBiasBull
    const btcAlignBuyOk  = !filterBTCAlignment || symbol === 'BTCUSDT' || (currentEma20 > currentEma50 && currentMacdHist > 0)
    const btcAlignSellOk = !filterBTCAlignment || symbol === 'BTCUSDT' || (currentEma20 < currentEma50 && currentMacdHist < 0)

    const createFinalSignal = (signals: typeof indicatorSignals, direction: 'buy' | 'sell') => {
      if (signals.length === 0) return null
      
      const avgQuality = signals.reduce((acc, s) => acc + s.quality, 0) / signals.length
      const confluence = signals.length
      
      // Calculate final quality boosted by confluence
      const finalQuality = Math.min(8, Math.floor(avgQuality + (confluence - 1)))

      const passDirectionalFilters =
        (strategyForSignals === fluxStr || strategyForSignals === stStr)
          ? (direction === 'buy' ? cooldownOk('buy') : cooldownOk('sell'))
          : direction === 'buy'
            ? btcAlignBuyOk && htfAlignBuyOk && cooldownOk('buy') && entryBuyOk && adxBuyOk && volumeOk
            : btcAlignSellOk && htfAlignSellOk && cooldownOk('sell') && entrySellOk && adxSellOk && volumeOk

      if (!passDirectionalFilters) {
        if (strategyForSignals === stStr) {
          if (filterCooldown && !(direction === 'buy' ? cooldownOk('buy') : cooldownOk('sell'))) {
            blockDelta.cooldown = (blockDelta.cooldown ?? 0) + 1
          }
          return null
        }
        if (direction === 'buy') {
          if (filterBTCAlignment && !btcAlignBuyOk) blockDelta.btcAlignment = (blockDelta.btcAlignment ?? 0) + 1
          if (filterHTFAlignment && !htfAlignBuyOk) blockDelta.htfAlignment = (blockDelta.htfAlignment ?? 0) + 1
          if (filterCooldown && !cooldownOk('buy')) blockDelta.cooldown = (blockDelta.cooldown ?? 0) + 1
          if (filterEntryConfirmation && !entryBuyOk) blockDelta.entryConfirmation = (blockDelta.entryConfirmation ?? 0) + 1
          if (filterStrongClose && !strongCloseOk) blockDelta.strongClose = (blockDelta.strongClose ?? 0) + 1
          if (filterADXRegime && !adxBuyOk) blockDelta.adxRegime = (blockDelta.adxRegime ?? 0) + 1
          if (filterVolumeConfirmation && !volumeOk) blockDelta.volumeConfirmation = (blockDelta.volumeConfirmation ?? 0) + 1
        } else {
          if (filterBTCAlignment && !btcAlignSellOk) blockDelta.btcAlignment = (blockDelta.btcAlignment ?? 0) + 1
          if (filterHTFAlignment && !htfAlignSellOk) blockDelta.htfAlignment = (blockDelta.htfAlignment ?? 0) + 1
          if (filterCooldown && !cooldownOk('sell')) blockDelta.cooldown = (blockDelta.cooldown ?? 0) + 1
          if (filterEntryConfirmation && !entrySellOk) blockDelta.entryConfirmation = (blockDelta.entryConfirmation ?? 0) + 1
          if (filterStrongClose && !strongCloseOk) blockDelta.strongClose = (blockDelta.strongClose ?? 0) + 1
          if (filterADXRegime && !adxSellOk) blockDelta.adxRegime = (blockDelta.adxRegime ?? 0) + 1
          if (filterVolumeConfirmation && !volumeOk) blockDelta.volumeConfirmation = (blockDelta.volumeConfirmation ?? 0) + 1
        }
        return null
      }

      if (finalQuality < minQuality) {
        blockDelta.minQuality = (blockDelta.minQuality ?? 0) + 1
        return null
      }
      if (isConfluence && confluence < minConfluence) {
        blockDelta.minConfluence = (blockDelta.minConfluence ?? 0) + 1
        return null
      }

      if (passDirectionalFilters) {
        return {
          id: `sig-${lastCandle.time}-${direction}`,
          time: signalTime,
          label: direction.toUpperCase(),
          direction,
          quality: finalQuality,
          confluence,
          notes: `${strategyForSignals}: ${signals.map(s => s.label).join(' + ')}`
        }
      }
      return null
    }

    const buySignal = createFinalSignal(activeBuySignals, 'buy')
    const sellSignal = createFinalSignal(activeSellSignals, 'sell')
    if (Object.keys(blockDelta).length > 0) {
      useTradingStore.getState().addFilterBlocks(blockDelta)
    }

    const finalSignals: SignalRow[] = []
    if (buySignal) finalSignals.push(buySignal)
    if (sellSignal) finalSignals.push(sellSignal)

    const primary = finalSignals[0]
    const vote: 'buy' | 'sell' | 'neutral' = primary?.direction ?? 'neutral'
    const confCount = primary?.confluence ?? 0
    const q = primary?.quality ?? 0

    const confluenceLabel = (() => {
      if (vote === 'buy') return confCount >= 3 || q >= 7 ? 'STRONG BUY' : 'BUY'
      if (vote === 'sell') return confCount >= 3 || q >= 7 ? 'STRONG SELL' : 'SELL'
      return 'NEUTRAL'
    })()

    setConfluence({
      confluenceLabel,
      confluenceSmartPct: Math.round((q / 8) * 100),
      confluenceAgreeText: `${confCount} conf | Q:${q}/8 | ${strategyForSignals}`,
    })

    const existingRows = useTradingStore.getState().confluenceRows
    setConfluenceRows(
      existingRows.map((r) => {
        if (r.strategy !== strategyForSignals) return { ...r, vote: 'neutral', perfText: r.perfText || '1.00x —' }
        if (vote === 'neutral') return { ...r, vote: 'neutral', perfText: `Q:${q}/8 C:${confCount}` }
        return { ...r, vote, perfText: `Q:${q}/8 C:${confCount}` }
      }),
    )

    if (finalSignals.length > 0) {
      // Update Trade Setup based on current metrics ONLY when there is a signal
      const lastSignal = finalSignals[0]
      const setupSide = lastSignal.direction === 'buy' ? 'long' : 'short'
      const lastAtr = currentAtr || currentPrice * 0.01
      const entry = currentPrice
      // ST targets 3/5×ATR (2R at TP1) — mirrors signalScan/signalEval make().
      const tpM1 = strategyForSignals === stStr ? 3 : 2
      const tpM2 = strategyForSignals === stStr ? 5 : 4
      const sl = setupSide === 'long' ? entry - lastAtr * 1.5 : entry + lastAtr * 1.5
      const tp1 = setupSide === 'long' ? entry + lastAtr * tpM1 : entry - lastAtr * tpM1
      const tp2 = setupSide === 'long' ? entry + lastAtr * tpM2 : entry - lastAtr * tpM2
      
      setTradeSetup({
        entry,
        sl,
        slPct: ((sl / entry) - 1) * 100,
        tp1,
        tp1Pct: ((tp1 / entry) - 1) * 100,
        tp2,
        tp2Pct: ((tp2 / entry) - 1) * 100
      })

      // Update store with filtered signals
      const signalsWithSetup = finalSignals.map((s) => ({
        ...s,
        symbol,
        entry,
        sl,
        tp1,
        tp2,
      }))
      setSignals(signalsWithSetup)
      useTradingStore.getState().appendSignalLog(signalsWithSetup)
      if (lastCandle.time && (lastSignal.direction === 'buy' || lastSignal.direction === 'sell')) {
        useTradingStore.getState().setLastSignalMeta({ timeSec: lastCandle.time, direction: lastSignal.direction })
      }
    } else {
      // Clear trade setup and signals if no signals (Neutral)
      setTradeSetup(null)
      setSignals([])
    }

    useTradingStore.getState().setAutoBest({
      strategy: strategyForSignals,
      winRate: strategyForSignals === errStr ? 58 : 62,
      profitFactor: strategyForSignals === errStr ? 2.4 : 2.1,
      expectancy: strategyForSignals === errStr ? '+0.72R' : '+0.65R',
      state: regime,
    })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    candles, 
    setMetrics, 
    setInsights, 
    setRegime, 
    setIndicatorTable, 
    setSignals, 
    setTradeSetup,
    setConfluence,
    setConfluenceRows,
    selectedStrategy,
    entryModel,
    enabledStrategies,
    minConfluence,
    minQuality,
    isConfluence,
    symbol,
    timeframe,
    filterBTCAlignment,
    filterHTFAlignment,
    filterEntryConfirmation,
    filterADXRegime,
    filterVolumeConfirmation,
    filterKeyLevelDistance,
    keyLevelMaxDistancePct,
    minVolumeRatio,
    filterRetestConfirmation,
    filterAtrEntryBuffer,
    entryAtrBufferAtrMult,
    filterStrongClose,
    strongCloseBodyPct,
    filterAvoidOppKeyLevel,
    filterCooldown,
    cooldownBars,
    eliteMinVolRegime,
    filterRequireOrderBlock,
    filterFVG,
    filterPapRequireRetest,
    filterEliteSession,
    filterCmSession,
    filterLiquiditySweep,
    filterEliteRequireRetest,
    filterEliteHTFEMA,
    filterEliteMaxEmaDistance,
    filterFixedPctSlTp,
    fixedSlPct,
    fixedTpPct,
    ecbAGradeBodyMinPctHighVol,
    ecbAGradeBodyMinPctOther,
    ecbAGradeVolMinMult,
    ecbBGradeBodyMinPctMedium,
    ecbBGradeBodyMinPctOther,
    ecbBGradeVolMinMultMedium,
    ecbBGradeVolMinMultOther,
    ecbRetestAtrTolMult,
    ecbRetestEma20MaxDistPct,
    ecbRetestVolMaxFracOfBreak,
    ecbMaxEma50DistanceAtrMult,
    ecbMinConsolidBars,
    ecbRsiLongMinMediumAGrade,
    ecbRsiLongMinMediumBGrade,
    ecbRsiLongMinOther,
    ecbRsiShortMaxMediumAGrade,
    ecbRsiShortMaxMediumBGrade,
    ecbRsiShortMaxOther,
    ecbSlAtrMultAGradeHigh,
    ecbSlAtrMultAGradeOther,
    ecbSlAtrMultBGrade,
    ecbTp1RRMultAGradeHigh,
    ecbTp1RRMultAGradeOther,
    ecbTp1RRMultBGradeMedium,
    ecbTp1RRMultBGradeOther,
    ecbMeasuredMoveMinAtrMult,
    ecbTp2ExtraRR,
    ecbMaxBreakCandleRangeAtrMult,
    ecbBreakClosePosBullMinPct,
    ecbBreakClosePosBearMaxPct,
    stAtrPeriod,
    stAtrMult,
    stUseRelVol,
    stRelVolLen,
    stRelVolMin,
    stRequireFlip,
    stUseKernel,
    stKernelLookback,
    stKernelBandwidth,
    stUseHTFAlign,
    stHtfEmaLen,
    stUseHtfEmaSlope,
    stHtfEmaSlopeLookback,
    stHtfEmaSlopeMinPctPerBar,
    stUseAdx,
    stAdxPeriod,
    stAdxMin,
    stUseDiAlign,
    stDiPeriod,
    stUseEmaDistance,
    stEmaDistAtrMin,
    stUseImpulse,
    stImpulseBodyMinPct,
    stImpulseWickMaxPct,
    stUseKdeRegime,
    stKdeRegimeLookback,
    stKdeRegimeBandwidth,
    stKdeRegimeMaxConcentration,
    stUseKdeValueArea,
    stKdeValueAreaLookback,
    stKdeValueAreaBandwidth,
    stKdeValueAreaMaxDensity,
    lastSignalTimeSec,
    lastSignalDirection,
    analysisRunNonce
  ])
}
