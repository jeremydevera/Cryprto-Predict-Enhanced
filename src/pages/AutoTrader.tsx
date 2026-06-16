import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STRATEGIES } from '@/stores/tradingStore'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountInfo = {
  ok: boolean
  message?: string
  walletBalance?: number
  availableBalance?: number
  unrealisedPnl?: number
  equity?: number
  positions?: {
    symbol: string; side: string; size: string; entryPrice: string
    unrealisedPnl: string; leverage: string; markPrice: string
    mexcSymbol?: string; positionId?: string; openType?: string
  }[]
}

type AutoTrade = {
  id: string; orderId: string; symbol: string; direction: 'buy' | 'sell'
  strategy: string; qty?: number; vol?: number; entryPrice: number; sl: number; tp1: number
  positionSizeUSDT: number; leverage: number
  status: 'open' | 'filled' | 'failed' | 'cancelled'; error?: string; openedAt: number
}

type BybitStatus = {
  settings: {
    enabled: boolean; mode: 'live' | 'demo' | 'testnet'; apiKey: string; apiSecret: string
    positionSizeUSDT: number; leverage: number; maxOpenTrades: number
    enabledStrategies: string[]; orderType: 'Market' | 'Limit'; lossThreshold: number
  }
  openTrades: AutoTrade[]
  recentTrades: AutoTrade[]
}

type MexcStatus = {
  settings: {
    enabled: boolean; apiKey: string; apiSecret: string
    positionSizeUSDT: number; leverage: number; maxOpenTrades: number
    enabledStrategies: string[]; orderType: 'Market' | 'Limit'; openType: 1 | 2
    noChase: boolean; maxChasePct: number; lossThreshold: number; dailyLossLimitPct?: number
  }
  openTrades: AutoTrade[]
  recentTrades: AutoTrade[]
  livePositionCount?: number
}

type ClosedPnl = {
  ok: boolean
  message?: string
  totalRealizedPnl: number
  totalCount: number
  winCount: number
  lossCount: number
  pagesFetched: number
  hasMore: boolean
  trades: {
    symbol: string; side: string; vol: number; openPrice: number; closePrice: number
    realizedPnl: number; fee: number; leverage: number; openTime: number; closeTime: number
  }[]
}

