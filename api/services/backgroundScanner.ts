import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { evaluateSignal, type BgSignal, type BgScanParams } from '../utils/signalEval.js'
import { sendTelegramSignal, sendTelegramText, isTelegramConfigured } from './telegramService.js'
import { bybitTrader } from './bybitTrader.js'
import { mexcTrader } from './mexcTrader.js'
import { paperTrader } from './paperTradingService.js'
import type { OhlcvBar } from '../utils/indicators.js'

// ── Scanner uptime log ──────────────────────────────────────────────────────
// Records the [start,end] wall-clock segments (unix seconds) during which the scanner was
// actually running. The backtest parity check uses these as TRUE active windows, instead of
// inferring them circularly from live trades. Each scan cycle extends the open segment's end,
// so segments survive restarts/crashes (last persisted end = last successful scan).
const _dir = path.dirname(fileURLToPath(import.meta.url))
const UPTIME_FILE = path.join(_dir, '../../data/scanner-uptime.json')

type UptimeSegment = { start: number; end: number }

function loadUptime(): UptimeSegment[] {
  try {
    if (fs.existsSync(UPTIME_FILE)) {
      const arr = JSON.parse(fs.readFileSync(UPTIME_FILE, 'utf-8'))
      if (Array.isArray(arr)) return arr.filter((s) => typeof s?.start === 'number' && typeof s?.end === 'number')
    }
  } catch { /* ignore */ }
  return []
}
function saveUptime(segs: UptimeSegment[]) {
  try {
    fs.mkdirSync(path.dirname(UPTIME_FILE), { recursive: true })
    // Keep last 1000 segments to bound file size.
    fs.writeFileSync(UPTIME_FILE, JSON.stringify(segs.slice(-1000)), 'utf-8')
  } catch { /* ignore */ }
}

// ── Signal cooldown persistence ─────────────────────────────────────────────
// The dedup map must survive restarts: a still-valid stale signal re-detected after a
// server restart would otherwise fire a duplicate real order on MEXC/Bybit.
const COOLDOWN_FILE = path.join(_dir, '../../data/scanner-cooldowns.json')

function loadCooldowns(): Map<string, number> {
  try {
    if (fs.existsSync(COOLDOWN_FILE)) {
      const obj = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf-8'))
      if (obj && typeof obj === 'object') {
        const now = Date.now()
        const entries = Object.entries(obj)
          .filter((e): e is [string, number] => typeof e[1] === 'number' && now - e[1] < 24 * 60 * 60 * 1000)
        return new Map(entries)
      }
    }
  } catch { /* ignore */ }
  return new Map()
}
function saveCooldowns(map: Map<string, number>) {
  try {
    fs.mkdirSync(path.dirname(COOLDOWN_FILE), { recursive: true })
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(Object.fromEntries(map)), 'utf-8')
  } catch { /* ignore */ }
}

export type BgScanSettings = {
  symbols: string[]
  scanAllCoins: boolean
  timeframes: string[]
  strategy: string
  minQuality: number
  minConfluence: number
  isConfluence: boolean
  nearEntryOnly: boolean
  nearEntryPct: number
  intervalSec: number
  // Filter tab settings
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
  filterIFVG: boolean
  filterCisdRetest: boolean
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
  ecbAGradeBodyMinPctHighVol: number
  ecbAGradeBodyMinPctOther: number
  ecbAGradeVolMinMult: number
  ecbBGradeBodyMinPctMedium: number
  ecbBGradeBodyMinPctOther: number
  ecbBGradeVolMinMultMedium: number
  ecbBGradeVolMinMultOther: number
  ecbRetestAtrTolMult: number
  ecbRetestEma20MaxDistPct: number
  ecbRetestVolMaxFracOfBreak: number
  ecbMaxEma50DistanceAtrMult: number
  ecbMinConsolidBars: number
  ecbRsiLongMinMediumAGrade: number
  ecbRsiLongMinMediumBGrade: number
  ecbRsiLongMinOther: number
  ecbRsiShortMaxMediumAGrade: number
  ecbRsiShortMaxMediumBGrade: number
  ecbRsiShortMaxOther: number
  ecbSlAtrMultAGradeHigh: number
  ecbSlAtrMultAGradeOther: number
  ecbSlAtrMultBGrade: number
  ecbTp1RRMultAGradeHigh: number
  ecbTp1RRMultAGradeOther: number
  ecbTp1RRMultBGradeMedium: number
  ecbTp1RRMultBGradeOther: number
  ecbMeasuredMoveMinAtrMult: number
  ecbTp2ExtraRR: number
  ecbMaxBreakCandleRangeAtrMult: number
  ecbBreakClosePosBullMinPct: number
  ecbBreakClosePosBearMaxPct: number
  brMinAtrPct: number
  brMaxRangeAtrMult: number
  brEmaSlopeLookback: number
  brAdxMin: number
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
}

