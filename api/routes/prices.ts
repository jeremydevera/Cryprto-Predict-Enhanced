import { Router, type Request, type Response } from 'express'
import { PriceService } from '../services/priceService.js'

const router = Router()

/**
 * Get all tradable futures symbols
 * Usage: /api/prices/symbols?exchange=binance|bybit|all
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const exchange = (req.query.exchange as string) || 'binance'
    const symbols = await PriceService.getAllSymbols(
      exchange === 'bybit' ? 'bybit' : exchange === 'all' ? 'all' : 'binance',
    );
    res.status(200).json({
      success: true,
      data: symbols,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * Get real-time price from specific exchange or aggregated source
 * Usage: /api/prices/ticker?symbol=BTCUSDT&source=binance
 */
router.get('/ticker', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT'
  const source = req.query.source as string

  try {
    let data;
    switch (source) {
      case 'binance':
        data = await PriceService.getBinancePrice(symbol)
        break;
      case 'bybit':
        data = await PriceService.getBybitPrice(symbol)
        break;
      case 'coingecko':
        // Mapping BTCUSDT -> 'bitcoin' for CG
        const symbolMap: Record<string, string> = {
          'BTCUSDT': 'bitcoin',
          'ETHUSDT': 'ethereum',
          'SOLUSDT': 'solana',
          'BNBUSDT': 'binancecoin',
          'XRPUSDT': 'ripple'
        };
        const id = symbolMap[symbol.replace('/', '').toUpperCase()] || 'bitcoin';
        data = await PriceService.getCoinGeckoPrice(id)
        break;
      default:
        data = await PriceService.getAggregatePrice(symbol)
        break;
    }

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * Get historical OHLCV data for charts
 */
async function fetchBinanceKlines(url: string): Promise<any[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Binance request failed: ${response.status}`)
  return response.json() as Promise<any[]>
}

async function fetchKlinesPaginated(ticker: string, interval: string, totalLimit: number): Promise<any[]> {
  const BATCH = 1000
  const batches = Math.ceil(totalLimit / BATCH)
  let allKlines: any[] = []
  let endTime: number | null = null

  for (let i = 0; i < batches; i++) {
    const remaining = totalLimit - allKlines.length
    const batchSize = Math.min(remaining, BATCH)
    let klines: any[] = []

    const endParam = endTime ? `&endTime=${endTime}` : ''
    try {
      klines = await fetchBinanceKlines(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${ticker}&interval=${interval}&limit=${batchSize}${endParam}`
      )
    } catch {
      klines = await fetchBinanceKlines(
        `https://api.binance.com/api/v3/klines?symbol=${ticker}&interval=${interval}&limit=${batchSize}${endParam}`
      )
    }

    if (!klines.length) break
    // Prepend older candles
    allKlines = [...klines, ...allKlines]
    // Next batch ends just before the oldest candle we have
    endTime = klines[0][0] - 1
  }

  // Sort ascending by open time and deduplicate
  allKlines.sort((a, b) => a[0] - b[0])
  return allKlines.filter((k, i, arr) => i === 0 || k[0] !== arr[i - 1][0])
}

// ── MEXC contract klines (matches live MEXC fill prices) ───────────────────────
// MEXC Futures interval codes differ from Binance.
const MEXC_INTERVAL: Record<string, string> = {
  '1m': 'Min1', '5m': 'Min5', '15m': 'Min15', '30m': 'Min30',
  '1h': 'Min60', '4h': 'Hour4', '8h': 'Hour8', '1d': 'Day1', '1w': 'Week1', '1M': 'Month1',
}

// BTCUSDT → BTC_USDT (MEXC contract symbol format)
function toMexcContractSymbol(symbol: string): string {
  const s = symbol.replace('/', '').toUpperCase()
  if (s.includes('_')) return s
  if (s.endsWith('USDT')) return s.slice(0, -4) + '_USDT'
  if (s.endsWith('USDC')) return s.slice(0, -4) + '_USDC'
  return s
}

/**
 * Fetch MEXC contract klines. Supports time range via start/end (unix seconds).
 * Returns rows shaped like Binance klines [openTimeMs, o, h, l, c, v] for a uniform formatter.
 */
// Seconds per interval (for MEXC pagination math).
const INTERVAL_SEC: Record<string, number> = {
  '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400,
  '8h': 28800, '1d': 86400, '1w': 604800, '1M': 2592000,
}

