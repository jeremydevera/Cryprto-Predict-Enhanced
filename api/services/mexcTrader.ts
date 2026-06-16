import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { BgSignal } from '../utils/signalEval.js'
import { sendTelegramText } from './telegramService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SETTINGS_FILE = path.join(__dirname, '../../data/mexc-settings.json')

// ─── Types ────────────────────────────────────────────────────────────────────

export type MexcSettings = {
  enabled:          boolean
  apiKey:           string
  apiSecret:        string
  positionSizeUSDT: number
  leverage:         number
  maxOpenTrades:    number
  enabledStrategies: string[]
  orderType:        'Market' | 'Limit'
  openType:         1 | 2   // 1=Isolated, 2=Cross
  noChase:          boolean // skip if live price has moved against signal entry
  maxChasePct:      number  // % of slippage allowed before skipping (e.g. 0.15)
  lossThreshold:    number
  dailyLossLimitPct: number // halt new entries when equity drops this % below the UTC-day start (0 = off)
}

export type MexcTrade = {
  id:               string
  orderId:          string
  symbol:           string
  mexcSymbol:       string
  direction:        'buy' | 'sell'
  strategy:         string
  vol:              number
  entryPrice:       number
  sl:               number
  tp1:              number
  positionSizeUSDT: number
  leverage:         number
  status:           'open' | 'filled' | 'failed' | 'cancelled'
  error?:           string
  openedAt:         number
}

