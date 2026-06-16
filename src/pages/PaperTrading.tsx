import { useState, useEffect, useCallback } from 'react'
import AppShell from '@/components/layout/AppShell'
import {
  RefreshCw, X, LogOut, Trash2, CheckCircle, XCircle, Clock,
  TrendingUp, TrendingDown, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaperSettings = {
  enabled:          boolean
  orderType:        'Market' | 'Limit'
  maxOpenPositions: number
  paperCapital:     number
  riskPerTradePct:  number
  feeRatePct:       number
}

type PaperOrder = {
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
  status:           'pending' | 'filled' | 'cancelled' | 'expired'
}

type PaperPosition = {
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

type EquityPoint = { time: number; equity: number }

type Status = {
  settings:      PaperSettings
  orders:        PaperOrder[]
  openPositions: PaperPosition[]
  history:       PaperPosition[]
  lastSyncAt:    number | null
  currentEquity: number
  equityHistory: EquityPoint[]
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLL_MS = 5_000

function fmtPrice(n: number) {
  if (n >= 1000) return n.toFixed(2)
  if (n >= 1)    return n.toFixed(4)
  return n.toFixed(6)
}

function fmtR(r: number) {
  const sign = r >= 0 ? '+' : ''
  return `${sign}${r.toFixed(2)}R`
}

function fmtUsdt(n: number) {
  const sign = n >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function fmtAge(ms: number) {
  const s = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  if (h < 24)   return rm > 0 ? `${h}h ${rm}m` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`
}

// ─── Small components ─────────────────────────────────────────────────────────

function DirBadge({ dir }: { dir: 'buy' | 'sell' }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-xs font-bold',
      dir === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
    )}>
      {dir === 'buy' ? 'BUY' : 'SELL'}
    </span>
  )
}

function RBadge({ r }: { r: number }) {
  const pos = r > 0.01, neg = r < -0.01
  return (
    <span className={cn('font-mono text-sm font-semibold',
      pos ? 'text-emerald-400' : neg ? 'text-red-400' : 'text-slate-400'
    )}>
      {fmtR(r)}
    </span>
  )
}

function PnlBadge({ usdt }: { usdt: number }) {
  const pos = usdt > 0.005, neg = usdt < -0.005
  return (
    <span className={cn('font-mono text-sm',
      pos ? 'text-emerald-400' : neg ? 'text-red-400' : 'text-slate-400'
    )}>
      {fmtUsdt(usdt)}
    </span>
  )
}

// ─── Equity sparkline ─────────────────────────────────────────────────────────

function EquitySparkline({ data, capital }: { data: EquityPoint[]; capital: number }) {
  if (data.length < 2) return <span className="text-xs text-slate-600">no history</span>

  const W = 200, H = 40, PAD = 2
  const equities = data.map(d => d.equity)
  const minE = Math.min(...equities)
  const maxE = Math.max(...equities)
  const range = maxE - minE || 1

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + ((maxE - d.equity) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const last = equities[equities.length - 1]
  const color = last >= capital ? '#34d399' : '#f87171'

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={PAD} y1={PAD + ((maxE - capital) / range) * (H - PAD * 2)}
        x2={W - PAD} y2={PAD + ((maxE - capital) / range) * (H - PAD * 2)}
        stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2"
      />
    </svg>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings, onSave }: {
  settings: PaperSettings
  onSave: (s: Partial<PaperSettings>) => Promise<void>
}) {
  const [open, setOpen]               = useState(false)
  const [saving, setSaving]           = useState(false)
  const [capital, setCapital]         = useState(String(settings.paperCapital))
  const [risk, setRisk]               = useState(String(settings.riskPerTradePct))
  const [fee, setFee]                 = useState(String(settings.feeRatePct))
  const [maxPos, setMaxPos]           = useState(String(settings.maxOpenPositions))
  const [orderType, setOrderType]     = useState<'Market' | 'Limit'>(settings.orderType ?? 'Market')

  const save = async () => {
    setSaving(true)
    await onSave({
      orderType,
      paperCapital:     parseFloat(capital)  || settings.paperCapital,
      riskPerTradePct:  parseFloat(risk)     || settings.riskPerTradePct,
      feeRatePct:       parseFloat(fee)      || settings.feeRatePct,
      maxOpenPositions: parseInt(maxPos, 10) || settings.maxOpenPositions,
    })
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white"
      >
        <Settings2 className="h-4 w-4 text-slate-400" />
        Settings
        {open ? <ChevronUp className="ml-auto h-4 w-4 text-slate-500" /> : <ChevronDown className="ml-auto h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Order Type</span>
              <div className="flex rounded border border-slate-700 overflow-hidden text-xs font-bold">
                {(['Market', 'Limit'] as const).map(t => (
                  <button key={t} onClick={() => setOrderType(t)}
                    className={`flex-1 py-1.5 transition-colors ${orderType === t ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Paper Capital (USDT)</span>
              <input
                type="number" min="100" step="100" value={capital}
                onChange={e => setCapital(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Risk per Trade (%)</span>
              <input
                type="number" min="0.1" max="10" step="0.1" value={risk}
                onChange={e => setRisk(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Fee Rate (% per side)</span>
              <input
                type="number" min="0" max="1" step="0.01" value={fee}
                onChange={e => setFee(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-400">Max Open Positions</span>
              <input
                type="number" min="1" max="50" step="1" value={maxPos}
                onChange={e => setMaxPos(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaperTrading() {
  const [status, setStatus]   = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setReset] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/paper-trading/status')
      const json = await res.json()
      if (json.success) setStatus(json.data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, POLL_MS)
    return () => clearInterval(id)
  }, [fetchStatus])

  const toggleEnabled = async () => {
    if (!status) return
    await fetch('/api/paper-trading/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !status.settings.enabled }),
    })
    fetchStatus()
  }

  const saveSettings = async (partial: Partial<PaperSettings>) => {
    await fetch('/api/paper-trading/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
    fetchStatus()
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const res  = await fetch('/api/paper-trading/sync', { method: 'POST' })
      const json = await res.json()
      if (json.success) setStatus(json.data)
    } finally { setSyncing(false) }
  }

  const cancelOrder = async (id: string) => {
    await fetch(`/api/paper-trading/orders/${id}`, { method: 'DELETE' })
    fetchStatus()
  }

  const closePosition = async (id: string) => {
    await fetch(`/api/paper-trading/positions/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    fetchStatus()
  }

  const reset = async () => {
    if (!confirm('Clear all paper trading data and reset equity to starting capital?')) return
    setReset(true)
    try {
      await fetch('/api/paper-trading/reset', { method: 'POST' })
      fetchStatus()
    } finally { setReset(false) }
  }

  const now      = Date.now()
  const pending  = status?.orders.filter(o => o.status === 'pending') ?? []
  const active   = status?.openPositions ?? []
  const history  = status?.history ?? []
  const summary  = status?.summary
  const settings = status?.settings

  const equityPts   = status?.equityHistory ?? []
  const capital     = settings?.paperCapital ?? 10_000
  const equity      = status?.currentEquity ?? capital
  const returnPct   = summary?.returnPct ?? 0
  const returnColor = returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] space-y-5 p-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Paper Trading</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates BG Scanner signals as limit orders — 1m OHLCV monitoring, no real money
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleEnabled}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                settings?.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300',
              )}
            >
              {settings?.enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
              Sync Now
            </button>
            <button
              onClick={reset}
              disabled={resetting}
              className="flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-red-900 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {status?.lastSyncAt && (
          <p className="text-xs text-slate-500">
            Last sync: {fmtAge(now - status.lastSyncAt)} ago · auto every 30s
          </p>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {/* ── Equity card + sparkline ── */}
        {status && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Current Equity</div>
              <div className="text-2xl font-bold text-white font-mono">${equity.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Return</div>
              <div className={cn('text-2xl font-bold font-mono', returnColor)}>
                {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Net PnL</div>
              <div className={cn('text-xl font-bold font-mono', (summary?.netPnlUsdt ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {fmtUsdt(summary?.netPnlUsdt ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Total Fees</div>
              <div className="text-xl font-bold font-mono text-slate-400">
                -${(summary?.totalFeeUsdt ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="ml-auto">
              <div className="text-xs text-slate-400 mb-1">Equity Curve</div>
              <EquitySparkline data={equityPts} capital={capital} />
            </div>
          </div>
        )}

        {/* ── Summary stats ── */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: 'Active',     value: active.length.toString(),           color: 'text-cyan-400' },
              { label: 'Pending',    value: pending.length.toString(),           color: 'text-amber-400' },
              { label: 'Closed',     value: summary.totalClosed.toString(),      color: 'text-slate-300' },
              { label: 'Win Rate',   value: `${summary.winRate.toFixed(1)}%`,    color: summary.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Total R',    value: fmtR(summary.totalR),               color: summary.totalR >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Avg R',      value: fmtR(summary.avgR),                 color: summary.avgR >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Max DD',     value: `-${summary.maxDrawdownR.toFixed(2)}R`, color: 'text-orange-400' },
              { label: 'Gross PnL',  value: fmtUsdt(summary.grossPnlUsdt),      color: summary.grossPnlUsdt >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
                <div className={cn('text-lg font-bold font-mono', color)}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Settings panel ── */}
        {settings && (
          <SettingsPanel settings={settings} onSave={saveSettings} />
        )}

        {/* ── Active Positions ── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Active Positions
            <span className="rounded bg-cyan-500/20 px-1.5 text-xs text-cyan-400">{active.length}</span>
          </h2>

          {active.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              No open positions — waiting for signals to fill
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs text-slate-400">
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Dir</th>
                    <th className="px-3 py-2">Strategy</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Entry</th>
                    <th className="px-3 py-2 text-right">Current</th>
                    <th className="px-3 py-2 text-right">Unreal. R</th>
                    <th className="px-3 py-2 text-right">Unreal. PnL</th>
                    <th className="px-3 py-2 text-right">SL</th>
                    <th className="px-3 py-2 text-right">TP1</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {active.map(pos => (
                    <tr key={pos.id} className="border-b border-slate-800/50 bg-slate-950 hover:bg-slate-900/60">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-white">
                        {pos.symbol} <span className="text-slate-500">{pos.timeframe}</span>
                      </td>
                      <td className="px-3 py-2"><DirBadge dir={pos.direction} /></td>
                      <td className="px-3 py-2 text-xs text-slate-300 max-w-[140px] truncate">{pos.strategy}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
                        ${pos.positionSizeUsdt.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-slate-200">{fmtPrice(pos.entry)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        <span className={cn(
                          pos.direction === 'buy'
                            ? (pos.currentPrice >= pos.entry ? 'text-emerald-400' : 'text-red-400')
                            : (pos.currentPrice <= pos.entry ? 'text-emerald-400' : 'text-red-400')
                        )}>
                          {fmtPrice(pos.currentPrice)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right"><RBadge r={pos.unrealizedR} /></td>
                      <td className="px-3 py-2 text-right"><PnlBadge usdt={pos.unrealizedPnlUsdt} /></td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-red-400">{fmtPrice(pos.sl)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-emerald-400">{fmtPrice(pos.tp1)}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{fmtAge(now - pos.openedAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => closePosition(pos.id)}
                          title="Close position manually"
                          className="rounded p-1 text-slate-500 hover:bg-red-900/40 hover:text-red-400"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Pending Orders ── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <Clock className="h-4 w-4 text-amber-400" />
            Pending Limit Orders
            <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-400">{pending.length}</span>
          </h2>

          {pending.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              No pending orders — new BG Scanner signals will appear here
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs text-slate-400">
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Dir</th>
                    <th className="px-3 py-2">Strategy</th>
                    <th className="px-3 py-2 text-right">Risk</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Limit Entry</th>
                    <th className="px-3 py-2 text-right">SL</th>
                    <th className="px-3 py-2 text-right">TP1</th>
                    <th className="px-3 py-2 text-right">Dist%</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Expires in</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map(order => (
                    <tr key={order.id} className="border-b border-slate-800/50 bg-slate-950 hover:bg-slate-900/60">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-white">
                        {order.symbol} <span className="text-slate-500">{order.timeframe}</span>
                      </td>
                      <td className="px-3 py-2"><DirBadge dir={order.direction} /></td>
                      <td className="px-3 py-2 text-xs text-slate-300 max-w-[140px] truncate">{order.strategy}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
                        ${order.riskUsdt.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
                        ${order.positionSizeUsdt.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-amber-300">{fmtPrice(order.entry)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-red-400">{fmtPrice(order.sl)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-emerald-400">{fmtPrice(order.tp1)}</td>
                      <td className="px-3 py-2 text-right text-xs text-slate-400">{order.entryDistancePct.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{fmtAge(now - order.createdAt)}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {order.expiresAt > now ? fmtAge(order.expiresAt - now) : 'soon'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => cancelOrder(order.id)}
                          title="Cancel order"
                          className="rounded p-1 text-slate-500 hover:bg-red-900/40 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Trade History ── */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <TrendingDown className="h-4 w-4 text-slate-400" />
            Trade History
            <span className="rounded bg-slate-700 px-1.5 text-xs text-slate-300">{history.length}</span>
          </h2>

          {history.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
              No closed trades yet
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-80 rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs text-slate-400">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Dir</th>
                    <th className="px-3 py-2">Strategy</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">Entry</th>
                    <th className="px-3 py-2 text-right">Close</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2 text-right">R</th>
                    <th className="px-3 py-2 text-right">Gross PnL</th>
                    <th className="px-3 py-2 text-right">Fee</th>
                    <th className="px-3 py-2 text-right">Net PnL</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((pos, i) => {
                    const isWin  = pos.closeReason === 'tp1'
                    const isLoss = pos.closeReason === 'sl'
                    return (
                      <tr
                        key={pos.id}
                        className={cn(
                          'border-b border-slate-800/50 hover:bg-slate-900/60',
                          isWin ? 'bg-emerald-950/20' : isLoss ? 'bg-red-950/20' : 'bg-slate-950'
                        )}
                      >
                        <td className="px-3 py-2 text-xs text-slate-500">{history.length - i}</td>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-white">
                          {pos.symbol} <span className="text-slate-500">{pos.timeframe}</span>
                        </td>
                        <td className="px-3 py-2"><DirBadge dir={pos.direction} /></td>
                        <td className="px-3 py-2 text-xs text-slate-300 max-w-[120px] truncate">{pos.strategy}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-400">
                          ${pos.positionSizeUsdt.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-200">{fmtPrice(pos.entry)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-200">
                          {pos.closePrice ? fmtPrice(pos.closePrice) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {isWin  && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> TP1</span>}
                          {isLoss && <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> SL</span>}
                          {!isWin && !isLoss && <span className="text-xs text-slate-400">Manual</span>}
                        </td>
                        <td className="px-3 py-2 text-right"><RBadge r={pos.r ?? 0} /></td>
                        <td className="px-3 py-2 text-right"><PnlBadge usdt={pos.pnlUsdt ?? 0} /></td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                          -${(pos.feeUsdt ?? 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right"><PnlBadge usdt={pos.netPnlUsdt ?? 0} /></td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {pos.closedAt && pos.openedAt ? fmtAge(pos.closedAt - pos.openedAt) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {pos.closedAt ? fmtAge(now - pos.closedAt) + ' ago' : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── How it works ── */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-400">How it works</p>
          <p>1. BG Scanner signals become limit orders at the signal's exact entry price. Position size is calculated from equity × risk% ÷ risk-per-unit.</p>
          <p>2. Every 30s, Binance 1m OHLCV candles are fetched. A buy order fills when candle low ≤ entry; a sell fills when candle high ≥ entry.</p>
          <p>3. Open positions are checked candle-by-candle for SL/TP. If both hit the same candle, proximity to the candle open determines which was first.</p>
          <p>4. Fees are charged on both entry and exit: <span className="font-mono">size × fee% × 2</span>. Net PnL = gross PnL − fees. State persists across server restarts.</p>
        </div>
      </div>
    </AppShell>
  )
}
