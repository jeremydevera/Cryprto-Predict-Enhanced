import { create } from 'zustand'
import { scheduleCloudSave } from '@/lib/settingsSync'

export type ConfluenceVote = 'buy' | 'sell' | 'neutral'

export const STRATEGIES = [
  'Elite Context Breakout',
  'Elite Retest Reversal',
  'Breakout Retest',
  'Confirmation Model',
  'FluxGate Dual Engine',
  'Supertrend + RelVol',
  'BB Stoch S/D',
  'Squeeze Momentum',
] as const

export const IMPLEMENTED_STRATEGIES: ReadonlySet<string> = new Set([
  'Elite Context Breakout',
  'Elite Retest Reversal',
  'Breakout Retest',
  'Confirmation Model',
  'FluxGate Dual Engine',
  'Supertrend + RelVol',
  'BB Stoch S/D',
  'Squeeze Momentum',
])

type StrategyName = (typeof STRATEGIES)[number]

export type ConfluenceRow = {
  id: string
  strategy: string
  tf: string
  vote: ConfluenceVote
  perfText: string
}

export type SignalRow = {
  id: string
  time: string
  label: string
  direction: 'buy' | 'sell' | 'neutral'
  quality: number
  confluence: number
  symbol?: string
  entry?: number
  sl?: number
  tp1?: number
  tp2?: number
  notes: string
}

export type RegimeScores = {
  Trending: number
  Ranging: number
  Choppy: number
  Breakout: number
  Exhaustion: number
}

export type AIInsight = {
  label: string
  value: string
  status: 'bullish' | 'bearish' | 'neutral'
}

export type SDZone = {
  name: string
  price: number
  dist: number
  color: 'supply' | 'demand'
}

export type IndicatorRow = {
  name: string
  value: string
  signal: 'BUY' | 'SELL' | 'NEUTRAL'
  color: 'buy' | 'sell' | 'neutral'
}

export type MarketMetrics = {
  rsi: number
  ema20: number
  ema50: number
  ema200: number
  macd: string
  direction: string
  volatility: string
  momentum: string
  adx: string
  adxLabel: string
  htfBias: string
  candle: string
  signalQuality: number
  overallScore: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  mktCap?: string
  vol24h?: string
  high7d?: number
  low7d?: number
  lastUpdate?: string
}

export type AutoBest = {
  strategy: string
  winRate: number
  profitFactor: number
  expectancy: string
  state: string
}

export type ScannerResultRow = {
  symbol: string
  timeframe: string
  direction: 'buy' | 'sell'
  quality: number
  confluence: number
  strategy: string
  regime: string
  currentPrice: number
  entry: number
  entryDistancePct: number
  sl: number
  tp1: number
  tp2: number
  notes: string
  detectedAt: number  // ms timestamp, set by addScannerResults
}

const STRATEGY_SETTINGS_KEY = 'cp_strategy_settings_v1'
const TERMINAL_SETTINGS_KEY = 'cp_terminal_settings_v1'
const SCANNER_SETTINGS_KEY = 'cp_scanner_settings_v1'
const STRATEGY_FILTERS_KEY = 'cp_strategy_filters_v1'

const normalizeStrategies = (input: unknown) => {
  if (!Array.isArray(input)) return null
  const list = input.filter(
    (s): s is StrategyName =>
      typeof s === 'string' && (STRATEGIES as readonly string[]).includes(s),
  )
  return list.length > 0 ? list : null
}

const loadEnabledStrategies = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STRATEGY_SETTINGS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as { enabledStrategies?: unknown; autoBestPoolStrategies?: unknown }
    const enabled = normalizeStrategies(obj.enabledStrategies)
    const autoPool = normalizeStrategies(obj.autoBestPoolStrategies)
    return enabled ?? autoPool ?? null
  } catch {
    return null
  }
}

const persistEnabledStrategies = (enabledStrategies: StrategyName[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STRATEGY_SETTINGS_KEY, JSON.stringify({ enabledStrategies }))
    scheduleCloudSave()
  } catch {
    void 0
  }
}

const loadScannerSettings = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SCANNER_SETTINGS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as {
      timeframes?: unknown
      nearEntryOnly?: unknown
      nearEntryPct?: unknown
      continuousScan?: unknown
      stopOnFirstSignal?: unknown
      scanIntervalSec?: unknown
      scanStrategy?: unknown
    }
    const allowed = new Set(['1m', '5m', '15m', '1h', '4h', '1d'])
    const timeframes =
      Array.isArray(obj.timeframes) && obj.timeframes.every((t) => typeof t === 'string')
        ? (obj.timeframes as string[]).filter((t) => allowed.has(t))
        : null
    const nearEntryOnly = typeof obj.nearEntryOnly === 'boolean' ? obj.nearEntryOnly : null
    const nearEntryPct =
      typeof obj.nearEntryPct === 'number' && Number.isFinite(obj.nearEntryPct) ? obj.nearEntryPct : null
    const continuousScan = typeof obj.continuousScan === 'boolean' ? obj.continuousScan : null
    const stopOnFirstSignal = typeof obj.stopOnFirstSignal === 'boolean' ? obj.stopOnFirstSignal : null
    const scanIntervalSec =
      typeof obj.scanIntervalSec === 'number' && Number.isFinite(obj.scanIntervalSec) ? obj.scanIntervalSec : null
    const scanStrategy = typeof obj.scanStrategy === 'string' ? obj.scanStrategy : null
    if (
      timeframes === null &&
      nearEntryOnly === null &&
      nearEntryPct === null &&
      continuousScan === null &&
      stopOnFirstSignal === null &&
      scanIntervalSec === null &&
      scanStrategy === null
    )
      return null
    return { timeframes, nearEntryOnly, nearEntryPct, continuousScan, stopOnFirstSignal, scanIntervalSec, scanStrategy }
  } catch {
    return null
  }
}

const persistScannerSettings = (settings: {
  timeframes: string[]
  nearEntryOnly: boolean
  nearEntryPct: number
  continuousScan: boolean
  stopOnFirstSignal: boolean
  scanIntervalSec: number
  scanStrategy: string
}) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SCANNER_SETTINGS_KEY, JSON.stringify(settings))
    scheduleCloudSave()
  } catch {
    void 0
  }
}

