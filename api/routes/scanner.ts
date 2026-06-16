import { Router, type Request, type Response } from 'express'
import { evaluateSignal, type BgScanParams } from '../utils/signalEval.js'
import type { OhlcvBar } from '../utils/indicators.js'

const router = Router()

const htfFor = (tf: string): string => {
  if (tf === '1m') return '15m'
  if (tf === '5m') return '1h'
  if (tf === '15m') return '4h'
  if (tf === '1h') return '1d'
  if (tf === '4h') return '1d'
  return '1d'
}

async function fetchCandles(symbol: string, interval: string, limit = 220): Promise<OhlcvBar[]> {
  const ticker = symbol.replace('/', '').toUpperCase()
  const tryFetch = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<any[]>
  }
  let klines: any[]
  try {
    klines = await tryFetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${ticker}&interval=${interval}&limit=${limit}`)
  } catch {
    klines = await tryFetch(`https://api.binance.com/api/v3/klines?symbol=${ticker}&interval=${interval}&limit=${limit}`)
  }
  return klines.map((k: any) => ({
    time: k[0] / 1000,
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }))
}

router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<BgScanParams> & { symbol?: unknown; timeframe?: unknown }
    const symbol = typeof body?.symbol === 'string' ? body.symbol : ''
    const timeframe = typeof body?.timeframe === 'string' ? body.timeframe : ''
    if (!symbol || !timeframe) return res.status(400).json({ success: false, error: 'symbol and timeframe are required' })

    const [candles, htfCandles] = await Promise.all([
      fetchCandles(symbol, timeframe, 220),
      fetchCandles(symbol, htfFor(timeframe), 220),
    ])

    const params: BgScanParams = {
      ...(body as BgScanParams),
      symbol,
      timeframe,
      htfCandles: Array.isArray(htfCandles) && htfCandles.length > 0 ? htfCandles : undefined,
    }

    const signal = evaluateSignal(candles, params)
    res.json({ success: true, data: signal })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Failed to evaluate' })
  }
})

export default router
