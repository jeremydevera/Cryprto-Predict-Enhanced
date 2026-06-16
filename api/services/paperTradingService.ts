import { promises as fs } from 'fs'
import path from 'path'
import type { BgSignal } from '../utils/signalEval.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaperSettings = {
  enabled:          boolean
  orderType:        'Market' | 'Limit'
  maxOpenPositions: number
  paperCapital:     number   // USDT starting balance
  riskPerTradePct:  number   // % of current equity risked per trade
  feeRatePct:       number   // per-side fee % (0.05 = Binance futures maker)
}

export type PaperOrder = {
  id:               string
  symbol:           string
  timeframe:        string
  direction:        'buy' | 'sell'
  strategy:         string
  quality:          number
  confluence:       number
  entry:            number
  sl:               number
  tp1:              number
  tp2:              number
  entryDistancePct: number
  positionSizeUsdt: number
  riskUsdt:         number
  createdAt:        number
  expiresAt:        number
  lastCheckedMs:    number   // last 1m candle close-time we processed
  status:           'pending' | 'filled' | 'cancelled' | 'expired'
}

export type PaperPosition = {
  id:                string
  orderId:           string
  symbol:            string
  timeframe:         string
  direction:         'buy' | 'sell'
  strategy:          string
  quality:           number
  confluence:        number
  entry:             number
  sl:                number
  tp1:               number
  tp2:               number
  positionSizeUsdt:  number
  riskUsdt:          number
  openedAt:          number
  lastCheckedMs:     number
  currentPrice:      number
  unrealizedR:       number
  unrealizedPnlUsdt: number
  closedAt?:         number
  closePrice?:       number
  closeReason?:      'tp1' | 'sl' | 'manual'
  r?:                number
  pnlUsdt?:          number
  feeUsdt?:          number
  netPnlUsdt?:       number
  status:            'open' | 'closed'
}

export type EquityPoint = { time: number; equity: number }

export type PaperStatus = {
  settings:       PaperSettings
  orders:         PaperOrder[]
  openPositions:  PaperPosition[]
  history:        PaperPosition[]
  lastSyncAt:     number | null
  currentEquity:  number
  equityHistory:  EquityPoint[]
  summary: {
    totalClosed:  number
    wins:         number
    losses:       number
    winRate:      number
    totalR:       number
    avgR:         number
    grossPnlUsdt: number
    totalFeeUsdt: number
    netPnlUsdt:   number
    returnPct:    number
    maxDrawdownR: number
  }
}