const loadTerminalSettings = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TERMINAL_SETTINGS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as {
      entryModel?: unknown
      isConfluence?: unknown
      minConfluence?: unknown
      minQuality?: unknown
      isAutoStrategy?: unknown
      selectedStrategy?: unknown
      filterBTCAlignment?: unknown
      filterHTFAlignment?: unknown
      filterEntryConfirmation?: unknown
      filterADXRegime?: unknown
      filterVolumeConfirmation?: unknown
      filterKeyLevelDistance?: unknown
      keyLevelMaxDistancePct?: unknown
      minVolumeRatio?: unknown
      filterRetestConfirmation?: unknown
      filterAtrEntryBuffer?: unknown
      entryAtrBufferAtrMult?: unknown
      filterStrongClose?: unknown
      strongCloseBodyPct?: unknown
      filterAvoidOppKeyLevel?: unknown
      filterCooldown?: unknown
      cooldownBars?: unknown
      filterRequireOrderBlock?: unknown
      filterFVG?: unknown
      filterPapRequireRetest?: unknown
      filterEliteSession?: unknown
      filterCmSession?: unknown
      filterLiquiditySweep?: unknown
      filterEliteRequireRetest?: unknown
      filterEliteHTFEMA?: unknown
      filterEliteMaxEmaDistance?: unknown
      filterFixedPctSlTp?: unknown
      fixedSlPct?: unknown
      fixedTpPct?: unknown
      eliteMinVolRegime?: unknown
      filterIFVG?: unknown
      filterCisdRetest?: unknown
      filterClearTarget?: unknown
      filterHtfEma50?: unknown
      errAGradeBoost?: unknown
      errStochConfirm?: unknown
      errHtfEma200?: unknown
      errMultiRetest?: unknown
      errAGradeRequired?: unknown
      errHtfEma50Required?: unknown
      errMinRREnabled?: unknown
      errMinRR?: unknown
      errRetestMaxBarsEnabled?: unknown
      errRetestMaxBars?: unknown
      errReversalBodyMinPct?: unknown
      errRetestAtrTolMult?: unknown
      errStochOS?: unknown
      errStochOB?: unknown
      errMultiRetestLookbackBars?: unknown
      errMultiRetestMinTouches?: unknown
      errAGradeBodyMinPct?: unknown
      errAGradeVolMinMult?: unknown
      errTp1MultDefault?: unknown
      errTp2MultDefault?: unknown
      errTp1MultBoost?: unknown
      errTp2MultBoost?: unknown
      ecbAGradeBodyMinPctHighVol?: unknown
      ecbAGradeBodyMinPctOther?: unknown
      ecbAGradeVolMinMult?: unknown
      ecbBGradeBodyMinPctMedium?: unknown
      ecbBGradeBodyMinPctOther?: unknown
      ecbBGradeVolMinMultMedium?: unknown
      ecbBGradeVolMinMultOther?: unknown
      ecbRetestAtrTolMult?: unknown
      ecbRetestEma20MaxDistPct?: unknown
      ecbRetestVolMaxFracOfBreak?: unknown
      ecbMaxEma50DistanceAtrMult?: unknown
      ecbMinConsolidBars?: unknown
      ecbRsiLongMinMediumAGrade?: unknown
      ecbRsiLongMinMediumBGrade?: unknown
      ecbRsiLongMinOther?: unknown
      ecbRsiShortMaxMediumAGrade?: unknown
      ecbRsiShortMaxMediumBGrade?: unknown
      ecbRsiShortMaxOther?: unknown
      ecbSlAtrMultAGradeHigh?: unknown
      ecbSlAtrMultAGradeOther?: unknown
      ecbSlAtrMultBGrade?: unknown
      ecbTp1RRMultAGradeHigh?: unknown
      ecbTp1RRMultAGradeOther?: unknown
      ecbTp1RRMultBGradeMedium?: unknown
      ecbTp1RRMultBGradeOther?: unknown
      ecbMeasuredMoveMinAtrMult?: unknown
      ecbTp2ExtraRR?: unknown
      ecbMaxBreakCandleRangeAtrMult?: unknown
      ecbBreakClosePosBullMinPct?: unknown
      ecbBreakClosePosBearMaxPct?: unknown
      brMinAtrPct?: unknown
      brMaxRangeAtrMult?: unknown
      brEmaSlopeLookback?: unknown
      brAdxMin?: unknown
      fgUseADX?: unknown
      fgAdxMin?: unknown
      fgUseStructure?: unknown
      fgStructureTolAtrMult?: unknown
      fgUseMomentum?: unknown
      fgUseRsiDivergence?: unknown
      fgUseStochCross?: unknown
      fgUseVolume?: unknown
      fgMinVolumeRatio?: unknown
      fgRequireVolumeExpanding?: unknown
      fgUseHTFAlign?: unknown
      fgBaseLenLong?: unknown
      fgBaseLenShort?: unknown
      fgGuideEmaLen?: unknown
      fgVolLen?: unknown
      fgPersLen?: unknown
      fgCurvLen?: unknown
      fgThresholdKLong?: unknown
      fgThresholdKShort?: unknown
      fgUseCross?: unknown
      fgPresetVersion?: unknown
      fgUseSession?: unknown
      fgSessionStartUtc?: unknown
      fgSessionEndUtc?: unknown
      fgStochExtreme?: unknown
      fgStochOS?: unknown
      fgStochOB?: unknown
      fgUseCost?: unknown
      fgUseExecution?: unknown
    }
    const entryModel = (['breakout_close', 'retest_hold', 'retest_confirm'] as const).includes(obj.entryModel as any)
      ? (obj.entryModel as 'breakout_close' | 'retest_hold' | 'retest_confirm')
      : null
    const isConfluence = typeof obj.isConfluence === 'boolean' ? obj.isConfluence : null
    const minConfluence = typeof obj.minConfluence === 'number' && Number.isFinite(obj.minConfluence) ? obj.minConfluence : null
    const minQuality = typeof obj.minQuality === 'number' && Number.isFinite(obj.minQuality) ? obj.minQuality : null
    const isAutoStrategy = typeof obj.isAutoStrategy === 'boolean' ? obj.isAutoStrategy : null
    const selectedStrategy = typeof obj.selectedStrategy === 'string' ? obj.selectedStrategy : null
    const filterBTCAlignment = typeof obj.filterBTCAlignment === 'boolean' ? obj.filterBTCAlignment : null
    const filterHTFAlignment = typeof obj.filterHTFAlignment === 'boolean' ? obj.filterHTFAlignment : null
    const filterEntryConfirmation = typeof obj.filterEntryConfirmation === 'boolean' ? obj.filterEntryConfirmation : null
    const filterADXRegime = typeof obj.filterADXRegime === 'boolean' ? obj.filterADXRegime : null
    const filterVolumeConfirmation = typeof obj.filterVolumeConfirmation === 'boolean' ? obj.filterVolumeConfirmation : null
    const filterKeyLevelDistance = typeof obj.filterKeyLevelDistance === 'boolean' ? obj.filterKeyLevelDistance : null
    const keyLevelMaxDistancePct =
      typeof obj.keyLevelMaxDistancePct === 'number' && Number.isFinite(obj.keyLevelMaxDistancePct)
        ? obj.keyLevelMaxDistancePct
        : null
    const minVolumeRatio =
      typeof obj.minVolumeRatio === 'number' && Number.isFinite(obj.minVolumeRatio)
        ? obj.minVolumeRatio
        : null
    const filterRetestConfirmation = typeof obj.filterRetestConfirmation === 'boolean' ? obj.filterRetestConfirmation : null
    const filterAtrEntryBuffer = typeof obj.filterAtrEntryBuffer === 'boolean' ? obj.filterAtrEntryBuffer : null
    const entryAtrBufferAtrMult =
      typeof obj.entryAtrBufferAtrMult === 'number' && Number.isFinite(obj.entryAtrBufferAtrMult)
        ? obj.entryAtrBufferAtrMult
        : null
    const filterStrongClose = typeof obj.filterStrongClose === 'boolean' ? obj.filterStrongClose : null
    const strongCloseBodyPct =
      typeof obj.strongCloseBodyPct === 'number' && Number.isFinite(obj.strongCloseBodyPct)
        ? obj.strongCloseBodyPct
        : null
    const filterAvoidOppKeyLevel = typeof obj.filterAvoidOppKeyLevel === 'boolean' ? obj.filterAvoidOppKeyLevel : null
    const filterCooldown = typeof obj.filterCooldown === 'boolean' ? obj.filterCooldown : null
    const cooldownBars =
      typeof obj.cooldownBars === 'number' && Number.isFinite(obj.cooldownBars)
        ? obj.cooldownBars
        : null
    const filterRequireOrderBlock = typeof obj.filterRequireOrderBlock === 'boolean' ? obj.filterRequireOrderBlock : null
    const filterFVG               = typeof obj.filterFVG               === 'boolean' ? obj.filterFVG               : null
    const filterPapRequireRetest  = typeof obj.filterPapRequireRetest  === 'boolean' ? obj.filterPapRequireRetest  : null
    const filterEliteSession      = typeof obj.filterEliteSession      === 'boolean' ? obj.filterEliteSession      : null
    const filterCmSession         = typeof obj.filterCmSession         === 'boolean' ? obj.filterCmSession         : null
    const filterLiquiditySweep        = typeof obj.filterLiquiditySweep        === 'boolean' ? obj.filterLiquiditySweep        : null
    const filterEliteRequireRetest    = typeof obj.filterEliteRequireRetest    === 'boolean' ? obj.filterEliteRequireRetest    : null
    const filterEliteHTFEMA           = typeof obj.filterEliteHTFEMA           === 'boolean' ? obj.filterEliteHTFEMA           : null
    const filterEliteMaxEmaDistance   = typeof obj.filterEliteMaxEmaDistance   === 'boolean' ? obj.filterEliteMaxEmaDistance   : null
    const filterFixedPctSlTp          = typeof obj.filterFixedPctSlTp          === 'boolean' ? obj.filterFixedPctSlTp          : null
    const fixedSlPct                  = typeof obj.fixedSlPct === 'number' && Number.isFinite(obj.fixedSlPct as number) ? obj.fixedSlPct as number : null
    const fixedTpPct                  = typeof obj.fixedTpPct === 'number' && Number.isFinite(obj.fixedTpPct as number) ? obj.fixedTpPct as number : null
    const eliteMinVolRegime = (['any', 'medium', 'high'] as const).includes(obj.eliteMinVolRegime as any) ? obj.eliteMinVolRegime as 'any' | 'medium' | 'high' : null
    const filterIFVG        = typeof obj.filterIFVG        === 'boolean' ? obj.filterIFVG        : null
    const filterCisdRetest  = typeof obj.filterCisdRetest  === 'boolean' ? obj.filterCisdRetest  : null
    const filterClearTarget = typeof obj.filterClearTarget === 'boolean' ? obj.filterClearTarget : null
    const filterHtfEma50    = typeof obj.filterHtfEma50    === 'boolean' ? obj.filterHtfEma50    : null
    const errAGradeBoost    = typeof obj.errAGradeBoost    === 'boolean' ? obj.errAGradeBoost    : null
    const errStochConfirm   = typeof obj.errStochConfirm   === 'boolean' ? obj.errStochConfirm   : null
    const errHtfEma200      = typeof obj.errHtfEma200      === 'boolean' ? obj.errHtfEma200      : null
    const errMultiRetest    = typeof obj.errMultiRetest    === 'boolean' ? obj.errMultiRetest    : null
    const errAGradeRequired       = typeof obj.errAGradeRequired       === 'boolean' ? obj.errAGradeRequired       : null
    const errHtfEma50Required     = typeof obj.errHtfEma50Required     === 'boolean' ? obj.errHtfEma50Required     : null
    const errMinRREnabled         = typeof obj.errMinRREnabled         === 'boolean' ? obj.errMinRREnabled         : null
    const errMinRR                = typeof obj.errMinRR                === 'number' && Number.isFinite(obj.errMinRR) ? obj.errMinRR : null
    const errRetestMaxBarsEnabled = typeof obj.errRetestMaxBarsEnabled === 'boolean' ? obj.errRetestMaxBarsEnabled : null
    const errRetestMaxBars        = typeof obj.errRetestMaxBars        === 'number' && Number.isFinite(obj.errRetestMaxBars) ? obj.errRetestMaxBars : null
    const errReversalBodyMinPct = typeof obj.errReversalBodyMinPct === 'number' && Number.isFinite(obj.errReversalBodyMinPct) ? obj.errReversalBodyMinPct : null
    const errRetestAtrTolMult   = typeof obj.errRetestAtrTolMult   === 'number' && Number.isFinite(obj.errRetestAtrTolMult)   ? obj.errRetestAtrTolMult   : null
    const errStochOS            = typeof obj.errStochOS            === 'number' && Number.isFinite(obj.errStochOS)            ? obj.errStochOS            : null
    const errStochOB            = typeof obj.errStochOB            === 'number' && Number.isFinite(obj.errStochOB)            ? obj.errStochOB            : null
    const errMultiRetestLookbackBars =
      typeof obj.errMultiRetestLookbackBars === 'number' && Number.isFinite(obj.errMultiRetestLookbackBars) ? obj.errMultiRetestLookbackBars : null
    const errMultiRetestMinTouches =
      typeof obj.errMultiRetestMinTouches === 'number' && Number.isFinite(obj.errMultiRetestMinTouches) ? obj.errMultiRetestMinTouches : null
    const errAGradeBodyMinPct =
      typeof obj.errAGradeBodyMinPct === 'number' && Number.isFinite(obj.errAGradeBodyMinPct) ? obj.errAGradeBodyMinPct : null
    const errAGradeVolMinMult =
      typeof obj.errAGradeVolMinMult === 'number' && Number.isFinite(obj.errAGradeVolMinMult) ? obj.errAGradeVolMinMult : null
    const errTp1MultDefault =
      typeof obj.errTp1MultDefault === 'number' && Number.isFinite(obj.errTp1MultDefault) ? obj.errTp1MultDefault : null
    const errTp2MultDefault =
      typeof obj.errTp2MultDefault === 'number' && Number.isFinite(obj.errTp2MultDefault) ? obj.errTp2MultDefault : null
    const errTp1MultBoost =
      typeof obj.errTp1MultBoost === 'number' && Number.isFinite(obj.errTp1MultBoost) ? obj.errTp1MultBoost : null
    const errTp2MultBoost =
      typeof obj.errTp2MultBoost === 'number' && Number.isFinite(obj.errTp2MultBoost) ? obj.errTp2MultBoost : null
    const ecbAGradeBodyMinPctHighVol =
      typeof obj.ecbAGradeBodyMinPctHighVol === 'number' && Number.isFinite(obj.ecbAGradeBodyMinPctHighVol) ? obj.ecbAGradeBodyMinPctHighVol : null
    const ecbAGradeBodyMinPctOther =
      typeof obj.ecbAGradeBodyMinPctOther === 'number' && Number.isFinite(obj.ecbAGradeBodyMinPctOther) ? obj.ecbAGradeBodyMinPctOther : null
    const ecbAGradeVolMinMult =
      typeof obj.ecbAGradeVolMinMult === 'number' && Number.isFinite(obj.ecbAGradeVolMinMult) ? obj.ecbAGradeVolMinMult : null
    const ecbBGradeBodyMinPctMedium =
      typeof obj.ecbBGradeBodyMinPctMedium === 'number' && Number.isFinite(obj.ecbBGradeBodyMinPctMedium) ? obj.ecbBGradeBodyMinPctMedium : null
    const ecbBGradeBodyMinPctOther =
      typeof obj.ecbBGradeBodyMinPctOther === 'number' && Number.isFinite(obj.ecbBGradeBodyMinPctOther) ? obj.ecbBGradeBodyMinPctOther : null
    const ecbBGradeVolMinMultMedium =
      typeof obj.ecbBGradeVolMinMultMedium === 'number' && Number.isFinite(obj.ecbBGradeVolMinMultMedium) ? obj.ecbBGradeVolMinMultMedium : null
    const ecbBGradeVolMinMultOther =
      typeof obj.ecbBGradeVolMinMultOther === 'number' && Number.isFinite(obj.ecbBGradeVolMinMultOther) ? obj.ecbBGradeVolMinMultOther : null
    const ecbRetestAtrTolMult =
      typeof obj.ecbRetestAtrTolMult === 'number' && Number.isFinite(obj.ecbRetestAtrTolMult) ? obj.ecbRetestAtrTolMult : null
    const ecbRetestEma20MaxDistPct =
      typeof obj.ecbRetestEma20MaxDistPct === 'number' && Number.isFinite(obj.ecbRetestEma20MaxDistPct) ? obj.ecbRetestEma20MaxDistPct : null
    const ecbRetestVolMaxFracOfBreak =
      typeof obj.ecbRetestVolMaxFracOfBreak === 'number' && Number.isFinite(obj.ecbRetestVolMaxFracOfBreak) ? obj.ecbRetestVolMaxFracOfBreak : null
    const ecbMaxEma50DistanceAtrMult =
      typeof obj.ecbMaxEma50DistanceAtrMult === 'number' && Number.isFinite(obj.ecbMaxEma50DistanceAtrMult) ? obj.ecbMaxEma50DistanceAtrMult : null
    const ecbMinConsolidBars =
      typeof obj.ecbMinConsolidBars === 'number' && Number.isFinite(obj.ecbMinConsolidBars) ? obj.ecbMinConsolidBars : null
    const ecbRsiLongMinMediumAGrade =
      typeof obj.ecbRsiLongMinMediumAGrade === 'number' && Number.isFinite(obj.ecbRsiLongMinMediumAGrade) ? obj.ecbRsiLongMinMediumAGrade : null
    const ecbRsiLongMinMediumBGrade =
      typeof obj.ecbRsiLongMinMediumBGrade === 'number' && Number.isFinite(obj.ecbRsiLongMinMediumBGrade) ? obj.ecbRsiLongMinMediumBGrade : null
    const ecbRsiLongMinOther =
      typeof obj.ecbRsiLongMinOther === 'number' && Number.isFinite(obj.ecbRsiLongMinOther) ? obj.ecbRsiLongMinOther : null
    const ecbRsiShortMaxMediumAGrade =
      typeof obj.ecbRsiShortMaxMediumAGrade === 'number' && Number.isFinite(obj.ecbRsiShortMaxMediumAGrade) ? obj.ecbRsiShortMaxMediumAGrade : null
    const ecbRsiShortMaxMediumBGrade =
      typeof obj.ecbRsiShortMaxMediumBGrade === 'number' && Number.isFinite(obj.ecbRsiShortMaxMediumBGrade) ? obj.ecbRsiShortMaxMediumBGrade : null
    const ecbRsiShortMaxOther =
      typeof obj.ecbRsiShortMaxOther === 'number' && Number.isFinite(obj.ecbRsiShortMaxOther) ? obj.ecbRsiShortMaxOther : null
    const ecbSlAtrMultAGradeHigh =
      typeof obj.ecbSlAtrMultAGradeHigh === 'number' && Number.isFinite(obj.ecbSlAtrMultAGradeHigh) ? obj.ecbSlAtrMultAGradeHigh : null
    const ecbSlAtrMultAGradeOther =
      typeof obj.ecbSlAtrMultAGradeOther === 'number' && Number.isFinite(obj.ecbSlAtrMultAGradeOther) ? obj.ecbSlAtrMultAGradeOther : null
    const ecbSlAtrMultBGrade =
      typeof obj.ecbSlAtrMultBGrade === 'number' && Number.isFinite(obj.ecbSlAtrMultBGrade) ? obj.ecbSlAtrMultBGrade : null
    const ecbTp1RRMultAGradeHigh =
      typeof obj.ecbTp1RRMultAGradeHigh === 'number' && Number.isFinite(obj.ecbTp1RRMultAGradeHigh) ? obj.ecbTp1RRMultAGradeHigh : null
    const ecbTp1RRMultAGradeOther =
      typeof obj.ecbTp1RRMultAGradeOther === 'number' && Number.isFinite(obj.ecbTp1RRMultAGradeOther) ? obj.ecbTp1RRMultAGradeOther : null
    const ecbTp1RRMultBGradeMedium =
      typeof obj.ecbTp1RRMultBGradeMedium === 'number' && Number.isFinite(obj.ecbTp1RRMultBGradeMedium) ? obj.ecbTp1RRMultBGradeMedium : null
    const ecbTp1RRMultBGradeOther =
      typeof obj.ecbTp1RRMultBGradeOther === 'number' && Number.isFinite(obj.ecbTp1RRMultBGradeOther) ? obj.ecbTp1RRMultBGradeOther : null
    const ecbMeasuredMoveMinAtrMult =
      typeof obj.ecbMeasuredMoveMinAtrMult === 'number' && Number.isFinite(obj.ecbMeasuredMoveMinAtrMult) ? obj.ecbMeasuredMoveMinAtrMult : null
    const ecbTp2ExtraRR =
      typeof obj.ecbTp2ExtraRR === 'number' && Number.isFinite(obj.ecbTp2ExtraRR) ? obj.ecbTp2ExtraRR : null
    const ecbMaxBreakCandleRangeAtrMult =
      typeof obj.ecbMaxBreakCandleRangeAtrMult === 'number' && Number.isFinite(obj.ecbMaxBreakCandleRangeAtrMult) ? obj.ecbMaxBreakCandleRangeAtrMult : null
    const ecbBreakClosePosBullMinPct =
      typeof obj.ecbBreakClosePosBullMinPct === 'number' && Number.isFinite(obj.ecbBreakClosePosBullMinPct) ? obj.ecbBreakClosePosBullMinPct : null
    const ecbBreakClosePosBearMaxPct =
      typeof obj.ecbBreakClosePosBearMaxPct === 'number' && Number.isFinite(obj.ecbBreakClosePosBearMaxPct) ? obj.ecbBreakClosePosBearMaxPct : null
    const brMinAtrPct =
      typeof obj.brMinAtrPct === 'number' && Number.isFinite(obj.brMinAtrPct) ? obj.brMinAtrPct : null
    const brMaxRangeAtrMult =
      typeof obj.brMaxRangeAtrMult === 'number' && Number.isFinite(obj.brMaxRangeAtrMult) ? obj.brMaxRangeAtrMult : null
    const brEmaSlopeLookback =
      typeof obj.brEmaSlopeLookback === 'number' && Number.isFinite(obj.brEmaSlopeLookback) ? obj.brEmaSlopeLookback : null
    const brAdxMin =
      typeof obj.brAdxMin === 'number' && Number.isFinite(obj.brAdxMin) ? obj.brAdxMin : null
    const fgUseADX = typeof obj.fgUseADX === 'boolean' ? obj.fgUseADX : null
    const fgAdxMin = typeof obj.fgAdxMin === 'number' && Number.isFinite(obj.fgAdxMin) ? obj.fgAdxMin : null
    const fgUseStructure = typeof obj.fgUseStructure === 'boolean' ? obj.fgUseStructure : null
    const fgStructureTolAtrMult =
      typeof obj.fgStructureTolAtrMult === 'number' && Number.isFinite(obj.fgStructureTolAtrMult) ? obj.fgStructureTolAtrMult : null
    const fgUseMomentum = typeof obj.fgUseMomentum === 'boolean' ? obj.fgUseMomentum : null
    const fgUseRsiDivergence = typeof obj.fgUseRsiDivergence === 'boolean' ? obj.fgUseRsiDivergence : null
    const fgUseStochCross = typeof obj.fgUseStochCross === 'boolean' ? obj.fgUseStochCross : null
    const fgUseVolume = typeof obj.fgUseVolume === 'boolean' ? obj.fgUseVolume : null
    const fgMinVolumeRatio =
      typeof obj.fgMinVolumeRatio === 'number' && Number.isFinite(obj.fgMinVolumeRatio) ? obj.fgMinVolumeRatio : null
    const fgRequireVolumeExpanding = typeof obj.fgRequireVolumeExpanding === 'boolean' ? obj.fgRequireVolumeExpanding : null
    const fgUseHTFAlign = typeof obj.fgUseHTFAlign === 'boolean' ? obj.fgUseHTFAlign : null
    const fgBaseLenLong = typeof obj.fgBaseLenLong === 'number' && Number.isFinite(obj.fgBaseLenLong) ? obj.fgBaseLenLong : null
    const fgBaseLenShort = typeof obj.fgBaseLenShort === 'number' && Number.isFinite(obj.fgBaseLenShort) ? obj.fgBaseLenShort : null
    const fgGuideEmaLen = typeof obj.fgGuideEmaLen === 'number' && Number.isFinite(obj.fgGuideEmaLen) ? obj.fgGuideEmaLen : null
    const fgVolLen = typeof obj.fgVolLen === 'number' && Number.isFinite(obj.fgVolLen) ? obj.fgVolLen : null
    const fgPersLen = typeof obj.fgPersLen === 'number' && Number.isFinite(obj.fgPersLen) ? obj.fgPersLen : null
    const fgCurvLen = typeof obj.fgCurvLen === 'number' && Number.isFinite(obj.fgCurvLen) ? obj.fgCurvLen : null
    const fgThresholdKLong =
      typeof obj.fgThresholdKLong === 'number' && Number.isFinite(obj.fgThresholdKLong) ? obj.fgThresholdKLong : null
    const fgThresholdKShort =
      typeof obj.fgThresholdKShort === 'number' && Number.isFinite(obj.fgThresholdKShort) ? obj.fgThresholdKShort : null
    const fgUseCross = typeof obj.fgUseCross === 'boolean' ? obj.fgUseCross : null
    const fgPresetVersion =
      typeof obj.fgPresetVersion === 'number' && Number.isFinite(obj.fgPresetVersion) ? obj.fgPresetVersion : null
    const fgUseSession = typeof obj.fgUseSession === 'boolean' ? obj.fgUseSession : null
    const fgSessionStartUtc =
      typeof obj.fgSessionStartUtc === 'number' && Number.isFinite(obj.fgSessionStartUtc) ? obj.fgSessionStartUtc : null
    const fgSessionEndUtc =
      typeof obj.fgSessionEndUtc === 'number' && Number.isFinite(obj.fgSessionEndUtc) ? obj.fgSessionEndUtc : null
    const fgStochExtreme = typeof obj.fgStochExtreme === 'boolean' ? obj.fgStochExtreme : null
    const fgStochOS = typeof obj.fgStochOS === 'number' && Number.isFinite(obj.fgStochOS) ? obj.fgStochOS : null
    const fgStochOB = typeof obj.fgStochOB === 'number' && Number.isFinite(obj.fgStochOB) ? obj.fgStochOB : null
    const fgUseCost = typeof obj.fgUseCost === 'boolean' ? obj.fgUseCost : null
    const fgUseExecution = typeof obj.fgUseExecution === 'boolean' ? obj.fgUseExecution : null
    if (
      entryModel === null &&
      isConfluence === null &&
      minConfluence === null &&
      minQuality === null &&
      isAutoStrategy === null &&
      selectedStrategy === null &&
      filterBTCAlignment === null &&
      filterHTFAlignment === null &&
      filterEntryConfirmation === null &&
      filterADXRegime === null &&
      filterVolumeConfirmation === null &&
      filterKeyLevelDistance === null &&
      keyLevelMaxDistancePct === null &&
      minVolumeRatio === null &&
      filterRetestConfirmation === null &&
      filterAtrEntryBuffer === null &&
      entryAtrBufferAtrMult === null &&
      filterStrongClose === null &&
      strongCloseBodyPct === null &&
      filterAvoidOppKeyLevel === null &&
      filterCooldown === null &&
      cooldownBars === null &&
      filterRequireOrderBlock === null &&
      filterFVG === null &&
      filterPapRequireRetest === null &&
      filterEliteSession === null &&
      filterCmSession === null &&
      filterLiquiditySweep === null &&
      filterEliteRequireRetest === null &&
      filterEliteHTFEMA === null &&
      filterEliteMaxEmaDistance === null &&
      filterFixedPctSlTp === null &&
      fixedSlPct === null &&
      fixedTpPct === null &&
      filterIFVG === null &&
      filterCisdRetest === null &&
      filterClearTarget === null &&
      filterHtfEma50 === null &&
      errAGradeBoost === null &&
      errStochConfirm === null &&
      errHtfEma200 === null &&
      errMultiRetest === null &&
      errAGradeRequired === null &&
      errHtfEma50Required === null &&
      errMinRREnabled === null &&
      errMinRR === null &&
      errRetestMaxBarsEnabled === null &&
      errRetestMaxBars === null &&
      errReversalBodyMinPct === null &&
      errRetestAtrTolMult === null &&
      errStochOS === null &&
      errStochOB === null &&
      errMultiRetestLookbackBars === null &&
      errMultiRetestMinTouches === null &&
      errAGradeBodyMinPct === null &&
      errAGradeVolMinMult === null &&
      errTp1MultDefault === null &&
      errTp2MultDefault === null &&
      errTp1MultBoost === null &&
      errTp2MultBoost === null &&
      ecbAGradeBodyMinPctHighVol === null &&
      ecbAGradeBodyMinPctOther === null &&
      ecbAGradeVolMinMult === null &&
      ecbBGradeBodyMinPctMedium === null &&
      ecbBGradeBodyMinPctOther === null &&
      ecbBGradeVolMinMultMedium === null &&
      ecbBGradeVolMinMultOther === null &&
      ecbRetestAtrTolMult === null &&
      ecbRetestEma20MaxDistPct === null &&
      ecbRetestVolMaxFracOfBreak === null &&
      ecbMaxEma50DistanceAtrMult === null &&
      ecbMinConsolidBars === null &&
      ecbRsiLongMinMediumAGrade === null &&
      ecbRsiLongMinMediumBGrade === null &&
      ecbRsiLongMinOther === null &&
      ecbRsiShortMaxMediumAGrade === null &&
      ecbRsiShortMaxMediumBGrade === null &&
      ecbRsiShortMaxOther === null &&
      ecbSlAtrMultAGradeHigh === null &&
      ecbSlAtrMultAGradeOther === null &&
      ecbSlAtrMultBGrade === null &&
      ecbTp1RRMultAGradeHigh === null &&
      ecbTp1RRMultAGradeOther === null &&
      ecbTp1RRMultBGradeMedium === null &&
      ecbTp1RRMultBGradeOther === null &&
      ecbMeasuredMoveMinAtrMult === null &&
      ecbTp2ExtraRR === null &&
      ecbMaxBreakCandleRangeAtrMult === null &&
      ecbBreakClosePosBullMinPct === null &&
      ecbBreakClosePosBearMaxPct === null &&
      brMinAtrPct === null &&
      brMaxRangeAtrMult === null &&
      brEmaSlopeLookback === null &&
      brAdxMin === null &&
      fgUseADX === null &&
      fgAdxMin === null &&
      fgUseStructure === null &&
      fgStructureTolAtrMult === null &&
      fgUseMomentum === null &&
      fgUseRsiDivergence === null &&
      fgUseStochCross === null &&
      fgUseVolume === null &&
      fgMinVolumeRatio === null &&
      fgRequireVolumeExpanding === null &&
      fgUseHTFAlign === null &&
      fgBaseLenLong === null &&
      fgBaseLenShort === null &&
      fgGuideEmaLen === null &&
      fgVolLen === null &&
      fgPersLen === null &&
      fgCurvLen === null &&
      fgThresholdKLong === null &&
      fgThresholdKShort === null &&
      fgUseCross === null &&
      fgPresetVersion === null &&
      fgUseSession === null &&
      fgSessionStartUtc === null &&
      fgSessionEndUtc === null &&
      fgStochExtreme === null &&
      fgStochOS === null &&
      fgStochOB === null &&
      fgUseCost === null &&
      fgUseExecution === null
    )
      return null
    return {
      entryModel,
      isConfluence,
      minConfluence,
      minQuality,
      isAutoStrategy,
      selectedStrategy,
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
      filterIFVG,
      filterCisdRetest,
      filterClearTarget,
      filterHtfEma50,
      errAGradeBoost,
      errStochConfirm,
      errHtfEma200,
      errMultiRetest,
      errAGradeRequired,
      errHtfEma50Required,
      errMinRREnabled,
      errMinRR,
      errRetestMaxBarsEnabled,
      errRetestMaxBars,
      errReversalBodyMinPct,
      errRetestAtrTolMult,
      errStochOS,
      errStochOB,
      errMultiRetestLookbackBars,
      errMultiRetestMinTouches,
      errAGradeBodyMinPct,
      errAGradeVolMinMult,
      errTp1MultDefault,
      errTp2MultDefault,
      errTp1MultBoost,
      errTp2MultBoost,
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
      brMinAtrPct,
      brMaxRangeAtrMult,
      brEmaSlopeLookback,
      brAdxMin,
      fgUseADX,
      fgAdxMin,
      fgUseStructure,
      fgStructureTolAtrMult,
      fgUseMomentum,
      fgUseRsiDivergence,
      fgUseStochCross,
      fgUseVolume,
      fgMinVolumeRatio,
      fgRequireVolumeExpanding,
      fgUseHTFAlign,
      fgBaseLenLong,
      fgBaseLenShort,
      fgGuideEmaLen,
      fgVolLen,
      fgPersLen,
      fgCurvLen,
      fgThresholdKLong,
      fgThresholdKShort,
      fgUseCross,
      fgPresetVersion,
      fgUseSession,
      fgSessionStartUtc,
      fgSessionEndUtc,
      fgStochExtreme,
      fgStochOS,
      fgStochOB,
      fgUseCost,
      fgUseExecution,
    }
  } catch {
    return null
  }
}

