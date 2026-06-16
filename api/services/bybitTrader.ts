import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { BgSignal } from '../utils/signalEval.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SETTINGS_FILE = path.join(__dirname, '../../data/bybit-settings.json')

export type AutoTradeSettings = {
  enabled: boolean
  mode: 'live' | 'demo' | 'testnet'
  apiKey: string
  apiSecret: string
  positionSizeUSDT: number
  leverage: number
  maxOpenTrades: number
  enabledStrategies: string[]
  orderType: 'Market' | 'Limit'
  lossThreshold: number
}

export type AutoTrade = {
  id: string
  orderId: string
  symbol: string
  direction: 'buy' | 'sell'
  strategy: string
  qty: number
  entryPrice: number
  sl: number
  tp1: number
  positionSizeUSDT: number
  leverage: number
  status: 'open' | 'filled' | 'failed' | 'cancelled'
  error?: string
  openedAt: number
}

type InstrumentInfo = { qtyStep: number; minQty: number; tickSize: number }

const DEFAULT_SETTINGS: AutoTradeSettings = {
  enabled: false,
  mode: 'demo',
  apiKey: '',
  apiSecret: '',
  positionSizeUSDT: 10,
  leverage: 5,
  maxOpenTrades: 3,
  enabledStrategies: ['Elite Context Breakout'],
  orderType: 'Market',
  lossThreshold: 0,
}

const MAX_TRADES = 100

class BybitTraderService {
  private settings: AutoTradeSettings = { ...DEFAULT_SETTINGS }
  private openTrades: AutoTrade[] = []
  private recentTrades: AutoTrade[] = []
  private inFlight: Set<string> = new Set()  // symbols with in-progress placeOrder calls
  private livePositionCount: number = 0  // authoritative position count from Bybit
  private liveSymbols: Set<string> = new Set()  // symbols with active live positions
  private instrumentCache = new Map<string, InstrumentInfo>()
  private timeOffset = 0  // ms to add to Date.now() to match Bybit server time
  private timeSyncPromise: Promise<void> | null = null

  constructor() {
    this.loadFromFile()
    setInterval(() => this.syncOpenTrades().catch(() => {}), 30_000)
  }

  private async ensureTimeSync(): Promise<void> {
    if (!this.timeSyncPromise) {
      this.timeSyncPromise = this.fetchTimeOffset().catch(() => { this.timeSyncPromise = null })
    }
    return this.timeSyncPromise
  }

  private async fetchTimeOffset(): Promise<void> {
    const res = await fetch(`${this.baseUrl()}/v5/market/time`)
    const data = await res.json()
    const serverMs = Math.floor(Number(data?.result?.timeNano ?? 0) / 1_000_000)
    if (serverMs > 0) this.timeOffset = serverMs - Date.now()
  }