type Candle = { timeMs: number; open: number; high: number; low: number; close: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_EXPIRY_MS  = 24 * 60 * 60 * 1000
const MAX_HISTORY      = 300
const MAX_EQUITY_PTS   = 1000
const SYNC_INTERVAL_MS = 5_000
const DATA_PATH        = path.join(process.cwd(), 'data', 'paperTrades.json')

// ─── Service ──────────────────────────────────────────────────────────────────

class PaperTradingService {
  private settings: PaperSettings = {
    enabled:          true,
    orderType:        'Market',
    maxOpenPositions: 10,
    paperCapital:     10_000,
    riskPerTradePct:  1,
    feeRatePct:       0.05,
  }

  private pendingOrders: PaperOrder[]    = []
  private openPositions: PaperPosition[] = []
  private history:       PaperPosition[] = []
  private equityHistory: EquityPoint[]   = []
  private currentEquity: number          = 10_000
  private lastSyncAt:    number | null   = null
  private idCounter      = 0
  private saveQueued     = false

  constructor() {
    this.loadState().then(() => {
      this.currentEquity = this.computeEquity()
      console.log(`[PaperTrading] Ready — equity $${this.currentEquity.toFixed(2)}`)
    })
    setInterval(() => this.sync().catch(console.error), SYNC_INTERVAL_MS)
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  getStatus(): PaperStatus {
    const closed     = this.history
    const wins       = closed.filter(p => p.closeReason === 'tp1')
    const losses     = closed.filter(p => p.closeReason === 'sl')
    const totalR     = closed.reduce((s, p) => s + (p.r          ?? 0), 0)
    const grossPnl   = closed.reduce((s, p) => s + (p.pnlUsdt    ?? 0), 0)
    const totalFee   = closed.reduce((s, p) => s + (p.feeUsdt    ?? 0), 0)
    const netPnl     = closed.reduce((s, p) => s + (p.netPnlUsdt ?? 0), 0)

    // Max drawdown in R
    let peak = 0, runningR = 0, maxDD = 0
    for (const t of [...closed].reverse()) {
      runningR += t.r ?? 0
      if (runningR > peak) peak = runningR
      const dd = peak - runningR
      if (dd > maxDD) maxDD = dd
    }

    return {
      settings:      { ...this.settings },
      orders:        [...this.pendingOrders],
      openPositions: [...this.openPositions],
      history:       [...this.history],
      lastSyncAt:    this.lastSyncAt,
      currentEquity: this.currentEquity,
      equityHistory: this.equityHistory.slice(-500),
      summary: {
        totalClosed:  closed.length,
        wins:         wins.length,
        losses:       losses.length,
        winRate:      closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
        totalR,
        avgR:         closed.length > 0 ? totalR / closed.length : 0,
        grossPnlUsdt: grossPnl,
        totalFeeUsdt: totalFee,
        netPnlUsdt:   netPnl,
        returnPct:    (netPnl / this.settings.paperCapital) * 100,
        maxDrawdownR: maxDD,
      },
    }
  }

  updateSettings(partial: Partial<PaperSettings>) {
    this.settings = { ...this.settings, ...partial }
    this.scheduleSave()
  }

  createOrder(signal: BgSignal | Record<string, unknown>): boolean {
    if (!this.settings.enabled) return false

    const sym   = String(signal.symbol    ?? '').toUpperCase().replace('/', '')
    const dir   = String(signal.direction ?? '') as 'buy' | 'sell'
    const entry = Number(signal.entry     ?? 0)
    const sl    = Number(signal.sl        ?? 0)
    const tp1   = Number(signal.tp1       ?? 0)
    const tp2   = Number(signal.tp2       ?? 0)

    if (!sym || !dir || !entry || !sl || !tp1) return false
    if (dir === 'buy'  && sl >= entry) return false
    if (dir === 'sell' && sl <= entry) return false

    // Dedup: one pending/active per symbol+direction
    const key = `${sym}-${dir}`
    if (this.pendingOrders.some(o => o.status === 'pending' && `${o.symbol}-${o.direction}` === key)) return false
    if (this.openPositions.some(p => p.status === 'open'   && `${p.symbol}-${p.direction}` === key))  return false

    // Position sizing — risk fixed % of current equity
    const riskUsdt         = this.currentEquity * this.settings.riskPerTradePct / 100
    const riskPerUnit      = Math.abs(entry - sl)
    const positionSizeUnits = riskPerUnit > 1e-12 ? riskUsdt / riskPerUnit : 0
    const positionSizeUsdt  = positionSizeUnits * entry

    const now = Date.now()

    if (this.settings.orderType === 'Market') {
      // Market order — fill immediately at signal price, skip pending queue
      if (this.openPositions.filter(p => p.status === 'open').length >= this.settings.maxOpenPositions) return false
      this.openPositions.push({
        id:                this.nextId(),
        orderId:           this.nextId(),
        symbol:            sym,
        timeframe:         String(signal.timeframe   ?? ''),
        direction:         dir,
        strategy:          String(signal.strategy    ?? ''),
        quality:           Number(signal.quality     ?? 0),
        confluence:        Number(signal.confluence  ?? 0),
        entry, sl, tp1, tp2,
        positionSizeUsdt,
        riskUsdt,
        openedAt:          now,
        lastCheckedMs:     now,
        currentPrice:      entry,
        unrealizedR:       0,
        unrealizedPnlUsdt: 0,
        status:            'open',
      })
      console.log(`[PaperTrading] Market Fill: ${sym} ${dir.toUpperCase()} @ ${entry}  risk=$${riskUsdt.toFixed(1)}  size=$${positionSizeUsdt.toFixed(0)}`)
      this.scheduleSave()
      return true
    }

    this.pendingOrders.push({
      id:               this.nextId(),
      symbol:           sym,
      timeframe:        String(signal.timeframe   ?? ''),
      direction:        dir,
      strategy:         String(signal.strategy    ?? ''),
      quality:          Number(signal.quality     ?? 0),
      confluence:       Number(signal.confluence  ?? 0),
      entry, sl, tp1, tp2,
      entryDistancePct: Number(signal.entryDistancePct ?? 0),
      positionSizeUsdt,
      riskUsdt,
      createdAt:        now,
      expiresAt:        now + ORDER_EXPIRY_MS,
      lastCheckedMs:    now,
      status:           'pending',
    })
    console.log(`[PaperTrading] Limit Order: ${sym} ${dir.toUpperCase()} @ ${entry}  risk=$${riskUsdt.toFixed(1)}  size=$${positionSizeUsdt.toFixed(0)}`)
    this.scheduleSave()
    return true
  }

  cancelOrder(id: string): boolean {
    const o = this.pendingOrders.find(o => o.id === id && o.status === 'pending')
    if (!o) return false
    o.status = 'cancelled'
    this.scheduleSave()
    return true
  }

  closePosition(id: string, price?: number): boolean {
    const idx = this.openPositions.findIndex(p => p.id === id && p.status === 'open')
    if (idx < 0) return false
    const pos = this.openPositions[idx]
    this.finalizeClose(pos, price ?? pos.currentPrice, 'manual')
    this.openPositions.splice(idx, 1)
    this.rebuildEquity()
    this.scheduleSave()
    return true
  }

  reset() {
    this.pendingOrders = []
    this.openPositions = []
    this.history       = []
    this.equityHistory = []
    this.currentEquity = this.settings.paperCapital
    this.lastSyncAt    = null
    this.scheduleSave()
  }

  // ─── Core sync (runs every 30s) ──────────────────────────────────────────────

  async sync() {
    const hasPending = this.pendingOrders.some(o => o.status === 'pending')
    const hasOpen    = this.openPositions.some(p => p.status === 'open')
    if (!hasPending && !hasOpen) return

    // Unique symbols needing price data
    const symbols = [...new Set([
      ...this.pendingOrders.filter(o => o.status === 'pending').map(o => o.symbol),
      ...this.openPositions.filter(p => p.status === 'open').map(p => p.symbol),
    ])]

    // Fetch 1m OHLCV candles for each symbol in parallel (last 6 completed candles)
    const candleMap = new Map<string, Candle[]>()
    await Promise.all(symbols.map(async sym => {
      const candles = await this.fetchCandles1m(sym)
      if (candles.length > 0) candleMap.set(sym, candles)
    }))

    const now = Date.now()

    // ── Expire pending orders ────────────────────────────────────────────────
    for (const o of this.pendingOrders) {
      if (o.status === 'pending' && now >= o.expiresAt) {
        o.status = 'expired'
        console.log(`[PaperTrading] Expired: ${o.symbol} ${o.direction}`)
      }
    }

    // ── Fill pending orders ──────────────────────────────────────────────────
    for (const order of this.pendingOrders) {
      if (order.status !== 'pending') continue
      if (this.openPositions.filter(p => p.status === 'open').length >= this.settings.maxOpenPositions) continue

      const candles  = candleMap.get(order.symbol) ?? []
      const newCandl = candles.filter(c => c.timeMs > order.lastCheckedMs)

      // Check each new candle's low/high for fill
      let filled = false
      for (const c of newCandl) {
        if (order.direction === 'buy'  && c.low  <= order.entry) { filled = true; break }
        if (order.direction === 'sell' && c.high >= order.entry) { filled = true; break }
      }
      if (newCandl.length > 0) order.lastCheckedMs = newCandl[newCandl.length - 1].timeMs

      if (!filled) continue

      // Fill at the exact limit price (limit order semantics)
      order.status = 'filled'
      this.openPositions.push({
        id:                this.nextId(),
        orderId:           order.id,
        symbol:            order.symbol,
        timeframe:         order.timeframe,
        direction:         order.direction,
        strategy:          order.strategy,
        quality:           order.quality,
        confluence:        order.confluence,
        entry:             order.entry,       // exact limit price — accurate fill
        sl:                order.sl,
        tp1:               order.tp1,
        tp2:               order.tp2,
        positionSizeUsdt:  order.positionSizeUsdt,
        riskUsdt:          order.riskUsdt,
        openedAt:          now,
        lastCheckedMs:     now,
        currentPrice:      order.entry,
        unrealizedR:       0,
        unrealizedPnlUsdt: 0,
        status:            'open',
      })
      console.log(`[PaperTrading] Filled: ${order.symbol} ${order.direction.toUpperCase()} @ ${order.entry}`)
    }

    // ── Check open positions for SL / TP hits ───────────────────────────────
    const stillOpen: PaperPosition[] = []

    for (const pos of this.openPositions) {
      if (pos.status !== 'open') { continue }

      const candles  = candleMap.get(pos.symbol) ?? []
      const newCandl = candles.filter(c => c.timeMs > pos.lastCheckedMs)
      const latest   = candles.length > 0 ? candles[candles.length - 1] : null

      // Update live price and unrealized PnL
      if (latest) {
        pos.currentPrice      = latest.close
        pos.unrealizedR       = this.calcR(pos.direction, pos.entry, pos.sl, latest.close)
        pos.unrealizedPnlUsdt = this.calcPnlUsdt(pos, latest.close)
      }
      if (newCandl.length > 0) pos.lastCheckedMs = newCandl[newCandl.length - 1].timeMs

      // Check each candle for SL/TP hit
      let hit = false
      for (const c of newCandl) {
        const { sl, tp1, direction } = pos
        if (direction === 'buy') {
          const slHit = c.low  <= sl
          const tpHit = c.high >= tp1
          if (slHit && tpHit) {
            // Both hit same candle — proximity to open decides which came first
            const hitSl = Math.abs(c.open - sl) <= Math.abs(c.open - tp1)
            this.finalizeClose(pos, hitSl ? sl : tp1, hitSl ? 'sl' : 'tp1')
          } else if (slHit) {
            this.finalizeClose(pos, sl, 'sl')
          } else if (tpHit) {
            this.finalizeClose(pos, tp1, 'tp1')
          } else { continue }
          hit = true; break
        } else {
          const slHit = c.high >= sl
          const tpHit = c.low  <= tp1
          if (slHit && tpHit) {
            const hitSl = Math.abs(c.open - sl) <= Math.abs(c.open - tp1)
            this.finalizeClose(pos, hitSl ? sl : tp1, hitSl ? 'sl' : 'tp1')
          } else if (slHit) {
            this.finalizeClose(pos, sl, 'sl')
          } else if (tpHit) {
            this.finalizeClose(pos, tp1, 'tp1')
          } else { continue }
          hit = true; break
        }
      }

      if (!hit) stillOpen.push(pos)
    }

    this.openPositions = stillOpen

    // Trim stale non-pending orders
    const cutoff = now - 7 * 24 * 60 * 60 * 1000
    this.pendingOrders = this.pendingOrders
      .filter(o => o.status === 'pending' || o.createdAt > cutoff)
      .slice(-300)

    this.rebuildEquity()
    this.lastSyncAt = now
    this.scheduleSave()
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private nextId() { return `pt_${Date.now()}_${++this.idCounter}` }

  private calcR(dir: 'buy' | 'sell', entry: number, sl: number, exitPrice: number): number {
    const risk = Math.abs(entry - sl)
    if (risk < 1e-12) return 0
    return dir === 'buy' ? (exitPrice - entry) / risk : (entry - exitPrice) / risk
  }

  private calcPnlUsdt(pos: PaperPosition, exitPrice: number): number {
    const units = pos.entry > 1e-12 ? pos.positionSizeUsdt / pos.entry : 0
    return pos.direction === 'buy'
      ? (exitPrice  - pos.entry) * units
      : (pos.entry  - exitPrice) * units
  }

  private finalizeClose(pos: PaperPosition, closePrice: number, reason: 'tp1' | 'sl' | 'manual') {
    const r          = this.calcR(pos.direction, pos.entry, pos.sl, closePrice)
    const pnlUsdt    = this.calcPnlUsdt(pos, closePrice)
    // Fee: entry + exit, charged on notional position size
    const feeUsdt    = pos.positionSizeUsdt * (this.settings.feeRatePct / 100) * 2
    const netPnlUsdt = pnlUsdt - feeUsdt

    const closedPos: PaperPosition = {
      ...pos,
      status: 'closed',
      closedAt: Date.now(),
      closePrice,
      closeReason: reason,
      r,
      pnlUsdt,
      feeUsdt,
      netPnlUsdt,
      currentPrice:      closePrice,
      unrealizedR:       r,
      unrealizedPnlUsdt: pnlUsdt,
    }

    this.history = [closedPos, ...this.history].slice(0, MAX_HISTORY)

    console.log(`[PaperTrading] ${reason.toUpperCase()}: ${pos.symbol} ${pos.direction} r=${r.toFixed(2)} net=$${netPnlUsdt.toFixed(2)}`)
  }

  private computeEquity(): number {
    return this.settings.paperCapital +
      this.history.reduce((s, p) => s + (p.netPnlUsdt ?? 0), 0)
  }

  private rebuildEquity() {
    this.currentEquity = this.computeEquity()
    this.equityHistory.push({ time: Date.now(), equity: this.currentEquity })
    if (this.equityHistory.length > MAX_EQUITY_PTS)
      this.equityHistory = this.equityHistory.slice(-MAX_EQUITY_PTS)
  }

  // ─── Candle fetch (1m, last 6 completed candles) ─────────────────────────────

  private async fetchCandles1m(symbol: string): Promise<Candle[]> {
    try {
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=1m&limit=7`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as any[]
      // Drop the last row — it's the currently-forming candle
      return data.slice(0, -1).map((k: any) => ({
        timeMs: Number(k[0]),
        open:   parseFloat(k[1]),
        high:   parseFloat(k[2]),
        low:    parseFloat(k[3]),
        close:  parseFloat(k[4]),
      }))
    } catch {
      return []
    }
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  async flushSave() {
    this.saveQueued = false
    await this.saveState()
  }

  private scheduleSave() {
    if (this.saveQueued) return
    this.saveQueued = true
    setTimeout(() => {
      this.saveQueued = false
      this.saveState().catch(console.error)
    }, 2_000)
  }

  private async saveState() {
    try {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
      await fs.writeFile(DATA_PATH, JSON.stringify({
        pendingOrders: this.pendingOrders,
        openPositions: this.openPositions,
        history:       this.history,
        equityHistory: this.equityHistory,
        settings:      this.settings,
        idCounter:     this.idCounter,
      }))
    } catch (e) {
      console.error('[PaperTrading] Save error:', e)
    }
  }

  private async loadState() {
    try {
      const raw  = await fs.readFile(DATA_PATH, 'utf-8')
      const data = JSON.parse(raw)
      this.pendingOrders = Array.isArray(data.pendingOrders) ? data.pendingOrders : []
      this.openPositions = Array.isArray(data.openPositions) ? data.openPositions : []
      this.history       = Array.isArray(data.history)       ? data.history       : []
      this.equityHistory = Array.isArray(data.equityHistory) ? data.equityHistory : []
      this.idCounter     = Number(data.idCounter ?? 0)
      if (data.settings) this.settings = { ...this.settings, ...data.settings }
      console.log(`[PaperTrading] Loaded ${this.history.length} closed, ${this.openPositions.filter(p=>p.status==='open').length} open`)
    } catch {
      // no saved state — fresh start
    }
  }
}

export const paperTrader = new PaperTradingService()
