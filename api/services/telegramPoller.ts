import { addSubscriber, removeSubscriber, isSubscribed } from './telegramSubscribers.js'

const POLL_INTERVAL_MS = 3000
let offset = 0
let polling = false
let timer: ReturnType<typeof setTimeout> | null = null

async function sendMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

async function poll() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !polling) return

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=10&allowed_updates=["message"]`
    )
    if (!res.ok) return
    const json = await res.json() as { ok: boolean; result: any[] }
    if (!json.ok || !Array.isArray(json.result)) return

    for (const update of json.result) {
      offset = update.update_id + 1
      const msg = update.message
      if (!msg || !msg.text) continue

      const chatId = String(msg.chat.id)
      const text = (msg.text as string).trim().toLowerCase()
      const firstName = msg.from?.first_name ?? 'there'

      if (text === '/start' || text.startsWith('/start ')) {
        if (addSubscriber(chatId)) {
          await sendMessage(chatId,
            `👋 Hello <b>${firstName}</b>! You're now subscribed to scanner signals.\n\nYou'll receive Telegram alerts whenever a signal is detected.\n\nSend /stop to unsubscribe.`
          )
          console.log(`[TelegramPoller] New subscriber: ${chatId} (${firstName})`)
        } else {
          await sendMessage(chatId,
            `✅ You're already subscribed, <b>${firstName}</b>! Signals will be sent to you automatically.\n\nSend /stop to unsubscribe.`
          )
        }
      } else if (text === '/stop' || text.startsWith('/stop ')) {
        if (removeSubscriber(chatId)) {
          await sendMessage(chatId,
            `👋 You've been unsubscribed, <b>${firstName}</b>. You won't receive any more signals.\n\nSend /start to subscribe again.`
          )
          console.log(`[TelegramPoller] Unsubscribed: ${chatId} (${firstName})`)
        } else {
          await sendMessage(chatId, `You're not currently subscribed. Send /start to subscribe.`)
        }
      } else if (text === '/status') {
        const subscribed = isSubscribed(chatId)
        await sendMessage(chatId,
          subscribed
            ? `✅ You are subscribed to signals. Send /stop to unsubscribe.`
            : `❌ You are not subscribed. Send /start to subscribe.`
        )
      }
    }
  } catch {
    // ignore network errors
  }

  if (polling) timer = setTimeout(poll, POLL_INTERVAL_MS)
}

export function startPoller() {
  if (polling) return
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.log('[TelegramPoller] No bot token — poller not started')
    return
  }
  polling = true
  console.log('[TelegramPoller] Started — users can send /start to subscribe')
  void poll()
}

export function stopPoller() {
  polling = false
  if (timer) { clearTimeout(timer); timer = null }
}