const persistTerminalSettings = (settings: {
  entryModel: 'breakout_close' | 'retest_hold' | 'retest_confirm'
  isConfluence: boolean
  minConfluence: number
  minQuality: number
  isAutoStrategy: boolean
  selectedStrategy: string
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
  brMinAtrPct?: number
  brMaxRangeAtrMult?: number
  brEmaSlopeLookback?: number
  brAdxMin?: number
  fgUseADX?: boolean
  fgAdxMin?: number
  fgUseStructure?: boolean
  fgStructureTolAtrMult?: number
  fgUseMomentum?: boolean
  fgUseRsiDivergence?: boolean
  fgUseStochCross?: boolean
  fgUseVolume?: boolean
  fgMinVolumeRatio?: number
  fgRequireVolumeExpanding?: boolean
  fgUseHTFAlign?: boolean
  fgBaseLenLong?: number
  fgBaseLenShort?: number
  fgGuideEmaLen?: number
  fgVolLen?: number
  fgPersLen?: number
  fgCurvLen?: number
  fgThresholdKLong?: number
  fgThresholdKShort?: number
  fgUseCross?: boolean
  fgPresetVersion?: number
  fgUseSession?: boolean
  fgSessionStartUtc?: number
  fgSessionEndUtc?: number
  fgStochExtreme?: boolean
  fgStochOS?: number
  fgStochOB?: number
  fgUseCost?: boolean
  fgUseExecution?: boolean
}) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TERMINAL_SETTINGS_KEY, JSON.stringify(settings))
    scheduleCloudSave()
  } catch {
    void 0
  }
}

export type FilterBlockKey =
  | 'btcAlignment'
  | 'htfAlignment'
  | 'entryConfirmation'
  | 'retestConfirmation'
  | 'atrEntryBuffer'
  | 'strongClose'
  | 'adxRegime'
  | 'volumeConfirmation'
  | 'keyLevelDistance'
  | 'avoidOppKeyLevel'
  | 'cooldown'
  | 'minQuality'
  | 'minConfluence'

export type EntryModel = 'breakout_close' | 'retest_hold' | 'retest_confirm'

export type FilterSettings = {
  entryModel: EntryModel
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
  filterIFVG: boolean
  filterCisdRetest: boolean
  filterClearTarget: boolean
  filterHtfEma50: boolean
  errAGradeBoost: boolean
  errStochConfirm: boolean
  errHtfEma200: boolean
  errMultiRetest: boolean
  errAGradeRequired: boolean
  errHtfEma50Required: boolean
  errMinRREnabled: boolean
  errMinRR: number
  errRetestMaxBarsEnabled: boolean
  errRetestMaxBars: number
  errReversalBodyMinPct: number
  errRetestAtrTolMult: number
  errStochOS: number
  errStochOB: number
  errMultiRetestLookbackBars: number
  errMultiRetestMinTouches: number
  errAGradeBodyMinPct: number
  errAGradeVolMinMult: number
  errTp1MultDefault: number
  errTp2MultDefault: number
  errTp1MultBoost: number
  errTp2MultBoost: number
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
  brMinAtrPct?: number
  brMaxRangeAtrMult?: number
  brEmaSlopeLookback?: number
  brAdxMin?: number
  fgUseADX?: boolean
  fgAdxMin?: number
  fgUseStructure?: boolean
  fgStructureTolAtrMult?: number
  fgUseMomentum?: boolean
  fgUseRsiDivergence?: boolean
  fgUseStochCross?: boolean
  fgUseVolume?: boolean
  fgMinVolumeRatio?: number
  fgRequireVolumeExpanding?: boolean
  fgUseHTFAlign?: boolean
  fgBaseLenLong?: number
  fgBaseLenShort?: number
  fgGuideEmaLen?: number
  fgVolLen?: number
  fgPersLen?: number
  fgCurvLen?: number
  fgThresholdKLong?: number
  fgThresholdKShort?: number
  fgUseCross?: boolean
  fgPresetVersion?: number
  fgUseSession?: boolean
  fgSessionStartUtc?: number
  fgSessionEndUtc?: number
  fgStochExtreme?: boolean
  fgStochOS?: number
  fgStochOB?: number
  fgUseCost?: boolean
  fgUseExecution?: boolean
  stPresetVersion?: number
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
  // Squeeze Momentum (TTM) — volatility-compression breakout
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
}

export const DEFAULT_ECB_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: false,
  minConfluence: 11,
  minQuality: 4,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.1,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: true,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: true,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: true,
  filterCooldown: true,
  cooldownBars: 3,
  filterRequireOrderBlock: true,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: true,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'medium',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
  ecbAGradeBodyMinPctHighVol: 70,
  ecbAGradeBodyMinPctOther: 65,
  ecbAGradeVolMinMult: 2.5,
  ecbBGradeBodyMinPctMedium: 55,
  ecbBGradeBodyMinPctOther: 45,
  ecbBGradeVolMinMultMedium: 2.0,
  ecbBGradeVolMinMultOther: 1.5,
  ecbRetestAtrTolMult: 0.3,
  ecbRetestEma20MaxDistPct: 0.3,
  ecbRetestVolMaxFracOfBreak: 0.7,
  ecbMaxEma50DistanceAtrMult: 3,
  ecbMinConsolidBars: 5,
  ecbRsiLongMinMediumAGrade: 55,
  ecbRsiLongMinMediumBGrade: 52,
  ecbRsiLongMinOther: 50,
  ecbRsiShortMaxMediumAGrade: 45,
  ecbRsiShortMaxMediumBGrade: 48,
  ecbRsiShortMaxOther: 50,
  ecbSlAtrMultAGradeHigh: 1.2,
  ecbSlAtrMultAGradeOther: 1.0,
  ecbSlAtrMultBGrade: 1.5,
  ecbTp1RRMultAGradeHigh: 2.5,
  ecbTp1RRMultAGradeOther: 2.0,
  ecbTp1RRMultBGradeMedium: 2.0,
  ecbTp1RRMultBGradeOther: 1.5,
  ecbMeasuredMoveMinAtrMult: 2.5,
  ecbTp2ExtraRR: 2,
  ecbMaxBreakCandleRangeAtrMult: 4,
  ecbBreakClosePosBullMinPct: 75,
  ecbBreakClosePosBearMaxPct: 25,
}

export const DEFAULT_ERR_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: false,
  minConfluence: 5,
  minQuality: 6,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.1,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: false,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: true,
  cooldownBars: 3,
  filterRequireOrderBlock: true,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: true,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'medium',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
}

export const DEFAULT_BR_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: false,
  minConfluence: 4,
  minQuality: 5,
  filterBTCAlignment: false,
  filterHTFAlignment: true,
  filterEntryConfirmation: false,
  filterADXRegime: true,
  filterVolumeConfirmation: true,
  filterKeyLevelDistance: true,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.8,
  filterRetestConfirmation: true,
  filterAtrEntryBuffer: true,
  entryAtrBufferAtrMult: 0.2,
  filterStrongClose: true,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: true,
  cooldownBars: 5,
  filterRequireOrderBlock: false,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: false,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'medium',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
  brMinAtrPct: 0.4,
  brMaxRangeAtrMult: 3,
  brEmaSlopeLookback: 10,
  brAdxMin: 25,
}

export const DEFAULT_CM_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: false,
  minConfluence: 0,
  minQuality: 4,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: true,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.1,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: true,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: true,
  cooldownBars: 3,
  filterRequireOrderBlock: false,
  filterFVG: true,
  filterPapRequireRetest: true,
  filterEliteSession: false,
  filterCmSession: false,
  filterLiquiditySweep: true,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: true,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'medium',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
}

export const DEFAULT_FG_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: false,
  minConfluence: 0,
  minQuality: 0,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.1,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: false,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: false,
  cooldownBars: 24,
  filterRequireOrderBlock: false,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: false,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'any',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
  fgPresetVersion: 5,
  fgUseADX: true,
  fgAdxMin: 22,
  fgUseSession: true,
  fgSessionStartUtc: 8,
  fgSessionEndUtc: 12,
  fgUseStructure: true,
  fgStructureTolAtrMult: 0.25,
  fgUseMomentum: true,
  fgUseRsiDivergence: true,
  fgUseStochCross: true,
  fgStochExtreme: true,
  fgStochOS: 30,
  fgStochOB: 70,
  fgUseVolume: true,
  fgMinVolumeRatio: 1.5,
  fgRequireVolumeExpanding: true,
  fgUseHTFAlign: true,
  fgUseCost: false,
  fgUseExecution: false,
  fgBaseLenLong: 48,
  fgBaseLenShort: 64,
  fgGuideEmaLen: 14,
  fgVolLen: 20,
  fgPersLen: 8,
  fgCurvLen: 14,
  fgThresholdKLong: 1.1,
  fgThresholdKShort: 1.3,
  fgUseCross: true,
}

export const DEFAULT_ST_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: true,
  minConfluence: 2,
  minQuality: 5,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.1,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: false,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: true,
  cooldownBars: 4,
  filterRequireOrderBlock: false,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: false,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'any',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
  stPresetVersion: 2,
  stAtrPeriod: 10,
  stAtrMult: 3.0,
  stUseRelVol: true,
  stRelVolLen: 20,
  stRelVolMin: 1.5,
  stRequireFlip: true,
  stUseKernel: false,
  stKernelLookback: 20,
  stKernelBandwidth: 6,
  stUseHTFAlign: true,
  stHtfEmaLen: 200,
  stUseHtfEmaSlope: false,
  stHtfEmaSlopeLookback: 3,
  stHtfEmaSlopeMinPctPerBar: 0,
  stUseAdx: true,
  stAdxPeriod: 14,
  stAdxMin: 22,
  stUseDiAlign: false,
  stDiPeriod: 14,
  stUseManualSlTp: false,
  stManualSlPct: 1.5,
  stManualTp1Pct: 2.0,
  stManualTp2Pct: 4.0,
  stUseEmaDistance: false,
  stEmaDistAtrMin: 0.6,
  stUseImpulse: false,
  stImpulseBodyMinPct: 55,
  stImpulseWickMaxPct: 30,
  stUseKdeRegime: false,
  stKdeRegimeLookback: 200,
  stKdeRegimeBandwidth: 0.8,
  stKdeRegimeMaxConcentration: 0.90,
  stUseKdeValueArea: false,
  stKdeValueAreaLookback: 260,
  stKdeValueAreaBandwidth: 0.8,
  stKdeValueAreaMaxDensity: 0.80,
}

export const DEFAULT_BBSSD_FILTERS: FilterSettings = {
  entryModel: 'retest_confirm',
  isConfluence: true,
  minConfluence: 4,
  minQuality: 5,
  filterBTCAlignment: false,
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.5,
  minVolumeRatio: 1.2,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.1,
  filterStrongClose: false,
  strongCloseBodyPct: 50,
  filterAvoidOppKeyLevel: false,
  filterCooldown: true,
  cooldownBars: 4,
  filterRequireOrderBlock: false,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: false,
  filterLiquiditySweep: false,
  filterEliteRequireRetest: false,
  filterEliteHTFEMA: false,
  filterEliteMaxEmaDistance: false,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  eliteMinVolRegime: 'any',
  filterIFVG: false,
  filterCisdRetest: false,
  filterClearTarget: false,
  filterHtfEma50: false,
  errAGradeBoost: false,
  errStochConfirm: false,
  errHtfEma200: false,
  errMultiRetest: false,
  errAGradeRequired: false,
  errHtfEma50Required: false,
  errMinRREnabled: false,
  errMinRR: 2.5,
  errRetestMaxBarsEnabled: false,
  errRetestMaxBars: 8,
  errReversalBodyMinPct: 50,
  errRetestAtrTolMult: 0.3,
  errStochOS: 30,
  errStochOB: 70,
  errMultiRetestLookbackBars: 30,
  errMultiRetestMinTouches: 2,
  errAGradeBodyMinPct: 65,
  errAGradeVolMinMult: 2.5,
  errTp1MultDefault: 2.5,
  errTp2MultDefault: 5,
  errTp1MultBoost: 3.0,
  errTp2MultBoost: 6,
  bbssdLength: 20,
  bbssdStdDev: 2.0,
  bbssdStochK: 14,
  bbssdStochD: 3,
  bbssdStochSmooth: 3,
  bbssdStochOS: 20,
  bbssdStochOB: 80,
  bbssdLookbackBars: 3,
  bbssdRequireZone: true,
  bbssdZoneFreshOnly: true,
  bbssdRequireBBTag: true,
  bbssdRequireBBReject: true,
  bbssdRequireStochCross: true,
  bbssdRequireReversalCandle: true,
  bbssdHtfEma200: false,
  bbssdUseMaxAdx: true,
  bbssdMaxAdx: 22,
  bbssdUseVolume: false,
  bbssdMinVolumeRatio: 1.2,
  bbssdZoneTolAtrMult: 0.3,
  bbssdMinLegAtr: 2.0,
  bbssdRsiLongMin: 30,
  bbssdRsiLongMax: 45,
  bbssdRsiShortMin: 55,
  bbssdRsiShortMax: 70,
  bbssdFreshZonesOnly: false,
  bbssdRequireRsiDiv: false,
  bbssdAllowObFvgFallback: true,
  bbssdRevWickPct: 70,
  bbssdRequireEntryConfirm: false,
  bbssdRequireLiqSweep: false,
}

// Squeeze Momentum (TTM) — fires on a volatility-compression release in the momentum
// direction. Tuned for 5m: HTF-200 trend filter + volume-expansion on by default to keep
// the (already infrequent) breakout signals high-quality.
export const DEFAULT_SQZ_FILTERS: FilterSettings = {
  ...DEFAULT_BBSSD_FILTERS,
  entryModel: 'breakout_close',
  isConfluence: true,
  minConfluence: 2,
  minQuality: 5,
  filterCooldown: true,
  cooldownBars: 4,
  filterFixedPctSlTp: false,
  fixedSlPct: 1.0,
  fixedTpPct: 2.0,
  sqzBbLen: 20,
  sqzBbStd: 2.0,
  sqzKcLen: 20,
  sqzKcMult: 1.5,
  sqzMomLen: 20,
  sqzRequireRelease: true,
  sqzMinSqueezeBars: 2,
  sqzRequireMomRising: true,
  sqzUseHtfAlign: true,
  sqzHtfEmaLen: 200,
  sqzUseAdx: true,
  sqzAdxMin: 18,
  sqzUseVolume: true,
  sqzVolLen: 20,
  sqzMinVolumeRatio: 1.2,
  sqzSlAtrMult: 2.0,
  sqzTp1AtrMult: 3.0,
  sqzTp2AtrMult: 5.0,
  sqzUseManualSlTp: false,
  sqzManualSlPct: 1.5,
  sqzManualTp1Pct: 3.0,
  sqzManualTp2Pct: 5.0,
}

