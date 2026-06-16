import { Router, type Request, type Response } from 'express'
import { mexcTrader } from '../services/mexcTrader.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: mexcTrader.getStatus() })
})

router.post('/settings', (req: Request, res: Response) => {
  const result = mexcTrader.updateSettings(req.body)
  if (!result.ok) return res.status(400).json({ success: false, error: result.errors.join('; ') })
  res.json({ success: true, data: mexcTrader.getStatus() })
})

router.get('/account', async (_req: Request, res: Response) => {
  try {
    const result = await mexcTrader.fetchAccountInfo()
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Unknown error' })
  }
})

router.post('/test-connection', async (_req: Request, res: Response) => {
  try {
    const result = await mexcTrader.testConnection()
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Unknown error' })
  }
})

router.post('/remove-trade', (req: Request, res: Response) => {
  const { id } = req.body
  if (id) mexcTrader.removeOpenTrade(id)
  res.json({ success: true })
})

router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await mexcTrader.syncOpenTrades()
    res.json({ success: true, data: { ...result, status: mexcTrader.getStatus() } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Sync failed' })
  }
})

router.get('/closed-pnl', async (req: Request, res: Response) => {
  try {
    const pageSize  = req.query.pageSize  ? Number(req.query.pageSize)  : undefined
    const maxTrades = req.query.maxTrades ? Number(req.query.maxTrades) : undefined
    const result = await mexcTrader.fetchClosedPnl({ pageSize, maxTrades })
    if (!result.ok) return res.status(400).json({ success: false, error: result.message })
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Failed to fetch closed P&L' })
  }
})

router.post('/close-position', async (req: Request, res: Response) => {
  try {
    const { symbol, side, vol, openType, positionId } = req.body ?? {}
    const result = await mexcTrader.closePosition({
      symbol: String(symbol ?? ''),
      side: String(side ?? ''),
      vol: Number(vol),
      openType: openType === 1 || openType === 2 ? openType : undefined,
      positionId: positionId ? String(positionId) : undefined,
    })
    if (!result.ok) return res.status(400).json({ success: false, error: result.message })
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Close failed' })
  }
})

export default router
