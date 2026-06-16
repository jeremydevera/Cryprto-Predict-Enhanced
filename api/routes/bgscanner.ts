import { Router, type Request, type Response } from 'express'
import { bgScanner } from '../services/backgroundScanner.js'
import { sendTelegramSignal } from '../services/telegramService.js'
import { paperTrader } from '../services/paperTradingService.js'
import { mexcTrader } from '../services/mexcTrader.js'

const router = Router()

router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: bgScanner.getStatus() })
})

// True scanner active-time segments (unix seconds) — used by the backtest parity check as the
// real "when was live actually trading" windows, instead of inferring from trades.
router.get('/uptime', (_req: Request, res: Response) => {
  res.json({ success: true, data: { segments: bgScanner.getUptimeSegments() } })
})

router.post('/start', (req: Request, res: Response) => {
  const s = req.body
  if (s && typeof s === 'object') bgScanner.updateSettings(s)
  bgScanner.start()
  res.json({ success: true, data: bgScanner.getStatus() })
})

router.post('/stop', (_req: Request, res: Response) => {
  bgScanner.stop()
  res.json({ success: true, data: bgScanner.getStatus() })
})

router.post('/settings', (req: Request, res: Response) => {
  bgScanner.updateSettings(req.body)
  res.json({ success: true, data: bgScanner.getStatus() })
})

// Frontend scanner sends signals here → backend forwards to Telegram + paper trading
router.post('/notify', async (req: Request, res: Response) => {
  try {
    await sendTelegramSignal(req.body)
    paperTrader.createOrder(req.body)
    mexcTrader.placeOrder(req.body as any)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