const loadStrategyFilters = (): { ecb: FilterSettings; err: FilterSettings; br: FilterSettings; cm: FilterSettings; fg: FilterSettings; st: FilterSettings; bbssd: FilterSettings; sqz: FilterSettings } | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STRATEGY_FILTERS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as { ecb?: unknown; err?: unknown; br?: unknown; cm?: unknown; fg?: unknown; st?: unknown; bbssd?: unknown; sqz?: unknown }
    if (!obj || typeof obj !== 'object') return null
    const ecb = obj.ecb && typeof obj.ecb === 'object'
      ? { ...DEFAULT_ECB_FILTERS, ...(obj.ecb as object) } as FilterSettings
      : null
    const err = obj.err && typeof obj.err === 'object'
      ? { ...DEFAULT_ERR_FILTERS, ...(obj.err as object) } as FilterSettings
      : null
    const br = obj.br && typeof obj.br === 'object'
      ? { ...DEFAULT_BR_FILTERS, ...(obj.br as object) } as FilterSettings
      : null
    const cm = obj.cm && typeof obj.cm === 'object'
      ? { ...DEFAULT_CM_FILTERS, ...(obj.cm as object) } as FilterSettings
      : null
    const fg = (() => {
      if (!obj.fg || typeof obj.fg !== 'object') return null
      const raw = obj.fg as any
      const v = raw?.fgPresetVersion
      if (typeof v === 'number' && v === DEFAULT_FG_FILTERS.fgPresetVersion) {
        return { ...DEFAULT_FG_FILTERS, ...(raw as object) } as FilterSettings
      }
      return DEFAULT_FG_FILTERS
    })()
    const st = (() => {
      if (!obj.st || typeof obj.st !== 'object') return null
      const raw = obj.st as any
      const v = raw?.stPresetVersion
      if (typeof v === 'number' && v === DEFAULT_ST_FILTERS.stPresetVersion) {
        return { ...DEFAULT_ST_FILTERS, ...(raw as object) } as FilterSettings
      }
      return DEFAULT_ST_FILTERS
    })()
    const bbssd = obj.bbssd && typeof obj.bbssd === 'object'
      ? { ...DEFAULT_BBSSD_FILTERS, ...(obj.bbssd as object) } as FilterSettings
      : null
    const sqz = obj.sqz && typeof obj.sqz === 'object'
      ? { ...DEFAULT_SQZ_FILTERS, ...(obj.sqz as object) } as FilterSettings
      : null
    if (!ecb && !err && !br && !cm && !fg && !st && !bbssd && !sqz) return null
    return {
      ecb: ecb ?? DEFAULT_ECB_FILTERS,
      err: err ?? DEFAULT_ERR_FILTERS,
      br: br ?? DEFAULT_BR_FILTERS,
      cm: cm ?? DEFAULT_CM_FILTERS,
      fg: fg ?? DEFAULT_FG_FILTERS,
      st: st ?? DEFAULT_ST_FILTERS,
      bbssd: bbssd ?? DEFAULT_BBSSD_FILTERS,
      sqz: sqz ?? DEFAULT_SQZ_FILTERS,
    }
  } catch {
    return null
  }
}

const persistStrategyFilters = (ecb: FilterSettings, err: FilterSettings, br: FilterSettings, cm: FilterSettings, fg: FilterSettings, st: FilterSettings, bbssd: FilterSettings, sqz: FilterSettings) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STRATEGY_FILTERS_KEY, JSON.stringify({ ecb, err, br, cm, fg, st, bbssd, sqz }))
    scheduleCloudSave()
  } catch {
    void 0
  }
}

// ─── Backtest filter profiles (independent of live Filters tab) ─────────────────
// These let the user define multiple filter combinations per strategy purely for
// backtesting. They are NEVER read by the live scanner and never touch the live
// *Filters slices or their persistence. Stored under a separate localStorage key.

export type StrategyEditorKey = 'ecb' | 'err' | 'br' | 'cm' | 'fg' | 'st' | 'bbssd' | 'sqz'

export type BacktestProfile = {
  id: string
  name: string
  filters: FilterSettings
}

// Profiles grouped by strategy editor key.
export type BacktestProfiles = Record<StrategyEditorKey, BacktestProfile[]>

const BACKTEST_PROFILES_KEY = 'backtestProfiles_v1'
const APPENDED_COINS_KEY = 'backtestAppendedCoins_v1'

const loadAppendedCoins = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(APPENDED_COINS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : []
  } catch { return [] }
}
const persistAppendedCoins = (coins: string[]) => {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(APPENDED_COINS_KEY, JSON.stringify(coins)); scheduleCloudSave() } catch { void 0 }
}

// Map a strategy display name to its editor key + default FilterSettings.
export const STRATEGY_EDITOR_KEY: Record<string, StrategyEditorKey> = {
  'Elite Context Breakout': 'ecb',
  'Elite Retest Reversal':  'err',
  'Breakout Retest':        'br',
  'Confirmation Model':     'cm',
  'FluxGate Dual Engine':   'fg',
  'Supertrend + RelVol':    'st',
  'BB Stoch S/D':           'bbssd',
  'Squeeze Momentum':       'sqz',
}

export const DEFAULT_FILTERS_BY_KEY: Record<StrategyEditorKey, FilterSettings> = {
  ecb:   DEFAULT_ECB_FILTERS,
  err:   DEFAULT_ERR_FILTERS,
  br:    DEFAULT_BR_FILTERS,
  cm:    DEFAULT_CM_FILTERS,
  fg:    DEFAULT_FG_FILTERS,
  st:    DEFAULT_ST_FILTERS,
  bbssd: DEFAULT_BBSSD_FILTERS,
  sqz:   DEFAULT_SQZ_FILTERS,
}

const EMPTY_PROFILES: BacktestProfiles = { ecb: [], err: [], br: [], cm: [], fg: [], st: [], bbssd: [], sqz: [] }

const loadBacktestProfiles = (): BacktestProfiles => {
  if (typeof window === 'undefined') return { ...EMPTY_PROFILES }
  try {
    const raw = window.localStorage.getItem(BACKTEST_PROFILES_KEY)
    if (!raw) return applyProfileSeeds({ ...EMPTY_PROFILES })
    const obj = JSON.parse(raw) as Partial<BacktestProfiles>
    const out: BacktestProfiles = { ...EMPTY_PROFILES }
    for (const key of Object.keys(EMPTY_PROFILES) as StrategyEditorKey[]) {
      const list = Array.isArray(obj[key]) ? obj[key]! : []
      // Merge each saved profile's filters over the strategy defaults so new fields are filled in.
      out[key] = list
        .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.filters)
        .map(p => ({ id: p.id, name: p.name, filters: { ...DEFAULT_FILTERS_BY_KEY[key], ...p.filters } }))
    }
    return applyProfileSeeds(out)
  } catch {
    return applyProfileSeeds({ ...EMPTY_PROFILES })
  }
}

const persistBacktestProfiles = (profiles: BacktestProfiles) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BACKTEST_PROFILES_KEY, JSON.stringify(profiles))
    scheduleCloudSave()
  } catch {
    void 0
  }
}

// ── Seeded backtest profiles ─────────────────────────────────────────────────
// Profiles shipped with the app, appended once on load. Applied seed ids are
// tracked under a separate key so deleting a seeded profile doesn't resurrect
// it on the next refresh.
//
// "Claude Tuned v1" — data-driven retune of the exported "Recommended 15m-1h copy"
// BB Stoch S/D run (2026-06-12, 388 trades, 17.5% WR, −32.6R, PF 0.90):
//   • minConfluence 4 → 6: c4–c5 trades were −56.6R combined; filtering to c≥6
//     alone flipped the run to +24.1R / PF 1.13.
//   • bbssdHtfEma200 → true: longs only above HTF EMA200, shorts only below.
//     Counter-trend longs bled −85.4R (12% WR) while shorts made +52.8R; this
//     gate removes the knife-catch longs and adapts if the regime flips.
// Every other value matches the exported profile exactly.
const SEEDED_PROFILES_KEY = 'backtestProfileSeeds_v1'

const CLAUDE_TUNED_BBSSD_V1: BacktestProfile = {
  id: 'bp_seed_bbssd_claude_tuned_v1',
  name: 'Claude Tuned v1 (conf≥6 + HTF200)',
  filters: {
    ...DEFAULT_BBSSD_FILTERS,
    // — exported "Recommended 15m-1h copy" settings —
    entryModel: 'retest_confirm',
    isConfluence: true,
    minQuality: 5,
    minVolumeRatio: 1.2,
    keyLevelMaxDistancePct: 0.5,
    strongCloseBodyPct: 50,
    entryAtrBufferAtrMult: 0.1,
    eliteMinVolRegime: 'any',
    filterADXRegime: false,
    filterAtrEntryBuffer: false,
    filterAvoidOppKeyLevel: false,
    filterBTCAlignment: false,
    filterCisdRetest: false,
    filterClearTarget: false,
    filterCooldown: true,
    cooldownBars: 6,
    filterEliteHTFEMA: false,
    filterEliteMaxEmaDistance: false,
    filterEliteRequireRetest: false,
    filterEliteSession: false,
    filterEntryConfirmation: false,
    filterFVG: false,
    filterFixedPctSlTp: true,
    fixedSlPct: 1,
    fixedTpPct: 4.5,
    filterHTFAlignment: false,
    filterHtfEma50: false,
    filterIFVG: false,
    filterKeyLevelDistance: false,
    filterLiquiditySweep: false,
    filterPapRequireRetest: false,
    filterRequireOrderBlock: false,
    filterRetestConfirmation: false,
    filterStrongClose: false,
    filterVolumeConfirmation: false,
    bbssdLength: 20,
    bbssdStdDev: 2,
    bbssdStochK: 14,
    bbssdStochD: 3,
    bbssdStochSmooth: 3,
    bbssdStochOB: 80,
    bbssdStochOS: 20,
    bbssdLookbackBars: 3,
    bbssdRequireZone: true,
    bbssdZoneFreshOnly: true,
    bbssdRequireBBTag: true,
    bbssdRequireBBReject: true,
    bbssdRequireStochCross: true,
    bbssdRequireReversalCandle: false,
    bbssdUseMaxAdx: true,
    bbssdMaxAdx: 25,
    bbssdUseVolume: false,
    bbssdMinVolumeRatio: 1.2,
    bbssdZoneTolAtrMult: 0.3,
    bbssdMinLegAtr: 2,
    bbssdRsiLongMin: 25,
    bbssdRsiLongMax: 50,
    bbssdRsiShortMin: 50,
    bbssdRsiShortMax: 75,
    bbssdFreshZonesOnly: false,
    bbssdRequireRsiDiv: false,
    bbssdAllowObFvgFallback: true,
    bbssdRevWickPct: 70,
    bbssdRequireEntryConfirm: false,
    bbssdRequireLiqSweep: false,
    errAGradeBoost: false,
    errAGradeRequired: false,
    errAGradeBodyMinPct: 65,
    errAGradeVolMinMult: 2.5,
    errHtfEma200: false,
    errHtfEma50Required: false,
    errMinRR: 2.5,
    errMinRREnabled: false,
    errMultiRetest: false,
    errMultiRetestLookbackBars: 30,
    errMultiRetestMinTouches: 2,
    errRetestAtrTolMult: 0.3,
    errRetestMaxBars: 8,
    errRetestMaxBarsEnabled: false,
    errReversalBodyMinPct: 50,
    errStochConfirm: false,
    errStochOB: 70,
    errStochOS: 30,
    errTp1MultDefault: 2.5,
    errTp2MultDefault: 5,
    errTp1MultBoost: 3,
    errTp2MultBoost: 6,
    // — the two tuned changes —
    minConfluence: 6,
    bbssdHtfEma200: true,
  },
}

// "Claude ST v1" — retune of the exported "profile 1" Supertrend + RelVol run
// (2026-06-12, 15m, 4-day MEXC window, 197 closed: 9.6% WR, −117.8R, PF 0.32):
//   • stUseHtfEmaSlope on (≥0.02%/bar): shorts bled −104R (3.1% WR) fighting an
//     up-grinding regime that the level-only HTF gate (price vs EMA200) waved
//     through. Slope direction gates longs to rising / shorts to falling EMA200.
//   • stManualTp1Pct 5 → 2.25 (=1.5R at SL 1.5%): only 10.7% of trades ever
//     reached the old 3.33R target (needs 23.1% WR to break even); 25.4% reached
//     1.5R (needs 40%) — buys alone were at 35.5% before the slope gate.
//   • stManualTp2Pct 4 → 4.5: was below TP1, fixing ordering for runner mode.
// Every other value matches the exported profile exactly.
const CLAUDE_TUNED_ST_V1: BacktestProfile = {
  id: 'bp_seed_st_claude_tuned_v1',
  name: 'Claude ST v1 (slope + TP 2.25%)',
  filters: {
    ...DEFAULT_ST_FILTERS,
    // — exported "profile 1" settings —
    entryModel: 'retest_confirm',
    isConfluence: true,
    minConfluence: 4,
    minQuality: 5,
    minVolumeRatio: 1.1,
    keyLevelMaxDistancePct: 0.5,
    strongCloseBodyPct: 50,
    entryAtrBufferAtrMult: 0.1,
    eliteMinVolRegime: 'any',
    filterADXRegime: false,
    filterAtrEntryBuffer: false,
    filterAvoidOppKeyLevel: false,
    filterBTCAlignment: false,
    filterCisdRetest: false,
    filterClearTarget: false,
    filterCooldown: true,
    cooldownBars: 4,
    filterEliteHTFEMA: false,
    filterEliteMaxEmaDistance: false,
    filterEliteRequireRetest: false,
    filterEliteSession: false,
    filterEntryConfirmation: false,
    filterFVG: false,
    filterFixedPctSlTp: false,
    fixedSlPct: 1,
    fixedTpPct: 2.2,
    filterHTFAlignment: false,
    filterHtfEma50: false,
    filterIFVG: false,
    filterKeyLevelDistance: false,
    filterLiquiditySweep: false,
    filterPapRequireRetest: false,
    filterRequireOrderBlock: false,
    filterRetestConfirmation: false,
    filterStrongClose: false,
    filterVolumeConfirmation: false,
    stPresetVersion: 2,
    stAtrPeriod: 10,
    stAtrMult: 3,
    stAdxPeriod: 14,
    stAdxMin: 22,
    stDiPeriod: 14,
    stRelVolLen: 20,
    stRelVolMin: 1.5,
    stRequireFlip: true,
    stUseAdx: true,
    stUseDiAlign: false,
    stUseRelVol: true,
    stUseHTFAlign: true,
    stHtfEmaLen: 200,
    stHtfEmaSlopeLookback: 3,
    stUseEmaDistance: false,
    stEmaDistAtrMin: 0.6,
    stUseImpulse: false,
    stImpulseBodyMinPct: 55,
    stImpulseWickMaxPct: 30,
    stUseKdeRegime: false,
    stKdeRegimeLookback: 200,
    stKdeRegimeBandwidth: 0.8,
    stKdeRegimeMaxConcentration: 0.9,
    stUseKdeValueArea: false,
    stKdeValueAreaLookback: 260,
    stKdeValueAreaBandwidth: 0.8,
    stKdeValueAreaMaxDensity: 0.8,
    stUseKernel: false,
    stKernelLookback: 20,
    stKernelBandwidth: 6,
    stUseManualSlTp: true,
    stManualSlPct: 1.5,
    errAGradeBoost: false,
    errAGradeRequired: false,
    errAGradeBodyMinPct: 65,
    errAGradeVolMinMult: 2.5,
    errHtfEma200: false,
    errHtfEma50Required: false,
    errMinRR: 2.5,
    errMinRREnabled: false,
    errMultiRetest: false,
    errMultiRetestLookbackBars: 30,
    errMultiRetestMinTouches: 2,
    errRetestAtrTolMult: 0.3,
    errRetestMaxBars: 8,
    errRetestMaxBarsEnabled: false,
    errReversalBodyMinPct: 50,
    errStochConfirm: false,
    errStochOB: 70,
    errStochOS: 30,
    errTp1MultDefault: 2.5,
    errTp2MultDefault: 5,
    errTp1MultBoost: 3,
    errTp2MultBoost: 6,
    // — the three tuned changes —
    stUseHtfEmaSlope: true,
    stHtfEmaSlopeMinPctPerBar: 0.02,
    stManualTp1Pct: 2.25,
    stManualTp2Pct: 4.5,
  },
}

const PROFILE_SEEDS: { key: StrategyEditorKey; profile: BacktestProfile }[] = [
  { key: 'bbssd', profile: CLAUDE_TUNED_BBSSD_V1 },
  { key: 'st',    profile: CLAUDE_TUNED_ST_V1 },
]

const applyProfileSeeds = (profiles: BacktestProfiles): BacktestProfiles => {
  if (typeof window === 'undefined') return profiles
  let applied: string[] = []
  try {
    const arr = JSON.parse(window.localStorage.getItem(SEEDED_PROFILES_KEY) ?? '[]')
    if (Array.isArray(arr)) applied = arr.filter((s): s is string => typeof s === 'string')
  } catch { applied = [] }
  let changed = false
  for (const { key, profile } of PROFILE_SEEDS) {
    if (applied.includes(profile.id)) continue
    if (!profiles[key].some((p) => p.id === profile.id)) {
      profiles[key] = [...profiles[key], { ...profile, filters: { ...profile.filters } }]
      changed = true
    }
    applied.push(profile.id)
  }
  if (changed) persistBacktestProfiles(profiles)
  try { window.localStorage.setItem(SEEDED_PROFILES_KEY, JSON.stringify(applied)) } catch { void 0 }
  return profiles
}