type ContractInfo = { contractSize: number; minVol: number; maxVol: number; volUnit: number; priceUnit: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL     = 'https://contract.mexc.com'
const MAX_TRADES   = 100

const DEFAULT_SETTINGS: MexcSettings = {
  enabled:           false,
  apiKey:            '',
  apiSecret:         '',
  positionSizeUSDT:  10,
  leverage:          5,
  maxOpenTrades:     3,
  enabledStrategies: ['Elite Context Breakout'],
  orderType:         'Market',
  openType:          2,   // Cross margin by default
  noChase:           false,
  maxChasePct:       0.15,
  lossThreshold:     0,
  dailyLossLimitPct: 10,
}

// Daily-loss circuit-breaker state. Persisted so a mid-day restart can't reset the
// baseline (and therefore the limit).
type DailyEquityState = { day: string; startEquity: number; halted: boolean }

const DAILY_EQUITY_FILE = path.join(__dirname, '../../data/mexc-daily-equity.json')

function loadDailyEquity(): DailyEquityState {
  try {
    const raw = JSON.parse(fs.readFileSync(DAILY_EQUITY_FILE, 'utf-8'))
    if (typeof raw?.day === 'string' && typeof raw?.startEquity === 'number') {
      return { day: raw.day, startEquity: raw.startEquity, halted: raw.halted === true }
    }
  } catch { /* missing/corrupt file → fresh state */ }
  return { day: '', startEquity: 0, halted: false }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class MexcTraderService {
  private settings: MexcSettings      = { ...DEFAULT_SETTINGS }
  private openTrades:   MexcTrade[]   = []
  private recentTrades: MexcTrade[]   = []
  private contractCache = new Map<string, ContractInfo>()
  private livePositionCount = 0  // actual MEXC open position count after last sync
  // Symbols with an order currently in flight. placeOrder's open-trade check is
  // check-then-act across awaits — without this synchronous reservation, two signals
  // for the same symbol arriving from concurrent scanner workers both pass the guard.
  private pendingSymbols = new Set<string>()
  private dailyEquity: DailyEquityState = loadDailyEquity()

  constructor() {
    this.loadFromFile()
    setInterval(() => this.syncOpenTrades().catch(() => {}), 30_000)
    // Roll the daily-loss baseline near UTC midnight rather than at the day's first order
    // attempt — otherwise overnight bleed before the first signal escapes the daily limit.
    setInterval(() => this.refreshDailyBaseline().catch(() => {}), 15 * 60_000)
    this.refreshDailyBaseline().catch(() => {})
  }

  private async refreshDailyBaseline(): Promise<void> {
    const pct = Math.max(0, Number(this.settings.dailyLossLimitPct) || 0)
    if (pct <= 0 || !this.settings.enabled || !this.settings.apiKey || !this.settings.apiSecret) return
    const day = new Date().toISOString().slice(0, 10)
    if (this.dailyEquity.day === day && this.dailyEquity.startEquity > 0) return
    const account = await this.fetchAccountInfo().catch(() => null)
    const equity = account?.ok === true ? Number(account.walletBalance ?? NaN) : NaN
    if (!Number.isFinite(equity) || equity <= 0) return
    this.dailyEquity = { day, startEquity: equity, halted: false }
    this.saveDailyEquity()
    console.log(`[MEXC] Daily-loss baseline for ${day}: ${equity.toFixed(2)} USDT`)
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
        const saved = JSON.parse(raw)
        const merged: MexcSettings = { ...DEFAULT_SETTINGS, ...saved }
        // A hand-edited file can carry strings where numbers are expected; the sizing
        // guard (Number.isFinite) would then silently skip every order. Coerce on load,
        // falling back to defaults for anything non-numeric.
        for (const k of ['positionSizeUSDT', 'leverage', 'maxOpenTrades', 'maxChasePct', 'lossThreshold', 'dailyLossLimitPct'] as const) {
          const v = Number(merged[k])
          ;(merged as Record<string, unknown>)[k] = Number.isFinite(v) ? v : DEFAULT_SETTINGS[k]
        }
        merged.enabled = merged.enabled === true
        merged.noChase = merged.noChase === true
        this.settings = merged
      }
    } catch { /* ignore corrupt file */ }
  }

  private saveToFile() {
    try {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch { /* ignore write errors */ }
  }

  private saveDailyEquity() {
    // Temp-file + rename: a crash mid-write must not leave a truncated file that reads
    // back as "no halt, no baseline" — this state guards live-money order flow.
    try {
      fs.mkdirSync(path.dirname(DAILY_EQUITY_FILE), { recursive: true })
      const tmp = `${DAILY_EQUITY_FILE}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(this.dailyEquity, null, 2), 'utf-8')
      fs.renameSync(tmp, DAILY_EQUITY_FILE)
    } catch (e: any) {
      console.error('[MEXC] Failed to persist daily-equity state:', e?.message)
    }
  }

  getStatus() {
    return {
      settings:          { ...this.settings, apiSecret: this.settings.apiSecret ? '••••••••' : '' },
      openTrades:        [...this.openTrades],
      recentTrades:      [...this.recentTrades],
      livePositionCount: this.livePositionCount,
    }
  }

  async syncOpenTrades(): Promise<{ synced: number; removed: number; imported: number }> {
    if (!this.settings.apiKey || !this.settings.apiSecret) return { synced: 0, removed: 0, imported: 0 }
    try {
      const res = await this.request('GET', '/api/v1/private/position/open_positions')
      if ((!res?.success && res?.code !== 0) || !Array.isArray(res.data)) {
        console.log('[MEXC] Sync: unexpected response:', JSON.stringify(res)?.slice(0, 300))
        return { synced: 0, removed: 0, imported: 0 }
      }

      // MEXC Futures uses holdVol for position size (not vol)
      const posVol = (p: any) => parseFloat(p.holdVol ?? p.vol ?? 0)
      const activePositions = res.data.filter((p: any) => posVol(p) > 0)
      if (res.data.length > 0 && activePositions.length === 0) {
        console.log('[MEXC] Sync: sample position fields:', JSON.stringify(res.data[0])?.slice(0, 400))
      }
      this.livePositionCount = activePositions.length

      // Symbols actually open on MEXC (normalised to no underscore, e.g. BTC_USDT → BTCUSDT)
      const mexcOpenSymbols = new Set(
        activePositions.map((p: any) => String(p.symbol ?? '').replace('_', ''))
      )

      // Drop any app-tracked trades that MEXC no longer has open
      const before = this.openTrades.length
      this.openTrades = this.openTrades.filter(t => mexcOpenSymbols.has(t.symbol))
      const removed = before - this.openTrades.length

      // Update SL/TP on already-tracked trades from live MEXC data
      const positionBySymbol = new Map<string, any>()
      for (const p of activePositions) {
        const sym = String(p.symbol ?? '').replace('_', '')
        positionBySymbol.set(sym, p)
      }
      for (const t of this.openTrades) {
        const p = positionBySymbol.get(t.symbol)
        if (!p) continue
        const liveSl  = parseFloat(p.stopLossPrice   ?? p.stopLoss   ?? '0')
        const liveTp  = parseFloat(p.takeProfitPrice ?? p.takeProfit ?? '0')
        if (liveSl  > 0) t.sl  = liveSl
        if (liveTp  > 0) t.tp1 = liveTp
        t.entryPrice = parseFloat(p.openAvgPrice ?? p.holdAvgPrice ?? '0') || t.entryPrice
      }

      // Import MEXC positions not yet in the app's open trades list
      const trackedSymbols = new Set(this.openTrades.map(t => t.symbol))
      let imported = 0
      for (const p of activePositions) {
        const symbol     = String(p.symbol ?? '').replace('_', '')   // BTCUSDT
        const mexcSymbol = String(p.symbol ?? '')                     // BTC_USDT
        if (trackedSymbols.has(symbol)) continue

        const direction: 'buy' | 'sell' = p.positionType === 1 ? 'buy' : 'sell'
        const importedTrade: MexcTrade = {
          id:               `mexc-import-${symbol}-${Date.now()}-${imported}`,
          orderId:          String(p.orderId ?? ''),
          symbol,
          mexcSymbol,
          direction,
          strategy:         'manual',
          vol:              posVol(p),
          entryPrice:       parseFloat(p.openAvgPrice ?? p.holdAvgPrice ?? '0'),
          sl:               parseFloat(p.stopLossPrice ?? p.stopLoss ?? '0'),
          tp1:              parseFloat(p.takeProfitPrice ?? p.takeProfit ?? '0'),
          positionSizeUSDT: 0,
          leverage:         parseFloat(p.leverage ?? '1'),
          status:           'filled',
          openedAt:         Number(p.createTime ?? Date.now()),
        }
        this.openTrades.push(importedTrade)
        trackedSymbols.add(symbol)
        imported++
      }

      if (removed > 0)  console.log(`[MEXC] Sync: auto-removed ${removed} closed trade(s)`)
      if (imported > 0) console.log(`[MEXC] Sync: imported ${imported} manually-opened position(s)`)
      console.log(`[MEXC] Sync: ${this.livePositionCount} live position(s) on MEXC, ${this.openTrades.length} tracked`)

      return { synced: this.livePositionCount, removed, imported }
    } catch (e: any) {
      console.error('[MEXC] Sync error:', e?.message)
      return { synced: 0, removed: 0, imported: 0 }
    }
  }

  updateSettings(partial: Partial<MexcSettings>): { ok: boolean; errors: string[] } {
    const p = (partial ?? {}) as Record<string, unknown>
    const errors: string[] = []
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

    if ('positionSizeUSDT' in p && !(num(p.positionSizeUSDT) && p.positionSizeUSDT > 0)) errors.push('positionSizeUSDT must be a number > 0')
    if ('leverage' in p && !(num(p.leverage) && p.leverage >= 1 && p.leverage <= 500)) errors.push('leverage must be 1–500')
    if ('maxOpenTrades' in p && !(num(p.maxOpenTrades) && Number.isInteger(p.maxOpenTrades) && p.maxOpenTrades >= 1 && p.maxOpenTrades <= 100)) errors.push('maxOpenTrades must be an integer 1–100')
    if ('lossThreshold' in p && !(num(p.lossThreshold) && p.lossThreshold >= 0)) errors.push('lossThreshold must be ≥ 0')
    if ('dailyLossLimitPct' in p && !(num(p.dailyLossLimitPct) && p.dailyLossLimitPct >= 0 && p.dailyLossLimitPct < 100)) errors.push('dailyLossLimitPct must be 0–99 (0 = off)')
    if ('maxChasePct' in p && !(num(p.maxChasePct) && p.maxChasePct >= 0)) errors.push('maxChasePct must be ≥ 0')
    if ('orderType' in p && p.orderType !== 'Market' && p.orderType !== 'Limit') errors.push("orderType must be 'Market' or 'Limit'")
    if ('openType' in p && p.openType !== 1 && p.openType !== 2) errors.push('openType must be 1 (isolated) or 2 (cross)')
    if ('enabled' in p && typeof p.enabled !== 'boolean') errors.push('enabled must be boolean')
    if ('noChase' in p && typeof p.noChase !== 'boolean') errors.push('noChase must be boolean')
    if ('apiKey' in p && typeof p.apiKey !== 'string') errors.push('apiKey must be a string')
    if ('apiSecret' in p && typeof p.apiSecret !== 'string') errors.push('apiSecret must be a string')
    if ('enabledStrategies' in p && !(Array.isArray(p.enabledStrategies) && p.enabledStrategies.every(s => typeof s === 'string'))) errors.push('enabledStrategies must be an array of strings')

    if (errors.length > 0) return { ok: false, errors }

    // Apply only known settings keys — req.body comes in unvalidated, so unknown keys
    // must not be spread into the persisted settings object.
    const allowed: (keyof MexcSettings)[] = [
      'enabled', 'apiKey', 'apiSecret', 'positionSizeUSDT', 'leverage', 'maxOpenTrades',
      'enabledStrategies', 'orderType', 'openType', 'noChase', 'maxChasePct',
      'lossThreshold', 'dailyLossLimitPct',
    ]
    for (const key of allowed) {
      if (key in p) (this.settings as Record<string, unknown>)[key] = p[key]
    }
    this.saveToFile()
    return { ok: true, errors: [] }
  }

  removeOpenTrade(id: string) {
    this.openTrades = this.openTrades.filter(t => t.id !== id)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  // Convert BTCUSDT → BTC_USDT  /  ETHBUSD → ETH_BUSD
  private toMexcSymbol(symbol: string): string {
    if (symbol.endsWith('USDT')) return symbol.slice(0, -4) + '_USDT'
    if (symbol.endsWith('USDC')) return symbol.slice(0, -4) + '_USDC'
    if (symbol.endsWith('BUSD')) return symbol.slice(0, -4) + '_BUSD'
    return symbol
  }

  // MEXC Futures signature: HMAC_SHA256(secret, apiKey + timestamp + params)
  private sign(timestamp: string, params: string): string {
    const payload = this.settings.apiKey + timestamp + params
    return crypto.createHmac('sha256', this.settings.apiSecret).update(payload).digest('hex')
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, unknown> = {},
    auth = true,
  ): Promise<any> {
    const timestamp = Date.now().toString()

    let url: string
    let bodyStr = ''
    let signature = ''

    if (method === 'GET') {
      const qs = Object.keys(params).length > 0
        ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
        : ''
      url = `${BASE_URL}${path}${qs}`
      if (auth) signature = this.sign(timestamp, qs.slice(1))   // strip leading '?'
    } else {
      bodyStr = Object.keys(params).length > 0 ? JSON.stringify(params) : ''
      url = `${BASE_URL}${path}`
      if (auth) signature = this.sign(timestamp, bodyStr)
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth) {
      headers['ApiKey']       = this.settings.apiKey
      headers['Request-Time'] = timestamp
      headers['Signature']    = signature
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12_000)
    try {
      const res = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
        ...(method === 'POST' ? { body: bodyStr } : {}),
      })

      return res.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ── Contract info ────────────────────────────────────────────────────────────

  private async getContractInfo(mexcSymbol: string): Promise<ContractInfo> {
    if (this.contractCache.has(mexcSymbol)) return this.contractCache.get(mexcSymbol)!
    try {
      const res = await this.request('GET', '/api/v1/contract/detail', { symbol: mexcSymbol }, false)
      const d   = res?.data
      if (!d) throw new Error('No contract data')
      const info: ContractInfo = {
        contractSize: parseFloat(d.contractSize   ?? '0.001'),
        minVol:       parseFloat(d.minVol         ?? '1'),
        maxVol:       parseFloat(d.maxVol         ?? '1000000000'),
        volUnit:      parseFloat(d.volUnit        ?? '1'),
        priceUnit:    parseFloat(d.priceUnit      ?? '0.01'),
      }
      this.contractCache.set(mexcSymbol, info)
      return info
    } catch {
      return { contractSize: 0.001, minVol: 1, maxVol: 1e9, volUnit: 1, priceUnit: 0.01 }
    }
  }

  // ── Rounding ─────────────────────────────────────────────────────────────────

  private roundDown(value: number, step: number): number {
    const precision = this.decimalPlaces(step)
    return parseFloat((Math.floor(value / step) * step).toFixed(precision))
  }

  private roundPrice(value: number, tick: number): number {
    const precision = this.decimalPlaces(tick)
    return parseFloat((Math.round(value / tick) * tick).toFixed(precision))
  }

  private decimalPlaces(step: number): number {
    const s = step.toString()
    const dot = s.indexOf('.')
    return dot === -1 ? 0 : s.length - dot - 1
  }

  // ── Place order ──────────────────────────────────────────────────────────────

  async placeOrder(signal: BgSignal): Promise<void> {
    const { enabled, apiKey, apiSecret, enabledStrategies } = this.settings
    if (!enabled || !apiKey || !apiSecret) return
    // Strip vol-regime suffix (e.g. "Elite Context Breakout [LOW VOL]" → "Elite Context Breakout") before matching
    const baseStrategy = signal.strategy.replace(/\s*\[.*?\]\s*$/, '').trim()
    if (!enabledStrategies.some(s => s === signal.strategy || s === baseStrategy)) return

    // Reserve the symbol synchronously BEFORE any await — concurrent placeOrder calls for
    // the same symbol must not interleave past the open-trade guard.
    if (this.pendingSymbols.has(signal.symbol)) {
      console.log(`[MEXC] Order already in flight for ${signal.symbol} — skipping duplicate signal`)
      return
    }
    this.pendingSymbols.add(signal.symbol)
    try {
      await this.placeOrderInner(signal)
    } finally {
      this.pendingSymbols.delete(signal.symbol)
    }
  }

  private async placeOrderInner(signal: BgSignal): Promise<void> {
    const { maxOpenTrades, positionSizeUSDT, leverage, orderType, openType } = this.settings

    // Sizing must be sane before anything touches the exchange. A zero/negative size used
    // to fall through Math.max(minVol, …) and place a minVol order anyway.
    if (!Number.isFinite(positionSizeUSDT) || positionSizeUSDT <= 0 || !Number.isFinite(leverage) || leverage < 1) {
      console.error(`[MEXC] Invalid sizing settings (size=${positionSizeUSDT} USDT, leverage=${leverage}) — skipping ${signal.symbol}`)
      return
    }
    if (!Number.isFinite(signal.entry) || signal.entry <= 0) {
      console.error(`[MEXC] ${signal.symbol}: invalid signal entry ${signal.entry} — skipping`)
      return
    }

    const threshold    = Number(this.settings.lossThreshold) || 0
    const dailyLossPct = Math.max(0, Number(this.settings.dailyLossLimitPct) || 0)

    // A standing daily halt is persisted state — enforce it before (and independent of)
    // the balance fetch, so an account-endpoint outage can't un-halt a halted day.
    const todayUtc = new Date().toISOString().slice(0, 10)
    if (dailyLossPct > 0 && this.dailyEquity.halted && this.dailyEquity.day === todayUtc) {
      console.log(`[MEXC] Daily-loss halt active — skipping ${signal.symbol}`)
      return
    }

    if (threshold > 0 || dailyLossPct > 0) {
      const account = await this.fetchAccountInfo().catch(() => null)
      const balance = account?.ok === true ? Number(account.walletBalance ?? NaN) : NaN
      // Fail CLOSED per attempt: with loss protections armed, no balance reading means no
      // new entry. (Tripping the kill switch here instead would permanently disable trading
      // on a transient fetch error — the previous bug.)
      if (!Number.isFinite(balance)) {
        console.warn(`[MEXC] Account fetch failed — loss protections can't be evaluated, skipping ${signal.symbol}`)
        return
      }
      // balance ≤ 0 is a REAL reading (drained account / negative cross equity) — it must
      // trip the switch, not be mistaken for a failed fetch.
      if (threshold > 0 && balance <= threshold) {
        this.settings.enabled = false
        this.saveToFile()
        console.warn(`[MEXC] Loss threshold ${threshold} reached at balance ${balance.toFixed(2)} USDT — Auto Trade Stopped`)
        sendTelegramText(`🛑 <b>Auto Trade stopped</b>\nBalance ${balance.toFixed(2)} USDT ≤ loss threshold ${threshold} USDT. Trading disabled until re-enabled manually.`).catch(() => {})
        return
      }
      if (dailyLossPct > 0 && this.dailyLossHalted(balance, dailyLossPct, signal.symbol)) return
    }

    // Sync with MEXC before checking slot availability — use live count as the authority.
    // Other in-flight orders (pendingSymbols minus this one) also consume slots: without
    // counting them, N concurrent signals all see the same pre-order livePositionCount.
    await this.syncOpenTrades()
    const pendingOthers = Math.max(0, this.pendingSymbols.size - 1)
    if (this.livePositionCount + pendingOthers >= maxOpenTrades) {
      console.log(`[MEXC] Max open trades (${maxOpenTrades}) reached — ${this.livePositionCount} live + ${pendingOthers} in flight — skipping ${signal.symbol}`)
      return
    }
    if (this.openTrades.some(t => t.symbol === signal.symbol)) {
      console.log(`[MEXC] Already have open trade for ${signal.symbol} — skipping`)
      return
    }

    const mexcSymbol = this.toMexcSymbol(signal.symbol)
    const info       = await this.getContractInfo(mexcSymbol)
    const { contractSize, minVol, maxVol, volUnit, priceUnit } = info

    // No-chase filter: skip if live price has moved past signal entry by more than maxChasePct
    if (this.settings.noChase && signal.entry > 0) {
      try {
        const tickerRes = await this.request('GET', '/api/v1/contract/ticker', { symbol: mexcSymbol }, false)
        const livePrice = parseFloat(tickerRes?.data?.lastPrice ?? '0')
        if (livePrice > 0) {
          const slipPct = ((livePrice - signal.entry) / signal.entry) * 100
          const tolerance = Math.max(0, Number(this.settings.maxChasePct) || 0)
          const chasing = signal.direction === 'buy'
            ? slipPct >  tolerance   // long: live above entry beyond tolerance
            : slipPct < -tolerance   // short: live below entry beyond tolerance
          if (chasing) {
            console.warn(`[MEXC] ${mexcSymbol}: no-chase skip — live ${livePrice} vs entry ${signal.entry} (${slipPct.toFixed(3)}%, tol ±${tolerance}%)`)
            return
          }
        }
      } catch (e: any) {
        console.warn(`[MEXC] ${mexcSymbol}: no-chase ticker fetch failed (${e?.message ?? 'unknown'}) — proceeding`)
      }
    }

    // MEXC vol = number of contracts
    // Each contract = contractSize base asset = contractSize * price USDT
    const rawVol    = positionSizeUSDT / (contractSize * signal.entry)
    const flooredVol = Math.max(minVol, this.roundDown(rawVol, volUnit))
    const vol       = Math.min(flooredVol, this.roundDown(maxVol, volUnit))

    if (vol < minVol) {
      console.warn(`[MEXC] ${mexcSymbol}: maxVol ${maxVol} < minVol ${minVol} — skipping signal`)
      return
    }
    if (flooredVol > maxVol) {
      console.warn(`[MEXC] ${mexcSymbol}: position size ${positionSizeUSDT} USDT requires ${flooredVol} contracts but per-order max is ${maxVol} — skipping signal (coin price too low for this size)`)
      return
    }

    // Round prices to MEXC tick size
    const slPrice  = this.roundPrice(signal.sl,  priceUnit)
    const tpPrice  = this.roundPrice(signal.tp1, priceUnit)
    const entryPrice = this.roundPrice(signal.entry, priceUnit)

    // Validate SL/TP: must be a real price (> 0) AND on the correct side of entry.
    // sl=0 on a buy passes a bare side check (0 < entry) but sends stopLossPrice=0 to MEXC.
    const slValid = slPrice > 0 && (signal.direction === 'buy' ? slPrice < entryPrice : slPrice > entryPrice)
    const tpValid = tpPrice > 0 && (signal.direction === 'buy' ? tpPrice > entryPrice : tpPrice < entryPrice)

    // MEXC side: 1=Open Long, 3=Open Short
    const side = signal.direction === 'buy' ? 1 : 3

    // MEXC order type: 5=Market, 1=Limit
    const type = orderType === 'Market' ? 5 : 1

    const trade: MexcTrade = {
      id:               `mexc-${signal.symbol}-${Date.now()}`,
      orderId:          '',
      symbol:           signal.symbol,
      mexcSymbol,
      direction:        signal.direction,
      strategy:         signal.strategy,
      vol,
      entryPrice,
      sl:               slPrice,
      tp1:              tpPrice,
      positionSizeUSDT,
      leverage,
      status:           'open',
      openedAt:         Date.now(),
    }

    // HARD GATE: never submit a leveraged order without a working stop. A naked position
    // was the known failure mode — invalid SL/TP now aborts the order instead of stripping it.
    if (!slValid || !tpValid) {
      trade.status = 'failed'
      trade.error  = `Rejected: invalid ${!slValid ? 'SL' : ''}${!slValid && !tpValid ? '+' : ''}${!tpValid ? 'TP' : ''} (entry=${entryPrice}, SL=${slPrice}, TP=${tpPrice}, ${signal.direction}) — order NOT submitted`
      this.recentTrades = [trade, ...this.recentTrades].slice(0, MAX_TRADES)
      console.error(`[MEXC] ✗ ${mexcSymbol}: ${trade.error}`)
      sendTelegramText(`⚠️ <b>MEXC order rejected</b>\n${mexcSymbol} ${signal.direction.toUpperCase()} (${signal.strategy})\nInvalid SL/TP — entry=${entryPrice}, SL=${slPrice}, TP=${tpPrice}. No order placed.`).catch(() => {})
      return
    }

    try {
      const orderBody: Record<string, unknown> = {
        symbol:   mexcSymbol,
        vol,
        leverage,
        side,
        type,
        openType,
        stopLossPrice:   slPrice,
        takeProfitPrice: tpPrice,
      }

      // Price required for limit orders
      if (orderType === 'Limit') {
        orderBody.price = entryPrice
      }

      console.log(`[MEXC] Placing order:`, JSON.stringify(orderBody))
      const result = await this.request('POST', '/api/v1/private/order/submit', orderBody)
      console.log(`[MEXC] API response:`, JSON.stringify(result))

      if (result?.success === true || result?.code === 0) {
        trade.orderId = String(result?.data ?? '')
        trade.status  = 'filled'
        this.openTrades.push(trade)
        console.log(`[MEXC] ✓ Order placed: ${mexcSymbol} ${signal.direction.toUpperCase()} vol=${vol} | SL=${slPrice} TP=${tpPrice} | orderId: ${trade.orderId}`)
        this.verifyProtection(trade)
      } else {
        trade.status = 'failed'
        trade.error  = `[${result?.code ?? '?'}] ${result?.message ?? result?.msg ?? 'Unknown error'}`
        console.error(`[MEXC] ✗ Order failed: ${mexcSymbol} — ${trade.error}`)
      }
    } catch (e: any) {
      trade.status = 'failed'
      trade.error  = e?.message ?? 'Network error'
      console.error(`[MEXC] ✗ Exception: ${mexcSymbol} — ${trade.error}`)
    }

    this.recentTrades = [trade, ...this.recentTrades].slice(0, MAX_TRADES)
  }

  /**
   * Post-fill safety check: confirm the live position actually carries a stop-loss.
   * MEXC accepts orders whose bracket silently fails to attach; without this check a
   * naked leveraged position sits unnoticed until manual review. Alerts loudly — does
   * not auto-close, since the position itself may be fine and only the bracket missing.
   */
  private verifyProtection(trade: MexcTrade, attempt = 1): void {
    setTimeout(async () => {
      try {
        const res = await this.request('GET', '/api/v1/private/position/open_positions')
        if ((!res?.success && res?.code !== 0) || !Array.isArray(res.data)) return
        const pos = res.data.find((p: any) =>
          String(p.symbol ?? '').replace('_', '') === trade.symbol && parseFloat(p.holdVol ?? p.vol ?? 0) > 0)
        if (!pos) return   // not filled yet or already closed — nothing to verify
        const liveSl = parseFloat(pos.stopLossPrice ?? pos.stopLoss ?? '0')
        if (liveSl > 0) return
        if (attempt < 3) { this.verifyProtection(trade, attempt + 1); return }
        const msg = `🚨 NAKED POSITION: ${trade.mexcSymbol} ${trade.direction.toUpperCase()} filled WITHOUT stop-loss (intended SL=${trade.sl}). Set the stop manually on MEXC now.`
        console.error(`[MEXC] ${msg}`)
        sendTelegramText(`🚨 <b>NAKED POSITION</b>\n${trade.mexcSymbol} ${trade.direction.toUpperCase()} has NO stop-loss attached.\nIntended SL=${trade.sl}, TP=${trade.tp1}.\n<b>Set the stop manually on MEXC now.</b>`).catch(() => {})
      } catch { /* transient — next sync re-imports SL state anyway */ }
    }, attempt * 5_000)
  }

  /**
   * Daily-loss circuit breaker. Baselines equity at the first order attempt of each UTC
   * day; once equity drops limitPct% below that baseline, new entries are blocked for the
   * rest of the day (existing positions untouched). Unlike lossThreshold this does NOT
   * flip `enabled` off — trading auto-resumes on the next UTC day. Stays halted even if
   * equity recovers above the floor, so a bounce can't re-arm revenge trading.
   */
  private dailyLossHalted(equity: number, limitPct: number, symbol: string): boolean {
    const day = new Date().toISOString().slice(0, 10)
    if (this.dailyEquity.day !== day || !(this.dailyEquity.startEquity > 0)) {
      this.dailyEquity = { day, startEquity: equity, halted: false }
      this.saveDailyEquity()
    }
    const floor = this.dailyEquity.startEquity * (1 - limitPct / 100)
    if (!this.dailyEquity.halted && equity <= floor) {
      this.dailyEquity.halted = true
      this.saveDailyEquity()
      console.warn(`[MEXC] Daily loss limit hit: equity ${equity.toFixed(2)} ≤ floor ${floor.toFixed(2)} (day start ${this.dailyEquity.startEquity.toFixed(2)}, limit ${limitPct}%) — no new trades until next UTC day`)
      sendTelegramText(`🛑 <b>Daily loss limit hit</b>\nEquity ${equity.toFixed(2)} USDT is ${limitPct}% below today's start (${this.dailyEquity.startEquity.toFixed(2)} USDT).\nNew entries halted until next UTC day. Open positions untouched.`).catch(() => {})
    }
    if (this.dailyEquity.halted) console.log(`[MEXC] Daily-loss halt active — skipping ${symbol}`)
    return this.dailyEquity.halted
  }

  // ── Account info ─────────────────────────────────────────────────────────────

  async fetchAccountInfo(): Promise<{
    ok: boolean
    message?: string
    walletBalance?: number
    availableBalance?: number
    unrealisedPnl?: number
    equity?: number
    positions?: {
      symbol: string; mexcSymbol?: string; side: string; size: string; entryPrice: string
      unrealisedPnl: string; leverage: string; markPrice: string; positionId?: string; openType?: string
    }[]
  }> {
    if (!this.settings.apiKey || !this.settings.apiSecret) return { ok: false, message: 'No API credentials' }
    try {
      const [assetsRes, posRes] = await Promise.all([
        this.request('GET', '/api/v1/private/account/assets'),
        this.request('GET', '/api/v1/private/position/open_positions'),
      ])

      if (!assetsRes?.success) return { ok: false, message: assetsRes?.message ?? 'Failed to fetch assets' }

      const assets: any[]  = Array.isArray(assetsRes.data) ? assetsRes.data : []
      const usdt           = assets.find((a: any) => a.currency === 'USDT') ?? {}

      const posVol2 = (p: any) => parseFloat(p.holdVol ?? p.vol ?? 0)
      if (Array.isArray(posRes?.data) && posRes.data.length > 0) {
        console.log('[MEXC] Account positions raw sample:', JSON.stringify(posRes.data[0])?.slice(0, 400))
      }
      const positions = (Array.isArray(posRes?.data) ? posRes.data : [])
        .filter((p: any) => posVol2(p) > 0)
        .map((p: any) => ({
          symbol:        p.symbol?.replace('_', '') ?? p.symbol,
          mexcSymbol:    p.symbol,
          side:          p.positionType === 1 ? 'Long' : 'Short',
          size:          String(p.holdVol ?? p.vol ?? '—'),
          entryPrice:    String(p.openAvgPrice ?? '0'),
          unrealisedPnl: String(p.unrealizedValue ?? p.holdFee ?? '0'),
          leverage:      String(p.leverage ?? '—'),
          markPrice:     String(p.closeAvgPrice ?? p.holdAvgPrice ?? p.openAvgPrice ?? '0'),
          positionId:    p.positionId !== undefined ? String(p.positionId) : undefined,
          openType:      p.openType !== undefined ? String(p.openType) : undefined,
        }))

      return {
        ok:               true,
        walletBalance:    parseFloat(usdt.equity            ?? usdt.cashBalance        ?? '0'),
        availableBalance: parseFloat(usdt.availableBalance  ?? '0'),
        unrealisedPnl:    parseFloat(usdt.unrealized        ?? '0'),
        equity:           parseFloat(usdt.equity            ?? '0'),
        positions,
      }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error' }
    }
  }

  async closePosition(params: {
    symbol: string
    side: 'Long' | 'Short' | string
    vol: number
    openType?: 1 | 2
    positionId?: string
  }): Promise<{ ok: boolean; message: string }> {
    if (!this.settings.apiKey || !this.settings.apiSecret) return { ok: false, message: 'No API credentials' }

    const mexcSymbol = params.symbol.includes('_') ? params.symbol : this.toMexcSymbol(params.symbol)
    const vol = Number(params.vol)
    if (!(vol > 0) || !Number.isFinite(vol)) return { ok: false, message: 'Invalid position size' }

    const isLong = String(params.side).toLowerCase() === 'long' || String(params.side).toLowerCase() === 'buy'
    const side = isLong ? 4 : 2
    const openType = params.openType ?? this.settings.openType

    try {
      const body: Record<string, unknown> = {
        symbol: mexcSymbol,
        vol,
        side,
        type: 5,
        openType,
      }
      if (params.positionId) body.positionId = params.positionId
      const result = await this.request('POST', '/api/v1/private/order/submit', body)
      if (result?.success === true || result?.code === 0) return { ok: true, message: 'Close order submitted' }
      return { ok: false, message: `[${result?.code ?? '?'}] ${result?.message ?? result?.msg ?? 'Close failed'}` }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error' }
    }
  }

  // ── Closed P&L / realized gains ───────────────────────────────────────────────

  /**
   * Fetch realized P&L from MEXC's closed-position history.
   * Endpoint: /api/v1/private/position/list/history_positions (page_num/page_size).
   * Pages through results up to `maxTrades` and returns per-trade realized P&L plus aggregates.
   */
  async fetchClosedPnl(opts: { maxTrades?: number; pageSize?: number } = {}): Promise<{
    ok: boolean
    message?: string
    totalRealizedPnl: number
    totalCount: number
    winCount: number
    lossCount: number
    pagesFetched: number
    hasMore: boolean
    trades: {
      symbol: string
      side: string
      vol: number
      openPrice: number
      closePrice: number
      realizedPnl: number
      fee: number
      leverage: number
      openTime: number
      closeTime: number
    }[]
  }> {
    const empty = { totalRealizedPnl: 0, totalCount: 0, winCount: 0, lossCount: 0, pagesFetched: 0, hasMore: false, trades: [] as any[] }
    if (!this.settings.apiKey || !this.settings.apiSecret) return { ok: false, message: 'No API credentials', ...empty }

    const pageSize  = Math.min(Math.max(opts.pageSize ?? 100, 1), 100)
    const maxTrades = Math.min(Math.max(opts.maxTrades ?? 100, 1), 1000)  // hard cap to avoid hammering the API
    const maxPages  = Math.ceil(maxTrades / pageSize)

    type ClosedTrade = {
      symbol: string; side: string; vol: number; openPrice: number; closePrice: number
      realizedPnl: number; fee: number; leverage: number; openTime: number; closeTime: number
    }
    const trades: ClosedTrade[] = []
    let pagesFetched = 0
    let hasMore = false

    try {
      for (let page = 1; page <= maxPages; page++) {
        const res = await this.request('GET', '/api/v1/private/position/list/history_positions', {
          page_num:  page,
          page_size: pageSize,
        })

        if ((!res?.success && res?.code !== 0) || !Array.isArray(res?.data)) {
          // First page failing is a hard error; later pages failing just stops pagination with what we have.
          if (page === 1) return { ok: false, message: res?.message ?? res?.msg ?? 'Failed to fetch closed positions', ...empty }
          break
        }

        pagesFetched = page
        const pageRows: any[] = res.data

        // Only fully-closed positions (state 3 = closed on MEXC). holdVol 0 also indicates closed.
        const closed = pageRows.filter((p: any) => {
          const state = Number(p.state ?? 0)
          const holdVol = parseFloat(p.holdVol ?? '0')
          return state === 3 || holdVol === 0
        })

        for (const p of closed) {
          // MEXC reports realized P&L in `realised` / `realized` / `profit`; fees in `fee` (or split fields).
          const realizedPnl = parseFloat(p.realised ?? p.realized ?? p.profit ?? p.closeProfitLoss ?? '0')
          const fee = parseFloat(p.fee ?? p.totalFee ?? '0')
          trades.push({
            symbol:      String(p.symbol ?? '').replace('_', ''),
            side:        p.positionType === 1 ? 'Long' : 'Short',
            vol:         parseFloat(p.closeVol ?? p.holdVol ?? p.vol ?? '0'),
            openPrice:   parseFloat(p.openAvgPrice ?? '0'),
            closePrice:  parseFloat(p.closeAvgPrice ?? '0'),
            realizedPnl,
            fee,
            leverage:    parseFloat(p.leverage ?? '1'),
            openTime:    Number(p.openTime ?? p.createTime ?? 0),
            closeTime:   Number(p.updateTime ?? p.closeTime ?? 0),
          })
        }

        // A short page (fewer rows than page_size) means we've reached the end of history.
        if (pageRows.length < pageSize) { hasMore = false; break }
        // Full page and more pages allowed → there may be more beyond our cap.
        if (page === maxPages) { hasMore = true }
      }

      // Trim to the requested cap (last page may overshoot) and report if more remain.
      if (trades.length > maxTrades) { trades.length = maxTrades; hasMore = true }

      const totalRealizedPnl = trades.reduce((s, t) => s + t.realizedPnl, 0)
      const winCount  = trades.filter(t => t.realizedPnl > 0).length
      const lossCount = trades.filter(t => t.realizedPnl < 0).length

      return {
        ok: true,
        totalRealizedPnl,
        totalCount: trades.length,
        winCount,
        lossCount,
        pagesFetched,
        hasMore,
        trades,
      }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error', ...empty }
    }
  }

  // ── Test connection ──────────────────────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string; balance?: number }> {
    if (!this.settings.apiKey || !this.settings.apiSecret) return { ok: false, message: 'API key and secret are required' }
    try {
      const res = await this.request('GET', '/api/v1/private/account/assets')
      if (res?.success === true) {
        const assets: any[] = Array.isArray(res.data) ? res.data : []
        const usdt          = assets.find((a: any) => a.currency === 'USDT')
        const balance       = usdt ? parseFloat(usdt.equity ?? usdt.cashBalance ?? '0') : undefined
        return { ok: true, message: 'Connected to MEXC Futures', balance }
      }
      return { ok: false, message: `[${res?.code ?? '?'}] ${res?.message ?? 'Authentication failed'}` }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error' }
    }
  }
}

export const mexcTrader = new MexcTraderService()
