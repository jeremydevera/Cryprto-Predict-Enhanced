import { Router, type Request, type Response } from 'express'
import { bybitTrader } from '../services/bybitTrader.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: bybitTrader.getStatus() })
})

router.post('/settings', (req: Request, res: Response) => {
  bybitTrader.updateSettings(req.body)
  res.json({ success: true, data: bybitTrader.getStatus() })
})

router.get('/account', async (_req: Request, res: Response) => {
  try {
    const result = await bybitTrader.fetchAccountInfo()
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Unknown error' })
  }
})

router.post('/test-connection', async (_req: Request, res: Response) => {
  try {
    const result = await bybitTrader.testConnection()
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? 'Unknown error' })
  }
})

router.post('/remove-trade', (req: Request, res: Response) => {
  const { id } = req.body
  if (id) bybitTrader.removeOpenTrade(id)
  res.json({ success: true })
})

export default router
