import { Router, type Request, type Response } from 'express'
import { ChatService } from '../services/chatService.js'

const router = Router()

router.post('/market-chat', async (req: Request, res: Response) => {
  const { messages, context, apiKey } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'messages array is required' })
  }

  try {
    const response = await ChatService.analyzeMarket(messages, context, apiKey)
    res.status(200).json({ success: true, data: response })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