const newProfileId = () => `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// One-time seeds of recommended backtest profiles (each guarded by its own flag so deleting
// a seeded profile doesn't resurrect it on next load).
const RECOMMENDED_SEEDS: { flag: string; key: StrategyEditorKey; name: string; overrides: Partial<FilterSettings> }[] = [
  {
    // BB Stoch S/D: loosens the rarest default gate (reversal candle) and widens the RSI
    // bands slightly so the strategy actually fires, while keeping the zone + BB-reject +
    // stoch-cross + range-regime core intact. Best on 15m–1h.
    flag: 'bbssdRecommendedSeeded_v1',
    key: 'bbssd',
    name: 'Recommended 15m-1h',
    overrides: {
      // Core kept ON: S/D zone (with OB/FVG fallback), BB tag+reject, stoch cross, ADX range gate.
      // Reversal candle demands a hammer/engulfing on the exact signal bar — the rarest gate and
      // redundant next to BB-reject + stoch-cross. Off for a tradeable signal rate.
      bbssdRequireReversalCandle: false,
      // Range regime, slightly more permissive than the 22 default.
      bbssdUseMaxAdx: true,
      bbssdMaxAdx: 25,
      // Wider RSI windows (defaults 30-45 / 55-70 clip too many valid reversion entries).
      bbssdRsiLongMin: 25,
      bbssdRsiLongMax: 50,
      bbssdRsiShortMin: 50,
      bbssdRsiShortMax: 75,
      // Gates are already hard ANDs — confluence-count double-gating would only starve it
      // (same trap as Supertrend with minConfluence 4).
      isConfluence: false,
      minQuality: 5,
      // Mean-reversion signals persist several bars; throttle same-direction refires.
      cooldownBars: 6,
    },
  },
  {
    // Elite Retest Reversal: the core trigger (breakout + same-bar retest tag + reversal
    // close) is already the strategy's edge and is rare by construction. The two default-ON
    // gates that starve it are turned off; the genuinely useful bounded-retest gate is
    // turned on; the known-tautological / geometry-contradicting toggles stay off.
    flag: 'errRecommendedSeeded_v1',
    key: 'err',
    name: 'Recommended 15m-1h',
    overrides: {
      // detectOrderBlocks only returns an OB when the CURRENT close breaks the 60-bar
      // extreme — price at a fresh extreme is the opposite of a pullback retest, so this
      // default-ON gate filters FOR the degenerate breakout-chase case and AGAINST the
      // clean retest the strategy is named for.
      filterRequireOrderBlock: false,
      // Default-ON session window (08-11 / 13-17 UTC bar-open) discards ~71% of bars on a
      // 24/7 market and zeroes 1d + 5/6 of 4h entirely. Let the backtest judge all hours.
      filterEliteSession: false,
      // 'medium' silently blocks every bar with ATR < 0.4% of price (quiet majors, low TFs).
      eliteMinVolRegime: 'any',
      // Upper bound on retest staleness: reject retests more than 8 bars after the breakout
      // (late re-entries at worsening R:R were an audit finding). Value set explicitly —
      // the engine reads it without a fallback.
      errRetestMaxBarsEnabled: true,
      errRetestMaxBars: 8,
      // A-grade boost never gates — it only widens TP to 3R/6R when the breakout candle is
      // A-grade (65% body, 2.5x volume). Free upside on the strongest setups.
      errAGradeBoost: true,
      // Known traps kept OFF: errMinRREnabled (tautological — compares two settings, never
      // the market), errStochConfirm (contradicts the setup geometry: %K is almost never
      // oversold 3 bars before a bullish reversal close), errMultiRetest (counts highs in
      // the zone for longs, not retest lows — misfires on clean retests).
      errMinRREnabled: false,
      errStochConfirm: false,
      errMultiRetest: false,
      errAGradeRequired: false,
      // Swing-anchored SL is the setup's edge — keep ATR/structure brackets.
      filterFixedPctSlTp: false,
      isConfluence: false,
      minQuality: 6,
    },
  },
]
const seedRecommendedProfiles = (profiles: BacktestProfiles): BacktestProfiles => {
  if (typeof window === 'undefined') return profiles
  try {
    let next = profiles
    let changed = false
    for (const seed of RECOMMENDED_SEEDS) {
      if (window.localStorage.getItem(seed.flag)) continue
      const profile: BacktestProfile = {
        id: newProfileId(),
        name: seed.name,
        filters: { ...DEFAULT_FILTERS_BY_KEY[seed.key], ...seed.overrides },
      }
      next = { ...next, [seed.key]: [...(next[seed.key] ?? []), profile] }
      window.localStorage.setItem(seed.flag, '1')
      changed = true
    }
    if (changed) persistBacktestProfiles(next)
    return next
  } catch {
    return profiles
  }
}

const filterSettingsFromTerminal = (
  t: ReturnType<typeof loadTerminalSettings>,
  defaults: FilterSettings,
): FilterSettings => ({
  entryModel:              (t?.entryModel              ?? defaults.entryModel) as EntryModel,
  isConfluence:             t?.isConfluence             ?? defaults.isConfluence,
  minConfluence:            t?.minConfluence            ?? defaults.minConfluence,
  minQuality:               t?.minQuality               ?? defaults.minQuality,
  filterBTCAlignment:       t?.filterBTCAlignment       ?? defaults.filterBTCAlignment,
  filterHTFAlignment:       t?.filterHTFAlignment       ?? defaults.filterHTFAlignment,
  filterEntryConfirmation:  t?.filterEntryConfirmation  ?? defaults.filterEntryConfirmation,
  filterADXRegime:          t?.filterADXRegime          ?? defaults.filterADXRegime,
  filterVolumeConfirmation: t?.filterVolumeConfirmation ?? defaults.filterVolumeConfirmation,
  filterKeyLevelDistance:   t?.filterKeyLevelDistance   ?? defaults.filterKeyLevelDistance,
  keyLevelMaxDistancePct:   t?.keyLevelMaxDistancePct   ?? defaults.keyLevelMaxDistancePct,
  minVolumeRatio:           t?.minVolumeRatio           ?? defaults.minVolumeRatio,
  filterRetestConfirmation: t?.filterRetestConfirmation ?? defaults.filterRetestConfirmation,
  filterAtrEntryBuffer:     t?.filterAtrEntryBuffer     ?? defaults.filterAtrEntryBuffer,
  entryAtrBufferAtrMult:    t?.entryAtrBufferAtrMult    ?? defaults.entryAtrBufferAtrMult,
  filterStrongClose:        t?.filterStrongClose        ?? defaults.filterStrongClose,
  strongCloseBodyPct:       t?.strongCloseBodyPct       ?? defaults.strongCloseBodyPct,
  filterAvoidOppKeyLevel:   t?.filterAvoidOppKeyLevel   ?? defaults.filterAvoidOppKeyLevel,
  filterCooldown:           t?.filterCooldown           ?? defaults.filterCooldown,
  cooldownBars:             t?.cooldownBars             ?? defaults.cooldownBars,
  filterRequireOrderBlock:  t?.filterRequireOrderBlock  ?? defaults.filterRequireOrderBlock,
  filterFVG:                t?.filterFVG                ?? defaults.filterFVG,
  filterPapRequireRetest:   t?.filterPapRequireRetest   ?? defaults.filterPapRequireRetest,
  filterEliteSession:       t?.filterEliteSession       ?? defaults.filterEliteSession,
  filterCmSession:          t?.filterCmSession          ?? defaults.filterCmSession,
  filterLiquiditySweep:     t?.filterLiquiditySweep     ?? defaults.filterLiquiditySweep,
  filterEliteRequireRetest: t?.filterEliteRequireRetest ?? defaults.filterEliteRequireRetest,
  filterEliteHTFEMA:        t?.filterEliteHTFEMA        ?? defaults.filterEliteHTFEMA,
  filterEliteMaxEmaDistance:t?.filterEliteMaxEmaDistance ?? defaults.filterEliteMaxEmaDistance,
  filterFixedPctSlTp:       t?.filterFixedPctSlTp       ?? defaults.filterFixedPctSlTp,
  fixedSlPct:               t?.fixedSlPct               ?? defaults.fixedSlPct,
  fixedTpPct:               t?.fixedTpPct               ?? defaults.fixedTpPct,
  eliteMinVolRegime:        (t?.eliteMinVolRegime        ?? defaults.eliteMinVolRegime) as 'any' | 'medium' | 'high',
  filterIFVG:               t?.filterIFVG               ?? defaults.filterIFVG,
  filterCisdRetest:         t?.filterCisdRetest         ?? defaults.filterCisdRetest,
  filterClearTarget:        t?.filterClearTarget        ?? defaults.filterClearTarget,
  filterHtfEma50:           t?.filterHtfEma50           ?? defaults.filterHtfEma50,
  errAGradeBoost:           t?.errAGradeBoost           ?? defaults.errAGradeBoost,
  errStochConfirm:          t?.errStochConfirm          ?? defaults.errStochConfirm,
  errHtfEma200:             t?.errHtfEma200             ?? defaults.errHtfEma200,
  errMultiRetest:           t?.errMultiRetest           ?? defaults.errMultiRetest,
  errAGradeRequired:        t?.errAGradeRequired        ?? defaults.errAGradeRequired,
  errHtfEma50Required:      t?.errHtfEma50Required      ?? defaults.errHtfEma50Required,
  errMinRREnabled:          t?.errMinRREnabled          ?? defaults.errMinRREnabled,
  errMinRR:                 t?.errMinRR                 ?? defaults.errMinRR,
  errRetestMaxBarsEnabled:  t?.errRetestMaxBarsEnabled  ?? defaults.errRetestMaxBarsEnabled,
  errRetestMaxBars:         t?.errRetestMaxBars         ?? defaults.errRetestMaxBars,
  errReversalBodyMinPct:    t?.errReversalBodyMinPct    ?? defaults.errReversalBodyMinPct,
  errRetestAtrTolMult:      t?.errRetestAtrTolMult      ?? defaults.errRetestAtrTolMult,
  errStochOS:               t?.errStochOS               ?? defaults.errStochOS,
  errStochOB:               t?.errStochOB               ?? defaults.errStochOB,
  errMultiRetestLookbackBars: t?.errMultiRetestLookbackBars ?? defaults.errMultiRetestLookbackBars,
  errMultiRetestMinTouches: t?.errMultiRetestMinTouches ?? defaults.errMultiRetestMinTouches,
  errAGradeBodyMinPct:      t?.errAGradeBodyMinPct      ?? defaults.errAGradeBodyMinPct,
  errAGradeVolMinMult:      t?.errAGradeVolMinMult      ?? defaults.errAGradeVolMinMult,
  errTp1MultDefault:        t?.errTp1MultDefault        ?? defaults.errTp1MultDefault,
  errTp2MultDefault:        t?.errTp2MultDefault        ?? defaults.errTp2MultDefault,
  errTp1MultBoost:          t?.errTp1MultBoost          ?? defaults.errTp1MultBoost,
  errTp2MultBoost:          t?.errTp2MultBoost          ?? defaults.errTp2MultBoost,
  ecbAGradeBodyMinPctHighVol: t?.ecbAGradeBodyMinPctHighVol ?? defaults.ecbAGradeBodyMinPctHighVol,
  ecbAGradeBodyMinPctOther:  t?.ecbAGradeBodyMinPctOther  ?? defaults.ecbAGradeBodyMinPctOther,
  ecbAGradeVolMinMult:       t?.ecbAGradeVolMinMult       ?? defaults.ecbAGradeVolMinMult,
  ecbBGradeBodyMinPctMedium: t?.ecbBGradeBodyMinPctMedium ?? defaults.ecbBGradeBodyMinPctMedium,
  ecbBGradeBodyMinPctOther:  t?.ecbBGradeBodyMinPctOther  ?? defaults.ecbBGradeBodyMinPctOther,
  ecbBGradeVolMinMultMedium: t?.ecbBGradeVolMinMultMedium ?? defaults.ecbBGradeVolMinMultMedium,
  ecbBGradeVolMinMultOther:  t?.ecbBGradeVolMinMultOther  ?? defaults.ecbBGradeVolMinMultOther,
  ecbRetestAtrTolMult:       t?.ecbRetestAtrTolMult       ?? defaults.ecbRetestAtrTolMult,
  ecbRetestEma20MaxDistPct:  t?.ecbRetestEma20MaxDistPct  ?? defaults.ecbRetestEma20MaxDistPct,
  ecbRetestVolMaxFracOfBreak: t?.ecbRetestVolMaxFracOfBreak ?? defaults.ecbRetestVolMaxFracOfBreak,
  ecbMaxEma50DistanceAtrMult: t?.ecbMaxEma50DistanceAtrMult ?? defaults.ecbMaxEma50DistanceAtrMult,
  ecbMinConsolidBars:         t?.ecbMinConsolidBars         ?? defaults.ecbMinConsolidBars,
  ecbRsiLongMinMediumAGrade:  t?.ecbRsiLongMinMediumAGrade  ?? defaults.ecbRsiLongMinMediumAGrade,
  ecbRsiLongMinMediumBGrade:  t?.ecbRsiLongMinMediumBGrade  ?? defaults.ecbRsiLongMinMediumBGrade,
  ecbRsiLongMinOther:         t?.ecbRsiLongMinOther         ?? defaults.ecbRsiLongMinOther,
  ecbRsiShortMaxMediumAGrade: t?.ecbRsiShortMaxMediumAGrade ?? defaults.ecbRsiShortMaxMediumAGrade,
  ecbRsiShortMaxMediumBGrade: t?.ecbRsiShortMaxMediumBGrade ?? defaults.ecbRsiShortMaxMediumBGrade,
  ecbRsiShortMaxOther:        t?.ecbRsiShortMaxOther        ?? defaults.ecbRsiShortMaxOther,
  ecbSlAtrMultAGradeHigh:     t?.ecbSlAtrMultAGradeHigh     ?? defaults.ecbSlAtrMultAGradeHigh,
  ecbSlAtrMultAGradeOther:    t?.ecbSlAtrMultAGradeOther    ?? defaults.ecbSlAtrMultAGradeOther,
  ecbSlAtrMultBGrade:         t?.ecbSlAtrMultBGrade         ?? defaults.ecbSlAtrMultBGrade,
  ecbTp1RRMultAGradeHigh:     t?.ecbTp1RRMultAGradeHigh     ?? defaults.ecbTp1RRMultAGradeHigh,
  ecbTp1RRMultAGradeOther:    t?.ecbTp1RRMultAGradeOther    ?? defaults.ecbTp1RRMultAGradeOther,
  ecbTp1RRMultBGradeMedium:   t?.ecbTp1RRMultBGradeMedium   ?? defaults.ecbTp1RRMultBGradeMedium,
  ecbTp1RRMultBGradeOther:    t?.ecbTp1RRMultBGradeOther    ?? defaults.ecbTp1RRMultBGradeOther,
  ecbMeasuredMoveMinAtrMult:  t?.ecbMeasuredMoveMinAtrMult  ?? defaults.ecbMeasuredMoveMinAtrMult,
  ecbTp2ExtraRR:              t?.ecbTp2ExtraRR              ?? defaults.ecbTp2ExtraRR,
  ecbMaxBreakCandleRangeAtrMult: t?.ecbMaxBreakCandleRangeAtrMult ?? defaults.ecbMaxBreakCandleRangeAtrMult,
  ecbBreakClosePosBullMinPct:    t?.ecbBreakClosePosBullMinPct    ?? defaults.ecbBreakClosePosBullMinPct,
  ecbBreakClosePosBearMaxPct:    t?.ecbBreakClosePosBearMaxPct    ?? defaults.ecbBreakClosePosBearMaxPct,
  brMinAtrPct:              t?.brMinAtrPct              ?? defaults.brMinAtrPct,
  brMaxRangeAtrMult:        t?.brMaxRangeAtrMult        ?? defaults.brMaxRangeAtrMult,
  brEmaSlopeLookback:       t?.brEmaSlopeLookback       ?? defaults.brEmaSlopeLookback,
  brAdxMin:                 t?.brAdxMin                 ?? defaults.brAdxMin,
  fgUseADX:                 t?.fgUseADX                 ?? defaults.fgUseADX                 ?? false,
  fgAdxMin:                 t?.fgAdxMin                 ?? defaults.fgAdxMin                 ?? 22,
  fgUseStructure:           t?.fgUseStructure           ?? defaults.fgUseStructure           ?? true,
  fgStructureTolAtrMult:    t?.fgStructureTolAtrMult    ?? defaults.fgStructureTolAtrMult    ?? 0.25,
  fgUseMomentum:            t?.fgUseMomentum            ?? defaults.fgUseMomentum            ?? true,
  fgUseRsiDivergence:       t?.fgUseRsiDivergence       ?? defaults.fgUseRsiDivergence       ?? false,
  fgUseStochCross:          t?.fgUseStochCross          ?? defaults.fgUseStochCross          ?? true,
  fgUseVolume:              t?.fgUseVolume              ?? defaults.fgUseVolume              ?? true,
  fgMinVolumeRatio:         t?.fgMinVolumeRatio         ?? defaults.fgMinVolumeRatio         ?? 1.5,
  fgRequireVolumeExpanding: t?.fgRequireVolumeExpanding ?? defaults.fgRequireVolumeExpanding ?? false,
  fgUseHTFAlign:            t?.fgUseHTFAlign            ?? defaults.fgUseHTFAlign            ?? true,
  fgBaseLenLong:            t?.fgBaseLenLong            ?? defaults.fgBaseLenLong            ?? 34,
  fgBaseLenShort:           t?.fgBaseLenShort           ?? defaults.fgBaseLenShort           ?? 34,
  fgGuideEmaLen:            t?.fgGuideEmaLen            ?? defaults.fgGuideEmaLen            ?? 20,
  fgVolLen:                 t?.fgVolLen                 ?? defaults.fgVolLen                 ?? 20,
  fgPersLen:                t?.fgPersLen                ?? defaults.fgPersLen                ?? 10,
  fgCurvLen:                t?.fgCurvLen                ?? defaults.fgCurvLen                ?? 20,
  fgThresholdKLong:         t?.fgThresholdKLong         ?? defaults.fgThresholdKLong         ?? 1.0,
  fgThresholdKShort:        t?.fgThresholdKShort        ?? defaults.fgThresholdKShort        ?? 1.0,
  fgUseCross:               t?.fgUseCross               ?? defaults.fgUseCross               ?? true,
  fgPresetVersion:          t?.fgPresetVersion          ?? defaults.fgPresetVersion          ?? 1,
  fgUseSession:             t?.fgUseSession             ?? defaults.fgUseSession             ?? false,
  fgSessionStartUtc:        t?.fgSessionStartUtc        ?? defaults.fgSessionStartUtc        ?? 8,
  fgSessionEndUtc:          t?.fgSessionEndUtc          ?? defaults.fgSessionEndUtc          ?? 12,
  fgStochExtreme:           t?.fgStochExtreme           ?? defaults.fgStochExtreme           ?? false,
  fgStochOS:                t?.fgStochOS                ?? defaults.fgStochOS                ?? 30,
  fgStochOB:                t?.fgStochOB                ?? defaults.fgStochOB                ?? 70,
  fgUseCost:                t?.fgUseCost                ?? defaults.fgUseCost                ?? false,
  fgUseExecution:           t?.fgUseExecution           ?? defaults.fgUseExecution           ?? false,
  bbssdLength:              defaults.bbssdLength,
  bbssdStdDev:              defaults.bbssdStdDev,
  bbssdStochK:              defaults.bbssdStochK,
  bbssdStochD:              defaults.bbssdStochD,
  bbssdStochSmooth:         defaults.bbssdStochSmooth,
  bbssdStochOS:             defaults.bbssdStochOS,
  bbssdStochOB:             defaults.bbssdStochOB,
  bbssdLookbackBars:        defaults.bbssdLookbackBars,
  bbssdRequireZone:         defaults.bbssdRequireZone,
  bbssdZoneFreshOnly:       defaults.bbssdZoneFreshOnly,
  bbssdRequireBBTag:        defaults.bbssdRequireBBTag,
  bbssdRequireBBReject:     defaults.bbssdRequireBBReject,
  bbssdRequireStochCross:   defaults.bbssdRequireStochCross,
  bbssdRequireReversalCandle: defaults.bbssdRequireReversalCandle,
  bbssdHtfEma200:           defaults.bbssdHtfEma200,
  bbssdUseMaxAdx:           defaults.bbssdUseMaxAdx,
  bbssdMaxAdx:              defaults.bbssdMaxAdx,
  bbssdUseVolume:           defaults.bbssdUseVolume,
  bbssdMinVolumeRatio:      defaults.bbssdMinVolumeRatio,
  bbssdZoneTolAtrMult:      defaults.bbssdZoneTolAtrMult,
  bbssdMinLegAtr:           defaults.bbssdMinLegAtr,
  bbssdRsiLongMin:          defaults.bbssdRsiLongMin,
  bbssdRsiLongMax:          defaults.bbssdRsiLongMax,
  bbssdRsiShortMin:         defaults.bbssdRsiShortMin,
  bbssdRsiShortMax:         defaults.bbssdRsiShortMax,
  bbssdFreshZonesOnly:      defaults.bbssdFreshZonesOnly,
  bbssdRequireRsiDiv:       defaults.bbssdRequireRsiDiv,
  bbssdAllowObFvgFallback:  defaults.bbssdAllowObFvgFallback,
  bbssdRevWickPct:          defaults.bbssdRevWickPct,
  bbssdRequireEntryConfirm: defaults.bbssdRequireEntryConfirm,
  bbssdRequireLiqSweep:     defaults.bbssdRequireLiqSweep,
})

const flatFromFilters = (f: FilterSettings) => ({
  entryModel:              f.entryModel,
  isConfluence:             f.isConfluence,
  minConfluence:            f.minConfluence,
  minQuality:               f.minQuality,
  filterBTCAlignment:       f.filterBTCAlignment,
  filterHTFAlignment:       f.filterHTFAlignment,
  filterEntryConfirmation:  f.filterEntryConfirmation,
  filterADXRegime:          f.filterADXRegime,
  filterVolumeConfirmation: f.filterVolumeConfirmation,
  filterKeyLevelDistance:   f.filterKeyLevelDistance,
  keyLevelMaxDistancePct:   f.keyLevelMaxDistancePct,
  minVolumeRatio:           f.minVolumeRatio,
  filterRetestConfirmation: f.filterRetestConfirmation,
  filterAtrEntryBuffer:     f.filterAtrEntryBuffer,
  entryAtrBufferAtrMult:    f.entryAtrBufferAtrMult,
  filterStrongClose:        f.filterStrongClose,
  strongCloseBodyPct:       f.strongCloseBodyPct,
  filterAvoidOppKeyLevel:   f.filterAvoidOppKeyLevel,
  filterCooldown:           f.filterCooldown,
  cooldownBars:             f.cooldownBars,
  filterRequireOrderBlock:  f.filterRequireOrderBlock,
  filterFVG:                f.filterFVG,
  filterPapRequireRetest:   f.filterPapRequireRetest,
  filterEliteSession:       f.filterEliteSession,
  filterCmSession:          f.filterCmSession,
  filterLiquiditySweep:     f.filterLiquiditySweep,
  filterEliteRequireRetest: f.filterEliteRequireRetest,
  filterEliteHTFEMA:        f.filterEliteHTFEMA,
  filterEliteMaxEmaDistance:f.filterEliteMaxEmaDistance,
  filterFixedPctSlTp:       f.filterFixedPctSlTp,
  fixedSlPct:               f.fixedSlPct,
  fixedTpPct:               f.fixedTpPct,
  eliteMinVolRegime:        f.eliteMinVolRegime,
  filterIFVG:               f.filterIFVG,
  filterCisdRetest:         f.filterCisdRetest,
  filterClearTarget:        f.filterClearTarget,
  filterHtfEma50:           f.filterHtfEma50,
  errAGradeBoost:           f.errAGradeBoost,
  errStochConfirm:          f.errStochConfirm,
  errHtfEma200:             f.errHtfEma200,
  errMultiRetest:           f.errMultiRetest,
  errAGradeRequired:        f.errAGradeRequired,
  errHtfEma50Required:      f.errHtfEma50Required,
  errMinRREnabled:          f.errMinRREnabled,
  errMinRR:                 f.errMinRR,
  errRetestMaxBarsEnabled:  f.errRetestMaxBarsEnabled,
  errRetestMaxBars:         f.errRetestMaxBars,
  errReversalBodyMinPct:    f.errReversalBodyMinPct,
  errRetestAtrTolMult:      f.errRetestAtrTolMult,
  errStochOS:               f.errStochOS,
  errStochOB:               f.errStochOB,
  errMultiRetestLookbackBars: f.errMultiRetestLookbackBars,
  errMultiRetestMinTouches: f.errMultiRetestMinTouches,
  errAGradeBodyMinPct:      f.errAGradeBodyMinPct,
  errAGradeVolMinMult:      f.errAGradeVolMinMult,
  errTp1MultDefault:        f.errTp1MultDefault,
  errTp2MultDefault:        f.errTp2MultDefault,
  errTp1MultBoost:          f.errTp1MultBoost,
  errTp2MultBoost:          f.errTp2MultBoost,
  ecbAGradeBodyMinPctHighVol: f.ecbAGradeBodyMinPctHighVol,
  ecbAGradeBodyMinPctOther:  f.ecbAGradeBodyMinPctOther,
  ecbAGradeVolMinMult:       f.ecbAGradeVolMinMult,
  ecbBGradeBodyMinPctMedium: f.ecbBGradeBodyMinPctMedium,
  ecbBGradeBodyMinPctOther:  f.ecbBGradeBodyMinPctOther,
  ecbBGradeVolMinMultMedium: f.ecbBGradeVolMinMultMedium,
  ecbBGradeVolMinMultOther:  f.ecbBGradeVolMinMultOther,
  ecbRetestAtrTolMult:       f.ecbRetestAtrTolMult,
  ecbRetestEma20MaxDistPct:  f.ecbRetestEma20MaxDistPct,
  ecbRetestVolMaxFracOfBreak: f.ecbRetestVolMaxFracOfBreak,
  ecbMaxEma50DistanceAtrMult: f.ecbMaxEma50DistanceAtrMult,
  ecbMinConsolidBars:         f.ecbMinConsolidBars,
  ecbRsiLongMinMediumAGrade:  f.ecbRsiLongMinMediumAGrade,
  ecbRsiLongMinMediumBGrade:  f.ecbRsiLongMinMediumBGrade,
  ecbRsiLongMinOther:         f.ecbRsiLongMinOther,
  ecbRsiShortMaxMediumAGrade: f.ecbRsiShortMaxMediumAGrade,
  ecbRsiShortMaxMediumBGrade: f.ecbRsiShortMaxMediumBGrade,
  ecbRsiShortMaxOther:        f.ecbRsiShortMaxOther,
  ecbSlAtrMultAGradeHigh:     f.ecbSlAtrMultAGradeHigh,
  ecbSlAtrMultAGradeOther:    f.ecbSlAtrMultAGradeOther,
  ecbSlAtrMultBGrade:         f.ecbSlAtrMultBGrade,
  ecbTp1RRMultAGradeHigh:     f.ecbTp1RRMultAGradeHigh,
  ecbTp1RRMultAGradeOther:    f.ecbTp1RRMultAGradeOther,
  ecbTp1RRMultBGradeMedium:   f.ecbTp1RRMultBGradeMedium,
  ecbTp1RRMultBGradeOther:    f.ecbTp1RRMultBGradeOther,
  ecbMeasuredMoveMinAtrMult:  f.ecbMeasuredMoveMinAtrMult,
  ecbTp2ExtraRR:              f.ecbTp2ExtraRR,
  ecbMaxBreakCandleRangeAtrMult: f.ecbMaxBreakCandleRangeAtrMult,
  ecbBreakClosePosBullMinPct:    f.ecbBreakClosePosBullMinPct,
  ecbBreakClosePosBearMaxPct:    f.ecbBreakClosePosBearMaxPct,
  brMinAtrPct:              f.brMinAtrPct,
  brMaxRangeAtrMult:        f.brMaxRangeAtrMult,
  brEmaSlopeLookback:       f.brEmaSlopeLookback,
  brAdxMin:                 f.brAdxMin,
  fgUseADX:                 f.fgUseADX,
  fgAdxMin:                 f.fgAdxMin,
  fgUseStructure:           f.fgUseStructure,
  fgStructureTolAtrMult:    f.fgStructureTolAtrMult,
  fgUseMomentum:            f.fgUseMomentum,
  fgUseRsiDivergence:       f.fgUseRsiDivergence,
  fgUseStochCross:          f.fgUseStochCross,
  fgUseVolume:              f.fgUseVolume,
  fgMinVolumeRatio:         f.fgMinVolumeRatio,
  fgRequireVolumeExpanding: f.fgRequireVolumeExpanding,
  fgUseHTFAlign:            f.fgUseHTFAlign,
  fgBaseLenLong:            f.fgBaseLenLong,
  fgBaseLenShort:           f.fgBaseLenShort,
  fgGuideEmaLen:            f.fgGuideEmaLen,
  fgVolLen:                 f.fgVolLen,
  fgPersLen:                f.fgPersLen,
  fgCurvLen:                f.fgCurvLen,
  fgThresholdKLong:         f.fgThresholdKLong,
  fgThresholdKShort:        f.fgThresholdKShort,
  fgUseCross:               f.fgUseCross,
  fgPresetVersion:          f.fgPresetVersion,
  fgUseSession:             f.fgUseSession,
  fgSessionStartUtc:        f.fgSessionStartUtc,
  fgSessionEndUtc:          f.fgSessionEndUtc,
  fgStochExtreme:           f.fgStochExtreme,
  fgStochOS:                f.fgStochOS,
  fgStochOB:                f.fgStochOB,
  fgUseCost:                f.fgUseCost,
  fgUseExecution:           f.fgUseExecution,
  stPresetVersion:          f.stPresetVersion,
  stAtrPeriod:              f.stAtrPeriod,
  stAtrMult:                f.stAtrMult,
  stUseRelVol:              f.stUseRelVol,
  stRelVolLen:              f.stRelVolLen,
  stRelVolMin:              f.stRelVolMin,
  stRequireFlip:            f.stRequireFlip,
  stUseKernel:              f.stUseKernel,
  stKernelLookback:         f.stKernelLookback,
  stKernelBandwidth:        f.stKernelBandwidth,
  stUseHTFAlign:            f.stUseHTFAlign,
  stHtfEmaLen:              f.stHtfEmaLen,
  stUseHtfEmaSlope:         f.stUseHtfEmaSlope,
  stHtfEmaSlopeLookback:    f.stHtfEmaSlopeLookback,
  stHtfEmaSlopeMinPctPerBar:f.stHtfEmaSlopeMinPctPerBar,
  stUseAdx:                 f.stUseAdx,
  stAdxPeriod:              f.stAdxPeriod,
  stAdxMin:                 f.stAdxMin,
  stUseDiAlign:             f.stUseDiAlign,
  stDiPeriod:               f.stDiPeriod,
  stUseManualSlTp:          f.stUseManualSlTp,
  stManualSlPct:            f.stManualSlPct,
  stManualTp1Pct:           f.stManualTp1Pct,
  stManualTp2Pct:           f.stManualTp2Pct,
  stUseEmaDistance:         f.stUseEmaDistance,
  stEmaDistAtrMin:          f.stEmaDistAtrMin,
  stUseImpulse:             f.stUseImpulse,
  stImpulseBodyMinPct:      f.stImpulseBodyMinPct,
  stImpulseWickMaxPct:      f.stImpulseWickMaxPct,
  stUseKdeRegime:           f.stUseKdeRegime,
  stKdeRegimeLookback:      f.stKdeRegimeLookback,
  stKdeRegimeBandwidth:     f.stKdeRegimeBandwidth,
  stKdeRegimeMaxConcentration: f.stKdeRegimeMaxConcentration,
  stUseKdeValueArea:        f.stUseKdeValueArea,
  stKdeValueAreaLookback:   f.stKdeValueAreaLookback,
  stKdeValueAreaBandwidth:  f.stKdeValueAreaBandwidth,
  stKdeValueAreaMaxDensity: f.stKdeValueAreaMaxDensity,
  bbssdLength:              f.bbssdLength,
  bbssdStdDev:              f.bbssdStdDev,
  bbssdStochK:              f.bbssdStochK,
  bbssdStochD:              f.bbssdStochD,
  bbssdStochSmooth:         f.bbssdStochSmooth,
  bbssdStochOS:             f.bbssdStochOS,
  bbssdStochOB:             f.bbssdStochOB,
  bbssdLookbackBars:        f.bbssdLookbackBars,
  bbssdRequireZone:         f.bbssdRequireZone,
  bbssdZoneFreshOnly:       f.bbssdZoneFreshOnly,
  bbssdRequireBBTag:        f.bbssdRequireBBTag,
  bbssdRequireBBReject:     f.bbssdRequireBBReject,
  bbssdRequireStochCross:   f.bbssdRequireStochCross,
  bbssdRequireReversalCandle: f.bbssdRequireReversalCandle,
  bbssdHtfEma200:           f.bbssdHtfEma200,
  bbssdUseMaxAdx:           f.bbssdUseMaxAdx,
  bbssdMaxAdx:              f.bbssdMaxAdx,
  bbssdUseVolume:           f.bbssdUseVolume,
  bbssdMinVolumeRatio:      f.bbssdMinVolumeRatio,
  bbssdZoneTolAtrMult:      f.bbssdZoneTolAtrMult,
  bbssdMinLegAtr:           f.bbssdMinLegAtr,
  bbssdRsiLongMin:          f.bbssdRsiLongMin,
  bbssdRsiLongMax:          f.bbssdRsiLongMax,
  bbssdRsiShortMin:         f.bbssdRsiShortMin,
  bbssdRsiShortMax:         f.bbssdRsiShortMax,
  bbssdFreshZonesOnly:      f.bbssdFreshZonesOnly,
  bbssdRequireRsiDiv:       f.bbssdRequireRsiDiv,
  bbssdAllowObFvgFallback:  f.bbssdAllowObFvgFallback,
  bbssdRevWickPct:          f.bbssdRevWickPct,
  bbssdRequireEntryConfirm: f.bbssdRequireEntryConfirm,
  bbssdRequireLiqSweep:     f.bbssdRequireLiqSweep,
})

type TradingState = {
  symbol: string
  timeframe: string
  symbols: string[]
  confluenceLabel: 'STRONG BUY' | 'BUY' | 'SELL' | 'STRONG SELL' | 'NEUTRAL'
  confluenceSmartPct: number
  confluenceAgreeText: string
  confluenceRows: ConfluenceRow[]
  signals: SignalRow[]
  signalLog: SignalRow[]
  price: number
  priceChange: number
  exchange: 'binance' | 'bybit'
  geminiApiKey: string
  regime: string
  regimeScores: RegimeScores
  insights: AIInsight[]
  metrics: MarketMetrics
  zones: SDZone[]
  indicatorTable: IndicatorRow[]
  selectedStrategy: string
  enabledStrategies: string[]
  autoBest: AutoBest
  isAutoStrategy: boolean
  entryModel: EntryModel
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
  errAGradeBoost: boolean
  errStochConfirm: boolean
  errHtfEma200: boolean
  errMultiRetest: boolean
  errAGradeRequired: boolean
  errHtfEma50Required: boolean
  errMinRREnabled: boolean
  errMinRR: number
  errRetestMaxBarsEnabled: boolean
  errRetestMaxBars: number
  errReversalBodyMinPct: number
  errRetestAtrTolMult: number
  errStochOS: number
  errStochOB: number
  errMultiRetestLookbackBars: number
  errMultiRetestMinTouches: number
  errAGradeBodyMinPct: number
  errAGradeVolMinMult: number
  errTp1MultDefault: number
  errTp2MultDefault: number
  errTp1MultBoost: number
  errTp2MultBoost: number
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
  brMinAtrPct?: number
  brMaxRangeAtrMult?: number
  brEmaSlopeLookback?: number
  brAdxMin?: number
  fgUseADX?: boolean
  fgAdxMin?: number
  fgUseStructure?: boolean
  fgStructureTolAtrMult?: number
  fgUseMomentum?: boolean
  fgUseRsiDivergence?: boolean
  fgUseStochCross?: boolean
  fgUseVolume?: boolean
  fgMinVolumeRatio?: number
  fgRequireVolumeExpanding?: boolean
  fgUseHTFAlign?: boolean
  fgBaseLenLong?: number
  fgBaseLenShort?: number
  fgGuideEmaLen?: number
  fgVolLen?: number
  fgPersLen?: number
  fgCurvLen?: number
  fgThresholdKLong?: number
  fgThresholdKShort?: number
  fgUseCross?: boolean
  fgPresetVersion?: number
  fgUseSession?: boolean
  fgSessionStartUtc?: number
  fgSessionEndUtc?: number
  fgStochExtreme?: boolean
  fgStochOS?: number
  fgStochOB?: number
  fgUseCost?: boolean
  fgUseExecution?: boolean
  stPresetVersion?: number
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
  bbssdUseMaxAdx?: boolean
  bbssdMaxAdx?: number
  bbssdUseVolume?: boolean
  bbssdMinVolumeRatio?: number
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
  lastSignalTimeSec: number | null
  lastSignalDirection: 'buy' | 'sell' | null
  ecbFilters: FilterSettings
  errFilters: FilterSettings
  brFilters: FilterSettings
  cmFilters: FilterSettings
  fgFilters: FilterSettings
  sqzFilters: FilterSettings
  stFilters: FilterSettings
  bbssdFilters: FilterSettings
  backtestProfiles: BacktestProfiles
  appendedCoins: string[]
  filterBlockCounts: Record<FilterBlockKey, number>
  scannerTimeframes: string[]
  scannerNearEntryOnly: boolean
  scannerNearEntryPct: number
  scannerContinuousScan: boolean
  scannerStopOnFirstSignal: boolean
  scannerIntervalSec: number
  scannerStrategy: string
  scannerRunning: boolean
  scannerProgress: { done: number; total: number }
  scannerResults: ScannerResultRow[]
  scannerRunNonce: number
  tradeSetup: {
    entry: number
    sl: number
    slPct: number
    tp1: number
    tp1Pct: number
    tp2: number
    tp2Pct: number
  } | null

  chartResetNonce: number
  analysisRunNonce: number

  setSignals: (signals: SignalRow[]) => void
  appendSignalLog: (signals: SignalRow[]) => void
  setLastSignalMeta: (meta: { timeSec: number; direction: 'buy' | 'sell' } | null) => void
  addFilterBlocks: (delta: Partial<Record<FilterBlockKey, number>>) => void
  resetFilterBlocks: () => void
  setScannerSettings: (
    settings: Partial<
      Pick<
        TradingState,
        | 'scannerTimeframes'
        | 'scannerNearEntryOnly'
        | 'scannerNearEntryPct'
        | 'scannerContinuousScan'
        | 'scannerStopOnFirstSignal'
        | 'scannerIntervalSec'
        | 'scannerStrategy'
      >
    >,
  ) => void
  startScanner: () => void
  stopScanner: () => void
  setScannerProgress: (progress: { done: number; total: number }) => void
  addScannerResults: (results: Omit<ScannerResultRow, 'detectedAt'>[]) => void
  clearScannerResults: () => void
  setConfluence: (data: Pick<TradingState, 'confluenceLabel' | 'confluenceAgreeText' | 'confluenceSmartPct'>) => void
  setConfluenceRows: (rows: ConfluenceRow[]) => void
  
  setSymbol: (symbol: string) => void
  setSymbols: (symbols: string[]) => void
  setTimeframe: (timeframe: string) => void
  setPrice: (price: number, priceChange: number, extra?: { vol24h?: string; mktCap?: string }) => void
  setExchange: (exchange: 'binance' | 'bybit') => void
  setGeminiApiKey: (key: string) => void
  setRegime: (regime: string, scores: RegimeScores) => void
  setInsights: (insights: AIInsight[]) => void
  setMetrics: (metrics: MarketMetrics) => void
  setZones: (zones: SDZone[]) => void
  setIndicatorTable: (table: IndicatorRow[]) => void
  setStrategy: (strategy: string) => void
  setStrategyFilters: (key: 'ecb' | 'err' | 'br' | 'cm' | 'fg' | 'st' | 'bbssd' | 'sqz', filters: FilterSettings) => void
  // Backtest-only profile CRUD (never affects live filters/scanner)
  addBacktestProfile: (key: StrategyEditorKey, name?: string) => void
  updateBacktestProfile: (key: StrategyEditorKey, id: string, patch: Partial<Pick<BacktestProfile, 'name' | 'filters'>>) => void
  deleteBacktestProfile: (key: StrategyEditorKey, id: string) => void
  duplicateBacktestProfile: (key: StrategyEditorKey, id: string) => void
  // Shared appended-coins list (curated from backtest results, add-only, deduped)
  appendCoins: (coins: string[]) => void
  clearAppendedCoins: () => void
  saveEnabledStrategies: (enabledStrategies: string[]) => void
  setAutoBest: (autoBest: AutoBest) => void
  setAutoStrategy: (isAuto: boolean) => void
  setSignalFilters: (filters: Partial<Pick<TradingState, 'isConfluence' | 'minConfluence' | 'minQuality'>>) => void
  setAdvancedFilters: (
    filters: Partial<
      Pick<
        TradingState,
        | 'filterBTCAlignment'
        | 'filterHTFAlignment'
        | 'filterEntryConfirmation'
        | 'filterADXRegime'
        | 'filterVolumeConfirmation'
        | 'filterKeyLevelDistance'
        | 'keyLevelMaxDistancePct'
        | 'minVolumeRatio'
        | 'filterRetestConfirmation'
        | 'filterAtrEntryBuffer'
        | 'entryAtrBufferAtrMult'
        | 'filterStrongClose'
        | 'strongCloseBodyPct'
        | 'filterAvoidOppKeyLevel'
        | 'filterCooldown'
        | 'cooldownBars'
        | 'filterRequireOrderBlock'
        | 'filterFVG'
        | 'filterPapRequireRetest'
        | 'filterEliteSession'
        | 'filterCmSession'
        | 'filterLiquiditySweep'
        | 'filterEliteRequireRetest'
        | 'filterEliteHTFEMA'
        | 'filterEliteMaxEmaDistance'
        | 'filterFixedPctSlTp'
        | 'fixedSlPct'
        | 'fixedTpPct'
        | 'eliteMinVolRegime'
      >
    >,
  ) => void
  setTradeSetup: (setup: TradingState['tradeSetup']) => void

  resetChart: () => void
  runAnalysis: () => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
const enabledFromStorage = loadEnabledStrategies()
const terminalSettingsFromStorage = loadTerminalSettings()
const scannerSettingsFromStorage = loadScannerSettings()
const initialEnabledStrategies = enabledFromStorage ?? [...STRATEGIES]
const initialSelectedStrategy = (() => {
  const maybe = terminalSettingsFromStorage?.selectedStrategy
  if (typeof maybe === 'string' && initialEnabledStrategies.includes(maybe as StrategyName)) return maybe
  return 'Elite Context Breakout'
})()

const strategyFiltersFromStorage = loadStrategyFilters()
const ecbFiltersInit: FilterSettings = strategyFiltersFromStorage?.ecb
  ?? filterSettingsFromTerminal(terminalSettingsFromStorage, DEFAULT_ECB_FILTERS)
const errFiltersInit: FilterSettings = strategyFiltersFromStorage?.err ?? DEFAULT_ERR_FILTERS
const brFiltersInit: FilterSettings = strategyFiltersFromStorage?.br ?? DEFAULT_BR_FILTERS
const cmFiltersInit: FilterSettings = strategyFiltersFromStorage?.cm ?? DEFAULT_CM_FILTERS
const fgFiltersInit: FilterSettings = strategyFiltersFromStorage?.fg ?? DEFAULT_FG_FILTERS
const stFiltersInit: FilterSettings = strategyFiltersFromStorage?.st ?? DEFAULT_ST_FILTERS
const bbssdFiltersInit: FilterSettings = strategyFiltersFromStorage?.bbssd ?? DEFAULT_BBSSD_FILTERS
const sqzFiltersInit: FilterSettings = strategyFiltersFromStorage?.sqz ?? DEFAULT_SQZ_FILTERS
const activeFiltersInit =
  initialSelectedStrategy === 'Elite Retest Reversal'
    ? errFiltersInit
    : initialSelectedStrategy === 'Breakout Retest'
      ? brFiltersInit
      : initialSelectedStrategy === 'Confirmation Model'
        ? cmFiltersInit
        : initialSelectedStrategy === 'FluxGate Dual Engine'
          ? fgFiltersInit
          : initialSelectedStrategy === 'Supertrend + RelVol'
            ? stFiltersInit
          : initialSelectedStrategy === 'BB Stoch S/D'
            ? bbssdFiltersInit
          : initialSelectedStrategy === 'Squeeze Momentum'
            ? sqzFiltersInit
            : ecbFiltersInit

export const useTradingStore = create<TradingState>((set) => ({
  symbol: 'BTCUSDT',
  timeframe: '15m',
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ASTERIODUSDT'],
  confluenceLabel: 'NEUTRAL',
  confluenceSmartPct: 17,
  confluenceAgreeText: '0/6 | w:1.0/5.9 | S:17% | Trending',
  price: 0,
  priceChange: 0,
  exchange: 'binance',
  geminiApiKey: '',
  regime: 'Trending',
  regimeScores: {
    Trending: 45,
    Ranging: 20,
    Choppy: 15,
    Breakout: 12,
    Exhaustion: 8,
  },
  enabledStrategies: initialEnabledStrategies,
  selectedStrategy: initialSelectedStrategy,
  autoBest: {
    strategy: 'Elite Context Breakout',
    winRate: 51,
    profitFactor: 1.5,
    expectancy: '+0.22R',
    state: 'Choppy'
  },
  isAutoStrategy: terminalSettingsFromStorage?.isAutoStrategy ?? true,
  ...flatFromFilters(activeFiltersInit),
  ecbFilters: ecbFiltersInit,
  errFilters: errFiltersInit,
  brFilters: brFiltersInit,
  cmFilters: cmFiltersInit,
  fgFilters: fgFiltersInit,
  stFilters: stFiltersInit,
  bbssdFilters: bbssdFiltersInit,
  sqzFilters: sqzFiltersInit,
  backtestProfiles: seedRecommendedProfiles(loadBacktestProfiles()),
  appendedCoins: loadAppendedCoins(),
  lastSignalTimeSec: null,
  lastSignalDirection: null,
  filterBlockCounts: {
    btcAlignment: 0,
    htfAlignment: 0,
    entryConfirmation: 0,
    retestConfirmation: 0,
    atrEntryBuffer: 0,
    strongClose: 0,
    adxRegime: 0,
    volumeConfirmation: 0,
    keyLevelDistance: 0,
    avoidOppKeyLevel: 0,
    cooldown: 0,
    minQuality: 0,
    minConfluence: 0,
  },
  scannerTimeframes: scannerSettingsFromStorage?.timeframes ?? ['15m'],
  scannerNearEntryOnly: scannerSettingsFromStorage?.nearEntryOnly ?? true,
  scannerNearEntryPct: scannerSettingsFromStorage?.nearEntryPct ?? 0.3,
  scannerContinuousScan: scannerSettingsFromStorage?.continuousScan ?? false,
  scannerStopOnFirstSignal: scannerSettingsFromStorage?.stopOnFirstSignal ?? true,
  scannerIntervalSec: scannerSettingsFromStorage?.scanIntervalSec ?? 30,
  scannerStrategy: scannerSettingsFromStorage?.scanStrategy ?? 'AUTO',
  scannerRunning: false,
  scannerProgress: { done: 0, total: 0 },
  scannerResults: [],
  scannerRunNonce: 0,
  tradeSetup: null,

  chartResetNonce: 0,
  analysisRunNonce: 0,

  insights: [
    { label: 'RSI (14)', value: '64.2', status: 'bullish' },
    { label: 'EMA 20/50', value: 'Bullish', status: 'bullish' },
    { label: 'MACD', value: 'Rising', status: 'bullish' },
    { label: 'ADX (14)', value: '28.5', status: 'bullish' },
    { label: 'BB Width', value: '0.042', status: 'neutral' },
    { label: 'ATR', value: '124.5', status: 'neutral' },
    { label: 'Vol ratio', value: '1.2x', status: 'bullish' },
    { label: 'HTF Bias', value: 'Bullish', status: 'bullish' },
  ],
  metrics: {
    rsi: 44.5,
    ema20: 327.282,
    ema50: 328.327,
    ema200: 330.252,
    macd: 'Bullish',
    direction: 'LONG 4/7 | SHORT 2/7',
    volatility: '0.2%',
    momentum: '-0.29%',
    adx: '22.8',
    adxLabel: 'Weak',
    htfBias: 'MIXED (1 Hour)',
    candle: 'Doji',
    signalQuality: 1,
    overallScore: 'NEUTRAL',
    mktCap: '--',
    vol24h: '10.69M',
    high7d: 326.39,
    low7d: 325.82,
    lastUpdate: hhmm(new Date())
  },
  zones: [
    { name: 'Supply Top', price: 330.789, dist: 1.19, color: 'supply' },
    { name: 'Supply Bot', price: 328.811, dist: 0.58, color: 'supply' },
    { name: 'Demand Top', price: 326.336, dist: -0.18, color: 'demand' },
    { name: 'Demand Bot', price: 324.384, dist: -0.77, color: 'demand' },
  ],
  indicatorTable: [
    { name: 'Direction', value: 'LONG 1/7 |', signal: 'NEUTRAL', color: 'neutral' },
    { name: 'HTF Bias', value: 'Mixed', signal: 'NEUTRAL', color: 'neutral' },
    { name: 'ADX', value: '23~↓', signal: 'SELL', color: 'sell' },
    { name: 'EMA Stack', value: 'Full Bear', signal: 'SELL', color: 'sell' },
    { name: 'RSI', value: '41.0 →', signal: 'NEUTRAL', color: 'neutral' },
    { name: 'MACD', value: '↑ Fade', signal: 'SELL', color: 'sell' },
    { name: 'Volume', value: 'Low', signal: 'NEUTRAL', color: 'neutral' },
    { name: 'Bollinger', value: 'Squeeze', signal: 'NEUTRAL', color: 'neutral' },
    { name: 'Strategy', value: 'BUY (1.0x)', signal: 'BUY', color: 'buy' },
  ],
  confluenceRows: [
    {
      id: 'c1',
      strategy: 'Elite Context Breakout',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c2',
      strategy: 'Elite Retest Reversal',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c3',
      strategy: 'Breakout Retest',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c4',
      strategy: 'Confirmation Model',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c5',
      strategy: 'FluxGate Dual Engine',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c7',
      strategy: 'Supertrend + RelVol',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
    {
      id: 'c6',
      strategy: 'BB Stoch S/D',
      tf: '15m 1h 4h',
      vote: 'neutral',
      perfText: '1.00x —',
    },
  ],
  signals: [],
  signalLog: [],
  setSymbol: (symbol) => set({ symbol, tradeSetup: null, signals: [] }),
  setSymbols: (symbols) => set({ symbols }),
  setTimeframe: (timeframe) => set({ timeframe, tradeSetup: null, signals: [] }),
  setPrice: (price: number, priceChange: number, extra?: { vol24h?: string; mktCap?: string }) => set((s) => ({ 
    price, 
    priceChange,
    metrics: {
      ...s.metrics,
      vol24h: extra?.vol24h || s.metrics.vol24h,
      mktCap: extra?.mktCap || s.metrics.mktCap
    }
  })),
  setExchange: (exchange) => set({ exchange }),
  setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
  setRegime: (regime, scores) => set({ regime, regimeScores: scores }),
  setInsights: (insights) => set({ insights }),
  setMetrics: (metrics) => set({ metrics }),
  setZones: (zones) => set({ zones }),
  setIndicatorTable: (indicatorTable) => set({ indicatorTable }),
  setSignals: (signals) => set({ signals }),
  appendSignalLog: (signals) =>
    set((s) => {
      if (!Array.isArray(signals) || signals.length === 0) return { signalLog: s.signalLog }
      const next = [...s.signalLog]
      for (const sig of signals) {
        if (!sig || typeof sig.id !== 'string') continue
        if (next[0]?.id === sig.id) continue
        const idx = next.findIndex((x) => x.id === sig.id)
        if (idx >= 0) next.splice(idx, 1)
        next.unshift(sig)
      }
      return { signalLog: next.slice(0, 50) }
    }),
  setLastSignalMeta: (meta) =>
    set(() => {
      if (!meta) return { lastSignalTimeSec: null, lastSignalDirection: null }
      return { lastSignalTimeSec: meta.timeSec, lastSignalDirection: meta.direction }
    }),
  addFilterBlocks: (delta) =>
    set((s) => {
      const next = { ...s.filterBlockCounts }
      let changed = false
      for (const k of Object.keys(delta) as FilterBlockKey[]) {
        const v = delta[k]
        if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue
        next[k] = (next[k] ?? 0) + v
        changed = true
      }
      return changed ? { filterBlockCounts: next } : { filterBlockCounts: s.filterBlockCounts }
    }),
  resetFilterBlocks: () =>
    set(() => ({
      filterBlockCounts: {
        btcAlignment: 0,
        htfAlignment: 0,
        entryConfirmation: 0,
        retestConfirmation: 0,
        atrEntryBuffer: 0,
        strongClose: 0,
        adxRegime: 0,
        volumeConfirmation: 0,
        keyLevelDistance: 0,
        avoidOppKeyLevel: 0,
        cooldown: 0,
        minQuality: 0,
        minConfluence: 0,
      },
    })),
  setScannerSettings: (settings) =>
    set((s) => {
      const allowed = new Set(['1m', '5m', '15m', '1h', '4h', '1d'])
      const next = {
        ...s,
        ...settings,
        scannerTimeframes: Array.isArray(settings.scannerTimeframes)
          ? settings.scannerTimeframes.filter((t): t is string => typeof t === 'string' && allowed.has(t))
          : s.scannerTimeframes,
        scannerNearEntryPct:
          typeof settings.scannerNearEntryPct === 'number'
            ? Math.max(0.05, Math.min(5, settings.scannerNearEntryPct))
            : s.scannerNearEntryPct,
        scannerIntervalSec:
          typeof settings.scannerIntervalSec === 'number'
            ? Math.max(5, Math.min(3600, Math.floor(settings.scannerIntervalSec)))
            : s.scannerIntervalSec,
        scannerStrategy:
          typeof settings.scannerStrategy === 'string' && settings.scannerStrategy.length > 0
            ? settings.scannerStrategy
            : s.scannerStrategy,
      }
      persistScannerSettings({
        timeframes: next.scannerTimeframes,
        nearEntryOnly: next.scannerNearEntryOnly,
        nearEntryPct: next.scannerNearEntryPct,
        continuousScan: next.scannerContinuousScan,
        stopOnFirstSignal: next.scannerStopOnFirstSignal,
        scanIntervalSec: next.scannerIntervalSec,
        scanStrategy: next.scannerStrategy,
      })
      return {
        scannerTimeframes: next.scannerTimeframes,
        scannerNearEntryOnly: next.scannerNearEntryOnly,
        scannerNearEntryPct: next.scannerNearEntryPct,
        scannerContinuousScan: next.scannerContinuousScan,
        scannerStopOnFirstSignal: next.scannerStopOnFirstSignal,
        scannerIntervalSec: next.scannerIntervalSec,
        scannerStrategy: next.scannerStrategy,
      }
    }),
  startScanner: () =>
    set((s) => ({
      scannerRunning: true,
      scannerProgress: { done: 0, total: 0 },
      scannerResults: [],
      scannerRunNonce: s.scannerRunNonce + 1,
    })),
  stopScanner: () =>
    set((s) => ({
      scannerRunning: false,
      scannerRunNonce: s.scannerRunNonce + 1,
    })),
  setScannerProgress: (progress) => set({ scannerProgress: progress }),
  addScannerResults: (results: Omit<ScannerResultRow, 'detectedAt'>[]) =>
    set((s) => {
      if (!Array.isArray(results) || results.length === 0) return { scannerResults: s.scannerResults }
      const next = [...s.scannerResults]
      const now = Date.now()
      for (const r of results) {
        if (!r || typeof r.symbol !== 'string') continue
        const key = `${r.symbol}-${r.timeframe}-${r.direction}-${r.strategy}`
        const idx = next.findIndex((x) => `${x.symbol}-${x.timeframe}-${x.direction}-${x.strategy}` === key)
        if (idx >= 0) next.splice(idx, 1)
        next.unshift({ ...r, detectedAt: now })
      }
      return { scannerResults: next.slice(0, 500) }
    }),
  clearScannerResults: () => set({ scannerResults: [] }),
  setConfluence: (data) => set(data),
  setConfluenceRows: (confluenceRows) => set({ confluenceRows }),
  setStrategy: (selectedStrategy) =>
    set((s) => {
      const filters =
        selectedStrategy === 'Elite Retest Reversal'
          ? s.errFilters
          : selectedStrategy === 'Breakout Retest'
            ? s.brFilters
            : selectedStrategy === 'Confirmation Model'
              ? s.cmFilters
            : selectedStrategy === 'FluxGate Dual Engine'
              ? s.fgFilters
              : selectedStrategy === 'Supertrend + RelVol'
                ? s.stFilters
            : selectedStrategy === 'BB Stoch S/D'
              ? s.bbssdFilters
            : selectedStrategy === 'Squeeze Momentum'
              ? s.sqzFilters
              : s.ecbFilters
      const flat = flatFromFilters(filters)
      persistTerminalSettings({ ...flat, isAutoStrategy: s.isAutoStrategy, selectedStrategy })
      return { selectedStrategy, ...flat }
    }),
  setStrategyFilters: (key, filters) =>
    set((s) => {
      const nextEcb = key === 'ecb' ? filters : s.ecbFilters
      const nextErr = key === 'err' ? filters : s.errFilters
      const nextBr = key === 'br' ? filters : s.brFilters
      const nextCm = key === 'cm' ? filters : s.cmFilters
      const nextFg = key === 'fg' ? filters : s.fgFilters
      const nextSt = key === 'st' ? filters : s.stFilters
      const nextBbssd = key === 'bbssd' ? filters : s.bbssdFilters
      const nextSqz = key === 'sqz' ? filters : s.sqzFilters
      persistStrategyFilters(nextEcb, nextErr, nextBr, nextCm, nextFg, nextSt, nextBbssd, nextSqz)
      const isActive =
        (key === 'ecb' && s.selectedStrategy === 'Elite Context Breakout') ||
        (key === 'err' && s.selectedStrategy === 'Elite Retest Reversal') ||
        (key === 'br' && s.selectedStrategy === 'Breakout Retest') ||
        (key === 'cm' && s.selectedStrategy === 'Confirmation Model') ||
        (key === 'fg' && s.selectedStrategy === 'FluxGate Dual Engine') ||
        (key === 'st' && s.selectedStrategy === 'Supertrend + RelVol') ||
        (key === 'bbssd' && s.selectedStrategy === 'BB Stoch S/D') ||
        (key === 'sqz' && s.selectedStrategy === 'Squeeze Momentum')
      if (isActive) {
        const flat = flatFromFilters(filters)
        persistTerminalSettings({ ...flat, isAutoStrategy: s.isAutoStrategy, selectedStrategy: s.selectedStrategy })
        return { ecbFilters: nextEcb, errFilters: nextErr, brFilters: nextBr, cmFilters: nextCm, fgFilters: nextFg, stFilters: nextSt, bbssdFilters: nextBbssd, sqzFilters: nextSqz, ...flat }
      }
      return { ecbFilters: nextEcb, errFilters: nextErr, brFilters: nextBr, cmFilters: nextCm, fgFilters: nextFg, stFilters: nextSt, bbssdFilters: nextBbssd, sqzFilters: nextSqz }
    }),

  // ── Backtest profiles (isolated from live) ──────────────────────────────────
  addBacktestProfile: (key, name) =>
    set((s) => {
      const list = s.backtestProfiles[key] ?? []
      const profile: BacktestProfile = {
        id: newProfileId(),
        name: name?.trim() || `profile ${list.length + 1}`,
        filters: { ...DEFAULT_FILTERS_BY_KEY[key] },   // seed from strategy defaults
      }
      const next = { ...s.backtestProfiles, [key]: [...list, profile] }
      persistBacktestProfiles(next)
      return { backtestProfiles: next }
    }),
  updateBacktestProfile: (key, id, patch) =>
    set((s) => {
      const list = (s.backtestProfiles[key] ?? []).map(p =>
        p.id === id
          ? { ...p, ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.filters ? { filters: patch.filters } : {}) }
          : p,
      )
      const next = { ...s.backtestProfiles, [key]: list }
      persistBacktestProfiles(next)
      return { backtestProfiles: next }
    }),
  deleteBacktestProfile: (key, id) =>
    set((s) => {
      const next = { ...s.backtestProfiles, [key]: (s.backtestProfiles[key] ?? []).filter(p => p.id !== id) }
      persistBacktestProfiles(next)
      return { backtestProfiles: next }
    }),
  duplicateBacktestProfile: (key, id) =>
    set((s) => {
      const list = s.backtestProfiles[key] ?? []
      const src = list.find(p => p.id === id)
      if (!src) return {}
      const copy: BacktestProfile = { id: newProfileId(), name: `${src.name} copy`, filters: { ...src.filters } }
      const next = { ...s.backtestProfiles, [key]: [...list, copy] }
      persistBacktestProfiles(next)
      return { backtestProfiles: next }
    }),

  appendCoins: (coins) =>
    set((s) => {
      // Add-only, deduped, order preserved (existing first, then new).
      const merged = Array.from(new Set([...s.appendedCoins, ...coins.filter(Boolean)]))
      persistAppendedCoins(merged)
      return { appendedCoins: merged }
    }),
  clearAppendedCoins: () =>
    set(() => {
      persistAppendedCoins([])
      return { appendedCoins: [] }
    }),

  saveEnabledStrategies: (enabledStrategies) =>
    set((s) => {
      const enabledSet = new Set(
        enabledStrategies.filter((v): v is StrategyName => typeof v === 'string' && (STRATEGIES as readonly string[]).includes(v)),
      )
      const nextEnabled = STRATEGIES.filter((v) => enabledSet.has(v))
      const finalEnabled = nextEnabled.length > 0 ? nextEnabled : [...STRATEGIES]

      const nextSelected = finalEnabled.includes(s.selectedStrategy as StrategyName) ? s.selectedStrategy : finalEnabled[0]
      const filters =
        nextSelected === 'Elite Retest Reversal'
          ? s.errFilters
          : nextSelected === 'Breakout Retest'
            ? s.brFilters
            : nextSelected === 'Confirmation Model'
              ? s.cmFilters
            : nextSelected === 'FluxGate Dual Engine'
              ? s.fgFilters
              : nextSelected === 'Supertrend + RelVol'
                ? s.stFilters
            : nextSelected === 'BB Stoch S/D'
              ? s.bbssdFilters
            : nextSelected === 'Squeeze Momentum'
              ? s.sqzFilters
              : s.ecbFilters
      const flat = flatFromFilters(filters)
      persistEnabledStrategies(finalEnabled)
      persistTerminalSettings({ ...flat, isAutoStrategy: s.isAutoStrategy, selectedStrategy: nextSelected })
      return { enabledStrategies: finalEnabled, selectedStrategy: nextSelected, ...flat }
    }),
  setAutoBest: (autoBest) => set({ autoBest }),
  setAutoStrategy: (isAutoStrategy) =>
    set((s) => {
      const next = { ...s, isAutoStrategy }
      persistTerminalSettings({
        entryModel: next.entryModel,
        isConfluence: next.isConfluence,
        minConfluence: next.minConfluence,
        minQuality: next.minQuality,
        isAutoStrategy: next.isAutoStrategy,
        selectedStrategy: next.selectedStrategy,
        filterBTCAlignment: next.filterBTCAlignment,
        filterHTFAlignment: next.filterHTFAlignment,
        filterEntryConfirmation: next.filterEntryConfirmation,
        filterADXRegime: next.filterADXRegime,
        filterVolumeConfirmation: next.filterVolumeConfirmation,
        filterKeyLevelDistance: next.filterKeyLevelDistance,
        keyLevelMaxDistancePct: next.keyLevelMaxDistancePct,
        minVolumeRatio: next.minVolumeRatio,
        filterRetestConfirmation: next.filterRetestConfirmation,
        filterAtrEntryBuffer: next.filterAtrEntryBuffer,
        entryAtrBufferAtrMult: next.entryAtrBufferAtrMult,
        filterStrongClose: next.filterStrongClose,
        strongCloseBodyPct: next.strongCloseBodyPct,
        filterAvoidOppKeyLevel: next.filterAvoidOppKeyLevel,
        filterCooldown: next.filterCooldown,
        cooldownBars: next.cooldownBars,
        filterRequireOrderBlock: next.filterRequireOrderBlock,
        filterFVG: next.filterFVG,
        filterPapRequireRetest: next.filterPapRequireRetest,
        filterEliteSession: next.filterEliteSession,
        filterCmSession: next.filterCmSession,
        filterLiquiditySweep: next.filterLiquiditySweep,
        filterEliteRequireRetest: next.filterEliteRequireRetest,
        filterEliteHTFEMA: next.filterEliteHTFEMA,
        filterEliteMaxEmaDistance: next.filterEliteMaxEmaDistance,
        filterFixedPctSlTp: next.filterFixedPctSlTp,
        fixedSlPct: next.fixedSlPct,
        fixedTpPct: next.fixedTpPct,
        eliteMinVolRegime: next.eliteMinVolRegime,
        fgUseADX: next.fgUseADX,
        fgAdxMin: next.fgAdxMin,
        fgUseStructure: next.fgUseStructure,
        fgStructureTolAtrMult: next.fgStructureTolAtrMult,
        fgUseMomentum: next.fgUseMomentum,
        fgUseRsiDivergence: next.fgUseRsiDivergence,
        fgUseStochCross: next.fgUseStochCross,
        fgUseVolume: next.fgUseVolume,
        fgMinVolumeRatio: next.fgMinVolumeRatio,
        fgRequireVolumeExpanding: next.fgRequireVolumeExpanding,
        fgUseHTFAlign: next.fgUseHTFAlign,
        fgBaseLenLong: next.fgBaseLenLong,
        fgBaseLenShort: next.fgBaseLenShort,
        fgGuideEmaLen: next.fgGuideEmaLen,
        fgVolLen: next.fgVolLen,
        fgPersLen: next.fgPersLen,
        fgCurvLen: next.fgCurvLen,
        fgThresholdKLong: next.fgThresholdKLong,
        fgThresholdKShort: next.fgThresholdKShort,
        fgUseCross: next.fgUseCross,
        fgPresetVersion: next.fgPresetVersion,
        fgUseSession: next.fgUseSession,
        fgSessionStartUtc: next.fgSessionStartUtc,
        fgSessionEndUtc: next.fgSessionEndUtc,
        fgStochExtreme: next.fgStochExtreme,
        fgStochOS: next.fgStochOS,
        fgStochOB: next.fgStochOB,
        fgUseCost: next.fgUseCost,
        fgUseExecution: next.fgUseExecution,
      })
      return { isAutoStrategy }
    }),
  setSignalFilters: (filters) =>
    set((s) => {
      const next = {
        ...s,
        ...filters,
        minConfluence:
          typeof filters.minConfluence === 'number'
            ? Math.max(2, Math.min(15, filters.minConfluence))
            : s.minConfluence,
        minQuality:
          typeof filters.minQuality === 'number'
            ? Math.max(4, Math.min(8, filters.minQuality))
            : s.minQuality,
      }
      persistTerminalSettings({
        entryModel: next.entryModel,
        isConfluence: next.isConfluence,
        minConfluence: next.minConfluence,
        minQuality: next.minQuality,
        isAutoStrategy: next.isAutoStrategy,
        selectedStrategy: next.selectedStrategy,
        filterBTCAlignment: next.filterBTCAlignment,
        filterHTFAlignment: next.filterHTFAlignment,
        filterEntryConfirmation: next.filterEntryConfirmation,
        filterADXRegime: next.filterADXRegime,
        filterVolumeConfirmation: next.filterVolumeConfirmation,
        filterKeyLevelDistance: next.filterKeyLevelDistance,
        keyLevelMaxDistancePct: next.keyLevelMaxDistancePct,
        minVolumeRatio: next.minVolumeRatio,
        filterRetestConfirmation: next.filterRetestConfirmation,
        filterAtrEntryBuffer: next.filterAtrEntryBuffer,
        entryAtrBufferAtrMult: next.entryAtrBufferAtrMult,
        filterStrongClose: next.filterStrongClose,
        strongCloseBodyPct: next.strongCloseBodyPct,
        filterAvoidOppKeyLevel: next.filterAvoidOppKeyLevel,
        filterCooldown: next.filterCooldown,
        cooldownBars: next.cooldownBars,
        filterRequireOrderBlock: next.filterRequireOrderBlock,
        filterFVG: next.filterFVG,
        filterPapRequireRetest: next.filterPapRequireRetest,
        filterEliteSession: next.filterEliteSession,
        filterCmSession: next.filterCmSession,
        filterLiquiditySweep: next.filterLiquiditySweep,
        filterEliteRequireRetest: next.filterEliteRequireRetest,
        filterEliteHTFEMA: next.filterEliteHTFEMA,
        filterEliteMaxEmaDistance: next.filterEliteMaxEmaDistance,
        filterFixedPctSlTp: next.filterFixedPctSlTp,
        fixedSlPct: next.fixedSlPct,
        fixedTpPct: next.fixedTpPct,
        eliteMinVolRegime: next.eliteMinVolRegime,
      })
      return {
        ...filters,
        minConfluence: next.minConfluence,
        minQuality: next.minQuality,
      }
    }),
  setAdvancedFilters: (filters) =>
    set((s) => {
      const next = {
        ...s,
        ...filters,
        keyLevelMaxDistancePct:
          typeof filters.keyLevelMaxDistancePct === 'number'
            ? Math.max(0.1, Math.min(5, filters.keyLevelMaxDistancePct))
            : s.keyLevelMaxDistancePct,
        minVolumeRatio:
          typeof filters.minVolumeRatio === 'number'
            ? Math.max(0.5, Math.min(5, filters.minVolumeRatio))
            : s.minVolumeRatio,
        entryAtrBufferAtrMult:
          typeof filters.entryAtrBufferAtrMult === 'number'
            ? Math.max(0, Math.min(0.5, filters.entryAtrBufferAtrMult))
            : s.entryAtrBufferAtrMult,
        strongCloseBodyPct:
          typeof filters.strongCloseBodyPct === 'number'
            ? Math.max(10, Math.min(90, filters.strongCloseBodyPct))
            : s.strongCloseBodyPct,
        cooldownBars:
          typeof filters.cooldownBars === 'number'
            ? Math.max(0, Math.min(30, Math.floor(filters.cooldownBars)))
            : s.cooldownBars,
      }
      persistTerminalSettings({
        entryModel: next.entryModel,
        isConfluence: next.isConfluence,
        minConfluence: next.minConfluence,
        minQuality: next.minQuality,
        isAutoStrategy: next.isAutoStrategy,
        selectedStrategy: next.selectedStrategy,
        filterBTCAlignment: next.filterBTCAlignment,
        filterHTFAlignment: next.filterHTFAlignment,
        filterEntryConfirmation: next.filterEntryConfirmation,
        filterADXRegime: next.filterADXRegime,
        filterVolumeConfirmation: next.filterVolumeConfirmation,
        filterKeyLevelDistance: next.filterKeyLevelDistance,
        keyLevelMaxDistancePct: next.keyLevelMaxDistancePct,
        minVolumeRatio: next.minVolumeRatio,
        filterRetestConfirmation: next.filterRetestConfirmation,
        filterAtrEntryBuffer: next.filterAtrEntryBuffer,
        entryAtrBufferAtrMult: next.entryAtrBufferAtrMult,
        filterStrongClose: next.filterStrongClose,
        strongCloseBodyPct: next.strongCloseBodyPct,
        filterAvoidOppKeyLevel: next.filterAvoidOppKeyLevel,
        filterCooldown: next.filterCooldown,
        cooldownBars: next.cooldownBars,
        filterRequireOrderBlock: next.filterRequireOrderBlock,
        filterFVG: next.filterFVG,
        filterPapRequireRetest: next.filterPapRequireRetest,
        filterEliteSession: next.filterEliteSession,
        filterCmSession: next.filterCmSession,
        filterLiquiditySweep: next.filterLiquiditySweep,
        filterEliteRequireRetest: next.filterEliteRequireRetest,
        filterEliteHTFEMA: next.filterEliteHTFEMA,
        filterEliteMaxEmaDistance: next.filterEliteMaxEmaDistance,
        filterFixedPctSlTp: next.filterFixedPctSlTp,
        fixedSlPct: next.fixedSlPct,
        fixedTpPct: next.fixedTpPct,
        eliteMinVolRegime: next.eliteMinVolRegime,
      })
      return {
        ...filters,
        keyLevelMaxDistancePct: next.keyLevelMaxDistancePct,
        minVolumeRatio: next.minVolumeRatio,
        entryAtrBufferAtrMult: next.entryAtrBufferAtrMult,
        strongCloseBodyPct: next.strongCloseBodyPct,
        cooldownBars: next.cooldownBars,
      }
    }),
  setTradeSetup: (tradeSetup) => set({ tradeSetup }),

  resetChart: () => set((s) => ({ chartResetNonce: s.chartResetNonce + 1 })),
  runAnalysis: () => set((s) => ({ analysisRunNonce: s.analysisRunNonce + 1 })),
}))
