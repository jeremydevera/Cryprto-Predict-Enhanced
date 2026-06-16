import AppShell from '@/components/layout/AppShell'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTradingStore } from '@/stores/tradingStore'

type Message = {
  role: 'user' | 'assistant'
  content: string
  time: string
}

export default function MarketChat() {
  const symbol  = useTradingStore((s) => s.symbol)
  const metrics = useTradingStore((s) => s.metrics)
  const geminiApiKey = useTradingStore((s) => s.geminiApiKey)

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm Claude, your AI Market Assistant. I can help you analyze ${symbol} or any other coin — ask me about technicals, ICT concepts, strategy setups, or market structure. What's on your mind?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      // Send full history so Claude has conversation memory
      const apiMessages = nextMessages.map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat/market-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          apiKey: geminiApiKey || undefined, // reuse the stored key field for now
          context: {
            symbol,
            rsi:    metrics.rsi,
            regime: metrics.htfBias,
            ema20:  metrics.ema20,
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.data,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message}. Make sure ANTHROPIC_API_KEY is set in your .env file.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                MarketChat AI
              </h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Powered by Claude Sonnet</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Context: {symbol}</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col shadow-2xl">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-4 max-w-[85%]', m.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border',
                    m.role === 'user'
                      ? 'bg-cyan-500/10 border-cyan-500/20'
                      : 'bg-orange-500/10 border-orange-500/20',
                  )}
                >
                  {m.role === 'user'
                    ? <User className="h-4 w-4 text-cyan-400" />
                    : <Bot className="h-4 w-4 text-orange-400" />}
                </div>
                <div className="space-y-1">
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                      m.role === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none',
                    )}
                  >
                    {m.content}
                  </div>
                  <div
                    className={cn(
                      'text-[9px] font-bold text-slate-500 uppercase tracking-tighter px-1',
                      m.role === 'user' ? 'text-right' : '',
                    )}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 max-w-[85%] animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-orange-400" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400/50 animate-bounce" />
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400/50 animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-400/50 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900/50 border-t border-slate-800">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Ask about market trends, ICT setups, order blocks, or specific coins… (Shift+Enter for newline)"
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-600 shadow-inner resize-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 bottom-3 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-orange-600 transition-all shadow-lg"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[9px] text-center text-slate-600 font-medium uppercase tracking-widest">
              AI analysis is for information only · Not financial advice
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
