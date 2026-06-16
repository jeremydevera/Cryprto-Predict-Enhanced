import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STRATEGIES, useTradingStore } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'

const TF_OPTIONS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const

type BgSignal = {
  symbol: string; timeframe: string; direction: 'buy'|'sell'; strategy: string
  quality: number; confluence: number; entry: number; sl: number; tp1: number; tp2: number
  entryDistancePct: number; detectedAt: number; currentPrice?: number
}

type Status = {
  running: boolean
  settings: {
    symbols: string[]; scanAllCoins: boolean; timeframes: string[]; strategy: string
    minQuality: number; minConfluence: number
    nearEntryOnly: boolean; nearEntryPct: number; intervalSec: number
  }
  scanCount: number; signalsFound: number; lastScanAt: number|null
  currentSymbol: string|null; progress: { done: number; total: number }
  recentSignals: BgSignal[]; telegramConfigured: boolean
}

export default function BackgroundScanner() {
  const enabledStrategies       = useTradingStore(s => s.enabledStrategies)
  const ecbFilters              = useTradingStore(s => s.ecbFilters)
  const errFilters              = useTradingStore(s => s.errFilters)
  const brFilters               = useTradingStore(s => s.brFilters)
  const cmFilters               = useTradingStore(s => s.cmFilters)
  const fgFilters               = useTradingStore(s => s.fgFilters)
  const stFilters               = useTradingStore(s => s.stFilters)
  const bbssdFilters            = useTradingStore(s => s.bbssdFilters)
  const sqzFilters              = useTradingStore(s => s.sqzFilters)

  const [status, setStatus]       = useState<Status | null>(null)
  const [loading, setLoading]     = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [symbolsText, setSymbolsText] = useState('BTCUSDT\nETHUSDT\nSOLUSDT\nBNBUSDT\nXRPUSDT')
  const [scanAllCoins, setScanAllCoins] = useState(false)
  const [timeframes, setTimeframes] = useState<string[]>(['1h'])
  const [strategy, setStrategy]   = useState('Elite Context Breakout')
  const [nearEntryOnly, setNearEntryOnly] = useState(false)
  const [nearEntryPct, setNearEntryPct]   = useState(1.0)
  const [intervalSec, setIntervalSec]     = useState(300)

  const activeFilters =
    strategy === 'Breakout Retest'
        ? brFilters
        : strategy === 'Elite Retest Reversal'
          ? errFilters
          : strategy === 'Confirmation Model'
            ? cmFilters
          : strategy === 'FluxGate Dual Engine'
            ? fgFilters
          : strategy === 'Supertrend + RelVol'
            ? stFilters
          : strategy === 'BB Stoch S/D'
            ? bbssdFilters
          : strategy === 'Squeeze Momentum'
            ? sqzFilters
          : ecbFilters

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/bgscanner/status')
      const txt = await r.text()
      if (!txt) return
      const j = JSON.parse(txt)
      if (j.success) setStatus(j.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [fetchStatus])

  // Sync UI from server state on first load
  useEffect(() => {
    if (!status) return
    setSymbolsText(status.settings.symbols.join('\n'))
    setScanAllCoins(status.settings.scanAllCoins)
    setTimeframes(status.settings.timeframes)
    setStrategy(status.settings.strategy)
    setNearEntryOnly(status.settings.nearEntryOnly)
    setNearEntryPct(status.settings.nearEntryPct)
    setIntervalSec(status.settings.intervalSec)
  }, [!!status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-push filter/strategy changes to the running scanner
  useEffect(() => {
    if (!running) return
    fetch('/api/bgscanner/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSettings()),
    }).catch(() => {})
  }, [activeFilters, strategy]) // eslint-disable-line react-hooks/exhaustive-deps

  const buildSettings = () => {
    return {
    symbols: symbolsText.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(Boolean),
    scanAllCoins,
    timeframes,
    strategy,
    entryModel: activeFilters.entryModel,
    minQuality: activeFilters.minQuality,
    minConfluence: activeFilters.minConfluence,
    isConfluence: activeFilters.isConfluence,
    nearEntryOnly,
    nearEntryPct,
    intervalSec,
    enabledStrategies,
    filterHTFAlignment: activeFilters.filterHTFAlignment,
    filterEntryConfirmation: activeFilters.filterEntryConfirmation,
    filterADXRegime: activeFilters.filterADXRegime,
    filterVolumeConfirmation: activeFilters.filterVolumeConfirmation,
    filterKeyLevelDistance: activeFilters.filterKeyLevelDistance,
    keyLevelMaxDistancePct: activeFilters.keyLevelMaxDistancePct,
    minVolumeRatio: activeFilters.minVolumeRatio,
    filterRetestConfirmation: activeFilters.filterRetestConfirmation,
    filterAtrEntryBuffer: activeFilters.filterAtrEntryBuffer,
    entryAtrBufferAtrMult: activeFilters.entryAtrBufferAtrMult,
    filterStrongClose: activeFilters.filterStrongClose,
    strongCloseBodyPct: activeFilters.strongCloseBodyPct,
    filterAvoidOppKeyLevel: activeFilters.filterAvoidOppKeyLevel,
    filterCooldown: activeFilters.filterCooldown,
    cooldownBars: activeFilters.cooldownBars,
    filterBTCAlignment: activeFilters.filterBTCAlignment,
    filterRequireOrderBlock: activeFilters.filterRequireOrderBlock,
    filterFVG: activeFilters.filterFVG,
    filterPapRequireRetest: activeFilters.filterPapRequireRetest,
    filterEliteSession: activeFilters.filterEliteSession,
    filterCmSession: activeFilters.filterCmSession,
    filterLiquiditySweep: activeFilters.filterLiquiditySweep,
    filterEliteRequireRetest: activeFilters.filterEliteRequireRetest,
    filterEliteHTFEMA: activeFilters.filterEliteHTFEMA,
    filterEliteMaxEmaDistance: activeFilters.filterEliteMaxEmaDistance,
    filterFixedPctSlTp: activeFilters.filterFixedPctSlTp,
    fixedSlPct: activeFilters.fixedSlPct,
    fixedTpPct: activeFilters.fixedTpPct,
    eliteMinVolRegime: activeFilters.eliteMinVolRegime,
    errAGradeBoost: activeFilters.errAGradeBoost,
    errStochConfirm: activeFilters.errStochConfirm,
    errHtfEma200: activeFilters.errHtfEma200,
    errMultiRetest: activeFilters.errMultiRetest,
    errAGradeRequired: activeFilters.errAGradeRequired,
    errHtfEma50Required: activeFilters.errHtfEma50Required,
    errMinRREnabled: activeFilters.errMinRREnabled,
    errMinRR: activeFilters.errMinRR,
    errRetestMaxBarsEnabled: activeFilters.errRetestMaxBarsEnabled,
    errRetestMaxBars: activeFilters.errRetestMaxBars,
    errReversalBodyMinPct: activeFilters.errReversalBodyMinPct,
    errRetestAtrTolMult: activeFilters.errRetestAtrTolMult,
    errStochOS: activeFilters.errStochOS,
    errStochOB: activeFilters.errStochOB,
    errMultiRetestLookbackBars: activeFilters.errMultiRetestLookbackBars,
    errMultiRetestMinTouches: activeFilters.errMultiRetestMinTouches,
    errAGradeBodyMinPct: activeFilters.errAGradeBodyMinPct,
    errAGradeVolMinMult: activeFilters.errAGradeVolMinMult,
    errTp1MultDefault: activeFilters.errTp1MultDefault,
    errTp2MultDefault: activeFilters.errTp2MultDefault,
    errTp1MultBoost: activeFilters.errTp1MultBoost,
    errTp2MultBoost: activeFilters.errTp2MultBoost,
    ecbAGradeBodyMinPctHighVol: activeFilters.ecbAGradeBodyMinPctHighVol,
    ecbAGradeBodyMinPctOther: activeFilters.ecbAGradeBodyMinPctOther,
    ecbAGradeVolMinMult: activeFilters.ecbAGradeVolMinMult,
    ecbBGradeBodyMinPctMedium: activeFilters.ecbBGradeBodyMinPctMedium,
    ecbBGradeBodyMinPctOther: activeFilters.ecbBGradeBodyMinPctOther,
    ecbBGradeVolMinMultMedium: activeFilters.ecbBGradeVolMinMultMedium,
    ecbBGradeVolMinMultOther: activeFilters.ecbBGradeVolMinMultOther,
    ecbRetestAtrTolMult: activeFilters.ecbRetestAtrTolMult,
    ecbRetestEma20MaxDistPct: activeFilters.ecbRetestEma20MaxDistPct,
    ecbRetestVolMaxFracOfBreak: activeFilters.ecbRetestVolMaxFracOfBreak,
    ecbMaxEma50DistanceAtrMult: activeFilters.ecbMaxEma50DistanceAtrMult,
    ecbMinConsolidBars: activeFilters.ecbMinConsolidBars,
    ecbRsiLongMinMediumAGrade: activeFilters.ecbRsiLongMinMediumAGrade,
    ecbRsiLongMinMediumBGrade: activeFilters.ecbRsiLongMinMediumBGrade,
    ecbRsiLongMinOther: activeFilters.ecbRsiLongMinOther,
    ecbRsiShortMaxMediumAGrade: activeFilters.ecbRsiShortMaxMediumAGrade,
    ecbRsiShortMaxMediumBGrade: activeFilters.ecbRsiShortMaxMediumBGrade,
    ecbRsiShortMaxOther: activeFilters.ecbRsiShortMaxOther,
    ecbSlAtrMultAGradeHigh: activeFilters.ecbSlAtrMultAGradeHigh,
    ecbSlAtrMultAGradeOther: activeFilters.ecbSlAtrMultAGradeOther,
    ecbSlAtrMultBGrade: activeFilters.ecbSlAtrMultBGrade,
    ecbTp1RRMultAGradeHigh: activeFilters.ecbTp1RRMultAGradeHigh,
    ecbTp1RRMultAGradeOther: activeFilters.ecbTp1RRMultAGradeOther,
    ecbTp1RRMultBGradeMedium: activeFilters.ecbTp1RRMultBGradeMedium,
    ecbTp1RRMultBGradeOther: activeFilters.ecbTp1RRMultBGradeOther,
    ecbMeasuredMoveMinAtrMult: activeFilters.ecbMeasuredMoveMinAtrMult,
    ecbTp2ExtraRR: activeFilters.ecbTp2ExtraRR,
    ecbMaxBreakCandleRangeAtrMult: activeFilters.ecbMaxBreakCandleRangeAtrMult,
    ecbBreakClosePosBullMinPct: activeFilters.ecbBreakClosePosBullMinPct,
    ecbBreakClosePosBearMaxPct: activeFilters.ecbBreakClosePosBearMaxPct,
    brMinAtrPct: activeFilters.brMinAtrPct,
    brMaxRangeAtrMult: activeFilters.brMaxRangeAtrMult,
    brEmaSlopeLookback: activeFilters.brEmaSlopeLookback,
    brAdxMin: activeFilters.brAdxMin,
    filterIFVG: activeFilters.filterIFVG,
    filterCisdRetest: activeFilters.filterCisdRetest,
    fgUseADX: activeFilters.fgUseADX,
    fgAdxMin: activeFilters.fgAdxMin,
    fgUseSession: activeFilters.fgUseSession,
    fgSessionStartUtc: activeFilters.fgSessionStartUtc,
    fgSessionEndUtc: activeFilters.fgSessionEndUtc,
    fgUseStructure: activeFilters.fgUseStructure,
    fgStructureTolAtrMult: activeFilters.fgStructureTolAtrMult,
    fgUseMomentum: activeFilters.fgUseMomentum,
    fgUseRsiDivergence: activeFilters.fgUseRsiDivergence,
    fgUseStochCross: activeFilters.fgUseStochCross,
    fgStochExtreme: activeFilters.fgStochExtreme,
    fgStochOS: activeFilters.fgStochOS,
    fgStochOB: activeFilters.fgStochOB,
    fgUseVolume: activeFilters.fgUseVolume,
    fgMinVolumeRatio: activeFilters.fgMinVolumeRatio,
    fgRequireVolumeExpanding: activeFilters.fgRequireVolumeExpanding,
    fgUseHTFAlign: activeFilters.fgUseHTFAlign,
    fgUseCost: activeFilters.fgUseCost,
    fgUseExecution: activeFilters.fgUseExecution,
    fgBaseLenLong: activeFilters.fgBaseLenLong,
    fgBaseLenShort: activeFilters.fgBaseLenShort,
    fgGuideEmaLen: activeFilters.fgGuideEmaLen,
    fgVolLen: activeFilters.fgVolLen,
    fgPersLen: activeFilters.fgPersLen,
    fgCurvLen: activeFilters.fgCurvLen,
    fgThresholdKLong: activeFilters.fgThresholdKLong,
    fgThresholdKShort: activeFilters.fgThresholdKShort,
    fgUseCross: activeFilters.fgUseCross,
    stAtrPeriod: activeFilters.stAtrPeriod,
    stAtrMult: activeFilters.stAtrMult,
    stUseRelVol: activeFilters.stUseRelVol,
    stRelVolLen: activeFilters.stRelVolLen,
    stRelVolMin: activeFilters.stRelVolMin,
    stRequireFlip: activeFilters.stRequireFlip,
    stUseKernel: activeFilters.stUseKernel,
    stKernelLookback: activeFilters.stKernelLookback,
    stKernelBandwidth: activeFilters.stKernelBandwidth,
    stUseHTFAlign: activeFilters.stUseHTFAlign,
    stHtfEmaLen: activeFilters.stHtfEmaLen,
    stUseHtfEmaSlope: activeFilters.stUseHtfEmaSlope,
    stHtfEmaSlopeLookback: activeFilters.stHtfEmaSlopeLookback,
    stHtfEmaSlopeMinPctPerBar: activeFilters.stHtfEmaSlopeMinPctPerBar,
    stUseAdx: activeFilters.stUseAdx,
    stAdxPeriod: activeFilters.stAdxPeriod,
    stAdxMin: activeFilters.stAdxMin,
    stUseDiAlign: activeFilters.stUseDiAlign,
    stDiPeriod: activeFilters.stDiPeriod,
    stUseEmaDistance: activeFilters.stUseEmaDistance,
    stEmaDistAtrMin: activeFilters.stEmaDistAtrMin,
    stUseImpulse: activeFilters.stUseImpulse,
    stImpulseBodyMinPct: activeFilters.stImpulseBodyMinPct,
    stImpulseWickMaxPct: activeFilters.stImpulseWickMaxPct,
    stUseKdeRegime: activeFilters.stUseKdeRegime,
    stKdeRegimeLookback: activeFilters.stKdeRegimeLookback,
    stKdeRegimeBandwidth: activeFilters.stKdeRegimeBandwidth,
    stKdeRegimeMaxConcentration: activeFilters.stKdeRegimeMaxConcentration,
    stUseKdeValueArea: activeFilters.stUseKdeValueArea,
    stKdeValueAreaLookback: activeFilters.stKdeValueAreaLookback,
    stKdeValueAreaBandwidth: activeFilters.stKdeValueAreaBandwidth,
    stKdeValueAreaMaxDensity: activeFilters.stKdeValueAreaMaxDensity,
    bbssdLength: activeFilters.bbssdLength,
    bbssdStdDev: activeFilters.bbssdStdDev,
    bbssdStochK: activeFilters.bbssdStochK,
    bbssdStochD: activeFilters.bbssdStochD,
    bbssdStochSmooth: activeFilters.bbssdStochSmooth,
    bbssdStochOS: activeFilters.bbssdStochOS,
    bbssdStochOB: activeFilters.bbssdStochOB,
    bbssdLookbackBars: activeFilters.bbssdLookbackBars,
    bbssdRequireZone: activeFilters.bbssdRequireZone,
    bbssdZoneFreshOnly: activeFilters.bbssdZoneFreshOnly,
    bbssdRequireBBTag: activeFilters.bbssdRequireBBTag,
    bbssdRequireBBReject: activeFilters.bbssdRequireBBReject,
    bbssdRequireStochCross: activeFilters.bbssdRequireStochCross,
    bbssdRequireReversalCandle: activeFilters.bbssdRequireReversalCandle,
    bbssdHtfEma200: activeFilters.bbssdHtfEma200,
    bbssdUseMaxAdx: activeFilters.bbssdUseMaxAdx,
    bbssdMaxAdx: activeFilters.bbssdMaxAdx,
    bbssdUseVolume: activeFilters.bbssdUseVolume,
    bbssdMinVolumeRatio: activeFilters.bbssdMinVolumeRatio,
    bbssdZoneTolAtrMult: activeFilters.bbssdZoneTolAtrMult,
    bbssdMinLegAtr: activeFilters.bbssdMinLegAtr,
    bbssdRsiLongMin: activeFilters.bbssdRsiLongMin,
    bbssdRsiLongMax: activeFilters.bbssdRsiLongMax,
    bbssdRsiShortMin: activeFilters.bbssdRsiShortMin,
    bbssdRsiShortMax: activeFilters.bbssdRsiShortMax,
    bbssdFreshZonesOnly: activeFilters.bbssdFreshZonesOnly,
    bbssdRequireRsiDiv: activeFilters.bbssdRequireRsiDiv,
    bbssdAllowObFvgFallback: activeFilters.bbssdAllowObFvgFallback,
    bbssdRevWickPct: activeFilters.bbssdRevWickPct,
    bbssdRequireEntryConfirm: activeFilters.bbssdRequireEntryConfirm,
    bbssdRequireLiqSweep: activeFilters.bbssdRequireLiqSweep,
    sqzBbLen: activeFilters.sqzBbLen,
    sqzBbStd: activeFilters.sqzBbStd,
    sqzKcLen: activeFilters.sqzKcLen,
    sqzKcMult: activeFilters.sqzKcMult,
    sqzMomLen: activeFilters.sqzMomLen,
    sqzRequireRelease: activeFilters.sqzRequireRelease,
    sqzMinSqueezeBars: activeFilters.sqzMinSqueezeBars,
    sqzRequireMomRising: activeFilters.sqzRequireMomRising,
    sqzUseHtfAlign: activeFilters.sqzUseHtfAlign,
    sqzHtfEmaLen: activeFilters.sqzHtfEmaLen,
    sqzUseAdx: activeFilters.sqzUseAdx,
    sqzAdxMin: activeFilters.sqzAdxMin,
    sqzUseVolume: activeFilters.sqzUseVolume,
    sqzVolLen: activeFilters.sqzVolLen,
    sqzMinVolumeRatio: activeFilters.sqzMinVolumeRatio,
    sqzSlAtrMult: activeFilters.sqzSlAtrMult,
    sqzTp1AtrMult: activeFilters.sqzTp1AtrMult,
    sqzTp2AtrMult: activeFilters.sqzTp2AtrMult,
    sqzUseManualSlTp: activeFilters.sqzUseManualSlTp,
    sqzManualSlPct: activeFilters.sqzManualSlPct,
    sqzManualTp1Pct: activeFilters.sqzManualTp1Pct,
    sqzManualTp2Pct: activeFilters.sqzManualTp2Pct,
    }
  }

  const parseJsonOrEmpty = async (r: Response): Promise<{ success?: boolean; data?: unknown; error?: string } | null> => {
    const txt = await r.text()
    if (!txt) return null
    try { return JSON.parse(txt) } catch { return null }
  }

  const handleStart = async () => {
    setLoading(true)
    setRequestError(null)
    try {
      if (timeframes.length === 0) {
        setRequestError('Select at least 1 timeframe')
        return
      }
      const r = await fetch('/api/bgscanner/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildSettings()) })
      const j = await parseJsonOrEmpty(r)
      if (!j) {
        setRequestError(`Backend returned no body (HTTP ${r.status}). It may be restarting — try again in a few seconds.`)
        return
      }
      if (j.success) setStatus(j.data as Status)
      else setRequestError(j?.error || 'Failed to start scanner')
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Failed to start scanner')
    } finally { setLoading(false) }
  }

  const handleStop = async () => {
    setLoading(true)
    setRequestError(null)
    try {
      const r = await fetch('/api/bgscanner/stop', { method: 'POST' })
      const j = await parseJsonOrEmpty(r)
      if (!j) {
        setRequestError(`Backend returned no body (HTTP ${r.status}). It may be restarting — try again in a few seconds.`)
        return
      }
      if (j.success) setStatus(j.data as Status)
      else setRequestError(j?.error || 'Failed to stop scanner')
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Failed to stop scanner')
    } finally { setLoading(false) }
  }

  const toggleTF = (tf: string) =>
    setTimeframes(prev => prev.includes(tf) ? prev.filter(x => x !== tf) : [...prev, tf])

  const running = status?.running ?? false

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-slate-100">Background Scanner</div>
            <div className="text-xs text-slate-500">Runs on the server — keeps scanning even when your browser is closed.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-9 border-slate-800" onClick={handleStop} disabled={!running || loading}>Stop</Button>
            <Button className="h-9 px-4 font-bold" onClick={handleStart} disabled={running || loading}>{loading ? 'Starting…' : 'Start'}</Button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600')} />
            {running ? 'Running' : 'Stopped'}
          </span>
          {status && (
            <>
              <span>Scans: {status.scanCount}</span>
              <span>Signals sent: {status.signalsFound}</span>
              {status.lastScanAt && <span>Last scan: {new Date(status.lastScanAt).toLocaleTimeString()}</span>}
              {status.currentSymbol && <span className="text-amber-400">Scanning: {status.currentSymbol}</span>}
              {status.progress.total > 0 && <span>{status.progress.done}/{status.progress.total}</span>}
              <span className={cn(status.telegramConfigured ? 'text-emerald-400' : 'text-red-400')}>
                Telegram: {status.telegramConfigured ? 'Configured ✓' : 'Not configured — add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env'}
              </span>
            </>
          )}
        </div>
        {requestError && <div className="text-xs text-red-400">{requestError}</div>}

        {/* Settings */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Settings</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-slate-500">Symbols (one per line or comma-separated)</div>
                  <button
                    disabled={running}
                    onClick={() => setScanAllCoins(o => !o)}
                    className={cn('rounded border px-2 py-0.5 text-xs font-bold disabled:opacity-50', scanAllCoins ? 'bg-cyan-700 border-cyan-600 text-white' : 'border-slate-700 text-slate-400')}
                  >
                    {scanAllCoins ? 'All Coins ON' : 'All Coins OFF'}
                  </button>
                </div>
                {scanAllCoins ? (
                  <div className="flex items-center justify-center rounded border border-slate-800 bg-slate-900 h-[6rem] text-xs text-cyan-400 font-semibold">
                    Scanning all Binance USDT pairs
                  </div>
                ) : (
                  <textarea
                    value={symbolsText}
                    onChange={e => setSymbolsText(e.target.value)}
                    disabled={running}
                    rows={6}
                    className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 font-mono resize-none disabled:opacity-50"
                    placeholder="BTCUSDT&#10;ETHUSDT&#10;SOLUSDT"
                  />
                )}
                <div className="text-xs text-slate-600 mt-0.5">
                  {scanAllCoins ? 'All USDT futures pairs' : `${symbolsText.split(/[\n,]+/).filter(s => s.trim()).length} symbols`}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Timeframes</div>
                  <div className="flex gap-1 flex-wrap">
                    {TF_OPTIONS.map(tf => (
                      <button key={tf} disabled={running} onClick={() => toggleTF(tf)}
                        className={cn('rounded border px-2 py-1 text-xs font-bold disabled:opacity-50', timeframes.includes(tf) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-300')}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Strategy</div>
                  <select value={strategy} disabled={running} onChange={e => setStrategy(e.target.value)}
                    className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 disabled:opacity-50">
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Min Quality <span className="text-slate-600">(from Filters)</span></div>
                    <div className="h-8 w-20 rounded border border-slate-800 bg-slate-900/50 px-2 flex items-center text-xs text-cyan-400 font-mono font-bold">{activeFilters.minQuality}/8</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Min Confluence <span className="text-slate-600">(from Filters)</span></div>
                    <div className="h-8 w-24 rounded border border-slate-800 bg-slate-900/50 px-2 flex items-center text-xs text-cyan-400 font-mono font-bold">{activeFilters.minConfluence}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Interval (sec)</div>
                    <input type="number" min={1} max={3600} step={1} value={intervalSec} disabled={running}
                      onChange={e => setIntervalSec(Number(e.target.value))}
                      className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 disabled:opacity-50" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Near Entry Only</div>
                    <button disabled={running} onClick={() => setNearEntryOnly(o => !o)}
                      className={cn('rounded border px-2 py-1 text-xs font-bold disabled:opacity-50', nearEntryOnly ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 text-slate-300')}>
                      {nearEntryOnly ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {nearEntryOnly && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Max %</div>
                      <input type="number" min={0.1} max={5} step={0.1} value={nearEntryPct} disabled={running}
                        onChange={e => setNearEntryPct(Number(e.target.value))}
                        className="h-8 w-20 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 disabled:opacity-50" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup instructions */}
        {status && !status.telegramConfigured && (
          <Card className="border-amber-800/50 bg-amber-950/20">
            <CardContent className="pt-4 space-y-1">
              <div className="text-xs font-bold text-amber-400">Telegram not configured — follow these steps:</div>
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>1. Message <span className="text-slate-200">@BotFather</span> on Telegram → <code>/newbot</code> → copy your token</div>
                <div>2. Send a message to your bot, then visit <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> to get your chat_id</div>
                <div>3. Add to your <code>.env</code> file:</div>
                <pre className="mt-1 rounded bg-slate-900 px-3 py-2 text-slate-300 text-xs">
{`TELEGRAM_BOT_TOKEN=7123456789:AAF...
TELEGRAM_CHAT_ID=123456789`}
                </pre>
                <div>4. Restart the server</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent signals */}
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">
              Signals Sent to Telegram ({status?.recentSignals.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!status || status.recentSignals.length === 0 ? (
              <div className="text-sm text-slate-500">No signals sent yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-800">
                <table className="min-w-[800px] w-full text-xs">
                  <thead className="bg-slate-900/50 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">TF</th>
                      <th className="px-3 py-2 text-left">Dir</th>
                      <th className="px-3 py-2 text-left">Q</th>
                      <th className="px-3 py-2 text-left">C</th>
                      <th className="px-3 py-2 text-left">Near %</th>
                      <th className="px-3 py-2 text-left">Price</th>
                      <th className="px-3 py-2 text-left">Entry</th>
                      <th className="px-3 py-2 text-left">SL</th>
                      <th className="px-3 py-2 text-left">TP1</th>
                      <th className="px-3 py-2 text-left">Strategy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {status.recentSignals.map((s, i) => (
                      <tr key={i} className="text-slate-100 hover:bg-slate-900/40">
                        <td className="px-3 py-2 font-mono text-slate-400">{new Date(s.detectedAt).toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono">{s.symbol}</td>
                        <td className="px-3 py-2 font-mono">{s.timeframe}</td>
                        <td className="px-3 py-2">
                          <Badge variant={s.direction === 'buy' ? 'buy' : 'sell'} className="text-[10px] font-black px-1.5 py-0.5">{s.direction.toUpperCase()}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono">{s.quality}/8</td>
                        <td className="px-3 py-2 font-mono">{s.confluence}</td>
                        <td className="px-3 py-2 font-mono text-slate-300">{Number.isFinite(s.entryDistancePct) ? `${s.entryDistancePct.toFixed(2)}%` : '—'}</td>
                        <td className="px-3 py-2 font-mono text-cyan-400">{s.currentPrice ? formatPrice(s.currentPrice) : '—'}</td>
                        <td className="px-3 py-2 font-mono">{formatPrice(s.entry)}</td>
                        <td className="px-3 py-2 font-mono text-red-400">{formatPrice(s.sl)}</td>
                        <td className="px-3 py-2 font-mono text-emerald-400">{formatPrice(s.tp1)}</td>
                        <td className="px-3 py-2 text-slate-300">{s.strategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
