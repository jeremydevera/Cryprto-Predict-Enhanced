import { useEffect, useMemo, useRef } from 'react'
import { useTradingStore } from '@/stores/tradingStore'
type TF = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

const htfFor = (tf: TF): TF => {
  if (tf === '1m') return '15m'
  if (tf === '5m') return '1h'
  if (tf === '15m') return '4h'
  if (tf === '1h') return '1d'
  if (tf === '4h') return '1d'
  return '1d'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function useScannerRunner() {
  const exchange = useTradingStore((s) => s.exchange)
  const enabledStrategies = useTradingStore((s) => s.enabledStrategies)
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const filterHTFAlignment = useTradingStore((s) => s.filterHTFAlignment)
  const entryModel = useTradingStore((s) => s.entryModel)

  const isConfluence = useTradingStore((s) => s.isConfluence)
  const minConfluence = useTradingStore((s) => s.minConfluence)
  const minQuality = useTradingStore((s) => s.minQuality)
  const filterBTCAlignment = useTradingStore((s) => s.filterBTCAlignment)
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
  const filterRequireOrderBlock = useTradingStore((s) => s.filterRequireOrderBlock)
  const filterFVG               = useTradingStore((s) => s.filterFVG)
  const filterPapRequireRetest  = useTradingStore((s) => s.filterPapRequireRetest)
  const filterEliteSession      = useTradingStore((s) => s.filterEliteSession)
  const filterCmSession         = useTradingStore((s) => s.filterCmSession)
  const filterLiquiditySweep    = useTradingStore((s) => s.filterLiquiditySweep)
  const filterEliteRequireRetest  = useTradingStore((s) => s.filterEliteRequireRetest)
  const filterEliteHTFEMA         = useTradingStore((s) => s.filterEliteHTFEMA)
  const filterEliteMaxEmaDistance = useTradingStore((s) => s.filterEliteMaxEmaDistance)
  const filterFixedPctSlTp        = useTradingStore((s) => s.filterFixedPctSlTp)
  const fixedSlPct                = useTradingStore((s) => s.fixedSlPct)
  const fixedTpPct                = useTradingStore((s) => s.fixedTpPct)
  const eliteMinVolRegime      = useTradingStore((s) => s.eliteMinVolRegime)
  const errAGradeBoost = useTradingStore((s) => s.errAGradeBoost)
  const errStochConfirm = useTradingStore((s) => s.errStochConfirm)
  const errHtfEma200 = useTradingStore((s) => s.errHtfEma200)
  const errMultiRetest = useTradingStore((s) => s.errMultiRetest)
  const errAGradeRequired = useTradingStore((s) => s.errAGradeRequired)
  const errHtfEma50Required = useTradingStore((s) => s.errHtfEma50Required)
  const errMinRREnabled = useTradingStore((s) => s.errMinRREnabled)
  const errMinRR = useTradingStore((s) => s.errMinRR)
  const errRetestMaxBarsEnabled = useTradingStore((s) => s.errRetestMaxBarsEnabled)
  const errRetestMaxBars = useTradingStore((s) => s.errRetestMaxBars)
  const errReversalBodyMinPct = useTradingStore((s) => s.errReversalBodyMinPct)
  const errRetestAtrTolMult = useTradingStore((s) => s.errRetestAtrTolMult)
  const errStochOS = useTradingStore((s) => s.errStochOS)
  const errStochOB = useTradingStore((s) => s.errStochOB)
  const errMultiRetestLookbackBars = useTradingStore((s) => s.errMultiRetestLookbackBars)
  const errMultiRetestMinTouches = useTradingStore((s) => s.errMultiRetestMinTouches)
  const errAGradeBodyMinPct = useTradingStore((s) => s.errAGradeBodyMinPct)
  const errAGradeVolMinMult = useTradingStore((s) => s.errAGradeVolMinMult)
  const errTp1MultDefault = useTradingStore((s) => s.errTp1MultDefault)
  const errTp2MultDefault = useTradingStore((s) => s.errTp2MultDefault)
  const errTp1MultBoost = useTradingStore((s) => s.errTp1MultBoost)
  const errTp2MultBoost = useTradingStore((s) => s.errTp2MultBoost)
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
  const brMinAtrPct = useTradingStore((s) => s.brMinAtrPct)
  const brMaxRangeAtrMult = useTradingStore((s) => s.brMaxRangeAtrMult)
  const brEmaSlopeLookback = useTradingStore((s) => s.brEmaSlopeLookback)
  const brAdxMin = useTradingStore((s) => s.brAdxMin)
  const fgUseADX = useTradingStore((s) => s.fgUseADX)
  const fgAdxMin = useTradingStore((s) => s.fgAdxMin)
  const fgUseSession = useTradingStore((s) => s.fgUseSession)
  const fgSessionStartUtc = useTradingStore((s) => s.fgSessionStartUtc)
  const fgSessionEndUtc = useTradingStore((s) => s.fgSessionEndUtc)
  const fgUseStructure = useTradingStore((s) => s.fgUseStructure)
  const fgStructureTolAtrMult = useTradingStore((s) => s.fgStructureTolAtrMult)
  const fgUseMomentum = useTradingStore((s) => s.fgUseMomentum)
  const fgUseRsiDivergence = useTradingStore((s) => s.fgUseRsiDivergence)
  const fgUseStochCross = useTradingStore((s) => s.fgUseStochCross)
  const fgStochExtreme = useTradingStore((s) => s.fgStochExtreme)
  const fgStochOS = useTradingStore((s) => s.fgStochOS)
  const fgStochOB = useTradingStore((s) => s.fgStochOB)
  const fgUseVolume = useTradingStore((s) => s.fgUseVolume)
  const fgMinVolumeRatio = useTradingStore((s) => s.fgMinVolumeRatio)
  const fgRequireVolumeExpanding = useTradingStore((s) => s.fgRequireVolumeExpanding)
  const fgUseHTFAlign = useTradingStore((s) => s.fgUseHTFAlign)
  const fgUseCost = useTradingStore((s) => s.fgUseCost)
  const fgUseExecution = useTradingStore((s) => s.fgUseExecution)
  const fgBaseLenLong = useTradingStore((s) => s.fgBaseLenLong)
  const fgBaseLenShort = useTradingStore((s) => s.fgBaseLenShort)
  const fgGuideEmaLen = useTradingStore((s) => s.fgGuideEmaLen)
  const fgVolLen = useTradingStore((s) => s.fgVolLen)
  const fgPersLen = useTradingStore((s) => s.fgPersLen)
  const fgCurvLen = useTradingStore((s) => s.fgCurvLen)
  const fgThresholdKLong = useTradingStore((s) => s.fgThresholdKLong)
  const fgThresholdKShort = useTradingStore((s) => s.fgThresholdKShort)
  const fgUseCross = useTradingStore((s) => s.fgUseCross)
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
  const stUseManualSlTp = useTradingStore((s) => s.stUseManualSlTp)
  const stManualSlPct = useTradingStore((s) => s.stManualSlPct)
  const stManualTp1Pct = useTradingStore((s) => s.stManualTp1Pct)
  const stManualTp2Pct = useTradingStore((s) => s.stManualTp2Pct)
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
  const bbssdLength = useTradingStore((s) => s.bbssdLength)
  const bbssdStdDev = useTradingStore((s) => s.bbssdStdDev)
  const bbssdStochK = useTradingStore((s) => s.bbssdStochK)
  const bbssdStochD = useTradingStore((s) => s.bbssdStochD)
  const bbssdStochSmooth = useTradingStore((s) => s.bbssdStochSmooth)
  const bbssdStochOS = useTradingStore((s) => s.bbssdStochOS)
  const bbssdStochOB = useTradingStore((s) => s.bbssdStochOB)
  const bbssdLookbackBars = useTradingStore((s) => s.bbssdLookbackBars)
  const bbssdRequireZone = useTradingStore((s) => s.bbssdRequireZone)
  const bbssdZoneFreshOnly = useTradingStore((s) => s.bbssdZoneFreshOnly)
  const bbssdRequireBBTag = useTradingStore((s) => s.bbssdRequireBBTag)
  const bbssdRequireBBReject = useTradingStore((s) => s.bbssdRequireBBReject)
  const bbssdRequireStochCross = useTradingStore((s) => s.bbssdRequireStochCross)
  const bbssdRequireReversalCandle = useTradingStore((s) => s.bbssdRequireReversalCandle)
  const bbssdHtfEma200 = useTradingStore((s) => s.bbssdHtfEma200)
  const bbssdUseMaxAdx = useTradingStore((s) => s.bbssdUseMaxAdx)
  const bbssdMaxAdx = useTradingStore((s) => s.bbssdMaxAdx)
  const bbssdUseVolume = useTradingStore((s) => s.bbssdUseVolume)
  const bbssdMinVolumeRatio = useTradingStore((s) => s.bbssdMinVolumeRatio)
  const bbssdZoneTolAtrMult = useTradingStore((s) => s.bbssdZoneTolAtrMult)
  const bbssdMinLegAtr = useTradingStore((s) => s.bbssdMinLegAtr)
  const bbssdRsiLongMin = useTradingStore((s) => s.bbssdRsiLongMin)
  const bbssdRsiLongMax = useTradingStore((s) => s.bbssdRsiLongMax)
  const bbssdRsiShortMin = useTradingStore((s) => s.bbssdRsiShortMin)
  const bbssdRsiShortMax = useTradingStore((s) => s.bbssdRsiShortMax)
  const bbssdFreshZonesOnly = useTradingStore((s) => s.bbssdFreshZonesOnly)
  const bbssdRequireRsiDiv = useTradingStore((s) => s.bbssdRequireRsiDiv)
  const bbssdAllowObFvgFallback = useTradingStore((s) => s.bbssdAllowObFvgFallback)
  const bbssdRevWickPct = useTradingStore((s) => s.bbssdRevWickPct)
  const bbssdRequireEntryConfirm = useTradingStore((s) => s.bbssdRequireEntryConfirm)
  const bbssdRequireLiqSweep = useTradingStore((s) => s.bbssdRequireLiqSweep)
  const lastSignalTimeSec = useTradingStore((s) => s.lastSignalTimeSec)
  const lastSignalDirection = useTradingStore((s) => s.lastSignalDirection)

  const scannerTimeframes = useTradingStore((s) => s.scannerTimeframes)
  const scannerNearEntryOnly = useTradingStore((s) => s.scannerNearEntryOnly)
  const scannerNearEntryPct = useTradingStore((s) => s.scannerNearEntryPct)
  const scannerContinuousScan = useTradingStore((s) => s.scannerContinuousScan)
  const scannerStopOnFirstSignal = useTradingStore((s) => s.scannerStopOnFirstSignal)
  const scannerIntervalSec = useTradingStore((s) => s.scannerIntervalSec)
  const scannerStrategy = useTradingStore((s) => s.scannerStrategy)
  const scannerRunning = useTradingStore((s) => s.scannerRunning)
  const scannerRunNonce = useTradingStore((s) => s.scannerRunNonce)

  const setScannerProgress = useTradingStore((s) => s.setScannerProgress)
  const addScannerResults = useTradingStore((s) => s.addScannerResults)
  const stopScanner = useTradingStore((s) => s.stopScanner)

  const cancelRef = useRef(false)

  const effectiveSelectedStrategy = scannerStrategy === 'AUTO' ? selectedStrategy : scannerStrategy

  const settings = useMemo(
    () => ({
      enabledStrategies,
      selectedStrategy: effectiveSelectedStrategy,
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
      lastSignalTimeSec,
      lastSignalDirection,
    }),
    [
      enabledStrategies,
      effectiveSelectedStrategy,
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
      lastSignalTimeSec,
      lastSignalDirection,
    ],
  )

  useEffect(() => {
    cancelRef.current = false
    if (!scannerRunning) return

    const run = async () => {
      let symbols: string[] = []
      try {
        const resp = await fetch(`/api/prices/symbols?exchange=${exchange}`)
        const json = await resp.json()
        if (cancelRef.current) return
        if (json?.success && Array.isArray(json.data)) symbols = json.data as string[]
      } catch (e) {
        console.warn('Scanner: failed to fetch symbols', e)
        symbols = []
      }

      const allowed = new Set(['1m', '5m', '15m', '1h', '4h', '1d'])
      const tfs = Array.isArray(scannerTimeframes)
        ? (scannerTimeframes as TF[]).filter((t) => allowed.has(t))
        : ([] as TF[])
      const finalTfs = tfs.length > 0 ? tfs : (['15m'] as TF[])

      const intervalMs = Math.max(5, Math.floor(scannerIntervalSec)) * 1000

      do {
        const work = symbols.flatMap((sym) => finalTfs.map((tf) => ({ sym, tf })))
        setScannerProgress({ done: 0, total: work.length })

        const concurrency = 6
        let idx = 0
        let done = 0
        let found = 0

        const shouldStop = () => cancelRef.current || !useTradingStore.getState().scannerRunning || (scannerStopOnFirstSignal && found > 0)

        const worker = async () => {
          while (idx < work.length && !shouldStop()) {
            const my = idx
            idx += 1
            const { sym, tf } = work[my]
            try {
              const json = await fetch('/api/scanner/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  symbol: sym,
                  timeframe: tf,
                  strategy: effectiveSelectedStrategy,
                  entryModel,
                  minQuality,
                  minConfluence,
                  isConfluence,
                  nearEntryOnly: scannerNearEntryOnly,
                  nearEntryPct: scannerNearEntryOnly ? scannerNearEntryPct : 100,
                  enabledStrategies,
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
                  filterBTCAlignment,
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
                  fgUseSession,
                  fgSessionStartUtc,
                  fgSessionEndUtc,
                  fgUseStructure,
                  fgStructureTolAtrMult,
                  fgUseMomentum,
                  fgUseRsiDivergence,
                  fgUseStochCross,
                  fgStochExtreme,
                  fgStochOS,
                  fgStochOB,
                  fgUseVolume,
                  fgMinVolumeRatio,
                  fgRequireVolumeExpanding,
                  fgUseHTFAlign,
                  fgUseCost,
                  fgUseExecution,
                  fgBaseLenLong,
                  fgBaseLenShort,
                  fgGuideEmaLen,
                  fgVolLen,
                  fgPersLen,
                  fgCurvLen,
                  fgThresholdKLong,
                  fgThresholdKShort,
                  fgUseCross,
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
                  stUseManualSlTp,
                  stManualSlPct,
                  stManualTp1Pct,
                  stManualTp2Pct,
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
                  bbssdLength,
                  bbssdStdDev,
                  bbssdStochK,
                  bbssdStochD,
                  bbssdStochSmooth,
                  bbssdStochOS,
                  bbssdStochOB,
                  bbssdLookbackBars,
                  bbssdRequireZone,
                  bbssdZoneFreshOnly,
                  bbssdRequireBBTag,
                  bbssdRequireBBReject,
                  bbssdRequireStochCross,
                  bbssdRequireReversalCandle,
                  bbssdHtfEma200,
                  bbssdUseMaxAdx,
                  bbssdMaxAdx,
                  bbssdUseVolume,
                  bbssdMinVolumeRatio,
                  bbssdZoneTolAtrMult,
                  bbssdMinLegAtr,
                  bbssdRsiLongMin,
                  bbssdRsiLongMax,
                  bbssdRsiShortMin,
                  bbssdRsiShortMax,
                  bbssdFreshZonesOnly,
                  bbssdRequireRsiDiv,
                  bbssdAllowObFvgFallback,
                  bbssdRevWickPct,
                  bbssdRequireEntryConfirm,
                  bbssdRequireLiqSweep,
                }),
              }).then((r) => r.json())
              if (shouldStop()) break
              const sig = json?.success ? (json.data as any) : null
              if (sig && sig.direction && sig.entry) {
                found += 1
                addScannerResults([
                  {
                    symbol: sym,
                    timeframe: tf,
                    direction: sig.direction,
                    quality: Number(sig.quality ?? 0),
                    confluence: Number(sig.confluence ?? 0),
                    strategy: String(sig.strategy ?? effectiveSelectedStrategy),
                    regime: String(sig.regime ?? '—'),
                    currentPrice: Number(sig.currentPrice ?? sig.entry ?? 0),
                    entry: Number(sig.entry ?? 0),
                    entryDistancePct: Number(sig.entryDistancePct ?? 0),
                    sl: Number(sig.sl ?? 0),
                    tp1: Number(sig.tp1 ?? 0),
                    tp2: Number(sig.tp2 ?? sig.tp1 ?? 0),
                    notes: String(sig.notes ?? ''),
                  },
                ])
                // Forward signal to backend → Telegram
                fetch('/api/bgscanner/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    symbol: sym,
                    timeframe: tf,
                    direction: sig.direction,
                    strategy: sig.strategy,
                    quality: sig.quality,
                    confluence: sig.confluence,
                    entry: sig.entry,
                    sl: sig.sl,
                    tp1: sig.tp1,
                    tp2: sig.tp2,
                    entryDistancePct: sig.entryDistancePct,
                    detectedAt: Date.now(),
                  }),
                }).catch(() => {})
                if (scannerStopOnFirstSignal) break
              }
            } catch (e) {
              console.warn(`Scanner: failed for ${sym}/${tf}`, e)
            } finally {
              done += 1
              setScannerProgress({ done, total: work.length })
            }
          }
        }

        await Promise.all(Array.from({ length: concurrency }, () => worker()))
        if (!scannerContinuousScan) break
        if (scannerStopOnFirstSignal && found > 0) break
        if (shouldStop()) break
        await sleep(intervalMs)
      } while (!cancelRef.current && useTradingStore.getState().scannerRunning)

      if (!cancelRef.current) stopScanner()
    }

    void run()
    return () => {
      cancelRef.current = true
    }
  }, [
    exchange,
    settings,
    filterHTFAlignment,
    scannerTimeframes,
    scannerNearEntryOnly,
    scannerNearEntryPct,
    scannerContinuousScan,
    scannerStopOnFirstSignal,
    scannerIntervalSec,
    scannerRunning,
    scannerRunNonce,
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
    stUseManualSlTp,
    stManualSlPct,
    stManualTp1Pct,
    stManualTp2Pct,
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
    addScannerResults,
    setScannerProgress,
    stopScanner,
  ])
}
