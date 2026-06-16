import * as XLSX from 'xlsx'
import type { FilterSettings } from '@/stores/tradingStore'
import type { BacktestOptions } from '@/hooks/useBacktestRunner'
import type { ProfileRunResult } from '@/hooks/useProfileBacktestRunner'

/** One profile's run, paired with the exact settings that produced it. */
export type ProfileExportInput = {
  profileName: string
  strategy: string
  /** The profile's saved FilterSettings used for this run. Null if the profile was deleted mid-session. */
  filters: FilterSettings | null
  result: ProfileRunResult
}

export type ExportMeta = {
  timeframe: string
  options: BacktestOptions
  /** Number of symbols the run was executed over. */
  symbolCount: number
}

// Excel caps sheet names at 31 chars and forbids : \ / ? * [ ]. Profiles are user-named, so sanitize.
function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 28) || 'Sheet'
  let candidate = base
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 28 - String(n).length - 1)} ${n}`
    n++
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function isoFromSec(sec: number): string {
  if (!sec || !Number.isFinite(sec)) return ''
  return new Date(sec * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

function round(n: number, dp = 4): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return n
  const f = Math.pow(10, dp)
  return Math.round(n * f) / f
}

/** Summary row (one per profile) — the comparison view. */
function summaryRow(inp: ProfileExportInput) {
  const s = inp.result.summary
  const d = inp.result.diag
  return {
    Profile: inp.profileName,
    Strategy: inp.strategy,
    Trades: s.totalTrades,
    Wins: s.wins,
    Losses: s.losses,
    Liquidations: s.liquidations,
    'Win Rate %': round(s.winrate, 2),
    'Total R': round(s.totalR, 2),
    'Avg R': round(s.avgR, 3),
    'Net P/L': round(s.netPnl, 2),
    'Gross P/L': round(s.grossPnl, 2),
    'Total Fees': round(s.totalFees, 2),
    'Return %': round(s.returnPct, 2),
    'Profit Factor': round(s.profitFactor, 3),
    'Max DD (R)': round(s.maxDrawdown, 2),
    'Max DD (USD)': round(s.maxDrawdownUsd, 2),
    'Max Floating DD (USD)': round(s.maxFloatingDrawdownUsd, 2),
    'Start Capital': round(s.startingCapital, 2),
    'End Capital': round(s.endingCapital, 2),
    Leverage: s.leverage,
    'Margin Mode': s.marginMode,
    'Fee Rate %': s.feeRatePct,
    'Signals Fired': d.signalsFired,
    Opened: d.opened,
    'Candles': inp.result.candleCount,
    'Period From': isoFromSec(inp.result.period?.from),
    'Period To': isoFromSec(inp.result.period?.to),
  }
}

/** Per-symbol breakdown rows for one profile. */
function symbolRows(inp: ProfileExportInput) {
  return Object.entries(inp.result.symbolBreakdown)
    .map(([symbol, v]) => ({
      Profile: inp.profileName,
      Symbol: symbol,
      Trades: v.trades,
      Wins: v.wins,
      Losses: v.trades - v.wins,
      'Win Rate %': v.trades > 0 ? round((v.wins / v.trades) * 100, 1) : 0,
      'Total R': round(v.r, 2),
    }))
    .sort((a, b) => b['Total R'] - a['Total R'])
}

/** Individual trade rows for one profile. */
function tradeRows(inp: ProfileExportInput) {
  return inp.result.trades.map((t) => ({
    Profile: inp.profileName,
    Symbol: t.symbol ?? '',
    Direction: t.direction,
    'Open Time': isoFromSec(t.openTime),
    'Close Time': isoFromSec(t.closeTime),
    Entry: t.entry,
    SL: t.sl,
    TP1: t.tp1,
    TP2: t.tp2,
    Exit: t.exitPrice,
    Result: t.result,
    'Close Reason': t.closeReason,
    R: round(t.r, 3),
    'P/L': round(t.pnl, 2),
    'Gross P/L': round(t.grossPnl, 2),
    Fees: round(t.fees, 2),
    'Equity After': round(t.equityAfter, 2),
    'MFE (R)': round(t.mfeR, 2),
    'MAE (R)': round(t.maeR, 2),
    Leverage: t.leverage,
    'Margin Used': round(t.marginUsed, 2),
    'Position Size': round(t.positionSize, 4),
    Quality: t.quality,
    Confluence: t.confluence,
    Signals: t.signals,
  }))
}

/** Diagnostics row (one per profile) — why signals were dropped. */
function diagRow(inp: ProfileExportInput) {
  const d = inp.result.diag
  return {
    Profile: inp.profileName,
    'Signals Fired': d.signalsFired,
    Opened: d.opened,
    'Dropped: Slots': d.droppedSlots,
    'Dropped: Capital': d.droppedCapital,
    'Dropped: Dedup': d.droppedDedup,
    'Dropped: Fill Gap': d.droppedFillGap,
    'Dropped: Daily Loss': d.droppedDailyLoss ?? 0,
    'Dropped: Kill Switch': d.droppedRiskStop ?? 0,
  }
}

/**
 * Settings sheet laid out as a comparison matrix: one row per setting, one column per profile,
 * plus a leading block of run-level options shared by every profile in the run. This is the
 * layout that makes "which setting differs, and which performs best" obvious at a glance.
 */
function settingsSheet(inputs: ProfileExportInput[], meta: ExportMeta): XLSX.WorkSheet {
  const aoa: (string | number | boolean | null)[][] = []
  const profileNames = inputs.map((i) => i.profileName)

  // Run-level options (identical across profiles in a single run).
  aoa.push(['RUN OPTIONS'])
  const o = meta.options
  const runOpts: [string, string | number | boolean | undefined][] = [
    ['Timeframe', meta.timeframe],
    ['Symbols In Run', meta.symbolCount],
    ['Starting Capital', o.startingCapital],
    ['Trade Amount', o.tradeAmount],
    ['Leverage', o.leverage],
    ['Margin Mode', o.marginMode],
    ['Fee Rate %', o.feeRatePct],
    ['Slippage %', o.slippagePct],
    ['Max Open Positions', o.maxOpenPositions],
    ['Exit Mode', o.exitMode],
    ['Runner Fraction', o.runnerFraction],
    ['Daily Loss Limit %', o.dailyLossLimitPct],
    ['Loss Threshold USDT', o.lossThresholdUSDT],
    ['Pessimistic Same Bar', o.pessimisticSameBar],
    ['Candle Limit', o.candleLimit],
    ['Source', o.source ?? 'binance'],
    ['Window Start', o.windowStart ? isoFromSec(o.windowStart) : ''],
    ['Window End', o.windowEnd ? isoFromSec(o.windowEnd) : ''],
  ]
  for (const [k, v] of runOpts) aoa.push([k, v ?? ''])

  aoa.push([])
  // Header row for the per-profile settings matrix.
  aoa.push(['PROFILE SETTINGS', ...profileNames])
  aoa.push(['Strategy', ...inputs.map((i) => i.strategy)])

  // Union of every setting key across the profiles, so a key present in only one still shows.
  const keys = new Set<string>()
  for (const inp of inputs) {
    if (inp.filters) for (const k of Object.keys(inp.filters)) keys.add(k)
  }
  for (const key of Array.from(keys).sort()) {
    const row: (string | number | boolean | null)[] = [key]
    for (const inp of inputs) {
      const val = inp.filters ? (inp.filters as Record<string, unknown>)[key] : undefined
      row.push(formatSettingValue(val))
    }
    aoa.push(row)
  }

  return XLSX.utils.aoa_to_sheet(aoa)
}

function formatSettingValue(val: unknown): string | number | boolean {
  if (val === undefined || val === null) return ''
  if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') return val
  return JSON.stringify(val)
}

/** Auto-fit-ish column widths from the widest cell in each column. */
function autoWidth(rows: Record<string, unknown>[]): { wch: number }[] {
  if (rows.length === 0) return []
  const keys = Object.keys(rows[0])
  return keys.map((k) => {
    const maxLen = rows.reduce((m, r) => {
      const len = String(r[k] ?? '').length
      return len > m ? len : m
    }, k.length)
    return { wch: Math.min(40, maxLen + 2) }
  })
}

/**
 * Build and download a multi-tab Excel workbook for one or more profile runs.
 * Tabs: Summary (comparison), Settings (matrix), Diagnostics, then Trades + Per-Symbol per profile.
 */
export function exportProfileResults(inputs: ProfileExportInput[], meta: ExportMeta): void {
  if (inputs.length === 0) return
  const wb = XLSX.utils.book_new()
  const used = new Set<string>()

  // 1. Summary — one row per profile (comparison view).
  const summary = inputs.map(summaryRow)
  const wsSummary = XLSX.utils.json_to_sheet(summary)
  wsSummary['!cols'] = autoWidth(summary)
  XLSX.utils.book_append_sheet(wb, wsSummary, safeSheetName('Summary', used))

  // 2. Settings — comparison matrix (run options + per-profile filters).
  XLSX.utils.book_append_sheet(wb, settingsSheet(inputs, meta), safeSheetName('Settings', used))

  // 3. Diagnostics — one row per profile.
  const diag = inputs.map(diagRow)
  const wsDiag = XLSX.utils.json_to_sheet(diag)
  wsDiag['!cols'] = autoWidth(diag)
  XLSX.utils.book_append_sheet(wb, wsDiag, safeSheetName('Diagnostics', used))

  // 4 & 5. Per profile: a Trades tab and a Per-Symbol tab.
  // For a single profile keep clean names; for many, prefix with the profile name to disambiguate.
  const many = inputs.length > 1
  for (const inp of inputs) {
    const trades = tradeRows(inp)
    if (trades.length > 0) {
      const wsT = XLSX.utils.json_to_sheet(trades)
      wsT['!cols'] = autoWidth(trades)
      const tName = many ? `${inp.profileName} Trades` : 'Trades'
      XLSX.utils.book_append_sheet(wb, wsT, safeSheetName(tName, used))
    }
    const syms = symbolRows(inp)
    if (syms.length > 0) {
      const wsS = XLSX.utils.json_to_sheet(syms)
      wsS['!cols'] = autoWidth(syms)
      const sName = many ? `${inp.profileName} Symbols` : 'Per-Symbol'
      XLSX.utils.book_append_sheet(wb, wsS, safeSheetName(sName, used))
    }
  }

  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '')
  const label = inputs.length === 1
    ? inputs[0].profileName.replace(/[^\w-]+/g, '-').slice(0, 40)
    : `${inputs.length}-profiles`
  XLSX.writeFile(wb, `profile-results_${label}_${stamp}.xlsx`)
}
