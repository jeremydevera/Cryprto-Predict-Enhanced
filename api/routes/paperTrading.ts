import { Router, type Request, type Response } from 'express'
import { paperTrader } from '../services/paperTradingService.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: paperTrader.getStatus() })
})

router.post('/settings', (req: Request, res: Response) => {
  paperTrader.updateSettings(req.body)
  res.json({ success: true, data: paperTrader.getStatus() })
})

router.post('/sync', async (_req: Request, res: Response) => {
  try {
    await paperTrader.sync()
    res.json({ success: true, data: paperTrader.getStatus() })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.delete('/orders/:id', (req: Request, res: Response) => {
  const ok = paperTrader.cancelOrder(req.params.id)
  res.json({ success: ok })
})

router.post('/positions/:id/close', (req: Request, res: Response) => {
  const ok = paperTrader.closePosition(req.params.id, req.body?.price)
  res.json({ success: ok })
})

router.post('/reset', (_req: Request, res: Response) => {
  paperTrader.reset()
  res.json({ success: true })
})

export default router