  private nowMs(): number {
    return Date.now() + this.timeOffset
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
        const saved = JSON.parse(raw)
        const merged = { ...DEFAULT_SETTINGS, ...saved }
        if (typeof merged.apiKey === 'string') merged.apiKey = merged.apiKey.trim()
        if (typeof merged.apiSecret === 'string') merged.apiSecret = merged.apiSecret.trim()
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

  getStatus() {
    return {
      settings: { ...this.settings, apiSecret: this.settings.apiSecret ? '••••••••' : '' },
      openTrades: [...this.openTrades],
      recentTrades: [...this.recentTrades],
    }
  }

  updateSettings(partial: Partial<AutoTradeSettings>) {
    const modeChanged = partial.mode !== undefined && partial.mode !== this.settings.mode
    const next: Partial<AutoTradeSettings> = { ...partial }
    if (typeof next.apiKey === 'string') next.apiKey = next.apiKey.trim()
    if (typeof next.apiSecret === 'string') next.apiSecret = next.apiSecret.trim()
    this.settings = { ...this.settings, ...next }
    this.saveToFile()
    if (modeChanged) this.timeSyncPromise = null
  }

  private baseUrl(): string {
    if (this.settings.mode === 'testnet') return 'https://api-testnet.bybit.com'
    if (this.settings.mode === 'demo')    return 'https://api-demo.bybit.com'
    return 'https://api.bybit.com'
  }

  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.settings.apiSecret).update(payload).digest('hex')
  }

  private sanitizeRetMsg(msg: unknown): string {
    const s = typeof msg === 'string' ? msg : 'Unknown error'
    return s.replace(/\s*origin_string\[[\s\S]*?\]\s*$/i, '').trim()
  }

  private async request(method: 'GET' | 'POST', endpoint: string, body: Record<string, unknown> = {}): Promise<any> {
    await this.ensureTimeSync()
    const timestamp = this.nowMs().toString()
    const recvWindow = '5000'
    const [path, queryString = ''] = endpoint.split('?')
    const bodyStr = method === 'POST' ? JSON.stringify(body) : ''
    // GET: timestamp + apiKey + recvWindow + queryString
    // POST: timestamp + apiKey + recvWindow + bodyStr
    const signPayload = method === 'GET'
      ? timestamp + this.settings.apiKey + recvWindow + queryString
      : timestamp + this.settings.apiKey + recvWindow + bodyStr
    const signature = this.sign(signPayload)

    const url = queryString ? `${this.baseUrl()}${path}?${queryString}` : `${this.baseUrl()}${path}`
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.settings.apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-SIGN': signature,
      },
      ...(method === 'POST' ? { body: bodyStr } : {}),
    })

    return res.json()
  }

  private async getInstrumentInfo(symbol: string): Promise<InstrumentInfo> {
    if (this.instrumentCache.has(symbol)) return this.instrumentCache.get(symbol)!
    try {
      const res = await fetch(`${this.baseUrl()}/v5/market/instruments-info?category=linear&symbol=${symbol}`)
      const json = await res.json() as any
      const item = json?.result?.list?.[0]
      const lot  = item?.lotSizeFilter
      const price = item?.priceFilter
      const result: InstrumentInfo = {
        qtyStep:  parseFloat(lot?.qtyStep      ?? '0.001'),
        minQty:   parseFloat(lot?.minOrderQty  ?? '0.001'),
        tickSize: parseFloat(price?.tickSize   ?? '0.01'),
      }
      this.instrumentCache.set(symbol, result)
      return result
    } catch {
      return { qtyStep: 0.001, minQty: 0.001, tickSize: 0.01 }
    }
  }

  // Round qty down to the nearest qtyStep
  private roundQty(qty: number, step: number): number {
    const precision = this.decimalPlaces(step)
    const floored = Math.floor(qty / step) * step
    return parseFloat(floored.toFixed(precision))
  }

  // Round price to the nearest tickSize
  private roundPrice(price: number, tick: number): number {
    const precision = this.decimalPlaces(tick)
    const rounded = Math.round(price / tick) * tick
    return parseFloat(rounded.toFixed(precision))
  }

  private decimalPlaces(step: number): number {
    const s = step.toString()
    const dot = s.indexOf('.')
    return dot === -1 ? 0 : s.length - dot - 1
  }

  // Set leverage — error 110043 means "already at this leverage", treat as success
  private async setLeverage(symbol: string): Promise<void> {
    try {
      const res = await this.request('POST', '/v5/position/set-leverage', {
        category: 'linear',
        symbol,
        buyLeverage:  String(this.settings.leverage),
        sellLeverage: String(this.settings.leverage),
      })
      if (res?.retCode !== 0 && res?.retCode !== 110043) {
        console.warn(`[AutoTrader] setLeverage warning: ${res?.retMsg} (code ${res?.retCode})`)
      }
    } catch (e: any) {
      console.warn(`[AutoTrader] setLeverage failed (non-fatal): ${e?.message}`)
    }
  }

  async placeOrder(signal: BgSignal): Promise<void> {
    const { enabled, apiKey, apiSecret, maxOpenTrades, enabledStrategies, positionSizeUSDT, leverage, orderType } = this.settings
    if (!enabled || !apiKey || !apiSecret) return
    // Strip vol-regime suffix (e.g. "Elite Context Breakout [LOW VOL]" → "Elite Context Breakout") before matching
    const baseStrategy = signal.strategy.replace(/\s*\[.*?\]\s*$/, '').trim()
    if (!enabledStrategies.some(s => s === signal.strategy || s === baseStrategy)) return

    const threshold = Number(this.settings.lossThreshold) || 0
    if (threshold > 0) {
      const account = await this.fetchAccountInfo().catch(() => null)
      const balance = account?.walletBalance ?? account?.availableBalance ?? account?.equity ?? 0
      if (balance <= threshold) {
        this.settings.enabled = false
        this.saveToFile()
        console.warn(`[AutoTrader] Loss threshold ${threshold} reached at balance ${balance.toFixed(2)} USDT — Auto Trade Stopped`)
        return
      }
    }

    // Sync with Bybit first — use live position count as the authority (handles server
    // restarts, manual trades, and positions opened by other instances).
    await this.syncOpenTrades()

    // Atomic slot check using LIVE Bybit positions + in-flight orders this instance is placing.
    const slotsUsed = this.livePositionCount + this.inFlight.size
    if (slotsUsed >= maxOpenTrades) {
      console.log(`[AutoTrader] Max open trades (${maxOpenTrades}) reached (live: ${this.livePositionCount}, in-flight: ${this.inFlight.size}) — skipping ${signal.symbol}`)
      return
    }
    if (this.liveSymbols.has(signal.symbol) || this.inFlight.has(signal.symbol)) {
      console.log(`[AutoTrader] Already have open or in-flight trade for ${signal.symbol} — skipping`)
      return
    }
    this.inFlight.add(signal.symbol)

    try {
    const info = await this.getInstrumentInfo(signal.symbol)
    const { qtyStep, minQty, tickSize } = info

    // Calculate qty in base asset: positionSizeUSDT / entryPrice
    const rawQty = positionSizeUSDT / signal.entry
    const qty = Math.max(minQty, this.roundQty(rawQty, qtyStep))

    // Round SL/TP to tickSize — Bybit rejects extra decimal places
    const sl  = this.roundPrice(signal.sl,  tickSize)
    const tp1 = this.roundPrice(signal.tp1, tickSize)

    const side = signal.direction === 'buy' ? 'Buy' : 'Sell'

    // Validate SL/TP direction relative to current price
    const currentPrice = signal.entry
    const slValid  = signal.direction === 'buy' ? sl  < currentPrice : sl  > currentPrice
    const tpValid  = signal.direction === 'buy' ? tp1 > currentPrice : tp1 < currentPrice

    const trade: AutoTrade = {
      id: `${signal.symbol}-${Date.now()}`,
      orderId: '',
      symbol: signal.symbol,
      direction: signal.direction,
      strategy: signal.strategy,
      qty,
      entryPrice: signal.entry,
      sl,
      tp1,
      positionSizeUSDT,
      leverage,
      status: 'open',
      openedAt: Date.now(),
    }

    try {
      await this.setLeverage(signal.symbol)

      const orderBody: Record<string, unknown> = {
        category:    'linear',
        symbol:      signal.symbol,
        side,
        orderType,
        qty:          String(qty),
        positionIdx:  0,       // 0 = one-way mode
        timeInForce: orderType === 'Market' ? 'IOC' : 'GTC',
        orderLinkId: trade.id, // deduplication key
      }

      if (orderType === 'Limit') {
        orderBody.price = String(this.roundPrice(signal.entry, tickSize))
      }

      // Attach SL/TP only if they are on the correct side
      if (slValid) {
        orderBody.stopLoss     = String(sl)
        orderBody.slOrderType  = 'Market'
        orderBody.slTriggerBy  = 'MarkPrice'
      }
      if (tpValid) {
        orderBody.takeProfit   = String(tp1)
        orderBody.tpOrderType  = 'Market'
        orderBody.tpTriggerBy  = 'MarkPrice'
      }
      if (slValid || tpValid) {
        orderBody.tpslMode = 'Full'
      }

      console.log(`[AutoTrader] Placing order:`, JSON.stringify(orderBody))
      const result = await this.request('POST', '/v5/order/create', orderBody)
      console.log(`[AutoTrader] API response:`, JSON.stringify(result))

      if (result?.retCode === 0) {
        trade.orderId = result.result?.orderId ?? ''
        trade.status  = 'filled'
        this.openTrades.push(trade)
        console.log(`[AutoTrader] ✓ Order placed: ${signal.symbol} ${side} qty=${qty} | SL=${sl} TP=${tp1} | orderId: ${trade.orderId}`)
      } else {
        trade.status = 'failed'
        trade.error  = `[${result?.retCode}] ${this.sanitizeRetMsg(result?.retMsg)}`
        console.error(`[AutoTrader] ✗ Order failed: ${signal.symbol} — ${trade.error}`)
      }
    } catch (e: any) {
      trade.status = 'failed'
      trade.error  = e?.message ?? 'Network error'
      console.error(`[AutoTrader] ✗ Exception: ${signal.symbol} — ${trade.error}`)
    }

    this.recentTrades = [trade, ...this.recentTrades].slice(0, MAX_TRADES)
    } finally {
      this.inFlight.delete(signal.symbol)
    }
  }

  async fetchAccountInfo(): Promise<{
    ok: boolean
    message?: string
    walletBalance?: number
    availableBalance?: number
    unrealisedPnl?: number
    equity?: number
    positions?: { symbol: string; side: string; size: string; entryPrice: string; unrealisedPnl: string; leverage: string; markPrice: string }[]
  }> {
    const { apiKey, apiSecret } = this.settings
    if (!apiKey || !apiSecret) return { ok: false, message: 'No API credentials' }
    try {
      const [walletRes, posRes] = await Promise.all([
        this.request('GET', '/v5/account/wallet-balance?accountType=UNIFIED&coin=USDT'),
        this.request('GET', '/v5/position/list?category=linear&settleCoin=USDT&limit=50'),
      ])

      if (walletRes?.retCode !== 0) return { ok: false, message: walletRes?.retMsg ?? 'Failed to fetch wallet' }

      const acct  = walletRes?.result?.list?.[0]
      const coins = acct?.coin as any[] | undefined
      const usdt  = coins?.find((c: any) => c.coin === 'USDT')

      const positions = (posRes?.result?.list ?? [])
        .filter((p: any) => parseFloat(p.size) > 0)
        .map((p: any) => ({
          symbol:        p.symbol,
          side:          p.side,
          size:          p.size,
          entryPrice:    p.avgPrice,
          unrealisedPnl: p.unrealisedPnl,
          leverage:      p.leverage,
          markPrice:     p.markPrice,
        }))

      return {
        ok: true,
        walletBalance:    parseFloat(usdt?.walletBalance           ?? acct?.totalWalletBalance    ?? '0'),
        availableBalance: parseFloat(usdt?.availableToWithdraw     ?? acct?.totalAvailableBalance ?? '0'),
        unrealisedPnl:    parseFloat(usdt?.unrealisedPnl           ?? acct?.totalUnrealisedPnl    ?? '0'),
        equity:           parseFloat(usdt?.equity                  ?? acct?.totalEquity           ?? '0'),
        positions,
      }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error' }
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string; balance?: number }> {
    const { apiKey, apiSecret } = this.settings
    if (!apiKey || !apiSecret) return { ok: false, message: 'API key and secret are required' }
    try {
      const res = await this.request('GET', '/v5/account/wallet-balance?accountType=UNIFIED&coin=USDT')
      if (res?.retCode === 0) {
        const coins = res?.result?.list?.[0]?.coin as any[] | undefined
        const usdt  = coins?.find((c: any) => c.coin === 'USDT')
        const balance = usdt ? parseFloat(usdt.walletBalance ?? '0') : undefined
        return { ok: true, message: 'Connected successfully', balance }
      }
      return { ok: false, message: `[${res?.retCode}] ${res?.retMsg ?? 'Authentication failed'}` }
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error' }
    }
  }

  private async syncOpenTrades(): Promise<void> {
    if (!this.settings.apiKey || !this.settings.apiSecret) return
    try {
      const res = await this.request('GET', '/v5/position/list?category=linear&settleCoin=USDT&limit=50')
      if (res?.retCode !== 0) return
      const activePositions = (res.result?.list ?? []).filter((p: any) => parseFloat(p.size ?? '0') > 0)
      const activeSymbols = new Set<string>(activePositions.map((p: any) => String(p.symbol)))

      // Authoritative count: actual live positions on Bybit
      this.liveSymbols = activeSymbols
      this.livePositionCount = activeSymbols.size

      // Reconcile internal openTrades — drop any entries no longer live on Bybit
      const stillOpen: AutoTrade[] = []
      const nowClosed: AutoTrade[] = []
      for (const trade of this.openTrades) {
        if (activeSymbols.has(trade.symbol)) {
          stillOpen.push(trade)
        } else {
          nowClosed.push(trade)
          console.log(`[AutoTrader] Sync: ${trade.symbol} closed on Bybit — moved to history`)
        }
      }
      if (nowClosed.length > 0) {
        this.openTrades = stillOpen
        this.recentTrades = [...nowClosed, ...this.recentTrades].slice(0, MAX_TRADES)
      }

      // Refresh entry/SL/TP on already-tracked trades from live Bybit data
      const positionBySymbol = new Map<string, any>()
      for (const p of activePositions) positionBySymbol.set(String(p.symbol), p)
      for (const t of this.openTrades) {
        const p = positionBySymbol.get(t.symbol)
        if (!p) continue
        const liveSl    = parseFloat(p.stopLoss   ?? '0')
        const liveTp    = parseFloat(p.takeProfit ?? '0')
        const liveEntry = parseFloat(p.avgPrice   ?? '0')
        if (liveSl    > 0) t.sl         = liveSl
        if (liveTp    > 0) t.tp1        = liveTp
        if (liveEntry > 0) t.entryPrice = liveEntry
      }

      // Import Bybit positions not yet tracked (manual opens, other instances, server restarts)
      const trackedSymbols = new Set(this.openTrades.map(t => t.symbol))
      let imported = 0
      for (const p of activePositions) {
        const symbol = String(p.symbol)
        if (trackedSymbols.has(symbol)) continue

        const direction: 'buy' | 'sell' = String(p.side ?? '').toLowerCase() === 'buy' ? 'buy' : 'sell'
        const importedTrade: AutoTrade = {
          id:               `bybit-import-${symbol}-${Date.now()}-${imported}`,
          orderId:          '',
          symbol,
          direction,
          strategy:         'manual',
          qty:              parseFloat(p.size      ?? '0'),
          entryPrice:       parseFloat(p.avgPrice  ?? '0'),
          sl:               parseFloat(p.stopLoss  ?? '0'),
          tp1:              parseFloat(p.takeProfit ?? '0'),
          positionSizeUSDT: 0,
          leverage:         parseFloat(p.leverage  ?? '1'),
          status:           'filled',
          openedAt:         Number(p.createdTime ?? Date.now()),
        }
        this.openTrades.push(importedTrade)
        trackedSymbols.add(symbol)
        imported++
      }
      if (imported > 0) console.log(`[AutoTrader] Sync: imported ${imported} manually-opened position(s)`)
    } catch {
      // silent — transient network errors
    }
  }

  removeOpenTrade(id: string) {
    this.openTrades = this.openTrades.filter(t => t.id !== id)
  }
}

export const bybitTrader = new BybitTraderService()
