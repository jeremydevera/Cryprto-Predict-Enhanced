/**
 * Pure parity-diff logic — compares a set of live closed trades against backtest results.
 * Extracted from useParityCheck so the verdict math can be unit-tested deterministically.
 */

export type LiveTradeLite = { symbol: string; realizedPnl: number; openTime: number; closeTime: number }
export type BtSymbolBreakdown = Record<string, { trades: number }>

export type ParityDiff = {
  window: { start: number; end: number }
  live: { count: number; totalPnl: number; bySymbol: Record<string, { trades: number; pnl: number }>; symbols: string[] }
  backtest: { count: number; bySymbol: Record<string, { trades: number }> }
  rows: { symbol: string; liveTrades: number; btTrades: number; livePnl: number; match: boolean }[]
  tradeCountMatchPct: number
  symbolsMatched: number
  symbolsLiveOnly: number
  symbolsBtOnly: number
}

export function computeParityDiff(
  liveTrades: LiveTradeLite[],
  btSymbolBreakdown: BtSymbolBreakdown,
  btTotalTrades: number,
): ParityDiff {
  const start = liveTrades.length ? Math.min(...liveTrades.map(t => t.openTime)) : 0
  const end   = liveTrades.length ? Math.max(...liveTrades.map(t => t.closeTime)) : 0

  const liveBySymbol: Record<string, { trades: number; pnl: number }> = {}
  for (const t of liveTrades) {
    if (!liveBySymbol[t.symbol]) liveBySymbol[t.symbol] = { trades: 0, pnl: 0 }
    liveBySymbol[t.symbol].trades++
    liveBySymbol[t.symbol].pnl += t.realizedPnl
  }
  const liveSymbols = Object.keys(liveBySymbol)
  const liveTotalPnl = liveTrades.reduce((s, t) => s + t.realizedPnl, 0)

  const btBySymbol: Record<string, { trades: number }> = {}
  for (const [sym, v] of Object.entries(btSymbolBreakdown)) {
    if (v.trades > 0) btBySymbol[sym] = { trades: v.trades }
  }

  const allSymbols = Array.from(new Set([...liveSymbols, ...Object.keys(btBySymbol)]))
  const rows = allSymbols.map((symbol) => {
    const liveT = liveBySymbol[symbol]?.trades ?? 0
    const btT   = btBySymbol[symbol]?.trades ?? 0
    return { symbol, liveTrades: liveT, btTrades: btT, livePnl: liveBySymbol[symbol]?.pnl ?? 0, match: liveT > 0 && btT > 0 }
  }).sort((a, b) => b.liveTrades - a.liveTrades)

  const symbolsMatched  = rows.filter(r => r.liveTrades > 0 && r.btTrades > 0).length
  const symbolsLiveOnly = rows.filter(r => r.liveTrades > 0 && r.btTrades === 0).length
  const symbolsBtOnly   = rows.filter(r => r.liveTrades === 0 && r.btTrades > 0).length

  const liveCount = liveTrades.length
  const tradeCountMatchPct = liveCount > 0
    ? Math.max(0, 100 - (Math.abs(btTotalTrades - liveCount) / liveCount) * 100)
    : 0

  return {
    window: { start, end },
    live: { count: liveCount, totalPnl: liveTotalPnl, bySymbol: liveBySymbol, symbols: liveSymbols },
    backtest: { count: btTotalTrades, bySymbol: btBySymbol },
    rows, tradeCountMatchPct, symbolsMatched, symbolsLiveOnly, symbolsBtOnly,
  }
}

export function parityVerdict(d: Pick<ParityDiff, 'tradeCountMatchPct' | 'symbolsLiveOnly'>): 'STRONG MATCH' | 'PARTIAL MATCH' | 'MISMATCH' {
  if (d.tradeCountMatchPct >= 90 && d.symbolsLiveOnly === 0) return 'STRONG MATCH'
  if (d.tradeCountMatchPct >= 70) return 'PARTIAL MATCH'
  return 'MISMATCH'
}
