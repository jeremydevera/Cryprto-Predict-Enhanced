import { useState, useMemo, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STRATEGIES, useTradingStore, STRATEGY_EDITOR_KEY, type FilterSettings, type StrategyEditorKey, type BacktestProfile } from '@/stores/tradingStore'
import { FilterForm } from '@/components/filters/FilterForm'
import { useBacktestRunner, usePaperBacktestRunner, type BacktestOptions } from '@/hooks/useBacktestRunner'
import { useForwardTestRunner } from '@/hooks/useForwardTestRunner'
import { useMultiBacktestRunner } from '@/hooks/useMultiBacktestRunner'
import { useProfileBacktestRunner, type ProfileRunRow } from '@/hooks/useProfileBacktestRunner'
import { useParityCheck } from '@/hooks/useParityCheck'
import { exportProfileResults, type ProfileExportInput } from '@/utils/exportProfileResults'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'
import type { ScanSettings } from '@/utils/signalScan'

type Tab = 'backtest' | 'forwardtest'

const dirBadge = (d: 'buy' | 'sell') => (d === 'buy' ? 'buy' : 'sell') as 'buy' | 'sell'

function SummaryCard({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string
  value: string | number
  sub?: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={cn('text-lg font-bold text-slate-100', valueClassName)}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function rColor(r: number) {
  if (r > 0) return 'text-emerald-400'
  if (r < 0) return 'text-red-400'
  return 'text-slate-400'
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatMoney(value: number) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0)
}

function signedMoney(value: number) {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

function moneyColor(value: number) {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

function resultBadgeVariant(result: string): 'buy' | 'sell' | 'neutral' {
  if (result === 'win') return 'buy'
  if (result === 'loss') return 'sell'
  return 'neutral'
}

const TF_OPTIONS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
type TFOpt = (typeof TF_OPTIONS)[number]

function SymbolSelect({ value, options, onChange, disabled }: { value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono disabled:opacity-50"
    >
      {options.map((sym) => (
        <option key={sym} value={sym}>{sym}</option>
      ))}
    </select>
  )
}

function buildBaseSettings(store: ReturnType<typeof useTradingStore.getState>, strategy: string): Omit<ScanSettings, 'lastSignalTimeSec' | 'lastSignalDirection' | 'lastCandleTimeSec' | 'timeframe'> {
  const filters = strategy === 'Breakout Retest' ? store.brFilters
    : strategy === 'Elite Retest Reversal' ? store.errFilters
    : strategy === 'Confirmation Model' ? store.cmFilters
    : strategy === 'FluxGate Dual Engine' ? store.fgFilters
    : strategy === 'Supertrend + RelVol' ? store.stFilters
    : strategy === 'BB Stoch S/D' ? store.bbssdFilters
    : store.ecbFilters
  return buildSettingsFromFilters(strategy, filters)
}

// Build ScanSettings (minus runtime fields) from an explicit FilterSettings object.
// Used by both the live-strategy path (above) and backtest profiles, so a profile produces
// exactly the same settings shape the live scanner would — just sourced from the profile.
function buildSettingsFromFilters(strategy: string, filters: FilterSettings): Omit<ScanSettings, 'lastSignalTimeSec' | 'lastSignalDirection' | 'lastCandleTimeSec' | 'timeframe'> {
  return {
    enabledStrategies: [strategy],
    selectedStrategy:  strategy,
    entryModel:            filters.entryModel,
    isConfluence:           filters.isConfluence,
    minConfluence:          filters.minConfluence,
    minQuality:             filters.minQuality,
    filterBTCAlignment:     filters.filterBTCAlignment,
    filterHTFAlignment:     filters.filterHTFAlignment,
    filterEntryConfirmation: filters.filterEntryConfirmation,
    filterADXRegime:        filters.filterADXRegime,
    filterVolumeConfirmation: filters.filterVolumeConfirmation,
    filterKeyLevelDistance: filters.filterKeyLevelDistance,
    keyLevelMaxDistancePct: filters.keyLevelMaxDistancePct,
    minVolumeRatio:         filters.minVolumeRatio,
    filterRetestConfirmation: filters.filterRetestConfirmation,
    filterAtrEntryBuffer:   filters.filterAtrEntryBuffer,
    entryAtrBufferAtrMult:  filters.entryAtrBufferAtrMult,
    filterStrongClose:      filters.filterStrongClose,
    strongCloseBodyPct:     filters.strongCloseBodyPct,
    filterAvoidOppKeyLevel: filters.filterAvoidOppKeyLevel,
    filterCooldown:         filters.filterCooldown,
    cooldownBars:           filters.cooldownBars,
    filterRequireOrderBlock: filters.filterRequireOrderBlock,
    filterFVG:             filters.filterFVG,
    filterPapRequireRetest: filters.filterPapRequireRetest,
    filterEliteSession:     filters.filterEliteSession,
    filterCmSession:        filters.filterCmSession,
    filterLiquiditySweep:   filters.filterLiquiditySweep,
    filterEliteRequireRetest:   filters.filterEliteRequireRetest,
    filterEliteHTFEMA:      filters.filterEliteHTFEMA,
    filterEliteMaxEmaDistance:  filters.filterEliteMaxEmaDistance,
    filterFixedPctSlTp:     filters.filterFixedPctSlTp,
    eliteMinVolRegime:      filters.eliteMinVolRegime,
    fixedSlPct:             filters.fixedSlPct,
    fixedTpPct:             filters.fixedTpPct,
    errAGradeBoost:         filters.errAGradeBoost,
    errStochConfirm:        filters.errStochConfirm,
    errHtfEma200:           filters.errHtfEma200,
    errMultiRetest:         filters.errMultiRetest,
    errAGradeRequired:      filters.errAGradeRequired,
    errHtfEma50Required:    filters.errHtfEma50Required,
    errMinRREnabled:        filters.errMinRREnabled,
    errMinRR:               filters.errMinRR,
    errRetestMaxBarsEnabled: filters.errRetestMaxBarsEnabled,
    errRetestMaxBars:       filters.errRetestMaxBars,
    errReversalBodyMinPct:  filters.errReversalBodyMinPct,
    errRetestAtrTolMult:    filters.errRetestAtrTolMult,
    errStochOS:             filters.errStochOS,
    errStochOB:             filters.errStochOB,
    errMultiRetestLookbackBars: filters.errMultiRetestLookbackBars,
    errMultiRetestMinTouches:   filters.errMultiRetestMinTouches,
    errAGradeBodyMinPct:    filters.errAGradeBodyMinPct,
    errAGradeVolMinMult:    filters.errAGradeVolMinMult,
    errTp1MultDefault:      filters.errTp1MultDefault,
    errTp2MultDefault:      filters.errTp2MultDefault,
    errTp1MultBoost:        filters.errTp1MultBoost,
    errTp2MultBoost:        filters.errTp2MultBoost,
    ecbAGradeBodyMinPctHighVol: filters.ecbAGradeBodyMinPctHighVol,
    ecbAGradeBodyMinPctOther:   filters.ecbAGradeBodyMinPctOther,
    ecbAGradeVolMinMult:        filters.ecbAGradeVolMinMult,
    ecbBGradeBodyMinPctMedium:  filters.ecbBGradeBodyMinPctMedium,
    ecbBGradeBodyMinPctOther:   filters.ecbBGradeBodyMinPctOther,
    ecbBGradeVolMinMultMedium:  filters.ecbBGradeVolMinMultMedium,
    ecbBGradeVolMinMultOther:   filters.ecbBGradeVolMinMultOther,
    ecbRetestAtrTolMult:        filters.ecbRetestAtrTolMult,
    ecbRetestEma20MaxDistPct:   filters.ecbRetestEma20MaxDistPct,
    ecbRetestVolMaxFracOfBreak: filters.ecbRetestVolMaxFracOfBreak,
    ecbMaxEma50DistanceAtrMult: filters.ecbMaxEma50DistanceAtrMult,
    ecbMinConsolidBars:         filters.ecbMinConsolidBars,
    ecbRsiLongMinMediumAGrade:  filters.ecbRsiLongMinMediumAGrade,
    ecbRsiLongMinMediumBGrade:  filters.ecbRsiLongMinMediumBGrade,
    ecbRsiLongMinOther:         filters.ecbRsiLongMinOther,
    ecbRsiShortMaxMediumAGrade: filters.ecbRsiShortMaxMediumAGrade,
    ecbRsiShortMaxMediumBGrade: filters.ecbRsiShortMaxMediumBGrade,
    ecbRsiShortMaxOther:        filters.ecbRsiShortMaxOther,
    ecbSlAtrMultAGradeHigh:     filters.ecbSlAtrMultAGradeHigh,
    ecbSlAtrMultAGradeOther:    filters.ecbSlAtrMultAGradeOther,
    ecbSlAtrMultBGrade:         filters.ecbSlAtrMultBGrade,
    ecbTp1RRMultAGradeHigh:     filters.ecbTp1RRMultAGradeHigh,
    ecbTp1RRMultAGradeOther:    filters.ecbTp1RRMultAGradeOther,
    ecbTp1RRMultBGradeMedium:   filters.ecbTp1RRMultBGradeMedium,
    ecbTp1RRMultBGradeOther:    filters.ecbTp1RRMultBGradeOther,
    ecbMeasuredMoveMinAtrMult:  filters.ecbMeasuredMoveMinAtrMult,
    ecbTp2ExtraRR:              filters.ecbTp2ExtraRR,
    ecbMaxBreakCandleRangeAtrMult: filters.ecbMaxBreakCandleRangeAtrMult,
    ecbBreakClosePosBullMinPct:    filters.ecbBreakClosePosBullMinPct,
    ecbBreakClosePosBearMaxPct:    filters.ecbBreakClosePosBearMaxPct,
    brMinAtrPct:            filters.brMinAtrPct,
    brMaxRangeAtrMult:      filters.brMaxRangeAtrMult,
    brEmaSlopeLookback:     filters.brEmaSlopeLookback,
    brAdxMin:               filters.brAdxMin,
    nearEntryOnly: false,
    nearEntryPct: 1.0,
    stAtrPeriod:             filters.stAtrPeriod,
    stAtrMult:               filters.stAtrMult,
    stUseRelVol:             filters.stUseRelVol,
    stRelVolLen:             filters.stRelVolLen,
    stRelVolMin:             filters.stRelVolMin,
    stRequireFlip:           filters.stRequireFlip,
    stUseKernel:             filters.stUseKernel,
    stKernelLookback:        filters.stKernelLookback,
    stKernelBandwidth:       filters.stKernelBandwidth,
    stUseHTFAlign:           filters.stUseHTFAlign,
    stHtfEmaLen:             filters.stHtfEmaLen,
    stUseHtfEmaSlope:        filters.stUseHtfEmaSlope,
    stHtfEmaSlopeLookback:   filters.stHtfEmaSlopeLookback,
    stHtfEmaSlopeMinPctPerBar: filters.stHtfEmaSlopeMinPctPerBar,
    stUseAdx:                filters.stUseAdx,
    stAdxPeriod:             filters.stAdxPeriod,
    stAdxMin:                filters.stAdxMin,
    stUseDiAlign:            filters.stUseDiAlign,
    stDiPeriod:              filters.stDiPeriod,
    stUseManualSlTp:         filters.stUseManualSlTp,
    stManualSlPct:           filters.stManualSlPct,
    stManualTp1Pct:          filters.stManualTp1Pct,
    stManualTp2Pct:          filters.stManualTp2Pct,
    stUseEmaDistance:        filters.stUseEmaDistance,
    stEmaDistAtrMin:         filters.stEmaDistAtrMin,
    stUseImpulse:            filters.stUseImpulse,
    stImpulseBodyMinPct:     filters.stImpulseBodyMinPct,
    stImpulseWickMaxPct:     filters.stImpulseWickMaxPct,
    stUseKdeRegime:          filters.stUseKdeRegime,
    stKdeRegimeLookback:     filters.stKdeRegimeLookback,
    stKdeRegimeBandwidth:    filters.stKdeRegimeBandwidth,
    stKdeRegimeMaxConcentration: filters.stKdeRegimeMaxConcentration,
    stUseKdeValueArea:       filters.stUseKdeValueArea,
    stKdeValueAreaLookback:  filters.stKdeValueAreaLookback,
    stKdeValueAreaBandwidth: filters.stKdeValueAreaBandwidth,
    stKdeValueAreaMaxDensity:filters.stKdeValueAreaMaxDensity,
    bbssdLength:                filters.bbssdLength,
    bbssdStdDev:                filters.bbssdStdDev,
    bbssdStochK:                filters.bbssdStochK,
    bbssdStochD:                filters.bbssdStochD,
    bbssdStochSmooth:           filters.bbssdStochSmooth,
    bbssdStochOS:               filters.bbssdStochOS,
    bbssdStochOB:               filters.bbssdStochOB,
    bbssdLookbackBars:          filters.bbssdLookbackBars,
    bbssdRequireZone:           filters.bbssdRequireZone,
    bbssdZoneFreshOnly:         filters.bbssdZoneFreshOnly,
    bbssdRequireBBTag:          filters.bbssdRequireBBTag,
    bbssdRequireBBReject:       filters.bbssdRequireBBReject,
    bbssdRequireStochCross:     filters.bbssdRequireStochCross,
    bbssdRequireReversalCandle: filters.bbssdRequireReversalCandle,
    bbssdHtfEma200:             filters.bbssdHtfEma200,
    bbssdUseMaxAdx:             filters.bbssdUseMaxAdx,
    bbssdMaxAdx:                filters.bbssdMaxAdx,
    bbssdUseVolume:             filters.bbssdUseVolume,
    bbssdMinVolumeRatio:        filters.bbssdMinVolumeRatio,
    bbssdZoneTolAtrMult:        filters.bbssdZoneTolAtrMult,
    bbssdMinLegAtr:             filters.bbssdMinLegAtr,
    bbssdRsiLongMin:            filters.bbssdRsiLongMin,
    bbssdRsiLongMax:            filters.bbssdRsiLongMax,
    bbssdRsiShortMin:           filters.bbssdRsiShortMin,
    bbssdRsiShortMax:           filters.bbssdRsiShortMax,
    bbssdFreshZonesOnly:        filters.bbssdFreshZonesOnly,
    bbssdRequireRsiDiv:         filters.bbssdRequireRsiDiv,
    bbssdAllowObFvgFallback:    filters.bbssdAllowObFvgFallback,
    bbssdRevWickPct:            filters.bbssdRevWickPct,
    bbssdRequireEntryConfirm:   filters.bbssdRequireEntryConfirm,
    bbssdRequireLiqSweep:       filters.bbssdRequireLiqSweep,
    sqzBbLen:                   filters.sqzBbLen,
    sqzBbStd:                   filters.sqzBbStd,
    sqzKcLen:                   filters.sqzKcLen,
    sqzKcMult:                  filters.sqzKcMult,
    sqzMomLen:                  filters.sqzMomLen,
    sqzRequireRelease:          filters.sqzRequireRelease,
    sqzMinSqueezeBars:          filters.sqzMinSqueezeBars,
    sqzRequireMomRising:        filters.sqzRequireMomRising,
    sqzUseHtfAlign:             filters.sqzUseHtfAlign,
    sqzHtfEmaLen:               filters.sqzHtfEmaLen,
    sqzUseAdx:                  filters.sqzUseAdx,
    sqzAdxMin:                  filters.sqzAdxMin,
    sqzUseVolume:               filters.sqzUseVolume,
    sqzVolLen:                  filters.sqzVolLen,
    sqzMinVolumeRatio:          filters.sqzMinVolumeRatio,
    sqzSlAtrMult:               filters.sqzSlAtrMult,
    sqzTp1AtrMult:              filters.sqzTp1AtrMult,
    sqzTp2AtrMult:              filters.sqzTp2AtrMult,
    sqzUseManualSlTp:           filters.sqzUseManualSlTp,
    sqzManualSlPct:             filters.sqzManualSlPct,
    sqzManualTp1Pct:            filters.sqzManualTp1Pct,
    sqzManualTp2Pct:            filters.sqzManualTp2Pct,
  }
}

export default function Backtesting() {
  const [tab, setTab] = useState<Tab>('backtest')

  // Backtest mode: which of the 3 testers is shown.
  //  symbol     = test ONE coin (uses active strategy from Filters tab)
  //  strategy   = profile comparison (uses Backtest Settings)
  //  allsymbols = winrate across N symbols (uses active filter from Filters tab; no Backtest Settings)
  const [btMode, setBtMode] = useState<'symbol' | 'strategy' | 'allsymbols'>('symbol')
  // Active strategy currently selected in the Filters tab — used by Symbol Test & All Symbols.
  const activeStrategy = useTradingStore((s) => s.selectedStrategy)

  // Backtest controls
  const [btSymbol,       setBtSymbol]       = useState('BTCUSDT')
  const [btTimeframe,    setBtTimeframe]    = useState<TFOpt>('5m')
  const [btStrategy]                        = useState('Supertrend + RelVol')
  const [btNearEntry,    setBtNearEntry]    = useState(true)
  const [btNearEntryPct, setBtNearEntryPct] = useState(0.2)
  const [btAllMaxSymbols, setBtAllMaxSymbols] = useState(0)

  // Behavior controls
  const [pessimisticSameBar, setPessimisticSameBar] = useState(true)
  const [candleLimit,      setCandleLimit]      = useState(600)
  const [btCapital, setBtCapital] = useState(27)
  const [btTradeAmount, setBtTradeAmount] = useState(1)
  const [btLeverage, setBtLeverage] = useState(20)
  const [btMarginMode, setBtMarginMode] = useState<'isolated' | 'cross'>('cross')
  const [btFeeRatePct, setBtFeeRatePct] = useState(0.02)
  const [btMaxOpenPositions, setBtMaxOpenPositions] = useState(10)
  const [btSlippagePct, setBtSlippagePct] = useState(0.05)
  const [btExitMode, setBtExitMode] = useState<'tp1' | 'runner'>('tp1')
  const [btRunnerFraction, setBtRunnerFraction] = useState(0.5)
  const [btDailyLossPct, setBtDailyLossPct] = useState(10)
  const [btLossThreshold, setBtLossThreshold] = useState(0)

  // Time-range replay (to match a past live window). Empty = disabled (latest-N mode).
  const [btUseWindow, setBtUseWindow] = useState(false)
  const [btWindowHours, setBtWindowHours] = useState(8)   // window length
  const [btWindowEndAgo, setBtWindowEndAgo] = useState(0) // how many hours ago the window ENDS (0 = now)

  // Compute window bounds in unix seconds from the "length / ends-ago" inputs.
  const { windowStart, windowEnd } = useMemo(() => {
    if (!btUseWindow) return { windowStart: 0, windowEnd: 0 }
    const nowSec = Math.floor(Date.now() / 1000)
    const end = nowSec - Math.max(0, btWindowEndAgo) * 3600
    const start = end - Math.max(1, btWindowHours) * 3600
    return { windowStart: start, windowEnd: end }
  }, [btUseWindow, btWindowHours, btWindowEndAgo])

  const btOptions = useMemo((): BacktestOptions => ({
    pessimisticSameBar,
    candleLimit,
    startingCapital: btCapital,
    tradeAmount: btTradeAmount,
    leverage: btLeverage,
    marginMode: btMarginMode,
    feeRatePct: btFeeRatePct,
    maxOpenPositions: btMaxOpenPositions,
    slippagePct: btSlippagePct,
    dailyLossLimitPct: btDailyLossPct,
    lossThresholdUSDT: btLossThreshold,
    exitMode: btExitMode,
    runnerFraction: btRunnerFraction,
    source: btUseWindow ? 'mexc' : undefined,   // match live MEXC fills when replaying a window
    windowStart,
    windowEnd,
  }), [pessimisticSameBar, candleLimit, btCapital, btTradeAmount, btLeverage, btMarginMode, btFeeRatePct, btMaxOpenPositions, btSlippagePct, btDailyLossPct, btLossThreshold, btExitMode, btRunnerFraction, btUseWindow, windowStart, windowEnd])

  // Forward test controls
  const [fwSymbol,    setFwSymbol]    = useState('BTCUSDT')
  const [fwTimeframe, setFwTimeframe] = useState<TFOpt>('1h')
  const [fwStrategy,  setFwStrategy]  = useState('Elite Context Breakout')

  // Granular store access — only subscribe to `exchange`. Settings are read on demand via
  // `getState()` inside handlers so unrelated store changes (e.g. live scanner updates) don't
  // re-render this page.
  const exchange = useTradingStore((s) => s.exchange)
  const [symbols, setSymbols] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/prices/symbols?exchange=${exchange}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json?.success && Array.isArray(json.data)) setSymbols(json.data as string[]) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [exchange])

  const backtest = useBacktestRunner()
  const fwd      = useForwardTestRunner()
  const multi    = useMultiBacktestRunner()
  const paper    = usePaperBacktestRunner()
  const profileRun = useProfileBacktestRunner()
  const parity = useParityCheck()

  // Run the parity check using the first selected profile's filters (or the dropdown strategy).
  const handleParityCheck = () => {
    // Pick a profile to test against live: first selected, else first profile of dropdown strategy.
    let strategy = btStrategy
    let filters: FilterSettings | null = null
    for (const s of STRATEGIES) {
      const key = STRATEGY_EDITOR_KEY[s]
      const p = (backtestProfiles[key] ?? []).find((pp) => profSelected.has(pp.id))
      if (p) { strategy = s; filters = p.filters; break }
    }
    const baseSettings: ScanSettings = filters
      ? { ...buildSettingsFromFilters(strategy, filters), lastSignalTimeSec: null, lastSignalDirection: null, lastCandleTimeSec: 0, timeframe: btTimeframe, nearEntryOnly: btNearEntry, nearEntryPct: btNearEntryPct }
      : buildBtSettings()
    parity.run({ timeframe: btTimeframe, baseSettings, options: btOptions })
  }

  // ── Strategy Profiles (backtest-only) ────────────────────────────────────────
  const backtestProfiles      = useTradingStore((s) => s.backtestProfiles)
  const addBacktestProfile    = useTradingStore((s) => s.addBacktestProfile)
  const updateBacktestProfile = useTradingStore((s) => s.updateBacktestProfile)
  const deleteBacktestProfile = useTradingStore((s) => s.deleteBacktestProfile)
  const duplicateBacktestProfile = useTradingStore((s) => s.duplicateBacktestProfile)
  const appendedCoins         = useTradingStore((s) => s.appendedCoins)
  const appendCoins           = useTradingStore((s) => s.appendCoins)
  const clearAppendedCoins    = useTradingStore((s) => s.clearAppendedCoins)

  // Collapse the whole Strategy Profiles panel (collapsed by default to save space)
  const [profPanelOpen, setProfPanelOpen] = useState(false)
  // Which profile result cards have their per-symbol breakdown expanded (by runId)
  const [profBreakdownOpen, setProfBreakdownOpen] = useState<Set<string>>(new Set())
  const toggleProfBreakdown = (runId: string) =>
    setProfBreakdownOpen((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId); else next.add(runId)
      return next
    })
  // Which strategies are ticked to test
  const [profStrategies, setProfStrategies] = useState<Set<string>>(new Set())
  // Which profiles are ticked to run, keyed by profile id
  const [profSelected, setProfSelected] = useState<Set<string>>(new Set())
  // Which profile is currently open in the editor modal (profile id) + its draft + owning strategy key
  const [profEditingId, setProfEditingId] = useState<string | null>(null)
  const [profEditingKey, setProfEditingKey] = useState<StrategyEditorKey | null>(null)
  const [profDraft, setProfDraft] = useState<FilterSettings | null>(null)

  const toggleProfStrategy = (name: string) => {
    setProfStrategies((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }
  const toggleProfSelected = (id: string) => {
    setProfSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const openProfileEditor = (key: StrategyEditorKey, profile: BacktestProfile) => {
    setProfEditingId(profile.id)
    setProfEditingKey(key)
    setProfDraft({ ...profile.filters })
  }
  const saveProfileEditor = () => {
    if (profEditingId && profEditingKey && profDraft) updateBacktestProfile(profEditingKey, profEditingId, { filters: profDraft })
    setProfEditingId(null); setProfEditingKey(null); setProfDraft(null)
  }
  const cancelProfileEditor = () => { setProfEditingId(null); setProfEditingKey(null); setProfDraft(null) }

  // symbolUniverse: when provided (e.g. appended coins), run only those symbols.
  const runSelectedProfiles = (symbolUniverse?: string[]) => {
    const list = symbolUniverse && symbolUniverse.length > 0
      ? symbolUniverse
      : (btAllMaxSymbols > 0 ? symbols.slice(0, btAllMaxSymbols) : symbols)
    const inputs = [] as { runId: string; strategy: string; profileName: string; baseSettings: ScanSettings }[]
    // Run EVERY selected profile, regardless of whether its strategy box is ticked —
    // checking a profile is clear intent. (Strategy tick only controls visibility.)
    for (const strategy of STRATEGIES) {
      const key = STRATEGY_EDITOR_KEY[strategy]
      if (!key) continue
      for (const p of (backtestProfiles[key] ?? [])) {
        if (!profSelected.has(p.id)) continue
        inputs.push({
          runId: `${key}:${p.id}`,
          strategy,
          profileName: p.name,
          baseSettings: {
            ...buildSettingsFromFilters(strategy, p.filters),
            lastSignalTimeSec: null,
            lastSignalDirection: null,
            lastCandleTimeSec: 0,
            timeframe: btTimeframe,
            nearEntryOnly: btNearEntry,
            nearEntryPct: btNearEntryPct,
          },
        })
      }
    }
    if (inputs.length === 0) return
    setProfPanelOpen(true)   // ensure results are visible
    profileRun.run({ inputs, symbols: list, timeframe: btTimeframe, options: btOptions })
  }

  const handleRunProfiles = () => runSelectedProfiles()
  const handleRunAppendedCoins = () => runSelectedProfiles(appendedCoins)

  // Pair a finished run row with the exact profile settings that produced it. The runId is
  // `${editorKey}:${profileId}`; the profile (with its FilterSettings) lives in the store.
  const buildExportInput = (row: ProfileRunRow): ProfileExportInput | null => {
    if (!row.result) return null
    const sep = row.runId.indexOf(':')
    const key = row.runId.slice(0, sep) as StrategyEditorKey
    const profileId = row.runId.slice(sep + 1)
    const profile = (backtestProfiles[key] ?? []).find((p) => p.id === profileId)
    return { profileName: row.profileName, strategy: row.strategy, filters: profile?.filters ?? null, result: row.result }
  }
  const exportMeta = () => ({
    timeframe: btTimeframe,
    options: btOptions,
    symbolCount: (btAllMaxSymbols > 0 ? symbols.slice(0, btAllMaxSymbols) : symbols).length,
  })
  const handleExportProfile = (row: ProfileRunRow) => {
    const inp = buildExportInput(row)
    if (inp) exportProfileResults([inp], exportMeta())
  }
  const handleExportAllProfiles = () => {
    const inputs = profileRun.rows.map(buildExportInput).filter((x): x is ProfileExportInput => x !== null)
    if (inputs.length > 0) exportProfileResults(inputs, exportMeta())
  }

  // Pick coins from a profile's per-symbol breakdown by a winrate criterion.
  const coinsByMode = (
    breakdown: Record<string, { trades: number; wins: number; r: number }>,
    mode: 'winning' | 'nonZero' | 'perfect',
  ): string[] => {
    const coins: string[] = []
    for (const [sym, v] of Object.entries(breakdown)) {
      if (v.trades <= 0) continue
      const wr = (v.wins / v.trades) * 100
      if (mode === 'winning' && wr > 0) coins.push(sym)
      else if (mode === 'nonZero' && wr > 0) coins.push(sym)   // "remove 0%" = keep the non-zero ones
      else if (mode === 'perfect' && wr >= 100) coins.push(sym)
    }
    return coins
  }

  // Extract coins from a profile's per-symbol breakdown by a winrate criterion, then append (add-only).
  const appendFromResult = (
    breakdown: Record<string, { trades: number; wins: number; r: number }>,
    mode: 'winning' | 'nonZero' | 'perfect',
  ) => {
    const coins = coinsByMode(breakdown, mode)
    if (coins.length > 0) appendCoins(coins)
  }

  // Same winrate criteria, but push the selected coins to the LIVE Background Scanner's symbol
  // list (add-only, deduped) via its API — so winning coins can be promoted straight to live.
  const [scannerMsg, setScannerMsg] = useState<string | null>(null)
  const pushToScanner = async (
    breakdown: Record<string, { trades: number; wins: number; r: number }>,
    mode: 'winning' | 'nonZero' | 'perfect',
  ) => {
    const coins = coinsByMode(breakdown, mode)
    if (coins.length === 0) { setScannerMsg('No matching coins'); setTimeout(() => setScannerMsg(null), 3000); return }
    try {
      let existing: string[] = []
      try {
        const sres = await fetch('/api/bgscanner/status')
        const sjson = await sres.json().catch(() => null)
        const cur = sjson?.data?.settings?.symbols
        if (Array.isArray(cur)) existing = cur.filter((s: unknown): s is string => typeof s === 'string')
      } catch { /* no scanner state — fall back to just the new coins */ }
      const merged = Array.from(new Set([...existing, ...coins]))
      const res = await fetch('/api/bgscanner/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: merged }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setScannerMsg(`Sent ${coins.length} coin(s) to BG Scanner (now ${merged.length} total)`)
    } catch (e) {
      setScannerMsg(`Failed: ${e instanceof Error ? e.message : 'error'}`)
    }
    setTimeout(() => setScannerMsg(null), 4000)
  }

  const buildBtSettings = (): ScanSettings => ({
    ...buildBaseSettings(useTradingStore.getState(), btStrategy),
    lastSignalTimeSec: null,
    lastSignalDirection: null,
    lastCandleTimeSec: 0,
    timeframe: btTimeframe,
    nearEntryOnly: btNearEntry,
    nearEntryPct:  btNearEntryPct,
  })

  const buildFwSettings = (): ScanSettings => ({
    ...buildBaseSettings(useTradingStore.getState(), fwStrategy),
    lastSignalTimeSec: null,
    lastSignalDirection: null,
    lastCandleTimeSec: 0,
    timeframe: fwTimeframe,
  })

  // Build settings from the ACTIVE strategy in the Filters tab (for Symbol Test & All Symbols).
  const buildActiveFilterSettings = (): ScanSettings => ({
    ...buildBaseSettings(useTradingStore.getState(), useTradingStore.getState().selectedStrategy),
    lastSignalTimeSec: null,
    lastSignalDirection: null,
    lastCandleTimeSec: 0,
    timeframe: btTimeframe,
    nearEntryOnly: btNearEntry,
    nearEntryPct:  btNearEntryPct,
  })

  // Symbol Test — one coin, using the active Filters-tab strategy.
  const handleBtRun = () => {
    backtest.run({ symbol: btSymbol, timeframe: btTimeframe, baseSettings: buildActiveFilterSettings(), options: btOptions })
  }

  // All Symbols Backtest — winrate across N symbols, using the active Filters-tab filter.
  // No Backtest Settings dependency: per-symbol ranked backtest (multi runner).
  const handleBtRunAll = () => {
    const list = btAllMaxSymbols > 0 ? symbols.slice(0, btAllMaxSymbols) : symbols
    multi.runAll({ symbols: list, timeframe: btTimeframe, baseSettings: buildActiveFilterSettings(), options: btOptions })
  }

  const handleFwStart = () => {
    fwd.start({ symbol: fwSymbol, timeframe: fwTimeframe, baseSettings: buildFwSettings() })
  }

  const multiAgg = useMemo(() => {
    const rows = multi.result?.rows ?? []
    if (rows.length === 0) return null

    const totalSymbols = rows.length
    const errorSymbols = rows.filter((r) => Boolean(r.error)).length
    const tradedRows = rows.filter((r) => r.summary.totalTrades > 0)
    const tradedSymbols = tradedRows.length

    const profitableSymbols = tradedRows.filter((r) => r.summary.totalR > 0).length
    const losingSymbols = tradedRows.filter((r) => r.summary.totalR < 0).length
    const breakevenSymbols = tradedRows.filter((r) => r.summary.totalR === 0).length

    const totalTrades = tradedRows.reduce((s, r) => s + r.summary.totalTrades, 0)
    const totalWins = tradedRows.reduce((s, r) => s + r.summary.wins, 0)
    const totalLosses = tradedRows.reduce((s, r) => s + r.summary.losses, 0)
    const totalR = tradedRows.reduce((s, r) => s + r.summary.totalR, 0)
    const totalNetPnl = tradedRows.reduce((s, r) => s + r.summary.netPnl, 0)
    const totalGrossPnl = tradedRows.reduce((s, r) => s + r.summary.grossPnl, 0)
    const totalFees = tradedRows.reduce((s, r) => s + r.summary.totalFees, 0)
    const totalStartingCapital = btCapital
    const totalEndingCapital = btCapital + totalNetPnl
    const totalReturnPct = totalStartingCapital > 0 ? (totalNetPnl / totalStartingCapital) * 100 : 0
    const overallWinrate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0
    const avgRPerTrade = totalTrades > 0 ? totalR / totalTrades : 0
    const avgRPerSymbol = tradedSymbols > 0 ? totalR / tradedSymbols : 0
    const avgSymbolWinrate =
      tradedSymbols > 0 ? tradedRows.reduce((s, r) => s + r.summary.winrate, 0) / tradedSymbols : 0

    const best = tradedRows.reduce((b, r) => (r.summary.totalR > b.summary.totalR ? r : b), tradedRows[0] ?? rows[0])
    const worst = tradedRows.reduce((w, r) => (r.summary.totalR < w.summary.totalR ? r : w), tradedRows[0] ?? rows[0])

    return {
      totalSymbols,
      tradedSymbols,
      errorSymbols,
      profitableSymbols,
      losingSymbols,
      breakevenSymbols,
      totalTrades,
      totalWins,
      totalLosses,
      overallWinrate,
      totalR,
      totalStartingCapital,
      totalEndingCapital,
      totalNetPnl,
      totalGrossPnl,
      totalFees,
      totalReturnPct,
      avgRPerTrade,
      avgRPerSymbol,
      avgSymbolWinrate,
      best,
      worst,
    }
  }, [multi.result, btCapital])

  const allTrades = useMemo(() => {
    const list = [...fwd.state.trades]
    if (fwd.state.activeTrade) list.push(fwd.state.activeTrade)
    return list.reverse()
  }, [fwd.state])

  // Parity Check card — defined here so it can be rendered at the very bottom of the page,
  // always visible regardless of the current backtest mode.
  const parityCard = (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between py-2.5">
        <div>
          <CardTitle className="text-slate-100 text-sm">Parity Check — Backtest vs Live</CardTitle>
          <div className="text-[10px] text-slate-500 mt-0.5">Pulls your real MEXC closed trades, runs the backtest over that exact window + symbols, and diffs them.</div>
        </div>
        <div className="flex items-center gap-2">
          {parity.running && <span className="text-xs text-amber-400">{parity.progress}%</span>}
          <Button className="h-7 px-3 text-xs font-bold" onClick={handleParityCheck} disabled={parity.running}>
            Run Parity Check
          </Button>
          {parity.running && <Button variant="secondary" className="h-7 px-2 text-xs border-slate-800" onClick={parity.stop}>Stop</Button>}
        </div>
      </CardHeader>
      {(parity.error || parity.result) && (
        <CardContent className="pt-3 space-y-3">
          {parity.error && <div className="text-xs text-red-400">{parity.error}</div>}
          {parity.result && (() => {
            const r = parity.result
            const pnlDelta = r.backtest.totalPnl - r.live.totalPnl
            const countMatch = r.tradeCountMatchPct
            const verdict = countMatch >= 90 && r.symbolsLiveOnly === 0 ? 'STRONG MATCH'
              : countMatch >= 70 ? 'PARTIAL MATCH' : 'MISMATCH'
            const verdictColor = verdict === 'STRONG MATCH' ? 'text-emerald-400' : verdict === 'PARTIAL MATCH' ? 'text-amber-400' : 'text-red-400'
            return (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn('text-sm font-black', verdictColor)}>{verdict}</span>
                  <span className="text-[11px] text-slate-500">
                    Window: {new Date(r.window.start * 1000).toLocaleString()} → {new Date(r.window.end * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Live Trades</div>
                    <div className="font-mono font-bold text-slate-100">{r.live.count}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Backtest Trades</div>
                    <div className="font-mono font-bold text-slate-100">{r.backtest.count}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Trade-Count Match</div>
                    <div className={cn('font-mono font-bold', countMatch >= 90 ? 'text-emerald-400' : countMatch >= 70 ? 'text-amber-400' : 'text-red-400')}>{countMatch.toFixed(0)}%</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Symbols matched</div>
                    <div className="font-mono font-bold text-slate-100">{r.symbolsMatched}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Live P&L</div>
                    <div className={cn('font-mono font-bold', r.live.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{r.live.totalPnl >= 0 ? '+' : ''}${r.live.totalPnl.toFixed(2)}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Backtest P&L</div>
                    <div className={cn('font-mono font-bold', r.backtest.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{r.backtest.totalPnl >= 0 ? '+' : ''}${r.backtest.totalPnl.toFixed(2)}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">P&L Δ (bt − live)</div>
                    <div className={cn('font-mono font-bold', Math.abs(pnlDelta) < 0.01 ? 'text-emerald-400' : 'text-amber-400')}>{pnlDelta >= 0 ? '+' : ''}${pnlDelta.toFixed(2)}</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Live-only / BT-only</div>
                    <div className="font-mono font-bold text-slate-300">{r.symbolsLiveOnly} / {r.symbolsBtOnly}</div>
                  </div>
                </div>
                {(r.symbolsLiveOnly > 0 || r.symbolsBtOnly > 0) && (
                  <div className="text-[11px] text-amber-300/80">
                    {r.symbolsLiveOnly > 0 && <span>{r.symbolsLiveOnly} symbol(s) traded live but NOT in backtest (missed signals). </span>}
                    {r.symbolsBtOnly > 0 && <span>{r.symbolsBtOnly} symbol(s) traded in backtest but NOT live (phantom/filtered live).</span>}
                  </div>
                )}
                <div className="overflow-x-auto rounded border border-slate-800 max-h-72 overflow-y-auto">
                  <table className="min-w-[420px] w-full text-xs">
                    <thead className="bg-slate-900/50 text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Symbol</th>
                        <th className="px-2 py-1.5 text-left">Live Trades</th>
                        <th className="px-2 py-1.5 text-left">BT Trades</th>
                        <th className="px-2 py-1.5 text-left">Live P&L</th>
                        <th className="px-2 py-1.5 text-left">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {r.rows.map((row) => (
                        <tr key={row.symbol} className="text-slate-200 hover:bg-slate-900/40">
                          <td className="px-2 py-1 font-mono font-semibold">{row.symbol}</td>
                          <td className="px-2 py-1">{row.liveTrades}</td>
                          <td className="px-2 py-1">{row.btTrades}</td>
                          <td className={cn('px-2 py-1 font-mono', row.livePnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{row.livePnl >= 0 ? '+' : ''}{row.livePnl.toFixed(2)}</td>
                          <td className="px-2 py-1">{row.match ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          })()}
        </CardContent>
      )}
    </Card>
  )

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-slate-100">Backtesting & Forward Testing</div>
            <div className="text-xs text-slate-500">Test strategies on historical data or paper-trade live signals.</div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setTab('backtest')}
              className={cn('rounded px-4 py-1.5 text-sm font-semibold transition-colors', tab === 'backtest' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200')}
            >
              Backtest
            </button>
            <button
              onClick={() => setTab('forwardtest')}
              className={cn('rounded px-4 py-1.5 text-sm font-semibold transition-colors', tab === 'forwardtest' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200')}
            >
              Forward Test
            </button>
          </div>
        </div>

        {/* ── BACKTEST TAB ─────────────────────────────────────────────────── */}
        {tab === 'backtest' && (
          <div className="space-y-4">
            {/* ── Mode selector: pick which tester to show ── */}
            <Card className="border-slate-800 bg-slate-950">
              <CardContent className="py-3 flex flex-wrap items-center gap-3">
                <div className="text-xs text-slate-400">Test mode</div>
                <select
                  value={btMode}
                  onChange={(e) => setBtMode(e.target.value as 'symbol' | 'strategy' | 'allsymbols')}
                  className="h-9 rounded border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                >
                  <option value="symbol">Symbol Test — one coin (uses active Filters-tab strategy)</option>
                  <option value="strategy">Strategy Test — profile comparison (uses Backtest Settings)</option>
                  <option value="allsymbols">All Symbols Backtest — winrate across N coins (uses active filter)</option>
                </select>
                {(btMode === 'symbol' || btMode === 'allsymbols') && (
                  <span className="text-[11px] text-slate-500">Active strategy: <span className="text-slate-300 font-mono">{activeStrategy}</span></span>
                )}
              </CardContent>
            </Card>

            {/* ── Strategy Profiles (backtest-only filters, independent of live) ── */}
            {btMode === 'strategy' && (
            <>
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between py-2.5">
                <button onClick={() => setProfPanelOpen((o) => !o)} className="flex items-center gap-2 text-slate-100 hover:text-white">
                  <span className="text-slate-500 text-xs w-3">{profPanelOpen ? '▼' : '▶'}</span>
                  <CardTitle className="text-slate-100 text-sm">Strategy Profiles</CardTitle>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {profStrategies.size} strategy · {profSelected.size} selected
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {profileRun.running && <span className="text-xs text-amber-400">Running…</span>}
                  {appendedCoins.length > 0 ? (
                    <>
                      <span className="text-[10px] text-emerald-400/80 font-mono">{appendedCoins.length} appended</span>
                      <Button
                        className="h-7 px-3 text-xs font-bold"
                        onClick={handleRunAppendedCoins}
                        disabled={profileRun.running || profSelected.size === 0}
                      >
                        Run Appended Coins ({appendedCoins.length})
                      </Button>
                      <Button variant="secondary" className="h-7 px-2 text-xs border-slate-800" onClick={clearAppendedCoins} disabled={profileRun.running}>Clear</Button>
                    </>
                  ) : (
                    <Button
                      className="h-7 px-3 text-xs font-bold"
                      onClick={handleRunProfiles}
                      disabled={profileRun.running || profSelected.size === 0}
                    >
                      Run ({profSelected.size})
                    </Button>
                  )}
                  {profileRun.running && (
                    <Button variant="secondary" className="h-7 px-3 text-xs border-slate-800" onClick={profileRun.stop}>Stop</Button>
                  )}
                </div>
              </CardHeader>
              {profPanelOpen && (
              <CardContent className="pt-3 space-y-2">
                {STRATEGIES.map((strategy) => {
                  const key = STRATEGY_EDITOR_KEY[strategy]
                  const enabled = profStrategies.has(strategy)
                  const profiles = backtestProfiles[key] ?? []
                  return (
                    <div key={strategy} className={cn('rounded border', enabled ? 'border-slate-700 bg-slate-900/40' : 'border-slate-900 bg-slate-950')}>
                      <div className="flex items-center justify-between px-2 py-1">
                        <label className={cn('flex items-center gap-2 text-xs font-semibold cursor-pointer', enabled ? 'text-slate-100' : 'text-slate-500')}>
                          <input type="checkbox" checked={enabled} onChange={() => toggleProfStrategy(strategy)} />
                          {strategy}
                          <span className="text-[10px] text-slate-600 font-normal">({profiles.length})</span>
                        </label>
                        <button
                          onClick={() => addBacktestProfile(key)}
                          disabled={!enabled}
                          className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          + Add
                        </button>
                      </div>

                      {enabled && (
                        <div className="px-2 pb-1.5 space-y-1">
                          {profiles.length === 0 && (
                            <div className="text-[11px] text-slate-600 italic">No profiles — click “+ Add”.</div>
                          )}
                          {profiles.map((p) => (
                            <div key={p.id} className="rounded border border-slate-800 bg-slate-950">
                              <div className="flex items-center justify-between px-2 py-1">
                                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer flex-1 min-w-0">
                                  <input type="checkbox" checked={profSelected.has(p.id)} onChange={() => toggleProfSelected(p.id)} />
                                  <input
                                    value={p.name}
                                    onChange={(e) => updateBacktestProfile(key, p.id, { name: e.target.value })}
                                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-slate-500 outline-none font-mono text-slate-100 px-1 py-0.5 max-w-[180px]"
                                  />
                                </label>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => openProfileEditor(key, p)}
                                    className="text-[11px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800">
                                    Edit
                                  </button>
                                  <button onClick={() => duplicateBacktestProfile(key, p.id)}
                                    className="text-[11px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 hover:bg-slate-800">Dup</button>
                                  <button onClick={() => { if (profEditingId === p.id) cancelProfileEditor(); deleteBacktestProfile(key, p.id); setProfSelected((s) => { const n = new Set(s); n.delete(p.id); return n }) }}
                                    className="text-[11px] px-1.5 py-0.5 rounded border border-rose-900 text-rose-300 hover:bg-rose-950/30">Del</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
              )}
            </Card>

            {/* Parallel run results — one card per profile. Always visible (outside collapse). */}
            {profileRun.rows.length > 0 && (
              <Card className="border-slate-800 bg-slate-950">
                <CardHeader className="border-b border-slate-800 py-2.5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-100 text-sm">Profile Results ({profileRun.rows.length} running in parallel)</CardTitle>
                    <Button
                      variant="secondary"
                      className="h-7 px-2 text-xs border-slate-800"
                      onClick={handleExportAllProfiles}
                      disabled={!profileRun.rows.some((r) => r.result)}
                      title="Download all finished profile results + settings as one Excel workbook"
                    >
                      ⤓ Export all (.xlsx)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  {appendedCoins.length > 0 && (
                    <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] font-semibold text-emerald-300">Stored coins ({appendedCoins.length})</div>
                        <button onClick={clearAppendedCoins} className="text-[10px] text-slate-400 hover:text-rose-300">Clear all</button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {appendedCoins.map((c) => (
                          <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {profileRun.rows.map((row) => (
                      <div key={row.runId} className="rounded border border-slate-800 bg-slate-900/40 p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-slate-100 truncate" title={`${row.strategy} — ${row.profileName}`}>
                            {row.profileName} <span className="text-[10px] text-slate-500">{row.strategy}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {row.result && (
                              <button
                                onClick={() => handleExportProfile(row)}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-emerald-300"
                                title="Download this profile's results + settings as an Excel file"
                              >
                                ⤓ Excel
                              </button>
                            )}
                            <span className={cn('text-[10px] font-mono', row.status === 'done' ? 'text-emerald-400' : row.status === 'error' ? 'text-red-400' : 'text-amber-400')}>
                              {row.status === 'running' ? `${row.progress}%` : row.status}
                            </span>
                          </div>
                        </div>
                        {(row.status === 'running' || row.status === 'queued') && (
                          <div className="mt-1.5">
                            <div className="mb-0.5 flex items-center justify-between text-[10px] text-slate-500">
                              <span>{row.status === 'queued' ? 'Queued…' : 'Backtesting…'}</span>
                              <span className="font-mono text-amber-400">{row.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
                              <div className="h-full bg-amber-500 transition-all" style={{ width: `${row.status === 'queued' ? 0 : row.progress}%` }} />
                            </div>
                          </div>
                        )}
                        {row.error && <div className="text-[11px] text-red-400 mt-1">{row.error}</div>}
                        {row.result && (
                          <>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div><div className="text-[10px] text-slate-500">Trades</div><div className="font-mono font-bold text-slate-100">{row.result.summary.totalTrades}</div></div>
                            <div><div className="text-[10px] text-slate-500">Win Rate</div><div className="font-mono font-bold text-slate-100">{row.result.summary.winrate.toFixed(1)}%</div></div>
                            <div><div className="text-[10px] text-slate-500">Net P/L</div><div className={cn('font-mono font-bold', row.result.summary.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>{row.result.summary.netPnl >= 0 ? '+' : ''}${row.result.summary.netPnl.toFixed(2)}</div></div>
                            <div><div className="text-[10px] text-slate-500">Total R</div><div className={cn('font-mono font-bold', row.result.summary.totalR >= 0 ? 'text-emerald-400' : 'text-red-400')}>{row.result.summary.totalR.toFixed(2)}R</div></div>
                            <div><div className="text-[10px] text-slate-500">Return</div><div className={cn('font-mono font-bold', row.result.summary.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>{row.result.summary.returnPct.toFixed(1)}%</div></div>
                            <div><div className="text-[10px] text-slate-500">Signals</div><div className="font-mono font-bold text-slate-300">{row.result.diag.signalsFired}</div></div>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Dropped — slots {row.result.diag.droppedSlots} · margin {row.result.diag.droppedCapital} · dedup {row.result.diag.droppedDedup} · fill-gap {row.result.diag.droppedFillGap} · daily-loss {row.result.diag.droppedDailyLoss ?? 0} · kill-switch {row.result.diag.droppedRiskStop ?? 0}
                          </div>
                          {/* Append-to-stored-coins actions (add-only into shared list) */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-500">Append:</span>
                            <button onClick={() => appendFromResult(row.result!.symbolBreakdown, 'winning')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300 hover:bg-emerald-950/30">
                              Winning
                            </button>
                            <button onClick={() => appendFromResult(row.result!.symbolBreakdown, 'nonZero')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300 hover:bg-emerald-950/30">
                              Remove 0% Winrate
                            </button>
                            <button onClick={() => appendFromResult(row.result!.symbolBreakdown, 'perfect')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-300 hover:bg-emerald-950/30">
                              100% Winrate
                            </button>
                          </div>
                          {/* Promote the same coin sets straight to the live Background Scanner. */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-slate-500">→ BG Scanner:</span>
                            <button onClick={() => pushToScanner(row.result!.symbolBreakdown, 'winning')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-sky-800 text-sky-300 hover:bg-sky-950/30">
                              Winning
                            </button>
                            <button onClick={() => pushToScanner(row.result!.symbolBreakdown, 'nonZero')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-sky-800 text-sky-300 hover:bg-sky-950/30">
                              Remove 0% Winrate
                            </button>
                            <button onClick={() => pushToScanner(row.result!.symbolBreakdown, 'perfect')}
                              className="text-[11px] px-1.5 py-0.5 rounded border border-sky-800 text-sky-300 hover:bg-sky-950/30">
                              100% Winrate
                            </button>
                          </div>
                          {scannerMsg && <div className="mt-1 text-[10px] font-mono text-sky-300">{scannerMsg}</div>}
                          {(() => {
                            const traded = Object.entries(row.result.symbolBreakdown)
                              .filter(([, v]) => v.trades > 0)
                              .sort(([, a], [, b]) => b.r - a.r)
                            const open = profBreakdownOpen.has(row.runId)
                            return (
                              <div className="mt-2">
                                <button onClick={() => toggleProfBreakdown(row.runId)}
                                  className="text-[11px] text-slate-400 hover:text-slate-200">
                                  {open ? '▼' : '▶'} Per-coin breakdown ({traded.length} coin{traded.length === 1 ? '' : 's'})
                                </button>
                                {open && (
                                  <div className="mt-1 overflow-x-auto rounded border border-slate-800 max-h-64 overflow-y-auto">
                                    <table className="min-w-[360px] w-full text-xs">
                                      <thead className="bg-slate-900/50 text-slate-400 sticky top-0">
                                        <tr>
                                          <th className="px-2 py-1.5 text-left">Symbol</th>
                                          <th className="px-2 py-1.5 text-left">Trades</th>
                                          <th className="px-2 py-1.5 text-left">Wins</th>
                                          <th className="px-2 py-1.5 text-left">Win%</th>
                                          <th className="px-2 py-1.5 text-left">Total R</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800">
                                        {traded.length === 0 ? (
                                          <tr><td colSpan={5} className="px-2 py-2 text-center text-slate-600">No coins traded.</td></tr>
                                        ) : traded.map(([sym, v]) => (
                                          <tr key={sym} className="text-slate-200 hover:bg-slate-900/40">
                                            <td className="px-2 py-1 font-mono font-semibold">{sym}</td>
                                            <td className="px-2 py-1">{v.trades}</td>
                                            <td className="px-2 py-1">{v.wins}</td>
                                            <td className="px-2 py-1">{((v.wins / v.trades) * 100).toFixed(0)}%</td>
                                            <td className={cn('px-2 py-1 font-bold font-mono', v.r >= 0 ? 'text-emerald-400' : 'text-red-400')}>{v.r >= 0 ? '+' : ''}{v.r.toFixed(2)}R</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parity Check moved to the very bottom of the page — see {parityCard} render. */}
            </>
            )}

            {/* ── Symbol Test — one coin ── */}
            {btMode === 'symbol' && (
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">Symbol Test — one coin</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Symbol</div>
                    <SymbolSelect value={btSymbol} options={symbols} onChange={setBtSymbol} disabled={backtest.running} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Timeframe</div>
                    <div className="flex gap-1">
                      {TF_OPTIONS.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setBtTimeframe(tf)}
                          className={cn('rounded border px-2 py-1 text-xs font-bold', btTimeframe === tf ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300')}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Strategy (from Filters tab)</div>
                    <div className="h-8 flex items-center rounded border border-slate-800 bg-slate-900/60 px-2 text-xs text-slate-300 font-mono">
                      {activeStrategy}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Near Entry</div>
                    <div className="flex items-center gap-2 h-8">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={btNearEntry}
                          onChange={(e) => setBtNearEntry(e.target.checked)}
                          className="accent-blue-500"
                        />
                        <span className="text-xs text-slate-300">Only within</span>
                      </label>
                      <input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={btNearEntryPct}
                        disabled={!btNearEntry}
                        onChange={(e) => setBtNearEntryPct(Number(e.target.value))}
                        className="w-16 h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono disabled:opacity-40"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="h-8 px-4 font-bold"
                      onClick={handleBtRun}
                      disabled={backtest.running}
                    >
                      {backtest.running ? `Running… ${backtest.progress}%` : 'Run Backtest'}
                    </Button>
                  </div>
                </div>
                {backtest.error && (
                  <div className="text-xs text-red-400">{backtest.error}</div>
                )}
                {backtest.running && (
                  <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${backtest.progress}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* ── Backtest Settings — applies to Strategy Test (profile comparison) ── */}
            {btMode === 'strategy' && (
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">Backtest Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="text-xs text-slate-500">
                  Capital is your account balance. Margin / Trade is multiplied by leverage to create position size; fees are charged per side on position size.
                </div>

                {/* Timeframe — applied to all profile comparison runs */}
                <div>
                  <div className="text-xs text-slate-400 mb-1">Timeframe</div>
                  <div className="flex gap-1">
                    {TF_OPTIONS.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setBtTimeframe(tf)}
                        className={cn('rounded border px-2 py-1 text-xs font-bold', btTimeframe === tf ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300')}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time-range replay — match a past live window using MEXC candles */}
                <div className="rounded border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                    <input type="checkbox" checked={btUseWindow} onChange={(e) => setBtUseWindow(e.target.checked)} />
                    Replay a past time window (MEXC candles — match live)
                  </label>
                  {btUseWindow && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Window length (hours)</div>
                          <input
                            type="number" min={1} step={1}
                            value={btWindowHours}
                            onChange={(e) => setBtWindowHours(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                            className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Window ends (hours ago, 0 = now)</div>
                          <input
                            type="number" min={0} step={1}
                            value={btWindowEndAgo}
                            onChange={(e) => setBtWindowEndAgo(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-amber-300/80 font-mono">
                        Replaying {new Date(windowStart * 1000).toLocaleString()} → {new Date(windowEnd * 1000).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Fetches ~55 warm-up bars before and a buffer after so in-window trades resolve like live. Compare results to the Realized P&amp;L panel filtered to the same window.
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Candle History {btUseWindow && <span className="text-amber-500/80">(ignored in replay)</span>}
                    </div>
                    <input
                      type="number" min={100} step={100}
                      value={candleLimit}
                      onChange={(e) => setCandleLimit(Math.max(100, Math.floor(Number(e.target.value) || 5000)))}
                      disabled={btUseWindow}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono disabled:opacity-40"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">
                      {btUseWindow ? 'Candle count is set by the replay window (warm-up + window + buffer).' : (() => {
                        const perDay: Record<string, number> = {
                          '1m': 1440, '3m': 480, '5m': 288, '15m': 96, '30m': 48,
                          '1h': 24, '2h': 12, '4h': 6, '6h': 4, '8h': 3, '12h': 2, '1d': 1,
                        }
                        const totalMins = candleLimit * (1440 / (perDay[btTimeframe] ?? 24))
                        const days  = Math.floor(totalMins / 1440)
                        const hours = Math.floor((totalMins % 1440) / 60)
                        const parts = []
                        if (days > 0)  parts.push(`${days}d`)
                        if (hours > 0) parts.push(`${hours}h`)
                        return `≈ ${parts.join(' ')} on ${btTimeframe}`
                      })()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Capital</div>
                    <input
                      type="number" min={1} step={100}
                      value={btCapital}
                      onChange={(e) => setBtCapital(Math.max(1, Number(e.target.value) || 10000))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Your MEXC-style account balance.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Margin / Trade (USDT)</div>
                    <input
                      type="number" min={0.01} step={1}
                      value={btTradeAmount}
                      onChange={(e) => setBtTradeAmount(Math.max(0.01, Number(e.target.value) || 100))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Dollars from balance used for each signal.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Leverage</div>
                    <input
                      type="number" min={1} max={500} step={1}
                      value={btLeverage}
                      onChange={(e) => setBtLeverage(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Position size = margin × leverage.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Margin Mode</div>
                    <div className="flex rounded border border-slate-800 overflow-hidden h-8">
                      {(['isolated', 'cross'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setBtMarginMode(mode)}
                          className={cn(
                            'flex-1 text-xs font-semibold capitalize transition-colors',
                            btMarginMode === mode
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200',
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      {btMarginMode === 'isolated' ? 'Each trade has its own margin. Liq = entry × (1 − 1/lev).' : 'All capital backs every trade. Liq moves with account balance.'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Fee / Side %</div>
                    <input
                      type="number" min={0} max={5} step={0.001}
                      value={btFeeRatePct}
                      onChange={(e) => setBtFeeRatePct(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">MEXC taker default: 0.020% per side.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Max Open Positions</div>
                    <input
                      type="number" min={1} max={50} step={1}
                      value={btMaxOpenPositions}
                      onChange={(e) => setBtMaxOpenPositions(Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Match your MEXC Max Trades for live parity.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Slippage % / Fill</div>
                    <input
                      type="number" min={0} max={1} step={0.01}
                      value={btSlippagePct}
                      onChange={(e) => setBtSlippagePct(Math.max(0, Math.min(1, Number(e.target.value) || 0)))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Adverse slip on entry AND exit market fills. 0 = ideal fills.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Daily Loss Limit %</div>
                    <input
                      type="number" min={0} max={99} step={1}
                      value={btDailyLossPct}
                      onChange={(e) => setBtDailyLossPct(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Halt new entries for the rest of a UTC day after this % drawdown — mirrors live breaker. 0 = off.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Loss Threshold (USDT)</div>
                    <input
                      type="number" min={0} step={1}
                      value={btLossThreshold}
                      onChange={(e) => setBtLossThreshold(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                    />
                    <div className="text-[11px] text-slate-600 mt-1">Stop ALL new entries once capital ≤ this floor — mirrors live kill switch. 0 = off.</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">Exit Strategy</div>
                    <div className="flex gap-1">
                      {(['tp1', 'runner'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setBtExitMode(mode)}
                          className={cn(
                            'flex-1 h-8 rounded border px-2 text-xs',
                            btExitMode === mode
                              ? 'border-sky-700 bg-sky-950/40 text-sky-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700',
                          )}
                        >
                          {mode === 'tp1' ? '100% at TP1' : 'TP1 partial → TP2 runner'}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      {btExitMode === 'tp1'
                        ? 'All-out at TP1 — matches the live MEXC bracket.'
                        : 'Partial closes at TP1, stop moves to breakeven, the rest runs to TP2. NOT what live executes yet — research mode.'}
                    </div>
                  </div>

                  {btExitMode === 'runner' && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Runner Fraction</div>
                      <input
                        type="number" min={0.05} max={0.95} step={0.05}
                        value={btRunnerFraction}
                        onChange={(e) => setBtRunnerFraction(Math.max(0.05, Math.min(0.95, Number(e.target.value) || 0.5)))}
                        className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                      />
                      <div className="text-[11px] text-slate-600 mt-1">Share left running to TP2 after the TP1 partial (0.5 = half).</div>
                    </div>
                  )}

                  <button
                    onClick={() => setPessimisticSameBar(!pessimisticSameBar)}
                    className="flex items-start justify-between rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-700"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Pessimistic Same-Bar Resolution</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">When SL+TP both touch in one bar, book as loss (industry standard).</div>
                    </div>
                    <span className={pessimisticSameBar ? 'h-4 w-4 rounded-sm bg-blue-600' : 'h-4 w-4 rounded-sm border border-slate-700'} />
                  </button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* ── All Symbols Backtest — winrate across N coins, active Filters-tab filter ── */}
            {btMode === 'allsymbols' && (
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">All Symbols Backtest</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-xs text-slate-500">
                  Tests per-coin win rate across N symbols using the <span className="text-slate-300 font-mono">{activeStrategy}</span> strategy from the Filters tab. No Backtest Settings needed.
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Max Symbols (0 = all)</div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={btAllMaxSymbols}
                      disabled={multi.running}
                      onChange={(e) => setBtAllMaxSymbols(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      className="w-28 h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 mb-1">Timeframe</div>
                    <div className="flex gap-1">
                      {TF_OPTIONS.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setBtTimeframe(tf)}
                          className={cn('rounded border px-2 py-1 text-xs font-bold', btTimeframe === tf ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300')}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    {!multi.running ? (
                      <Button
                        className="h-8 px-4 font-bold"
                        onClick={handleBtRunAll}
                        disabled={symbols.length === 0}
                      >
                        Run All Symbols
                      </Button>
                    ) : (
                      <Button variant="secondary" className="h-8 border-slate-800" onClick={() => multi.stop()}>
                        Stop
                      </Button>
                    )}
                    <div className="text-xs text-slate-500">
                      {symbols.length === 0 ? 'No symbols loaded' : `${btAllMaxSymbols > 0 ? Math.min(btAllMaxSymbols, symbols.length) : symbols.length} symbols`}
                    </div>
                  </div>
                </div>

                {(multi.error || paper.error) && <div className="text-xs text-red-400">{multi.error ?? paper.error}</div>}

                {multi.running && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">Progress: {multi.progress.done}/{multi.progress.total}</div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${multi.progress.total > 0 ? Math.round((multi.progress.done / multi.progress.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                )}
                {paper.running && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      {paper.progress < 30
                        ? `Building indicator caches… ${paper.progress}%`
                        : `Simulating trades… ${paper.progress}%`}
                    </div>
                    <div className="h-2 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-100"
                        style={{ width: `${paper.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {paper.result && (
                  <div className="space-y-4">
                    <div className="text-xs text-slate-400 font-semibold">Paper Trade Result — Single Account Simulation</div>
                    {paper.result.diag && (
                      <div className="rounded border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-[11px] font-mono text-amber-200/90 space-y-1">
                        <div className="font-bold text-amber-300">Signal Diagnostic — why trades = {paper.result.diag.opened}</div>
                        <div>Signals fired: <span className="text-amber-100 font-bold">{paper.result.diag.signalsFired}</span> → Opened: <span className="text-amber-100 font-bold">{paper.result.diag.opened}</span></div>
                        <div>
                          Dropped — slots: {paper.result.diag.droppedSlots} · capital: {paper.result.diag.droppedCapital} · dedup (1/symbol): {paper.result.diag.droppedDedup} · fill-gap: {paper.result.diag.droppedFillGap} · daily-loss: {paper.result.diag.droppedDailyLoss} · kill-switch: {paper.result.diag.droppedRiskStop}
                        </div>
                        <div className="text-amber-200/60">{paper.result.diag.line}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      <SummaryCard label="Trades" value={paper.result.summary.totalTrades} sub={`${paper.result.summary.wins}W · ${paper.result.summary.losses}L`} />
                      <SummaryCard label="Win Rate" value={`${paper.result.summary.winrate.toFixed(1)}%`} sub={`Avg/trade ${paper.result.summary.avgR.toFixed(2)}R`} />
                      <SummaryCard label="Total R" value={`${paper.result.summary.totalR > 0 ? '+' : ''}${paper.result.summary.totalR.toFixed(2)}R`} valueClassName={paper.result.summary.totalR >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                      <SummaryCard label="Net P/L" value={`${paper.result.summary.netPnl >= 0 ? '+' : ''}$${paper.result.summary.netPnl.toFixed(2)}`} sub={`Gross $${paper.result.summary.grossPnl.toFixed(2)}`} valueClassName={paper.result.summary.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                      <SummaryCard label="Return" value={`${paper.result.summary.returnPct >= 0 ? '+' : ''}${paper.result.summary.returnPct.toFixed(1)}%`} sub={`$${paper.result.summary.startingCapital} → $${paper.result.summary.endingCapital.toFixed(2)}`} valueClassName={paper.result.summary.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                      <SummaryCard label="Fees" value={`$${paper.result.summary.totalFees.toFixed(2)}`} sub={`Max DD $${paper.result.summary.maxDrawdownUsd.toFixed(2)}`} />
                      {paper.result.summary.liquidations > 0 && (
                        <SummaryCard label="Liquidated" value={paper.result.summary.liquidations} sub={`of ${paper.result.summary.losses} losses`} />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">Per-Symbol Breakdown</div>
                    <div className="overflow-x-auto rounded border border-slate-800">
                      <table className="min-w-[500px] w-full text-xs">
                        <thead className="bg-slate-900/50 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Symbol</th>
                            <th className="px-3 py-2 text-left">Trades</th>
                            <th className="px-3 py-2 text-left">Wins</th>
                            <th className="px-3 py-2 text-left">Win%</th>
                            <th className="px-3 py-2 text-left">Total R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {Object.entries(paper.result.symbolBreakdown)
                            .filter(([, v]) => v.trades > 0)
                            .sort(([, a], [, b]) => b.r - a.r)
                            .map(([sym, v]) => (
                              <tr key={sym} className="text-slate-200 hover:bg-slate-900/40">
                                <td className="px-3 py-1.5 font-mono font-semibold">{sym}</td>
                                <td className="px-3 py-1.5">{v.trades}</td>
                                <td className="px-3 py-1.5">{v.wins}</td>
                                <td className="px-3 py-1.5">{v.trades > 0 ? ((v.wins / v.trades) * 100).toFixed(0) : 0}%</td>
                                <td className={cn('px-3 py-1.5 font-bold font-mono', v.r >= 0 ? 'text-emerald-400' : 'text-red-400')}>{v.r >= 0 ? '+' : ''}{v.r.toFixed(2)}R</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {multiAgg && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2">
                    <SummaryCard
                      label="Symbols"
                      value={multiAgg.totalSymbols}
                      sub={`${multiAgg.tradedSymbols} w/ trades${multiAgg.errorSymbols > 0 ? ` · ${multiAgg.errorSymbols} errors` : ''}`}
                    />
                    <SummaryCard
                      label="Profitable"
                      value={`${multiAgg.profitableSymbols}/${multiAgg.tradedSymbols}`}
                      sub={multiAgg.tradedSymbols > 0 ? `${((multiAgg.profitableSymbols / multiAgg.tradedSymbols) * 100).toFixed(1)}%` : '—'}
                    />
                    <SummaryCard
                      label="Losing"
                      value={`${multiAgg.losingSymbols}/${multiAgg.tradedSymbols}`}
                      sub={multiAgg.breakevenSymbols > 0 ? `${multiAgg.breakevenSymbols} breakeven` : undefined}
                    />
                    <SummaryCard label="Trades" value={multiAgg.totalTrades} sub={`${multiAgg.totalWins}W · ${multiAgg.totalLosses}L`} />
                    <SummaryCard label="Win Rate" value={`${multiAgg.overallWinrate.toFixed(1)}%`} sub={`Avg/sym ${multiAgg.avgSymbolWinrate.toFixed(1)}%`} />
                    <SummaryCard
                      label="Total R"
                      value={`${multiAgg.totalR > 0 ? '+' : ''}${multiAgg.totalR.toFixed(2)}R`}
                      sub={`Avg/trade ${multiAgg.avgRPerTrade.toFixed(2)}R`}
                      valueClassName={rColor(multiAgg.totalR)}
                    />
                    <SummaryCard
                      label="Net P/L"
                      value={signedMoney(multiAgg.totalNetPnl)}
                      sub={`Gross ${signedMoney(multiAgg.totalGrossPnl)}`}
                      valueClassName={moneyColor(multiAgg.totalNetPnl)}
                    />
                    <SummaryCard
                      label="Fees"
                      value={formatMoney(multiAgg.totalFees)}
                      sub={`${btFeeRatePct.toFixed(3)}% per side`}
                    />
                    <SummaryCard
                      label="Capital"
                      value={formatMoney(multiAgg.totalEndingCapital)}
                      sub={`${multiAgg.totalReturnPct.toFixed(2)}% return`}
                    />
                    <SummaryCard
                      label="Best"
                      value={multiAgg.best?.symbol ?? '—'}
                      sub={multiAgg.best?.summary.totalTrades ? `${multiAgg.best.summary.totalR > 0 ? '+' : ''}${multiAgg.best.summary.totalR.toFixed(2)}R` : '—'}
                    />
                    <SummaryCard
                      label="Worst"
                      value={multiAgg.worst?.symbol ?? '—'}
                      sub={
                        multiAgg.worst?.summary.totalTrades
                          ? `${multiAgg.worst.summary.totalR > 0 ? '+' : ''}${multiAgg.worst.summary.totalR.toFixed(2)}R · DD ${multiAgg.worst.summary.maxDrawdown.toFixed(2)}R`
                          : '—'
                      }
                    />
                  </div>
                )}

                {multi.result && multi.result.rows.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-slate-800">
                    <table className="min-w-[1220px] w-full text-sm">
                      <thead className="bg-slate-900/50 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Symbol</th>
                          <th className="px-3 py-2 text-left">Trades</th>
                          <th className="px-3 py-2 text-left">Gross</th>
                          <th className="px-3 py-2 text-left">Fees</th>
                          <th className="px-3 py-2 text-left">Win Rate</th>
                          <th className="px-3 py-2 text-left">Total R</th>
                          <th className="px-3 py-2 text-left">P/L</th>
                          <th className="px-3 py-2 text-left">Return</th>
                          <th className="px-3 py-2 text-left">Profit Factor</th>
                          <th className="px-3 py-2 text-left">Max DD</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {multi.result.rows.map((row) => (
                          <tr key={row.symbol} className="text-slate-100 text-xs hover:bg-slate-900/40">
                            <td className="px-3 py-2 font-mono">{row.symbol}</td>
                            <td className="px-3 py-2 font-mono text-slate-300">{row.summary.totalTrades}</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', moneyColor(row.summary.grossPnl))}>{row.summary.totalTrades > 0 ? signedMoney(row.summary.grossPnl) : '-'}</td>
                            <td className="px-3 py-2 font-mono text-slate-300">{row.summary.totalTrades > 0 ? formatMoney(row.summary.totalFees) : '-'}</td>
                            <td className="px-3 py-2 font-mono text-slate-300">{row.summary.totalTrades > 0 ? `${row.summary.winrate.toFixed(1)}%` : '—'}</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', rColor(row.summary.totalR))}>{row.summary.totalTrades > 0 ? `${row.summary.totalR > 0 ? '+' : ''}${row.summary.totalR.toFixed(2)}R` : '—'}</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', moneyColor(row.summary.netPnl))}>{row.summary.totalTrades > 0 ? signedMoney(row.summary.netPnl) : '—'}</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', moneyColor(row.summary.netPnl))}>{row.summary.totalTrades > 0 ? `${row.summary.returnPct.toFixed(2)}%` : '—'}</td>
                            <td className="px-3 py-2 font-mono text-slate-300">
                              {row.summary.totalTrades > 0 ? (row.summary.profitFactor === 99 ? '∞' : row.summary.profitFactor.toFixed(2)) : '—'}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-300">{row.summary.totalTrades > 0 ? `${row.summary.maxDrawdown.toFixed(2)}R` : '—'}</td>
                            <td className="px-3 py-2 text-slate-400">{row.error ? row.error : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* ── Symbol Test result + trade log ── */}
            {btMode === 'symbol' && backtest.result && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2">
                  <SummaryCard label="Trades" value={backtest.result.summary.totalTrades} />
                  <SummaryCard label="Wins" value={backtest.result.summary.wins} />
                  <SummaryCard label="Losses" value={backtest.result.summary.losses} />
                  <SummaryCard label="Win Rate" value={`${backtest.result.summary.winrate.toFixed(1)}%`} />
                  <SummaryCard
                    label="Capital"
                    value={formatMoney(backtest.result.summary.endingCapital)}
                    sub={`Start ${formatMoney(backtest.result.summary.startingCapital)}`}
                  />
                  <SummaryCard
                    label="Net P/L"
                    value={signedMoney(backtest.result.summary.netPnl)}
                    sub={`Gross ${signedMoney(backtest.result.summary.grossPnl)}`}
                    valueClassName={moneyColor(backtest.result.summary.netPnl)}
                  />
                  <SummaryCard
                    label="Fees"
                    value={formatMoney(backtest.result.summary.totalFees)}
                    sub={`${backtest.result.summary.feeRatePct.toFixed(3)}% per side`}
                  />
                  <SummaryCard
                    label="Total R"
                    value={`${backtest.result.summary.totalR > 0 ? '+' : ''}${backtest.result.summary.totalR.toFixed(2)}R`}
                    valueClassName={rColor(backtest.result.summary.totalR)}
                  />
                  <SummaryCard label="Avg R" value={backtest.result.summary.avgR.toFixed(2)} />
                  <SummaryCard
                    label="Max DD"
                    value={`${backtest.result.summary.maxDrawdown.toFixed(2)}R`}
                    sub={`${formatMoney(backtest.result.summary.maxDrawdownUsd)} | Float ${formatMoney(backtest.result.summary.maxFloatingDrawdownUsd)}`}
                  />
                  <SummaryCard
                    label="Margin"
                    value={formatMoney(backtest.result.summary.tradeAmount)}
                    sub={`${backtest.result.summary.leverage.toFixed(0)}x ${backtest.result.summary.marginMode} | Max open ${backtest.result.summary.maxOpenPositions}`}
                  />
                  {backtest.result.summary.liquidations > 0 && (
                    <SummaryCard
                      label="Liquidated"
                      value={String(backtest.result.summary.liquidations)}
                      sub={`of ${backtest.result.summary.losses} losses`}
                    />
                  )}
                  <SummaryCard label="Profit Factor" value={backtest.result.summary.profitFactor === 99 ? '∞' : backtest.result.summary.profitFactor.toFixed(2)} />
                </div>
                <div className="text-xs text-slate-500">
                  {backtest.result.candleCount} candles · {new Date(backtest.result.period.from * 1000).toLocaleDateString()} – {new Date(backtest.result.period.to * 1000).toLocaleDateString()}
                </div>

                <Card className="border-slate-800 bg-slate-950">
                  <CardHeader className="border-b border-slate-800">
                    <CardTitle className="text-slate-100">Trade Log ({backtest.result.trades.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto rounded-md border border-slate-800">
                      <table className="min-w-[1480px] w-full text-sm">
                        <thead className="bg-slate-900/50 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Open</th>
                            <th className="px-3 py-2 text-left">Close</th>
                            <th className="px-3 py-2 text-left">Dir</th>
                            <th className="px-3 py-2 text-left">Entry</th>
                            <th className="px-3 py-2 text-left">SL</th>
                            <th className="px-3 py-2 text-left">TP1</th>
                            <th className="px-3 py-2 text-left">Liq</th>
                            <th className="px-3 py-2 text-left">Exit</th>
                            <th className="px-3 py-2 text-left">Result</th>
                            <th className="px-3 py-2 text-left">R</th>
                            <th className="px-3 py-2 text-left">Margin</th>
                            <th className="px-3 py-2 text-left">Notional</th>
                            <th className="px-3 py-2 text-left">Lev</th>
                            <th className="px-3 py-2 text-left">Fees</th>
                            <th className="px-3 py-2 text-left">P/L</th>
                            <th className="px-3 py-2 text-left">Equity</th>
                            <th className="px-3 py-2 text-left">MFE</th>
                            <th className="px-3 py-2 text-left">MAE</th>
                            <th className="px-3 py-2 text-left">Q</th>
                            <th className="px-3 py-2 text-left">C</th>
                            <th className="px-3 py-2 text-left">Vol</th>
                            <th className="px-3 py-2 text-left">Strategy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {backtest.result.trades.slice().reverse().map((t) => (
                            <tr key={t.id} className="text-slate-100 text-xs hover:bg-slate-900/40">
                              <td className="px-3 py-2 font-mono">{t.id}</td>
                              <td className="px-3 py-2 font-mono">{new Date(t.openTime * 1000).toLocaleString()}</td>
                              <td className="px-3 py-2 font-mono">{t.closeTime ? new Date(t.closeTime * 1000).toLocaleString() : '—'}</td>
                              <td className="px-3 py-2">
                                <Badge variant={dirBadge(t.direction)} className="text-[10px] font-black px-1.5 py-0.5">{t.direction.toUpperCase()}</Badge>
                              </td>
                              <td className="px-3 py-2 font-mono">{formatPrice(t.entry)}</td>
                              <td className="px-3 py-2 font-mono text-red-400">{formatPrice(t.sl)}</td>
                              <td className="px-3 py-2 font-mono text-emerald-400">{formatPrice(t.tp1)}</td>
                              <td className="px-3 py-2 font-mono text-orange-400">{t.liqPrice > 0 ? formatPrice(t.liqPrice) : '—'}</td>
                              <td className="px-3 py-2 font-mono">{formatPrice(t.exitPrice)}</td>
                              <td className="px-3 py-2">
                                {t.closeReason === 'liquidated'
                                  ? <Badge className="text-[10px] font-black px-1.5 py-0.5 bg-orange-600 text-white border-0">LIQ</Badge>
                                  : <Badge variant={resultBadgeVariant(t.result)} className="text-[10px] font-black px-1.5 py-0.5">{t.result.toUpperCase()}</Badge>
                                }
                              </td>
                              <td className={cn('px-3 py-2 font-mono font-bold', rColor(t.r))}>{t.r > 0 ? '+' : ''}{t.r.toFixed(2)}R</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{formatMoney(t.marginUsed)}</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{formatMoney(t.positionSize)}</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{t.leverage}x</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{t.result === 'open' ? '-' : formatMoney(t.fees)}</td>
                              <td className={cn('px-3 py-2 font-mono font-bold', moneyColor(t.pnl))}>{t.result === 'open' ? '—' : signedMoney(t.pnl)}</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{formatMoney(t.equityAfter)}</td>
                              <td className={cn('px-3 py-2 font-mono font-bold', rColor(t.mfeR))}>{t.mfeR > 0 ? '+' : ''}{t.mfeR.toFixed(2)}R</td>
                              <td className={cn('px-3 py-2 font-mono font-bold', rColor(-t.maeR))}>{(-t.maeR).toFixed(2)}R</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{t.quality}/8</td>
                              <td className="px-3 py-2 font-mono text-slate-300">{t.confluence}</td>
                              <td className="px-3 py-2">
                                {(() => {
                                  const m = t.signals.match(/\[(LOW|MEDIUM|HIGH) VOL\]/)
                                  if (!m) return <span className="text-slate-500">—</span>
                                  const color = m[1] === 'HIGH' ? 'text-rose-400' : m[1] === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
                                  return <span className={`font-mono text-xs font-bold ${color}`}>{m[1]}</span>
                                })()}
                              </td>
                              <td className="px-3 py-2 text-slate-300">{t.strategy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── FORWARD TEST TAB ─────────────────────────────────────────────── */}
        {tab === 'forwardtest' && (
          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">Forward Test Controls</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-xs text-slate-500">
                  Polls live candles every 60 seconds and paper-trades signals using your current filter settings. State is saved to localStorage — it persists across page reloads.
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Symbol</div>
                    <SymbolSelect value={fwSymbol} options={symbols} onChange={setFwSymbol} disabled={fwd.running} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Timeframe</div>
                    <div className="flex gap-1">
                      {TF_OPTIONS.map((tf) => (
                        <button
                          key={tf}
                          disabled={fwd.running}
                          onClick={() => setFwTimeframe(tf)}
                          className={cn('rounded border px-2 py-1 text-xs font-bold disabled:opacity-50', fwTimeframe === tf ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300')}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Strategy</div>
                    <select
                      value={fwStrategy}
                      disabled={fwd.running}
                      onChange={(e) => setFwStrategy(e.target.value)}
                      className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 disabled:opacity-50"
                    >
                      {STRATEGIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    {!fwd.running ? (
                      <Button className="h-8 px-4 font-bold" onClick={handleFwStart}>
                        Start
                      </Button>
                    ) : (
                      <Button variant="secondary" className="h-8 border-slate-800" onClick={fwd.stop}>
                        Stop
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="h-8 border-slate-800 text-red-400 hover:text-red-300"
                      onClick={fwd.clearTrades}
                      disabled={fwd.running}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                {fwd.error && <div className="text-xs text-red-400">{fwd.error}</div>}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {fwd.running && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Live · polls every 60s</span>}
                  {fwd.lastPoll && <span>Last poll: {new Date(fwd.lastPoll).toLocaleTimeString()}</span>}
                  <span>Polls: {fwd.state.pollCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <SummaryCard label="Closed" value={fwd.summary.totalTrades} />
              <SummaryCard label="Wins" value={fwd.summary.wins} />
              <SummaryCard label="Losses" value={fwd.summary.losses} />
              <SummaryCard label="Win Rate" value={`${fwd.summary.winrate.toFixed(1)}%`} />
              <SummaryCard label="Total R" value={fwd.summary.totalR.toFixed(2)} />
              <SummaryCard label="Avg R" value={fwd.summary.avgR.toFixed(2)} />
              <SummaryCard label="Open" value={fwd.summary.openTrades} />
            </div>

            {/* Active trade */}
            {fwd.state.activeTrade && (
              <Card className="border-slate-700 bg-slate-900">
                <CardHeader className="border-b border-slate-800 py-3">
                  <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Active Paper Trade
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  {(() => {
                    const t = fwd.state.activeTrade!
                    const unrealized = t.direction === 'buy'
                      ? (t.exitPrice - t.entry) / Math.max(Math.abs(t.entry - t.sl), 1e-8)
                      : (t.entry - t.exitPrice) / Math.max(Math.abs(t.sl - t.entry), 1e-8)
                    return (
                      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                        <div><span className="text-slate-500">Dir: </span><Badge variant={dirBadge(t.direction)} className="text-[10px] font-black px-1.5 py-0.5">{t.direction.toUpperCase()}</Badge></div>
                        <div><span className="text-slate-500">Entry: </span><span className="font-mono">{formatPrice(t.entry)}</span></div>
                        <div><span className="text-slate-500">SL: </span><span className="font-mono text-red-400">{formatPrice(t.sl)}</span></div>
                        <div><span className="text-slate-500">TP1: </span><span className="font-mono text-emerald-400">{formatPrice(t.tp1)}</span></div>
                        <div><span className="text-slate-500">Mark: </span><span className="font-mono">{formatPrice(t.exitPrice)}</span></div>
                        <div><span className="text-slate-500">Unrealized: </span><span className={cn('font-mono font-bold', rColor(unrealized))}>{unrealized > 0 ? '+' : ''}{unrealized.toFixed(2)}R</span></div>
                        <div><span className="text-slate-500">Strategy: </span>{t.strategy}</div>
                        <div><span className="text-slate-500">Since: </span>{new Date(t.openTime * 1000).toLocaleString()}</div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Trade log */}
            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">Trade Log ({allTrades.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {allTrades.length === 0 ? (
                  <div className="text-sm text-slate-500">No trades yet. Start the forward test and wait for a signal.</div>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-slate-800">
                    <table className="min-w-[1050px] w-full text-sm">
                      <thead className="bg-slate-900/50 text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Open</th>
                          <th className="px-3 py-2 text-left">Close</th>
                          <th className="px-3 py-2 text-left">Dir</th>
                          <th className="px-3 py-2 text-left">Entry</th>
                          <th className="px-3 py-2 text-left">SL</th>
                          <th className="px-3 py-2 text-left">TP1</th>
                          <th className="px-3 py-2 text-left">Exit</th>
                          <th className="px-3 py-2 text-left">Result</th>
                          <th className="px-3 py-2 text-left">R</th>
                          <th className="px-3 py-2 text-left">MFE</th>
                          <th className="px-3 py-2 text-left">MAE</th>
                          <th className="px-3 py-2 text-left">Q</th>
                          <th className="px-3 py-2 text-left">C</th>
                          <th className="px-3 py-2 text-left">Strategy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {allTrades.map((t) => (
                          <tr key={t.id} className={cn('text-slate-100 text-xs hover:bg-slate-900/40', t.result === 'open' && 'bg-amber-950/20')}>
                            <td className="px-3 py-2 font-mono">{t.id}</td>
                            <td className="px-3 py-2 font-mono">{new Date(t.openTime * 1000).toLocaleString()}</td>
                            <td className="px-3 py-2 font-mono">{t.closeTime ? new Date(t.closeTime * 1000).toLocaleString() : '—'}</td>
                            <td className="px-3 py-2">
                              <Badge variant={dirBadge(t.direction)} className="text-[10px] font-black px-1.5 py-0.5">{t.direction.toUpperCase()}</Badge>
                            </td>
                            <td className="px-3 py-2 font-mono">{formatPrice(t.entry)}</td>
                            <td className="px-3 py-2 font-mono text-red-400">{formatPrice(t.sl)}</td>
                            <td className="px-3 py-2 font-mono text-emerald-400">{formatPrice(t.tp1)}</td>
                            <td className="px-3 py-2 font-mono">{formatPrice(t.exitPrice)}</td>
                            <td className="px-3 py-2">
                              <Badge variant={resultBadgeVariant(t.result)} className="text-[10px] font-black px-1.5 py-0.5">{t.result.toUpperCase()}</Badge>
                            </td>
                            <td className={cn('px-3 py-2 font-mono font-bold', rColor(t.r))}>{t.r !== 0 ? (t.r > 0 ? '+' : '') + t.r.toFixed(2) + 'R' : '—'}</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', rColor(t.mfeR))}>{t.mfeR > 0 ? '+' : ''}{t.mfeR.toFixed(2)}R</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', rColor(-t.maeR))}>{(-t.maeR).toFixed(2)}R</td>
                            <td className="px-3 py-2 font-mono text-slate-300">{t.quality}/8</td>
                            <td className="px-3 py-2 font-mono text-slate-300">{t.confluence}</td>
                            <td className="px-3 py-2 text-slate-300">{t.strategy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Parity Check — always at the very bottom of the page ── */}
        {parityCard}
      </div>

      {/* ── Profile editor modal ── */}
      {profEditingId && profEditingKey && profDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={cancelProfileEditor}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-100">
                Edit Profile
                <span className="ml-2 font-mono text-xs text-slate-400">
                  {(backtestProfiles[profEditingKey] ?? []).find((p) => p.id === profEditingId)?.name ?? ''}
                </span>
              </h2>
              <button
                onClick={cancelProfileEditor}
                className="rounded px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ×
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <FilterForm viewedTab={profEditingKey} draft={profDraft} setDraft={setProfDraft as React.Dispatch<React.SetStateAction<FilterSettings>>} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
              <Button variant="secondary" className="h-8 px-4 text-xs border-slate-800" onClick={cancelProfileEditor}>Cancel</Button>
              <Button className="h-8 px-4 text-xs font-bold" onClick={saveProfileEditor}>Save Profile</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
