import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useTradingStore } from '@/stores/tradingStore'
import { formatPrice } from '@/utils/format'

const dirVariant = (d: 'buy' | 'sell' | 'neutral') => {
  if (d === 'buy') return 'buy'
  if (d === 'sell') return 'sell'
  return 'neutral'
}

const symbolToName = (symbol?: string) => {
  if (!symbol) return null
  const base = symbol.replace(/(USDT|USD|USDC|BUSD)$/i, '')
  const key = base.toUpperCase()
  const map: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    BNB: 'BNB',
    XRP: 'XRP',
    ADA: 'Cardano',
    DOGE: 'Dogecoin',
    AVAX: 'Avalanche',
    MATIC: 'Polygon',
    DOT: 'Polkadot',
    LINK: 'Chainlink',
    TRX: 'TRON',
    TON: 'Toncoin',
    LTC: 'Litecoin',
    BCH: 'Bitcoin Cash',
    ATOM: 'Cosmos',
    NEAR: 'NEAR',
    APT: 'Aptos',
    ARB: 'Arbitrum',
    OP: 'Optimism',
  }
  return { base: key, name: map[key] ?? key }
}

export default function ChartSignalLog() {
  const signalLog = useTradingStore((s) => s.signalLog)
  const currentSymbol = useTradingStore((s) => s.symbol)
  const isConfluence = useTradingStore((s) => s.isConfluence)
  const minConfluence = useTradingStore((s) => s.minConfluence)
  const minQuality = useTradingStore((s) => s.minQuality)

  const items = signalLog
    .filter((s) => s.direction !== 'neutral')
    .filter((s) => (!isConfluence ? true : s.confluence >= minConfluence))
    .filter((s) => s.quality >= minQuality)
    .slice(0, 8)
  const fmt = (n?: number) => (typeof n === 'number' && Number.isFinite(n) ? formatPrice(n) : '—')

  return (
    <Card className="border-slate-800 bg-[#0B0E14] overflow-hidden">
      <CardHeader className="bg-[#161B22]/40 px-4 py-2.5 border-b border-slate-800/50">
        <CardTitle className="text-[14px] font-bold text-slate-300 uppercase tracking-wider">
          Signal Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">No signals yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div key={s.id} className="rounded-md border border-slate-800/50 bg-[#0d1117] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={dirVariant(s.direction)} className="text-[11px] font-black px-2 py-0.5">
                      {s.label}
                    </Badge>
                    {(() => {
                      const info = symbolToName(s.symbol ?? currentSymbol)
                      if (!info) return null
                      return (
                        <div className="text-[12px] font-bold text-slate-300">
                          {info.name}{' '}
                          <span className="font-mono text-slate-500">({s.symbol ?? currentSymbol})</span>
                        </div>
                      )
                    })()}
                    <div className="text-[14px] font-bold text-slate-400">
                      Q:<span className="text-amber-500 font-mono"> {s.quality}/8</span>
                    </div>
                    <div className="text-[14px] font-bold text-slate-400">
                      C:<span className="text-cyan-400 font-mono"> {s.confluence}</span>
                      {isConfluence && <span className="text-slate-500 font-mono">/{minConfluence}</span>}
                    </div>
                  </div>
                  <div className="font-mono text-[12px] font-bold text-slate-500">{s.time}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12px] text-slate-400">
                  <div>Entry: <span className="text-slate-200">{fmt(s.entry)}</span></div>
                  <div>SL: <span className="text-slate-200">{fmt(s.sl)}</span></div>
                  <div>TP1: <span className="text-slate-200">{fmt(s.tp1)}</span></div>
                  <div>TP2: <span className="text-slate-200">{fmt(s.tp2)}</span></div>
                </div>
                <div className="mt-2 text-[13px] text-slate-300 line-clamp-2">{s.notes}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

