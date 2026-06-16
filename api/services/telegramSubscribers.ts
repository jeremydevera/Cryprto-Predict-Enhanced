import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_PATH = path.join(__dirname, '../../data/telegram_subscribers.json')

function ensureDir() {
  const dir = path.dirname(STORE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function load(): Set<string> {
  try {
    ensureDir()
    if (!fs.existsSync(STORE_PATH)) return new Set()
    const raw = fs.readFileSync(STORE_PATH, 'utf-8')
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function save(ids: Set<string>) {
  ensureDir()
  fs.writeFileSync(STORE_PATH, JSON.stringify([...ids], null, 2), 'utf-8')
}

const subscribers = load()

// Always include the owner chat ID from .env if set
const ownerChatId = process.env.TELEGRAM_CHAT_ID
if (ownerChatId) subscribers.add(ownerChatId)

export function getSubscribers(): string[] {
  return [...subscribers]
}

export function addSubscriber(chatId: string): boolean {
  if (subscribers.has(chatId)) return false
  subscribers.add(chatId)
  save(subscribers)
  return true
}

export function removeSubscriber(chatId: string): boolean {
  if (!subscribers.has(chatId)) return false
  subscribers.delete(chatId)
  save(subscribers)
  return true
}

export function isSubscribed(chatId: string): boolean {
  return subscribers.has(chatId)
}

export function subscriberCount(): number {
  return subscribers.size
}
