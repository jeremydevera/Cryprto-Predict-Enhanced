import dotenv from 'dotenv'
import { getSubscribers } from './telegramSubscribers.js'
dotenv.config()

const TELEGRAM_API = 'https://api.telegram.org'

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toFixed(6)
}

async function sendToOne(token: string, chatId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

async function broadcast(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  const ids = getSubscribers()
  await Promise.all(ids.map(id => sendToOne(token, id, text)))
}

export async function sendTelegramSignal(signal: {
  symbol: string
  timeframe: string
  direction: 'buy' | 'sell'
  strategy: string
  quality: number
  confluence: number
  entry: number
  sl: number
  tp1: number
  tp2: number
  entryDistancePct: number
  detectedAt: number
}): Promise<void> {
  const dir   = signal.direction.toUpperCase()
  const emoji = signal.direction === 'buy' ? '🟢' : '🔴'
  const time  = new Date(signal.detectedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })

  const text = [
    `${emoji} <b>SCANNER SIGNAL</b>`,
    ``,
    `📊 <b>${signal.symbol}</b> | ${signal.timeframe} | <b>${dir}</b>`,
    `🎯 Strategy: ${signal.strategy}`,
    `⭐ Quality: ${signal.quality}/8 | Confluence: ${signal.confluence}`,
    ``,
    `💰 Entry: <code>${fmt(signal.entry)}</code>`,
    `🛑 SL: <code>${fmt(signal.sl)}</code>`,
    `✅ TP1: <code>${fmt(signal.tp1)}</code>`,
    `🎯 TP2: <code>${fmt(signal.tp2)}</code>`,
    ``,
    `📏 Distance from entry: ${signal.entryDistancePct.toFixed(2)}%`,
    `🕐 ${time}`,
  ].join('\n')

  await broadcast(text)
}

export async function sendTelegramText(message: string): Promise<void> {
  await broadcast(message)
}

export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}