export type BgScannerStatus = {
  running: boolean
  settings: BgScanSettings
  scanCount: number
  signalsFound: number
  lastScanAt: number | null
  currentSymbol: string | null
  progress: { done: number; total: number }
  recentSignals: BgSignal[]
  telegramConfigured: boolean
}

const DEFAULT_SETTINGS: BgScanSettings = {
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
  scanAllCoins: false,
  timeframes: ['1h'],
  strategy: 'Elite Context Breakout',
  minQuality: 4,
  minConfluence: 2,
  isConfluence: false,
  nearEntryOnly: false,
  nearEntryPct: 1.0,
  intervalSec: 10,
  enabledStrategies: ['Elite Context Breakout', 'Elite Retest Reversal'],
  filterHTFAlignment: false,
  filterEntryConfirmation: false,
  filterADXRegime: false,
  filterVolumeConfirmation: false,
  filterKeyLevelDistance: false,
  keyLevelMaxDistancePct: 0.35,
  minVolumeRatio: 1.5,
  filterRetestConfirmation: false,
  filterAtrEntryBuffer: false,
  entryAtrBufferAtrMult: 0.5,
  filterStrongClose: false,
  strongCloseBodyPct: 60,
  filterAvoidOppKeyLevel: false,
  filterCooldown: false,
  cooldownBars: 5,
  filterBTCAlignment: false,
  filterRequireOrderBlock: true,
  filterFVG: false,
  filterPapRequireRetest: false,
  filterEliteSession: true,
  filterCmSession: false,
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
  brMinAtrPct: 0.4,
  brMaxRangeAtrMult: 3,
  brEmaSlopeLookback: 10,
  brAdxMin: 25,
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

const MAX_RECENT = 50
const SIGNAL_COOLDOWN_MS = 4 * 60 * 60 * 1000

const htfFor = (tf: string): string => {
  if (tf === '1m') return '15m'
  if (tf === '5m' || tf === '15m') return '1h'
  if (tf === '1h') return '4h'
  if (tf === '4h') return '1d'
  return '1d'
}

const intervalMsFor = (tf: string): number => {
  if (tf.endsWith('m')) return Number(tf.slice(0, -1) || 1) * 60_000
  if (tf.endsWith('h')) return Number(tf.slice(0, -1) || 1) * 60 * 60_000
  if (tf.endsWith('d')) return Number(tf.slice(0, -1) || 1) * 24 * 60 * 60_000
  return 60_000
}

class BackgroundScannerService {
  private settings: BgScanSettings = { ...DEFAULT_SETTINGS }
  private running = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private scanCount = 0
  private signalsFound = 0
  private lastScanAt: number | null = null
  private currentSymbol: string | null = null
  private progress = { done: 0, total: 0 }
  private recentSignals: BgSignal[] = []
  private lastSignalTime = loadCooldowns()
  private candleCache = new Map<string, { ts: number; data: OhlcvBar[] }>()
  private allSymbolsCache: { ts: number; symbols: string[] } | null = null
  private uptime: UptimeSegment[] = loadUptime()

  /** Active-running time segments (unix seconds) — true windows for backtest parity. */
  getUptimeSegments(): UptimeSegment[] { return [...this.uptime] }

  getStatus(): BgScannerStatus {
    return {
      running:            this.running,
      settings:           { ...this.settings },
      scanCount:          this.scanCount,
      signalsFound:       this.signalsFound,
      lastScanAt:         this.lastScanAt,
      currentSymbol:      this.currentSymbol,
      progress:           { ...this.progress },
      recentSignals:      [...this.recentSignals],
      telegramConfigured: isTelegramConfigured(),
    }
  }

  updateSettings(partial: Partial<BgScanSettings>) {
    if (partial.strategy && partial.strategy !== this.settings.strategy) {
      this.recentSignals = []
      this.signalsFound = 0
    }
    this.settings = { ...this.settings, ...partial }
  }

  start() {
    if (this.running) return
    this.running = true
    // Open a new uptime segment.
    const nowSec = Math.floor(Date.now() / 1000)
    this.uptime.push({ start: nowSec, end: nowSec })
    saveUptime(this.uptime)
    console.log('[BgScanner] Started')
    sendTelegramText('🚀 <b>Background Scanner started</b>\nStrategy: ' + this.settings.strategy).catch(() => {})
    this.scheduleNext(0)
  }

  stop() {
    if (!this.running) return
    this.running = false
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.currentSymbol = null
    // Close the open uptime segment.
    const seg = this.uptime[this.uptime.length - 1]
    if (seg) { seg.end = Math.floor(Date.now() / 1000); saveUptime(this.uptime) }
    console.log('[BgScanner] Stopped')
    sendTelegramText('🛑 <b>Background Scanner stopped</b>').catch(() => {})
  }

  /** Extend the current uptime segment to now (called each scan cycle). */
  private markUptime() {
    const nowSec = Math.floor(Date.now() / 1000)
    const seg = this.uptime[this.uptime.length - 1]
    // If no open segment or a long gap (>5 min) since last scan, start a fresh segment.
    if (!seg || nowSec - seg.end > 300) {
      this.uptime.push({ start: nowSec, end: nowSec })
    } else {
      seg.end = nowSec
    }
    saveUptime(this.uptime)
  }

  private scheduleNext(delayMs: number) {
    this.timer = setTimeout(() => this.runCycle().catch(console.error), delayMs)
  }

  private async fetchCandles(symbol: string, interval: string, limit = 100): Promise<OhlcvBar[]> {
    const ticker = symbol.replace('/', '').toUpperCase()
    const cacheKey = `${ticker}-${interval}-${limit}`
    const cached = this.candleCache.get(cacheKey)
    const tfMs = intervalMsFor(interval)
    const ttlMs = Math.min(5 * 60_000, Math.max(5_000, Math.floor(tfMs / 4)))
    if (cached && Date.now() - cached.ts < ttlMs) return cached.data

    const tryFetch = async (url: string) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(url)
        if (res.ok) return res.json() as Promise<any[]>
        if (res.status === 429 && attempt === 0) {
          await new Promise(r => setTimeout(r, 750))
          continue
        }
        throw new Error(`HTTP ${res.status}`)
      }
      return [] as any[]
    }
    let klines: any[]
    try {
      klines = await tryFetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${ticker}&interval=${interval}&limit=${limit}`)
    } catch {
      klines = await tryFetch(`https://api.binance.com/api/v3/klines?symbol=${ticker}&interval=${interval}&limit=${limit}`)
    }
    const data = klines.map((k: any) => ({
      time: k[0] / 1000, open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    }))
    this.candleCache.set(cacheKey, { ts: Date.now(), data })
    if (this.candleCache.size > 2000) {
      const removeCount = Math.floor(this.candleCache.size * 0.2)
      let removed = 0
      for (const key of this.candleCache.keys()) {
        this.candleCache.delete(key)
        removed++
        if (removed >= removeCount) break
      }
    }
    return data
  }

  private async fetchAllSymbols(): Promise<string[]> {
    const cached = this.allSymbolsCache
    if (cached && Date.now() - cached.ts < 30 * 60_000 && cached.symbols.length > 0) return cached.symbols
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { symbols: { symbol: string; status: string; quoteAsset: string }[] }
      const symbols = json.symbols.filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT').map(s => s.symbol)
      this.allSymbolsCache = { ts: Date.now(), symbols }
      return symbols
    } catch {
      return this.settings.symbols
    }
  }

  private async runCycle() {
    if (!this.running) return
    this.scanCount++
    this.lastScanAt = Date.now()
    this.markUptime()   // record that the scanner was active at this moment

    const { scanAllCoins, timeframes, strategy, minQuality, minConfluence, isConfluence, nearEntryOnly, nearEntryPct } = this.settings
    const symbols = scanAllCoins ? await this.fetchAllSymbols() : this.settings.symbols

    const pairs: { symbol: string; tf: string }[] = []
    for (const symbol of symbols) for (const tf of timeframes) pairs.push({ symbol, tf })
    this.progress = { done: 0, total: pairs.length }

    const concurrency = 6
    let idx = 0

    const worker = async () => {
      while (idx < pairs.length && this.running) {
        const my = idx++
        const { symbol, tf } = pairs[my]
        this.currentSymbol = `${symbol}/${tf}`

        try {
          // HTF 660 bars: EMA-200 seeded with only ~20 post-seed updates (220 bars) is mostly
          // a lagged SMA — 3x the period gives the recursion room to converge.
          const [candles, htfCandles] = await Promise.all([
            this.fetchCandles(symbol, tf, 200),
            this.fetchCandles(symbol, htfFor(tf), 660),
          ])

          if (candles.length >= 50) {
            const scanParams: BgScanParams = {
              symbol, timeframe: tf, strategy,
              minQuality, minConfluence, isConfluence,
              nearEntryOnly, nearEntryPct,
              enabledStrategies:        this.settings.enabledStrategies,
              filterHTFAlignment:       this.settings.filterHTFAlignment,
              filterEntryConfirmation:  this.settings.filterEntryConfirmation,
              filterADXRegime:          this.settings.filterADXRegime,
              filterVolumeConfirmation: this.settings.filterVolumeConfirmation,
              filterKeyLevelDistance:   this.settings.filterKeyLevelDistance,
              keyLevelMaxDistancePct:   this.settings.keyLevelMaxDistancePct,
              minVolumeRatio:           this.settings.minVolumeRatio,
              filterRetestConfirmation: this.settings.filterRetestConfirmation,
              filterAtrEntryBuffer:     this.settings.filterAtrEntryBuffer,
              entryAtrBufferAtrMult:    this.settings.entryAtrBufferAtrMult,
              filterStrongClose:        this.settings.filterStrongClose,
              strongCloseBodyPct:       this.settings.strongCloseBodyPct,
              filterAvoidOppKeyLevel:   this.settings.filterAvoidOppKeyLevel,
              filterCooldown:           this.settings.filterCooldown,
              cooldownBars:             this.settings.cooldownBars,
              filterBTCAlignment:       this.settings.filterBTCAlignment,
              filterRequireOrderBlock:  this.settings.filterRequireOrderBlock,
              filterFVG:                this.settings.filterFVG,
              filterPapRequireRetest:   this.settings.filterPapRequireRetest,
              filterEliteSession:         this.settings.filterEliteSession,
              filterCmSession:            this.settings.filterCmSession,
              filterLiquiditySweep:       this.settings.filterLiquiditySweep,
              filterEliteRequireRetest:   this.settings.filterEliteRequireRetest,
              filterEliteHTFEMA:          this.settings.filterEliteHTFEMA,
              filterEliteMaxEmaDistance:  this.settings.filterEliteMaxEmaDistance,
              filterFixedPctSlTp:         this.settings.filterFixedPctSlTp,
              fixedSlPct:                 this.settings.fixedSlPct,
              fixedTpPct:                 this.settings.fixedTpPct,
              eliteMinVolRegime:          this.settings.eliteMinVolRegime,
              filterIFVG:                 this.settings.filterIFVG,
              filterCisdRetest:           this.settings.filterCisdRetest,
              filterHtfEma50:             this.settings.filterHtfEma50,
              errAGradeBoost:             this.settings.errAGradeBoost,
              errStochConfirm:            this.settings.errStochConfirm,
              errHtfEma200:               this.settings.errHtfEma200,
              errMultiRetest:             this.settings.errMultiRetest,
              errAGradeRequired:          this.settings.errAGradeRequired,
              errHtfEma50Required:        this.settings.errHtfEma50Required,
              errMinRREnabled:            this.settings.errMinRREnabled,
              errMinRR:                   this.settings.errMinRR,
              errRetestMaxBarsEnabled:    this.settings.errRetestMaxBarsEnabled,
              errRetestMaxBars:           this.settings.errRetestMaxBars,
              errReversalBodyMinPct:      this.settings.errReversalBodyMinPct,
              errRetestAtrTolMult:        this.settings.errRetestAtrTolMult,
              errStochOS:                 this.settings.errStochOS,
              errStochOB:                 this.settings.errStochOB,
              errMultiRetestLookbackBars: this.settings.errMultiRetestLookbackBars,
              errMultiRetestMinTouches:   this.settings.errMultiRetestMinTouches,
              errAGradeBodyMinPct:        this.settings.errAGradeBodyMinPct,
              errAGradeVolMinMult:        this.settings.errAGradeVolMinMult,
              errTp1MultDefault:          this.settings.errTp1MultDefault,
              errTp2MultDefault:          this.settings.errTp2MultDefault,
              errTp1MultBoost:            this.settings.errTp1MultBoost,
              errTp2MultBoost:            this.settings.errTp2MultBoost,
              ecbAGradeBodyMinPctHighVol: this.settings.ecbAGradeBodyMinPctHighVol,
              ecbAGradeBodyMinPctOther:   this.settings.ecbAGradeBodyMinPctOther,
              ecbAGradeVolMinMult:        this.settings.ecbAGradeVolMinMult,
              ecbBGradeBodyMinPctMedium:  this.settings.ecbBGradeBodyMinPctMedium,
              ecbBGradeBodyMinPctOther:   this.settings.ecbBGradeBodyMinPctOther,
              ecbBGradeVolMinMultMedium:  this.settings.ecbBGradeVolMinMultMedium,
              ecbBGradeVolMinMultOther:   this.settings.ecbBGradeVolMinMultOther,
              ecbRetestAtrTolMult:        this.settings.ecbRetestAtrTolMult,
              ecbRetestEma20MaxDistPct:   this.settings.ecbRetestEma20MaxDistPct,
              ecbRetestVolMaxFracOfBreak: this.settings.ecbRetestVolMaxFracOfBreak,
              ecbMaxEma50DistanceAtrMult: this.settings.ecbMaxEma50DistanceAtrMult,
              ecbMinConsolidBars:         this.settings.ecbMinConsolidBars,
              ecbRsiLongMinMediumAGrade:  this.settings.ecbRsiLongMinMediumAGrade,
              ecbRsiLongMinMediumBGrade:  this.settings.ecbRsiLongMinMediumBGrade,
              ecbRsiLongMinOther:         this.settings.ecbRsiLongMinOther,
              ecbRsiShortMaxMediumAGrade: this.settings.ecbRsiShortMaxMediumAGrade,
              ecbRsiShortMaxMediumBGrade: this.settings.ecbRsiShortMaxMediumBGrade,
              ecbRsiShortMaxOther:        this.settings.ecbRsiShortMaxOther,
              ecbSlAtrMultAGradeHigh:     this.settings.ecbSlAtrMultAGradeHigh,
              ecbSlAtrMultAGradeOther:    this.settings.ecbSlAtrMultAGradeOther,
              ecbSlAtrMultBGrade:         this.settings.ecbSlAtrMultBGrade,
              ecbTp1RRMultAGradeHigh:     this.settings.ecbTp1RRMultAGradeHigh,
              ecbTp1RRMultAGradeOther:    this.settings.ecbTp1RRMultAGradeOther,
              ecbTp1RRMultBGradeMedium:   this.settings.ecbTp1RRMultBGradeMedium,
              ecbTp1RRMultBGradeOther:    this.settings.ecbTp1RRMultBGradeOther,
              ecbMeasuredMoveMinAtrMult:  this.settings.ecbMeasuredMoveMinAtrMult,
              ecbTp2ExtraRR:              this.settings.ecbTp2ExtraRR,
              ecbMaxBreakCandleRangeAtrMult: this.settings.ecbMaxBreakCandleRangeAtrMult,
              ecbBreakClosePosBullMinPct:    this.settings.ecbBreakClosePosBullMinPct,
              ecbBreakClosePosBearMaxPct:    this.settings.ecbBreakClosePosBearMaxPct,
              brMinAtrPct:                this.settings.brMinAtrPct,
              brMaxRangeAtrMult:          this.settings.brMaxRangeAtrMult,
              brEmaSlopeLookback:         this.settings.brEmaSlopeLookback,
              brAdxMin:                   this.settings.brAdxMin,
              fgUseADX:                   this.settings.fgUseADX,
              fgAdxMin:                   this.settings.fgAdxMin,
              fgUseSession:               this.settings.fgUseSession,
              fgSessionStartUtc:          this.settings.fgSessionStartUtc,
              fgSessionEndUtc:            this.settings.fgSessionEndUtc,
              fgUseStructure:             this.settings.fgUseStructure,
              fgStructureTolAtrMult:      this.settings.fgStructureTolAtrMult,
              fgUseMomentum:              this.settings.fgUseMomentum,
              fgUseRsiDivergence:         this.settings.fgUseRsiDivergence,
              fgUseStochCross:            this.settings.fgUseStochCross,
              fgStochExtreme:             this.settings.fgStochExtreme,
              fgStochOS:                  this.settings.fgStochOS,
              fgStochOB:                  this.settings.fgStochOB,
              fgUseVolume:                this.settings.fgUseVolume,
              fgMinVolumeRatio:           this.settings.fgMinVolumeRatio,
              fgRequireVolumeExpanding:   this.settings.fgRequireVolumeExpanding,
              fgUseHTFAlign:              this.settings.fgUseHTFAlign,
              fgUseCost:                  this.settings.fgUseCost,
              fgUseExecution:             this.settings.fgUseExecution,
              fgBaseLenLong:              this.settings.fgBaseLenLong,
              fgBaseLenShort:             this.settings.fgBaseLenShort,
              fgGuideEmaLen:              this.settings.fgGuideEmaLen,
              fgVolLen:                   this.settings.fgVolLen,
              fgPersLen:                  this.settings.fgPersLen,
              fgCurvLen:                  this.settings.fgCurvLen,
              fgThresholdKLong:           this.settings.fgThresholdKLong,
              fgThresholdKShort:          this.settings.fgThresholdKShort,
              fgUseCross:                 this.settings.fgUseCross,
              stAtrPeriod:                this.settings.stAtrPeriod,
              stAtrMult:                  this.settings.stAtrMult,
              stUseRelVol:                this.settings.stUseRelVol,
              stRelVolLen:                this.settings.stRelVolLen,
              stRelVolMin:                this.settings.stRelVolMin,
              stRequireFlip:              this.settings.stRequireFlip,
              stUseKernel:                this.settings.stUseKernel,
              stKernelLookback:           this.settings.stKernelLookback,
              stKernelBandwidth:          this.settings.stKernelBandwidth,
              stUseHTFAlign:              this.settings.stUseHTFAlign,
              stHtfEmaLen:                this.settings.stHtfEmaLen,
              stUseHtfEmaSlope:           this.settings.stUseHtfEmaSlope,
              stHtfEmaSlopeLookback:      this.settings.stHtfEmaSlopeLookback,
              stHtfEmaSlopeMinPctPerBar:  this.settings.stHtfEmaSlopeMinPctPerBar,
              stUseAdx:                   this.settings.stUseAdx,
              stAdxPeriod:                this.settings.stAdxPeriod,
              stAdxMin:                   this.settings.stAdxMin,
              stUseDiAlign:               this.settings.stUseDiAlign,
              stDiPeriod:                 this.settings.stDiPeriod,
              stUseManualSlTp:            this.settings.stUseManualSlTp,
              stManualSlPct:              this.settings.stManualSlPct,
              stManualTp1Pct:             this.settings.stManualTp1Pct,
              stManualTp2Pct:             this.settings.stManualTp2Pct,
              stUseEmaDistance:           this.settings.stUseEmaDistance,
              stEmaDistAtrMin:            this.settings.stEmaDistAtrMin,
              stUseImpulse:               this.settings.stUseImpulse,
              stImpulseBodyMinPct:        this.settings.stImpulseBodyMinPct,
              stImpulseWickMaxPct:        this.settings.stImpulseWickMaxPct,
              stUseKdeRegime:             this.settings.stUseKdeRegime,
              stKdeRegimeLookback:        this.settings.stKdeRegimeLookback,
              stKdeRegimeBandwidth:       this.settings.stKdeRegimeBandwidth,
              stKdeRegimeMaxConcentration:this.settings.stKdeRegimeMaxConcentration,
              stUseKdeValueArea:          this.settings.stUseKdeValueArea,
              stKdeValueAreaLookback:     this.settings.stKdeValueAreaLookback,
              stKdeValueAreaBandwidth:    this.settings.stKdeValueAreaBandwidth,
              stKdeValueAreaMaxDensity:   this.settings.stKdeValueAreaMaxDensity,
              bbssdLength:                this.settings.bbssdLength,
              bbssdStdDev:                this.settings.bbssdStdDev,
              bbssdStochK:                this.settings.bbssdStochK,
              bbssdStochD:                this.settings.bbssdStochD,
              bbssdStochSmooth:           this.settings.bbssdStochSmooth,
              bbssdStochOS:               this.settings.bbssdStochOS,
              bbssdStochOB:               this.settings.bbssdStochOB,
              bbssdLookbackBars:          this.settings.bbssdLookbackBars,
              bbssdRequireZone:           this.settings.bbssdRequireZone,
              bbssdZoneFreshOnly:         this.settings.bbssdZoneFreshOnly,
              bbssdRequireBBTag:          this.settings.bbssdRequireBBTag,
              bbssdRequireBBReject:       this.settings.bbssdRequireBBReject,
              bbssdRequireStochCross:     this.settings.bbssdRequireStochCross,
              bbssdRequireReversalCandle: this.settings.bbssdRequireReversalCandle,
              bbssdHtfEma200:             this.settings.bbssdHtfEma200,
              bbssdUseMaxAdx:             this.settings.bbssdUseMaxAdx,
              bbssdMaxAdx:                this.settings.bbssdMaxAdx,
              bbssdUseVolume:             this.settings.bbssdUseVolume,
              bbssdMinVolumeRatio:        this.settings.bbssdMinVolumeRatio,
              bbssdZoneTolAtrMult:        this.settings.bbssdZoneTolAtrMult,
              bbssdMinLegAtr:             this.settings.bbssdMinLegAtr,
              bbssdRsiLongMin:            this.settings.bbssdRsiLongMin,
              bbssdRsiLongMax:            this.settings.bbssdRsiLongMax,
              bbssdRsiShortMin:           this.settings.bbssdRsiShortMin,
              bbssdRsiShortMax:           this.settings.bbssdRsiShortMax,
              bbssdFreshZonesOnly:        this.settings.bbssdFreshZonesOnly,
              bbssdRequireRsiDiv:         this.settings.bbssdRequireRsiDiv,
              bbssdAllowObFvgFallback:    this.settings.bbssdAllowObFvgFallback,
              bbssdRevWickPct:            this.settings.bbssdRevWickPct,
              bbssdRequireEntryConfirm:   this.settings.bbssdRequireEntryConfirm,
              bbssdRequireLiqSweep:       this.settings.bbssdRequireLiqSweep,
              sqzBbLen:                   this.settings.sqzBbLen,
              sqzBbStd:                   this.settings.sqzBbStd,
              sqzKcLen:                   this.settings.sqzKcLen,
              sqzKcMult:                  this.settings.sqzKcMult,
              sqzMomLen:                  this.settings.sqzMomLen,
              sqzRequireRelease:          this.settings.sqzRequireRelease,
              sqzMinSqueezeBars:          this.settings.sqzMinSqueezeBars,
              sqzRequireMomRising:        this.settings.sqzRequireMomRising,
              sqzUseHtfAlign:             this.settings.sqzUseHtfAlign,
              sqzHtfEmaLen:               this.settings.sqzHtfEmaLen,
              sqzUseAdx:                  this.settings.sqzUseAdx,
              sqzAdxMin:                  this.settings.sqzAdxMin,
              sqzUseVolume:               this.settings.sqzUseVolume,
              sqzVolLen:                  this.settings.sqzVolLen,
              sqzMinVolumeRatio:          this.settings.sqzMinVolumeRatio,
              sqzSlAtrMult:               this.settings.sqzSlAtrMult,
              sqzTp1AtrMult:              this.settings.sqzTp1AtrMult,
              sqzTp2AtrMult:              this.settings.sqzTp2AtrMult,
              sqzUseManualSlTp:           this.settings.sqzUseManualSlTp,
              sqzManualSlPct:             this.settings.sqzManualSlPct,
              sqzManualTp1Pct:            this.settings.sqzManualTp1Pct,
              sqzManualTp2Pct:            this.settings.sqzManualTp2Pct,
              htfCandles:                 htfCandles.length > 0 ? htfCandles : undefined,
            }

            const signal = evaluateSignal(candles, scanParams)
            if (signal) {
              const dedupKey = `${symbol}-${tf}-${signal.strategy}-${signal.direction}`
              const lastSent = this.lastSignalTime.get(dedupKey) ?? 0
              if (Date.now() - lastSent > SIGNAL_COOLDOWN_MS) {
                this.lastSignalTime.set(dedupKey, Date.now())
                saveCooldowns(this.lastSignalTime)
                this.signalsFound++
                this.recentSignals = [signal, ...this.recentSignals].slice(0, MAX_RECENT)
                sendTelegramSignal(signal).catch(console.error)
                bybitTrader.placeOrder(signal).catch(console.error)
                mexcTrader.placeOrder(signal).catch(console.error)
                paperTrader.createOrder(signal)
                console.log(`[BgScanner] Signal: ${symbol} ${tf} ${signal.direction.toUpperCase()} Q${signal.quality} C${signal.confluence}`)
              }
            }
          }
        } catch {
          // skip failed symbol silently
        }

        this.progress.done++
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    this.currentSymbol = null
    if (this.running) this.scheduleNext(this.settings.intervalSec * 1000)
  }
}

export const bgScanner = new BackgroundScannerService()