const statusColor: Record<AutoTrade['status'], string> = {
  open:      'text-amber-400',
  filled:    'text-emerald-400',
  failed:    'text-red-400',
  cancelled: 'text-slate-500',
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function AccountPanel({ account, loading, onRefresh, onClosePosition, closeDisabled }: {
  account: AccountInfo | null
  loading: boolean
  onRefresh: () => void
  onClosePosition?: (p: NonNullable<AccountInfo['positions']>[number]) => void
  closeDisabled?: (p: NonNullable<AccountInfo['positions']>[number]) => boolean
}) {
  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-100">Account Overview</CardTitle>
          <button onClick={onRefresh} disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50">
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!account || !account.ok ? (
          <div className="text-xs text-slate-500">
            {account?.message ?? 'No API credentials saved — save your settings and test connection first.'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Wallet Balance',    value: `${account.walletBalance?.toFixed(2)} USDT`,                                  color: 'text-slate-100' },
                { label: 'Available',         value: `${account.availableBalance?.toFixed(2)} USDT`,                               color: 'text-slate-100' },
                { label: 'Equity',            value: `${account.equity?.toFixed(2)} USDT`,                                        color: 'text-slate-100' },
                { label: 'Unrealised PnL',    value: `${(account.unrealisedPnl ?? 0) >= 0 ? '+' : ''}${account.unrealisedPnl?.toFixed(2)} USDT`, color: (account.unrealisedPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className={cn('text-sm font-mono font-bold', color)}>{value}</div>
                </div>
              ))}
            </div>

            {account.positions && account.positions.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 mb-2">Live Positions ({account.positions.length})</div>
                <div className="overflow-x-auto rounded-md border border-slate-800">
                  <table className="min-w-[600px] w-full text-xs">
                    <thead className="bg-slate-900/50 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-left">Side</th>
                        <th className="px-3 py-2 text-left">Size</th>
                        <th className="px-3 py-2 text-left">Entry</th>
                        <th className="px-3 py-2 text-left">Mark</th>
                        <th className="px-3 py-2 text-left">Leverage</th>
                        <th className="px-3 py-2 text-left">Unr. PnL</th>
                        {onClosePosition && <th className="px-3 py-2 text-left" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {account.positions.map((p, i) => {
                        const pnl = parseFloat(p.unrealisedPnl)
                        const isLong = p.side === 'Buy' || p.side === 'Long'
                        return (
                          <tr key={i} className="text-slate-100 hover:bg-slate-900/40">
                            <td className="px-3 py-2 font-mono font-bold">{p.symbol}</td>
                            <td className="px-3 py-2">
                              <span className={cn('font-bold', isLong ? 'text-emerald-400' : 'text-red-400')}>
                                {p.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono">{p.size}</td>
                            <td className="px-3 py-2 font-mono">{formatPrice(parseFloat(p.entryPrice))}</td>
                            <td className="px-3 py-2 font-mono">{formatPrice(parseFloat(p.markPrice))}</td>
                            <td className="px-3 py-2 font-mono">{p.leverage}×</td>
                            <td className={cn('px-3 py-2 font-mono font-bold', pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USDT
                            </td>
                            {onClosePosition && (
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => onClosePosition(p)}
                                  disabled={closeDisabled ? closeDisabled(p) : false}
                                  className="text-xs font-bold px-2 py-1 rounded border border-rose-800 text-rose-300 hover:bg-rose-950/30 disabled:opacity-50"
                                >
                                  Close
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {account.positions?.length === 0 && (
              <div className="text-xs text-slate-500">No open positions.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const TIME_PRESETS: { label: string; ms: number | null }[] = [
  { label: 'All',  ms: null },
  { label: '1h',   ms: 1   * 60 * 60 * 1000 },
  { label: '6h',   ms: 6   * 60 * 60 * 1000 },
  { label: '24h',  ms: 24  * 60 * 60 * 1000 },
  { label: '7d',   ms: 7   * 24 * 60 * 60 * 1000 },
  { label: '30d',  ms: 30  * 24 * 60 * 60 * 1000 },
]

function TradesTable({ label, trades, onRemove, filterable }: {
  label: string
  trades: AutoTrade[]
  onRemove?: (id: string) => void
  filterable?: boolean
}) {
  // Time filter: null = All. Custom value is hours or days converted to ms.
  const [windowMs, setWindowMs] = useState<number | null>(null)
  const [customVal, setCustomVal] = useState('')
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours')

  const applyCustom = () => {
    const n = Number(customVal)
    if (!Number.isFinite(n) || n <= 0) { setWindowMs(null); return }
    const unitMs = customUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    setWindowMs(n * unitMs)
  }

  const visible = filterable && windowMs != null
    ? trades.filter(t => Date.now() - t.openedAt <= windowMs)
    : trades

  return (
    <Card className="border-slate-800 bg-slate-950">
      {label && (
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-slate-100">{label} ({visible.length}{filterable && windowMs != null ? ` of ${trades.length}` : ''})</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-4 space-y-3">
        {filterable && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Filter</span>
            {TIME_PRESETS.map(p => {
              const active = (p.ms === null && windowMs === null) ||
                (p.ms !== null && windowMs === p.ms)
              return (
                <button
                  key={p.label}
                  onClick={() => { setWindowMs(p.ms); setCustomVal('') }}
                  className={cn(
                    'text-xs px-2 py-1 rounded border transition-colors',
                    active
                      ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                      : 'border-slate-700 text-slate-400 hover:text-slate-200',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
            <span className="mx-1 h-4 w-px bg-slate-700" />
            <input
              type="number"
              min={1}
              placeholder="Custom"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
            <select
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value as 'hours' | 'days')}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
            <button
              onClick={applyCustom}
              className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-500"
            >
              Apply
            </button>
          </div>
        )}
        {visible.length === 0 ? (
          <div className="text-sm text-slate-500">
            {trades.length === 0 ? 'No trades yet.' : 'No trades in this time window.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="min-w-[700px] w-full text-xs">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Symbol</th>
                  <th className="px-3 py-2 text-left">Dir</th>
                  <th className="px-3 py-2 text-left">Strategy</th>
                  <th className="px-3 py-2 text-left">Size</th>
                  <th className="px-3 py-2 text-left">Entry</th>
                  <th className="px-3 py-2 text-left">SL</th>
                  <th className="px-3 py-2 text-left">TP1</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  {onRemove && <th className="px-3 py-2 text-left" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visible.map((t, i) => (
                  <tr key={i} className="text-slate-100 hover:bg-slate-900/40">
                    <td className="px-3 py-2 font-mono text-slate-400" title={new Date(t.openedAt).toLocaleString()}>
                      {filterable ? new Date(t.openedAt).toLocaleString() : new Date(t.openedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold">{t.symbol}</td>
                    <td className="px-3 py-2">
                      <Badge variant={t.direction === 'buy' ? 'buy' : 'sell'} className="text-[10px] font-black px-1.5 py-0.5">
                        {t.direction.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-300 max-w-[160px]">
                      <span className="block truncate" title={t.strategy}>
                        {t.strategy === 'manual'
                          ? <span className="text-amber-500 font-bold">manual</span>
                          : t.strategy}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {t.positionSizeUSDT > 0 ? `${t.positionSizeUSDT} USDT` : (t.vol ? `${t.vol} cts` : '—')}
                    </td>
                    <td className="px-3 py-2 font-mono">{t.entryPrice > 0 ? formatPrice(t.entryPrice) : '—'}</td>
                    <td className="px-3 py-2 font-mono text-red-400">{t.sl > 0 ? formatPrice(t.sl) : '—'}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{t.tp1 > 0 ? formatPrice(t.tp1) : '—'}</td>
                    <td className={cn('px-3 py-2 font-bold', statusColor[t.status])}>
                      {t.status}{t.error ? ` — ${t.error}` : ''}
                    </td>
                    {onRemove && (
                      <td className="px-3 py-2">
                        <button onClick={() => onRemove(t.id)} className="text-slate-600 hover:text-red-400 text-xs">remove</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RealizedPnlPanel({ pnl, onRefresh, limit, onLimitChange }: {
  pnl: ClosedPnl | null
  onRefresh: () => void
  limit: number
  onLimitChange: (n: number) => void
}) {
  // Time filter on real closeTime. null = All.
  const [windowMs, setWindowMs] = useState<number | null>(null)
  const [customVal, setCustomVal] = useState('')
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours')

  const applyCustom = () => {
    const n = Number(customVal)
    if (!Number.isFinite(n) || n <= 0) { setWindowMs(null); return }
    const unitMs = customUnit === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    setWindowMs(n * unitMs)
  }

  const allTrades = pnl?.trades ?? []
  const filtered = windowMs == null
    ? allTrades
    : allTrades.filter(t => t.closeTime > 0 && Date.now() - t.closeTime <= windowMs)

  // Recompute summary over the filtered window so P&L reflects the selected period.
  const total    = filtered.reduce((s, t) => s + t.realizedPnl, 0)
  const winCount = filtered.filter(t => t.realizedPnl > 0).length
  const lossCount = filtered.filter(t => t.realizedPnl < 0).length
  const winRate  = filtered.length > 0 ? (winCount / filtered.length) * 100 : 0

  // If a window is set, warn when loaded data may not reach back far enough to cover it.
  const oldestLoaded = allTrades.reduce((min, t) => (t.closeTime > 0 && t.closeTime < min ? t.closeTime : min), Infinity)
  const windowReachesPastLoaded = windowMs != null && pnl?.hasMore === true &&
    oldestLoaded !== Infinity && (Date.now() - oldestLoaded) < windowMs

  return (
    <Card className="border-slate-800 bg-slate-950">
      <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-slate-100">Realized P&amp;L (Closed Trades)</CardTitle>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500">Load</label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          >
            {[100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={onRefresh} className="text-xs text-slate-400 hover:text-slate-200">Refresh</button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!pnl || !pnl.ok ? (
          <div className="text-xs text-slate-500">{pnl?.message ?? 'No closed-trade data — save your API keys and test connection first.'}</div>
        ) : pnl.totalCount === 0 ? (
          <div className="text-xs text-slate-500">No closed trades found.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Period</span>
              {TIME_PRESETS.map(p => {
                const active = (p.ms === null && windowMs === null) || (p.ms !== null && windowMs === p.ms)
                return (
                  <button
                    key={p.label}
                    onClick={() => { setWindowMs(p.ms); setCustomVal('') }}
                    className={cn(
                      'text-xs px-2 py-1 rounded border transition-colors',
                      active ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-slate-700 text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
              <span className="mx-1 h-4 w-px bg-slate-700" />
              <input
                type="number"
                min={1}
                placeholder="Custom"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as 'hours' | 'days')}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
              <button
                onClick={applyCustom}
                className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-500"
              >
                Apply
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Realized P&L', value: `${total >= 0 ? '+' : ''}${total.toFixed(2)} USDT`, color: total >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Closed Trades',      value: String(filtered.length),                             color: 'text-slate-100' },
                { label: 'Win / Loss',         value: `${winCount} / ${lossCount}`,                        color: 'text-slate-100' },
                { label: 'Win Rate',           value: `${winRate.toFixed(1)}%`,                            color: winRate >= 50 ? 'text-emerald-400' : 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className={cn('text-sm font-mono font-bold', color)}>{value}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-800">
              <table className="min-w-[640px] w-full text-xs">
                <thead className="bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Closed</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-left">Entry</th>
                    <th className="px-3 py-2 text-left">Close</th>
                    <th className="px-3 py-2 text-left">Fee</th>
                    <th className="px-3 py-2 text-left">Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-500">No closed trades in this period.</td></tr>
                  ) : filtered.map((t, i) => {
                    const isLong = t.side === 'Long'
                    return (
                      <tr key={i} className="text-slate-100 hover:bg-slate-900/40">
                        <td className="px-3 py-2 font-mono text-slate-400">{t.closeTime > 0 ? new Date(t.closeTime).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 font-mono font-bold">{t.symbol}</td>
                        <td className={cn('px-3 py-2 font-bold', isLong ? 'text-emerald-400' : 'text-red-400')}>{t.side}</td>
                        <td className="px-3 py-2 font-mono">{t.openPrice > 0 ? formatPrice(t.openPrice) : '—'}</td>
                        <td className="px-3 py-2 font-mono">{t.closePrice > 0 ? formatPrice(t.closePrice) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">{t.fee ? t.fee.toFixed(4) : '—'}</td>
                        <td className={cn('px-3 py-2 font-mono font-bold', t.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {t.realizedPnl >= 0 ? '+' : ''}{t.realizedPnl.toFixed(2)} USDT
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {windowReachesPastLoaded ? (
              <div className="text-[10px] text-amber-500/80">
                This period may extend further back than the {pnl.totalCount} loaded trades — increase “Load” to be sure all trades in the window are included.
              </div>
            ) : pnl.hasMore && (
              <div className="text-[10px] text-amber-500/80">
                Showing first {pnl.totalCount} closed trades — more exist. Increase “Load” to fetch more.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutoTrader() {
  // ── Bybit state ──────────────────────────────────────────────────────────────
  const [bybitStatus, setBybitStatus]       = useState<BybitStatus | null>(null)
  const [bybitSynced, setBybitSynced]       = useState(false)
  const [bybitSaving, setBybitSaving]       = useState(false)
  const [bybitTesting, setBybitTesting]     = useState(false)
  const [bybitAccount, setBybitAccount]     = useState<AccountInfo | null>(null)
  const [bybitAccLoading, setBybitAccLoad]  = useState(false)
  const [bybitConnResult, setBybitConn]     = useState<{ ok: boolean; message: string; balance?: number } | null>(null)

  const [bbEnabled, setBbEnabled]           = useState(false)
  const [bbMode, setBbMode]                 = useState<'live' | 'demo' | 'testnet'>('demo')
  const [bbApiKey, setBbApiKey]             = useState('')
  const [bbApiSecret, setBbApiSecret]       = useState('')
  const [bbPosSize, setBbPosSize]           = useState(10)
  const [bbLeverage, setBbLeverage]         = useState(5)
  const [bbMaxTrades, setBbMaxTrades]       = useState(3)
  const [bbOrderType, setBbOrderType]       = useState<'Market'|'Limit'>('Market')
  const [bbLossThreshold, setBbLossThreshold] = useState(0)
  const [bbStrategies, setBbStrategies]     = useState<string[]>(['Elite Context Breakout'])

  // ── MEXC state ───────────────────────────────────────────────────────────────
  const [mexcStatus, setMexcStatus]         = useState<MexcStatus | null>(null)
  const [mexcSynced, setMexcSynced]         = useState(false)
  const [mexcSaving, setMexcSaving]         = useState(false)
  const [mexcTesting, setMexcTesting]       = useState(false)
  const [mexcAccount, setMexcAccount]       = useState<AccountInfo | null>(null)
  const [mexcAccLoading, setMexcAccLoad]    = useState(false)
  const [mexcPnl, setMexcPnl]               = useState<ClosedPnl | null>(null)
  const [mexcPnlLimit, setMexcPnlLimit]     = useState(100)
  const [mexcConnResult, setMexcConn]       = useState<{ ok: boolean; message: string; balance?: number } | null>(null)

  const [mxEnabled, setMxEnabled]           = useState(false)
  const [mxApiKey, setMxApiKey]             = useState('')
  const [mxApiSecret, setMxApiSecret]       = useState('')
  const [mxPosSize, setMxPosSize]           = useState(10)
  const [mxLeverage, setMxLeverage]         = useState(5)
  const [mxMaxTrades, setMxMaxTrades]       = useState(3)
  const [mxOrderType, setMxOrderType]       = useState<'Market'|'Limit'>('Market')
  const [mxLossThreshold, setMxLossThreshold] = useState(0)
  const [mxDailyLossPct, setMxDailyLossPct] = useState(10)
  const [mxOpenType, setMxOpenType]         = useState<1|2>(2)
  const [mxStrategies, setMxStrategies]     = useState<string[]>(['Elite Context Breakout'])
  const [mxNoChase, setMxNoChase]           = useState(false)
  const [mxMaxChasePct, setMxMaxChasePct]   = useState(0.15)

  const [mxCloseTarget, setMxCloseTarget]   = useState<NonNullable<AccountInfo['positions']>[number] | null>(null)
  const [mxClosing, setMxClosing]           = useState(false)
  const [mxCloseResult, setMxCloseResult]   = useState<{ ok: boolean; message: string } | null>(null)

  // ── Active tab ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'bybit' | 'mexc'>('bybit')

  const fetchJson = async (url: string, init: RequestInit & { timeoutMs?: number } = {}) => {
    const { timeoutMs = 15_000, ...rest } = init
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const r = await fetch(url, { ...rest, signal: controller.signal })
      const j = await r.json()
      return { r, j }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchBybit = useCallback(async () => {
    try {
      const r = await fetch('/api/autotrader/status')
      const j = await r.json()
      if (j.success) setBybitStatus(j.data)
    } catch { /* ignore */ }
  }, [])

  const fetchBybitAccount = useCallback(async () => {
    try {
      const r = await fetch('/api/autotrader/account')
      const j = await r.json()
      if (j.success) setBybitAccount(j.data)
    } catch { /* ignore */ }
  }, [])

  const fetchMexc = useCallback(async () => {
    try {
      const r = await fetch('/api/mexc-trader/status')
      const j = await r.json()
      if (j.success) setMexcStatus(j.data)
    } catch { /* ignore */ }
  }, [])

  const fetchMexcAccount = useCallback(async () => {
    try {
      const r = await fetch('/api/mexc-trader/account')
      const j = await r.json()
      if (j.success) setMexcAccount(j.data)
    } catch { /* ignore */ }
  }, [])

  const fetchMexcPnl = useCallback(async () => {
    try {
      const r = await fetch(`/api/mexc-trader/closed-pnl?maxTrades=${mexcPnlLimit}`)
      const j = await r.json()
      if (j.success) setMexcPnl(j.data)
    } catch { /* ignore */ }
  }, [mexcPnlLimit])

  useEffect(() => {
    fetchBybit(); fetchBybitAccount(); fetchMexc(); fetchMexcAccount(); fetchMexcPnl()
    const id = setInterval(() => {
      fetchBybit(); fetchBybitAccount(); fetchMexc(); fetchMexcAccount(); fetchMexcPnl()
    }, 10_000)
    return () => clearInterval(id)
  }, [fetchBybit, fetchBybitAccount, fetchMexc, fetchMexcAccount, fetchMexcPnl])

  // Sync Bybit settings from server on first load
  useEffect(() => {
    if (!bybitStatus || bybitSynced) return
    const s = bybitStatus.settings
    setBbEnabled(s.enabled); setBbMode(s.mode); setBbApiKey(s.apiKey)
    setBbPosSize(s.positionSizeUSDT); setBbLeverage(s.leverage); setBbMaxTrades(s.maxOpenTrades)
    setBbOrderType(s.orderType); setBbStrategies(s.enabledStrategies); setBbLossThreshold(Number(s.lossThreshold) || 0)
    setBybitSynced(true)
  }, [bybitStatus, bybitSynced])

  // Sync MEXC settings from server on first load
  useEffect(() => {
    if (!mexcStatus || mexcSynced) return
    const s = mexcStatus.settings
    setMxEnabled(s.enabled); setMxApiKey(s.apiKey)
    setMxPosSize(s.positionSizeUSDT); setMxLeverage(s.leverage); setMxMaxTrades(s.maxOpenTrades)
    setMxOrderType(s.orderType); setMxOpenType(s.openType); setMxStrategies(s.enabledStrategies)
    setMxNoChase(s.noChase ?? false); setMxMaxChasePct(s.maxChasePct ?? 0.15); setMxLossThreshold(Number(s.lossThreshold) || 0)
    setMxDailyLossPct(Number(s.dailyLossLimitPct ?? 10))
    setMexcSynced(true)
  }, [mexcStatus, mexcSynced])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const bybitPayload = () => ({
    enabled: bbEnabled, mode: bbMode, apiKey: bbApiKey,
    ...(bbApiSecret ? { apiSecret: bbApiSecret } : {}),
    positionSizeUSDT: bbPosSize, leverage: bbLeverage,
    maxOpenTrades: bbMaxTrades, orderType: bbOrderType, enabledStrategies: bbStrategies,
    lossThreshold: bbLossThreshold,
  })

  const mexcPayload = () => ({
    enabled: mxEnabled, apiKey: mxApiKey,
    ...(mxApiSecret ? { apiSecret: mxApiSecret } : {}),
    positionSizeUSDT: mxPosSize, leverage: mxLeverage,
    maxOpenTrades: mxMaxTrades, orderType: mxOrderType, openType: mxOpenType,
    enabledStrategies: mxStrategies,
    noChase: mxNoChase, maxChasePct: mxMaxChasePct, lossThreshold: mxLossThreshold,
    dailyLossLimitPct: mxDailyLossPct,
  })

  const saveBybit = async () => {
    setBybitSaving(true)
    try {
      const r = await fetch('/api/autotrader/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bybitPayload()) })
      const j = await r.json()
      if (j.success) { setBybitStatus(j.data); setBbApiSecret('') }
    } finally { setBybitSaving(false) }
  }

  const saveMexc = async () => {
    if (mxDailyLossPct === 0 && !window.confirm('Daily Loss Limit is 0 — the daily-loss breaker will be OFF. Save anyway?')) return
    setMexcSaving(true)
    try {
      const r = await fetch('/api/mexc-trader/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mexcPayload()) })
      const j = await r.json()
      if (j.success) { setMexcStatus(j.data); setMxApiSecret('') }
      else window.alert(`Settings rejected: ${j.error ?? `server error (${r.status})`}`)
    } finally { setMexcSaving(false) }
  }

  const testBybit = async () => {
    setBybitTesting(true); setBybitConn(null)
    try {
      await fetch('/api/autotrader/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bybitPayload()) })
      const r = await fetch('/api/autotrader/test-connection', { method: 'POST' })
      const j = await r.json()
      setBybitConn(j.success ? j.data : { ok: false, message: j.error ?? `Server error (${r.status})` })
    } catch { setBybitConn({ ok: false, message: 'Network error' }) }
    finally { setBybitTesting(false) }
  }

  const testMexc = async () => {
    setMexcTesting(true); setMexcConn(null)
    try {
      const sr = await fetch('/api/mexc-trader/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mexcPayload()) })
      if (!sr.ok) {
        const sj = await sr.json().catch(() => null)
        setMexcConn({ ok: false, message: `Settings rejected: ${sj?.error ?? `server error (${sr.status})`}` })
        return
      }
      const r = await fetch('/api/mexc-trader/test-connection', { method: 'POST' })
      const j = await r.json()
      setMexcConn(j.success ? j.data : { ok: false, message: j.error ?? `Server error (${r.status})` })
    } catch { setMexcConn({ ok: false, message: 'Network error' }) }
    finally { setMexcTesting(false) }
  }

  const removeBybitTrade = async (id: string) => {
    await fetch('/api/autotrader/remove-trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchBybit()
  }

  const removeMexcTrade = async (id: string) => {
    await fetch('/api/mexc-trader/remove-trade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchMexc()
  }

  const [mexcSyncing, setMexcSyncing]   = useState(false)
  const [mexcSyncMsg, setMexcSyncMsg]   = useState<string | null>(null)

  const bybitStopActive = !!(bybitStatus?.settings.lossThreshold && bybitAccount?.walletBalance !== undefined && bybitAccount.walletBalance <= bybitStatus.settings.lossThreshold)
  const mexcStopActive  = !!(mexcStatus?.settings.lossThreshold && mexcAccount?.walletBalance !== undefined && mexcAccount.walletBalance <= mexcStatus.settings.lossThreshold)
  const syncMexcTrades = async () => {
    setMexcSyncing(true); setMexcSyncMsg(null)
    try {
      const { r, j } = await fetchJson('/api/mexc-trader/sync', { method: 'POST', timeoutMs: 15_000 })
      if (!j?.success) {
        setMexcSyncMsg(j?.error ?? `Sync failed (${r.status})`)
        setTimeout(() => setMexcSyncMsg(null), 4000)
        return
      }
      await fetchMexc()
      if (j.success) {
        const { synced, removed, imported } = j.data
        const parts = [`${synced} live`]
        if (imported > 0) parts.push(`${imported} imported`)
        if (removed > 0)  parts.push(`${removed} removed`)
        setMexcSyncMsg(parts.join(' · '))
        setTimeout(() => setMexcSyncMsg(null), 4000)
      }
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Sync timeout' : (e?.message ?? 'Sync failed')
      setMexcSyncMsg(msg)
      setTimeout(() => setMexcSyncMsg(null), 4000)
    } finally { setMexcSyncing(false) }
  }

  const toggleBbStrategy = (s: string) => setBbStrategies(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleMxStrategy = (s: string) => setMxStrategies(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  const requestCloseMexcPosition = async () => {
    if (!mxCloseTarget) return
    setMxClosing(true)
    setMxCloseResult(null)
    try {
      const vol = Number(mxCloseTarget.size)
      const openTypeRaw = mxCloseTarget.openType !== undefined ? Number(mxCloseTarget.openType) : undefined
      const openType = openTypeRaw === 1 || openTypeRaw === 2 ? openTypeRaw : undefined
      const symbol = mxCloseTarget.mexcSymbol ?? mxCloseTarget.symbol
      const { r, j } = await fetchJson('/api/mexc-trader/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          side: mxCloseTarget.side,
          vol,
          openType: openType ?? mxOpenType,
          positionId: mxCloseTarget.positionId,
        }),
      },)
      if (!j?.success) {
        setMxCloseResult({ ok: false, message: j.error ?? `Server error (${r.status})` })
        return
      }
      setMxCloseResult({ ok: true, message: j.data?.message ?? 'Close order submitted' })
      setMexcSyncMsg('Close order submitted')
      setTimeout(() => setMexcSyncMsg(null), 4000)
      setMxCloseTarget(null)
      void fetchMexcAccount()
      void syncMexcTrades()
    } catch {
      setMxCloseResult({ ok: false, message: 'Network error' })
    } finally {
      setMxClosing(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {tab === 'mexc' && mxCloseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="text-sm font-bold text-slate-100">Close Position?</div>
            <div className="text-xs text-slate-400">
              This submits a market close for <span className="font-mono text-slate-200">{mxCloseTarget.symbol}</span> ({mxCloseTarget.side}) size <span className="font-mono text-slate-200">{mxCloseTarget.size}</span>.
            </div>
            {mxCloseResult && (
              <div className={cn('rounded px-3 py-2 text-xs font-mono border', mxCloseResult.ok ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-red-950/30 border-red-800 text-red-400')}>
                {mxCloseResult.ok ? '✓' : '✗'} {mxCloseResult.message}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="secondary" onClick={() => { if (!mxClosing) { setMxCloseTarget(null); setMxCloseResult(null) } }} disabled={mxClosing}>
                Cancel
              </Button>
              <Button variant="danger" onClick={requestCloseMexcPosition} disabled={mxClosing}>
                {mxClosing ? 'Closing…' : 'Close Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-5xl p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-slate-100">Auto Trader</div>
            <div className="text-xs text-slate-500">Automatically places orders on Bybit or MEXC when a BG Scanner signal is detected.</div>
          </div>
          <div className="flex items-center gap-2">
            {bbEnabled && <span className="text-xs font-bold px-2 py-1 rounded border bg-blue-900/40 border-blue-700 text-blue-400">Bybit ON</span>}
            {mxEnabled && <span className="text-xs font-bold px-2 py-1 rounded border bg-orange-900/40 border-orange-700 text-orange-400">MEXC ON</span>}
            {!bbEnabled && !mxEnabled && <span className="text-xs font-bold px-2 py-1 rounded border bg-slate-900 border-slate-700 text-slate-500">DISABLED</span>}
          </div>
        </div>

        {/* Risk warning */}
        {(bybitStopActive || mexcStopActive) && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-xs text-amber-300 space-y-1">
            <div className="font-bold text-amber-200">Auto Trade Stopped</div>
            <div>Current wallet balance is at or below the configured loss threshold, so auto trading has been paused for the active exchange.</div>
          </div>
        )}
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-4 py-3 text-xs text-red-400 space-y-1">
          <div className="font-bold text-red-300">⚠ Real Money Warning</div>
          <div>Auto-trading places real orders on Bybit/MEXC. Wrong signals = real losses. Use small position sizes and always test the connection before enabling live trading.</div>
        </div>

        {/* Exchange tabs */}
        <div className="flex gap-1 border-b border-slate-800">
          <button
            onClick={() => setTab('bybit')}
            className={cn('px-4 py-2 text-sm font-semibold border-b-2 transition-colors', tab === 'bybit' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300')}
          >
            Bybit
          </button>
          <button
            onClick={() => setTab('mexc')}
            className={cn('px-4 py-2 text-sm font-semibold border-b-2 transition-colors', tab === 'mexc' ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300')}
          >
            MEXC
          </button>
        </div>

        {/* ── BYBIT TAB ── */}
        {tab === 'bybit' && (
          <div className="space-y-4">
            <AccountPanel account={bybitAccount} loading={bybitAccLoading} onRefresh={async () => { setBybitAccLoad(true); await fetchBybitAccount(); setBybitAccLoad(false) }} />

            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">Bybit Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Auto Trade</div>
                        <button onClick={() => setBbEnabled(o => !o)} className={cn('rounded border px-3 py-1.5 text-xs font-bold', bbEnabled ? 'bg-emerald-700 border-emerald-600 text-white' : 'border-slate-700 text-slate-400')}>
                          {bbEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Network</div>
                        <div className="flex rounded border border-slate-700 overflow-hidden text-xs font-bold">
                          {(['testnet', 'demo', 'live'] as const).map(m => (
                            <button key={m} onClick={() => setBbMode(m)}
                              className={cn('px-2.5 py-1.5 capitalize transition-colors',
                                bbMode === m
                                  ? m === 'live'    ? 'bg-red-700 text-white'
                                  : m === 'demo'    ? 'bg-blue-700 text-white'
                                  :                   'bg-amber-700 text-white'
                                  : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                              )}>
                              {m === 'live' ? 'Live' : m === 'demo' ? 'Demo' : 'Testnet'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Order Type</div>
                        <select value={bbOrderType} onChange={e => setBbOrderType(e.target.value as 'Market'|'Limit')} className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200">
                          <option value="Market">Market</option>
                          <option value="Limit">Limit</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-1">Bybit API Key</div>
                      <input value={bbApiKey} onChange={e => setBbApiKey(e.target.value)} className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono" placeholder="Enter API key..." />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Bybit API Secret <span className="text-slate-600">(leave blank to keep existing)</span></div>
                      <input type="password" value={bbApiSecret} onChange={e => setBbApiSecret(e.target.value)} className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono" placeholder="Enter API secret..." />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="secondary" className="h-8 border-slate-700 text-xs" onClick={testBybit} disabled={bybitTesting || !bbApiKey}>
                        {bybitTesting ? 'Testing…' : 'Test Connection'}
                      </Button>
                      {bybitConnResult && (
                        <div className={cn('flex-1 rounded px-3 py-1.5 text-xs font-mono border', bybitConnResult.ok ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-red-950/30 border-red-800 text-red-400')}>
                          {bybitConnResult.ok ? '✓' : '✗'} {bybitConnResult.message}
                          {bybitConnResult.balance !== undefined && <span className="ml-2 text-slate-300">Balance: {bybitConnResult.balance.toFixed(2)} USDT</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>API key needs <b className="text-slate-400">Derivatives trading</b> permission.</div>
                      {bbMode === 'demo' && <div className="text-blue-500">Demo mode — use your Bybit <b>Demo Trading</b> API key (virtual funds, real prices).</div>}
                      {bbMode === 'testnet' && <div className="text-amber-500">Testnet — use a separate key from testnet.bybit.com.</div>}
                      {bbMode === 'live' && <div className="text-red-400">Live mode — real money. Use small position sizes until verified.</div>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Position Size (USDT)</div>
                        <input type="number" min={1} value={bbPosSize} onChange={e => setBbPosSize(Number(e.target.value))} className="h-8 w-28 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Leverage</div>
                        <input type="number" min={1} max={100} value={bbLeverage} onChange={e => setBbLeverage(Number(e.target.value))} className="h-8 w-20 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Max Trades</div>
                        <input type="number" min={1} max={20} value={bbMaxTrades} onChange={e => setBbMaxTrades(Number(e.target.value))} className="h-8 w-20 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 space-y-0.5">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">Loss Threshold (USDT)</div>
                        <input type="number" min={0} step={1} value={bbLossThreshold} onChange={e => setBbLossThreshold(Number(e.target.value))} className="h-8 w-28 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                        <span className="ml-2 text-[10px] text-slate-500">If balance is at or below this, auto trading stops.</span>
                      </div>
                      <div>Position value: <span className="text-slate-200 font-mono">{bbPosSize} USDT</span></div>
                      <div>Margin used: <span className="text-slate-200 font-mono">{(bbPosSize / bbLeverage).toFixed(2)} USDT</span></div>
                      <div>Max exposure: <span className="text-slate-200 font-mono">{(bbPosSize * bbMaxTrades).toFixed(2)} USDT</span></div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Auto-trade on strategies</div>
                      <div className="flex flex-wrap gap-1">
                        {STRATEGIES.map(s => (
                          <button key={s} onClick={() => toggleBbStrategy(s)} className={cn('rounded border px-2 py-1 text-xs font-bold', bbStrategies.includes(s) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-400')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <Button className="h-9 px-6 font-bold" onClick={saveBybit} disabled={bybitSaving}>
                    {bybitSaving ? 'Saving…' : 'Save Bybit Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <TradesTable label="Open Trades" trades={bybitStatus?.openTrades ?? []} onRemove={removeBybitTrade} />
            <TradesTable label="Trade History" trades={bybitStatus?.recentTrades ?? []} />
          </div>
        )}

        {/* ── MEXC TAB ── */}
        {tab === 'mexc' && (
          <div className="space-y-4">
            <AccountPanel
              account={mexcAccount}
              loading={mexcAccLoading}
              onRefresh={async () => { setMexcAccLoad(true); await fetchMexcAccount(); setMexcAccLoad(false) }}
              onClosePosition={(p) => { setMxCloseResult(null); setMxCloseTarget(p) }}
              closeDisabled={() => mxClosing}
            />

            <Card className="border-slate-800 bg-slate-950">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-slate-100">MEXC Futures Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Auto Trade</div>
                        <button onClick={() => setMxEnabled(o => !o)} className={cn('rounded border px-3 py-1.5 text-xs font-bold', mxEnabled ? 'bg-emerald-700 border-emerald-600 text-white' : 'border-slate-700 text-slate-400')}>
                          {mxEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Order Type</div>
                        <select value={mxOrderType} onChange={e => setMxOrderType(e.target.value as 'Market'|'Limit')} className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200">
                          <option value="Market">Market</option>
                          <option value="Limit">Limit</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Margin Type</div>
                        <select value={mxOpenType} onChange={e => setMxOpenType(Number(e.target.value) as 1|2)} className="h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200">
                          <option value={2}>Cross</option>
                          <option value={1}>Isolated</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 mb-1">MEXC API Key</div>
                      <input value={mxApiKey} onChange={e => setMxApiKey(e.target.value)} className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono" placeholder="Enter API key..." />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">MEXC API Secret <span className="text-slate-600">(leave blank to keep existing)</span></div>
                      <input type="password" value={mxApiSecret} onChange={e => setMxApiSecret(e.target.value)} className="w-full h-8 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono" placeholder="Enter API secret..." />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="secondary" className="h-8 border-slate-700 text-xs" onClick={testMexc} disabled={mexcTesting || !mxApiKey}>
                        {mexcTesting ? 'Testing…' : 'Test Connection'}
                      </Button>
                      {mexcConnResult && (
                        <div className={cn('flex-1 rounded px-3 py-1.5 text-xs font-mono border', mexcConnResult.ok ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-red-950/30 border-red-800 text-red-400')}>
                          {mexcConnResult.ok ? '✓' : '✗'} {mexcConnResult.message}
                          {mexcConnResult.balance !== undefined && <span className="ml-2 text-slate-300">Balance: {mexcConnResult.balance.toFixed(2)} USDT</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>API key needs <b className="text-slate-400">Futures trading</b> permission on MEXC.</div>
                      <div>Symbols are auto-converted: <span className="font-mono text-slate-400">BTCUSDT → BTC_USDT</span></div>
                      <div className="text-amber-600">Note: MEXC does not have a futures testnet — always test with a small position size.</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Position Size (USDT)</div>
                        <input type="number" min={1} value={mxPosSize} onChange={e => setMxPosSize(Number(e.target.value))} className="h-8 w-28 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Leverage</div>
                        <input type="number" min={1} max={200} value={mxLeverage} onChange={e => setMxLeverage(Number(e.target.value))} className="h-8 w-20 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Max Trades</div>
                        <input type="number" min={1} max={20} value={mxMaxTrades} onChange={e => setMxMaxTrades(Number(e.target.value))} className="h-8 w-20 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                      </div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 space-y-0.5">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">Loss Threshold (USDT)</div>
                        <input type="number" min={0} step={1} value={mxLossThreshold} onChange={e => setMxLossThreshold(Number(e.target.value))} className="h-8 w-28 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                        <span className="ml-2 text-[10px] text-slate-500">If balance is at or below this, auto trading stops.</span>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">Daily Loss Limit (%)</div>
                        <input type="number" min={0} max={99} step={1} value={mxDailyLossPct} onChange={e => setMxDailyLossPct(Number(e.target.value))} className="h-8 w-28 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200" />
                        <span className="ml-2 text-[10px] text-slate-500">Halt new entries when equity drops this % below the day&apos;s start. Resumes next UTC day. 0 = off.</span>
                      </div>
                      <div>Position value: <span className="text-slate-200 font-mono">{mxPosSize} USDT</span></div>
                      <div>Margin used: <span className="text-slate-200 font-mono">{(mxPosSize / mxLeverage).toFixed(2)} USDT</span></div>
                      <div>Max exposure: <span className="text-slate-200 font-mono">{(mxPosSize * mxMaxTrades).toFixed(2)} USDT</span></div>
                    </div>
                    <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-300">No-Chase Filter</div>
                          <div className="text-[10px] text-slate-500">Skip if live price already moved past signal entry beyond tolerance.</div>
                        </div>
                        <button
                          onClick={() => setMxNoChase(o => !o)}
                          className={cn('rounded border px-3 py-1 text-xs font-bold shrink-0', mxNoChase ? 'bg-emerald-700 border-emerald-600 text-white' : 'border-slate-700 text-slate-400')}
                        >
                          {mxNoChase ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">Max Chase % (slippage tolerance)</div>
                        <input
                          type="number"
                          min={0}
                          step={0.05}
                          value={mxMaxChasePct}
                          onChange={e => setMxMaxChasePct(Number(e.target.value))}
                          disabled={!mxNoChase}
                          className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 disabled:opacity-50"
                        />
                        <span className="ml-2 text-[10px] text-slate-500">e.g. 0.15 = skip if &gt;0.15% chase</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Auto-trade on strategies</div>
                      <div className="flex flex-wrap gap-1">
                        {STRATEGIES.map(s => (
                          <button key={s} onClick={() => toggleMxStrategy(s)} className={cn('rounded border px-2 py-1 text-xs font-bold', mxStrategies.includes(s) ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-800 text-slate-400')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <Button className="h-9 px-6 font-bold bg-orange-600 hover:bg-orange-700" onClick={saveMexc} disabled={mexcSaving}>
                    {mexcSaving ? 'Saving…' : 'Save MEXC Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-200">Open Trades ({mexcStatus?.openTrades?.length ?? 0})</span>
                  {typeof mexcStatus?.livePositionCount === 'number' && (
                    <span className="text-xs font-mono text-slate-400">
                      MEXC live: <span className="text-amber-400 font-bold">{mexcStatus.livePositionCount}</span>
                    </span>
                  )}
                  {mexcSyncMsg && (
                    <span className="text-xs font-mono text-emerald-400">{mexcSyncMsg}</span>
                  )}
                </div>
                <button
                  onClick={syncMexcTrades}
                  disabled={mexcSyncing}
                  className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-50"
                >
                  {mexcSyncing ? 'Syncing…' : '⟳ Sync with MEXC'}
                </button>
              </div>
              <TradesTable label="" trades={mexcStatus?.openTrades ?? []} onRemove={removeMexcTrade} />
            </div>
            <RealizedPnlPanel pnl={mexcPnl} onRefresh={fetchMexcPnl} limit={mexcPnlLimit} onLimitChange={setMexcPnlLimit} />
            <TradesTable label="Trade History" trades={mexcStatus?.recentTrades ?? []} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
