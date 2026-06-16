/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import priceRoutes from './routes/prices.js'
import chatRoutes from './routes/chat.js'
import bgscannerRoutes from './routes/bgscanner.js'
import scannerRoutes from './routes/scanner.js'
import autotraderRoutes from './routes/autotrader.js'
import mexcTraderRoutes from './routes/mexcTrader.js'
import paperTradingRoutes from './routes/paperTrading.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/prices', priceRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/bgscanner', bgscannerRoutes)
app.use('/api/scanner', scannerRoutes)
app.use('/api/autotrader', autotraderRoutes)
app.use('/api/mexc-trader', mexcTraderRoutes)
app.use('/api/paper-trading', paperTradingRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  void next
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    path: req.path,
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
