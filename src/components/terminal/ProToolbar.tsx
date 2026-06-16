import { useTradingStore } from '@/stores/tradingStore'
import { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  Loader2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProToolbar() {
  const exchange = useTradingStore((s) => s.exchange)
  const symbol = useTradingStore((s) => s.symbol)
  const symbols = useTradingStore((s) => s.symbols)
  const setSymbols = useTradingStore((s) => s.setSymbols)
  const setExchange = useTradingStore((s) => s.setExchange)
  const setSymbol = useTradingStore((s) => s.setSymbol)
  const timeframe = useTradingStore((s) => s.timeframe)
  const setTimeframe = useTradingStore((s) => s.setTimeframe)
  const runAnalysis = useTradingStore((s) => s.runAnalysis)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSymbols = async () => {
      try {
        const response = await fetch(`/api/prices/symbols?exchange=${exchange}`)
        const json = await response.json()
        if (!cancelled && json.success && Array.isArray(json.data)) {
          const list = json.data as string[]
          setSymbols(list)
          if (list.length > 0 && !list.includes(symbol)) {
            setSymbol(list[0])
          }
        }
      } catch {
        void 0
      }
    }

    loadSymbols()
    return () => {
      cancelled = true
    }
  }, [exchange, setSymbols, setSymbol, symbol])

  const handleAnalyze = async () => {
    if (isAnalyzing) return
    setIsAnalyzing(true)
    runAnalysis()
    await new Promise((resolve) => setTimeout(resolve, 250))
    setIsAnalyzing(false)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 1200)
  }

  return (
    <div className="flex flex-col bg-[#0a0a0c] border-b border-slate-800 text-[14px] font-sans">
      <div className="flex items-center gap-6 px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-slate-100">Terminal</span>
        </div>

        <div className="flex items-center gap-5 flex-1">
          <ToolbarDropdown 
            label="EXCHANGE" 
            value={exchange.toUpperCase()} 
            options={['binance', 'bybit']}
            onSelect={(v) => setExchange(v as any)}
          />
          <ToolbarDropdown 
            label="COIN" 
            value={symbol.replace('USDT', ' / USDT')} 
            options={symbols}
            onSelect={(v) => setSymbol(v)}
          />
          <ToolbarDropdown 
            label="TIMEFRAME" 
            value={timeframe} 
            options={['1m', '5m', '15m', '1h', '4h', '1d']}
            onSelect={(v) => setTimeframe(v)}
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={cn(
            'font-black px-8 py-2.5 rounded-md shadow-lg transition-all flex items-center gap-2 min-w-[140px] justify-center text-base',
            showConfirmation ? 'bg-emerald-600 text-white shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20',
            isAnalyzing && 'opacity-70 cursor-not-allowed'
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : showConfirmation ? (
            <>
              <Check className="h-4 w-4" />
              Done
            </>
          ) : (
            'Analyze'
          )}
        </button>

      </div>
    </div>
  )

}

function ToolbarDropdown({ label, value, options, onSelect, className }: { 
  label: string, 
  value: string, 
  options?: string[],
  onSelect?: (v: string) => void,
  className?: string 
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredOptions = options?.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50) // Show top 50 matches for performance

  return (
    <div className={cn("flex items-center gap-2 group relative", className)}>
      <span className="text-slate-500 font-bold uppercase tracking-tighter text-[11px]">{label}</span>
      <div 
        onClick={() => {
          setOpen(!open)
          if (!open) setSearch('')
        }}
        className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded group-hover:border-slate-700 transition-colors cursor-pointer"
      >
        <span className="text-slate-200 font-bold text-sm">{value}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </div>

      {open && options && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[160px] bg-[#1c1c1f] border border-slate-800 rounded-md shadow-2xl z-[100] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2 py-1.5 border-b border-slate-800">
            <input 
              autoFocus
              type="text" 
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-[13px] outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
            {filteredOptions?.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onSelect?.(opt)
                  setOpen(false)
                }}
                className={cn(
                  "w-full px-4 py-2 text-left hover:bg-slate-800 transition-colors font-bold text-[13px]",
                  value.includes(opt) ? "text-blue-500 bg-blue-500/5" : "text-slate-300"
                )}
              >
                {opt}
              </button>
            ))}
            {filteredOptions?.length === 0 && (
              <div className="px-3 py-2 text-slate-600 italic text-[11px]">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