// One MEXC kline request (≤ ~2000 candles). Returns Binance-shaped rows, oldest→newest.
async function fetchMexcKlinesOnce(
  mexcSymbol: string, mexcInterval: string, startSec?: number, endSec?: number,
): Promise<any[]> {
  const params = new URLSearchParams({ interval: mexcInterval })
  if (startSec) params.set('start', String(startSec))
  if (endSec)   params.set('end',   String(endSec))
  const url = `https://contract.mexc.com/api/v1/contract/kline/${mexcSymbol}?${params.toString()}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`MEXC kline request failed: ${response.status}`)
  const json: any = await response.json()
  const d = json?.data
  if (!d || !Array.isArray(d.time)) return []
  const rows = d.time.map((t: number, i: number) => [
    t * 1000,
    String(d.open?.[i]   ?? d.realOpen?.[i]  ?? '0'),
    String(d.high?.[i]   ?? '0'),
    String(d.low?.[i]    ?? '0'),
    String(d.close?.[i]  ?? d.realClose?.[i] ?? '0'),
    String(d.vol?.[i]    ?? '0'),
  ])
  rows.sort((a: any[], b: any[]) => a[0] - b[0])
  return rows
}

/**
 * Fetch MEXC contract klines. Supports time range via start/end (unix seconds).
 * MEXC caps ~2000 candles per request, so for larger `limit` we PAGINATE backward via `end`.
 * Returns rows shaped like Binance klines [openTimeMs, o, h, l, c, v] for a uniform formatter.
 */
async function fetchMexcKlines(
  symbol: string, interval: string, limit: number,
  startSec?: number, endSec?: number,
): Promise<any[]> {
  const mexcSymbol = toMexcContractSymbol(symbol)
  const mexcInterval = MEXC_INTERVAL[interval] ?? 'Min5'
  const intervalSec = INTERVAL_SEC[interval] ?? 300

  // Ranged request: single fetch over [start,end] (caller bounds the range).
  if (startSec || endSec) {
    const rows = await fetchMexcKlinesOnce(mexcSymbol, mexcInterval, startSec, endSec)
    const deduped = rows.filter((k: any[], i: number, arr: any[][]) => i === 0 || k[0] !== arr[i - 1][0])
    return limit > 0 && deduped.length > limit ? deduped.slice(-limit) : deduped
  }

  // Latest-N request: paginate backward until we have `limit` candles (or run out).
  const want = limit > 0 ? limit : 2000
  let collected: any[] = []
  let end: number | undefined = undefined
  for (let guard = 0; guard < 10 && collected.length < want; guard++) {
    const batch = await fetchMexcKlinesOnce(mexcSymbol, mexcInterval, undefined, end)
    if (batch.length === 0) break
    collected = [...batch, ...collected]
    const oldestSec = Math.floor(batch[0][0] / 1000)
    const nextEnd = oldestSec - intervalSec
    if (end !== undefined && nextEnd >= end) break  // no progress → stop
    end = nextEnd
    if (batch.length < 1000) break  // exchange returned a short page → reached the start of history
  }
  // Dedup (older batches may overlap) and keep the most recent `want`.
  collected.sort((a: any[], b: any[]) => a[0] - b[0])
  const deduped = collected.filter((k: any[], i: number, arr: any[][]) => i === 0 || k[0] !== arr[i - 1][0])
  return deduped.length > want ? deduped.slice(-want) : deduped
}

router.get('/ohlcv', async (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT'
  const interval = (req.query.interval as string) || '15m'
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 5000)
  const source = ((req.query.source as string) || 'binance').toLowerCase()
  // Optional time range (unix seconds). When provided, returns only candles in [startTime, endTime].
  const startTime = req.query.startTime ? Math.floor(Number(req.query.startTime)) : undefined
  const endTime   = req.query.endTime   ? Math.floor(Number(req.query.endTime))   : undefined

  // When an explicit time range is given, the range defines the bounds — the `limit` cap must
  // NOT truncate it (otherwise warm-up/window candles get silently chopped off).
  const ranged = startTime !== undefined || endTime !== undefined
  const effectiveLimit = ranged ? 0 : limit

  // For ranged requests, work out how many candles the range spans so the Binance paginator
  // fetches enough to cover it (default 200 would miss long/old windows → empty result).
  const intervalSec = (() => {
    const n = parseInt(interval) || 1
    if (interval.endsWith('m')) return n * 60
    if (interval.endsWith('h')) return n * 3600
    if (interval.endsWith('d')) return n * 86400
    return 60
  })()
  const rangeCount = ranged && startTime
    ? Math.min(5000, Math.ceil(((endTime ?? Math.floor(Date.now() / 1000)) - startTime) / intervalSec) + 60)
    : limit

  // Binance fetch + range filter — paginates to cover the requested span. Used directly for
  // source=binance, and as a FALLBACK when MEXC returns nothing (rate-limited or range too large).
  const fetchBinanceRanged = async (ticker: string): Promise<any[]> => {
    let k = await fetchKlinesPaginated(ticker, interval, ranged ? rangeCount : limit)
    if (startTime) k = k.filter((x: any) => x[0] >= startTime * 1000)
    if (endTime)   k = k.filter((x: any) => x[0] <= endTime   * 1000)
    return k
  }

  try {
    const ticker = symbol.replace('/', '').toUpperCase()

    // Throw-safe wrappers — return [] on any failure so we can fall back to the other exchange.
    const tryMexc = async (): Promise<any[]> => {
      try { return await fetchMexcKlines(ticker, interval, effectiveLimit, startTime, endTime) } catch { return [] }
    }
    const tryBinance = async (): Promise<any[]> => {
      try { return await fetchBinanceRanged(ticker) } catch { return [] }
    }

    // Try the requested source first, then fall back to the other. Binance geo-blocks some
    // regions (HTTP 451) and MEXC rate-limits — either can be down, so we need both directions.
    let klines: any[]
    if (source === 'mexc') {
      klines = await tryMexc()
      if (!klines.length) klines = await tryBinance()
    } else {
      klines = await tryBinance()
      if (!klines.length) klines = await tryMexc()
    }

    const formatted = klines.map((k: any) => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))

    res.status(200).json({ success: true, data: formatted })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
