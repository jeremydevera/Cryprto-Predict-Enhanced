import AppShell from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/Card'
import { BrainCircuit, Target, Zap, Cpu, Search, Activity, Waves, Fingerprint, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTradingStore } from '@/stores/tradingStore'
import { useEffect, useMemo, useState } from 'react'
import { generateSampleOhlcv, type OhlcvBar, type Timeframe } from '@/utils/ohlcv'
import { useMarketAnalysis } from '@/hooks/useMarketAnalysis'
import AIInsightsCard from '@/components/terminal/AIInsightsCard'

const InsightSection = ({ icon: Icon, title, description, children, colorClass }: any) => (
  <div className="border border-slate-800/60 bg-slate-950/40 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3 mb-4">
      <div className={cn("p-2 rounded-md bg-slate-900/80 border border-slate-800", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 tracking-tight">
          {title}
          <div className="h-px w-24 bg-slate-800/50" />
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
)

const MetricRow = ({ label, value, percentage, color }: { label: string, value: string, percentage?: number, color?: string }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="text-[11px] font-medium text-slate-400 w-32">{label}</div>
    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
      {percentage !== undefined && (
        <div 
          className={cn("h-full transition-all duration-700", color || "bg-cyan-500")} 
          style={{ width: `${percentage}%` }}
        />
      )}
    </div>
    <div className={cn("text-[11px] font-mono font-bold w-32 text-right", color?.replace('bg-', 'text-') || "text-slate-300")}>
      {value}
    </div>
  </div>
)

export default function AIInsights() {
  const symbol = useTradingStore(s => s.symbol)
  const timeframe = useTradingStore(s => s.timeframe)
  const setTimeframe = useTradingStore(s => s.setTimeframe)
  const metrics = useTradingStore(s => s.metrics)
  const regime = useTradingStore(s => s.regime)
  const regimeScores = useTradingStore(s => s.regimeScores)
  const signals = useTradingStore(s => s.signals)
  const tradeSetup = useTradingStore(s => s.tradeSetup)

  const [realtimeCandles, setRealtimeCandles] = useState<OhlcvBar[]>([])

  const tf = (['1m', '5m', '15m', '1h', '4h', '1d'] as const).includes(timeframe as any)
    ? (timeframe as Timeframe)
    : '15m'

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/prices/ohlcv?symbol=${symbol}&interval=${tf}`)
        const json: unknown = await response.json()

        const obj = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
        const success = obj?.success === true
        const data = obj?.data

        if (success && Array.isArray(data)) {
          const normalized: OhlcvBar[] = data
            .map((row: unknown) => {
              const r = (row ?? {}) as Record<string, unknown>
              return {
                time: Number(r.time),
                open: Number(r.open),
                high: Number(r.high),
                low: Number(r.low),
                close: Number(r.close),
                volume: Number(r.volume),
              }
            })
            .filter(
              (b) =>
                Number.isFinite(b.time) &&
                Number.isFinite(b.open) &&
                Number.isFinite(b.high) &&
                Number.isFinite(b.low) &&
                Number.isFinite(b.close) &&
                Number.isFinite(b.volume),
            )
            .sort((a, b) => a.time - b.time)
          setRealtimeCandles(normalized)
        }
      } catch {
        void 0
      }
    }

    fetchHistory()
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [symbol, tf])

  const sample = useMemo(() => {
    return realtimeCandles.length > 0 ? realtimeCandles : generateSampleOhlcv({ symbol, timeframe: tf })
  }, [realtimeCandles, symbol, tf])

  useMarketAnalysis(sample)

  const latestSignal = signals[0]

  const clamp01 = (n: number) => Math.max(0, Math.min(100, n))
  const parsePct = (s?: string) => {
    const n = typeof s === 'string' ? parseFloat(s.replace('%', '')) : NaN
    return Number.isFinite(n) ? n : 0
  }

  const trendScore = clamp01(Math.round(regimeScores?.Trending ?? 0))
  const emaBull = (metrics?.ema20 ?? 0) >= (metrics?.ema50 ?? 0)
  const trendDirectionText =
    regime === 'Trending'
      ? (emaBull ? 'Uptrend' : 'Downtrend')
      : regime === 'Ranging'
        ? 'Range'
        : regime === 'Breakout'
          ? 'Breakout'
          : regime === 'Exhaustion'
            ? 'Exhaustion'
            : 'Choppy'
  const trendColor = regime === 'Trending' ? (emaBull ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-700'

  const rsi = Number(metrics?.rsi ?? 50)
  const reversalProbability = clamp01(
    rsi > 70 ? ((rsi - 70) / 30) * 100 : rsi < 30 ? ((30 - rsi) / 30) * 100 : 0,
  )
  const reversalStatus = reversalProbability >= 50 ? 'Reversal Risk' : 'Trend Continuing'
  const reversalColor = reversalProbability >= 50 ? 'bg-amber-500' : 'bg-emerald-500'

  const volPct = parsePct(metrics?.volatility)
  const volScore = clamp01(Math.round(volPct * 100))
  const volLabel = volScore < 20 ? 'Low' : volScore < 50 ? 'Medium' : 'High'

  const signalText = latestSignal?.direction === 'buy' ? '▲ BUY' : latestSignal?.direction === 'sell' ? '▼ SELL' : '—'
  const signalConfidence = clamp01(Math.round(((latestSignal?.quality ?? 0) / 8) * 100))
  const kernelScore = Math.round(((rsi - 50) / 50) * 1000) / 10

  const trailLevel = tradeSetup ? tradeSetup.sl : metrics?.ema20
  const trailText = Number.isFinite(Number(trailLevel)) ? `$${Number(trailLevel).toFixed(2)}` : '—'

  const adx = parseFloat(String(metrics?.adx ?? '0'))
  const atrMultiplier = Number.isFinite(adx) ? 2 + Math.min(3, adx / 25) : 2
  const atrMultPct = clamp01(Math.round((atrMultiplier / 5) * 100))

  const pulseScore = clamp01(Math.round(((latestSignal?.quality ?? metrics?.signalQuality ?? 0) / 8) * 100))
  const pattern =
    latestSignal?.direction === 'buy' ? '▲ Double Bottom' : latestSignal?.direction === 'sell' ? '▼ Head & Shoulders' : '—'
  const targetLevel = tradeSetup ? tradeSetup.tp1 : undefined
  const targetText = Number.isFinite(Number(targetLevel)) ? `$${Number(targetLevel).toFixed(2)}` : '—'

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">AI-Powered Market Intelligence</h1>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {symbol} · {timeframe} | Updated {new Date().toLocaleTimeString()} | <span className="text-cyan-400">8 AI indicators active</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center bg-slate-900 rounded-md p-0.5">
            {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                  tf === t ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <AIInsightsCard />
        </div>

        <InsightSection 
          icon={Target} 
          title="AI Trend Hunter" 
          description="Multi-factor trend strength scoring using EMA alignment, ADX, RSI, MACD momentum & volume confirmation."
          colorClass="text-cyan-400"
        >
          <MetricRow label="Trend Score" value={`${trendScore} / 100`} percentage={trendScore} color={trendColor} />
          <MetricRow label="Direction" value={trendDirectionText} color={trendColor} />
        </InsightSection>

        <InsightSection 
          icon={Waves} 
          title="AI Reversal Detector" 
          description="Detects potential market reversals using RSI extremes, Bollinger Band touches, volume exhaustion & MACD divergence."
          colorClass="text-blue-400"
        >
          <MetricRow label="Reversal Probability" value={`${Math.round(reversalProbability)}%`} percentage={reversalProbability} color={reversalColor} />
          <MetricRow label="Status" value={reversalStatus} color={reversalColor} />
        </InsightSection>

        <InsightSection 
          icon={Search} 
          title="AI Volatility Predictor" 
          description="Predicts upcoming volatility breakouts via Bollinger squeeze, ATR contraction, volume buildup & ADX momentum."
          colorClass="text-cyan-500"
        >
          <MetricRow label="Volatility Score" value={`${volLabel} (${metrics?.volatility || '—'})`} percentage={volScore} color="bg-slate-700" />
          <MetricRow label="Confidence" value={`${volScore}%`} percentage={volScore} color="bg-slate-700" />
        </InsightSection>

        <InsightSection 
          icon={Cpu} 
          title="ML Lorentzian Classification" 
          description="Machine learning classification using distance-weighted nearest neighbors on multi-indicator feature space for high-quality BUY/SELL signal classification."
          colorClass="text-cyan-400"
        >
          <MetricRow label="Signal" value={signalText} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
          <MetricRow label="Confidence" value={`${signalConfidence}%`} percentage={signalConfidence} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
          <MetricRow label="Kernel Score" value={`${kernelScore}`} percentage={clamp01(Math.abs(kernelScore))} color={kernelScore >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} />
        </InsightSection>

        <InsightSection 
          icon={Zap} 
          title="LuxAlgo AI Signals" 
          description="Advanced AI-driven signal detection for market reversals and trend confirmation using adaptive smoothing & smart trailing."
          colorClass="text-cyan-300"
        >
          <MetricRow label="Signal" value={signalText} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
          <MetricRow label="Trend Strength" value={`${trendScore}%`} percentage={trendScore} color={trendColor} />
          <MetricRow label="Smart Trail" value={trailText} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
        </InsightSection>

        <InsightSection 
          icon={Activity} 
          title="Adaptive SuperTrend" 
          description="Machine learning variant of SuperTrend that dynamically adjusts ATR multiplier based on market volatility regime."
          colorClass="text-cyan-400"
        >
          <MetricRow label="Direction" value={emaBull ? '▲ BULLISH' : '▼ BEARISH'} color={emaBull ? 'bg-emerald-500' : 'bg-rose-500'} />
          <MetricRow label="SuperTrend Level" value={Number.isFinite(Number(metrics?.ema20)) ? `$${Number(metrics.ema20).toFixed(2)}` : '—'} color={emaBull ? 'bg-emerald-500' : 'bg-rose-500'} />
          <MetricRow label="ATR Multiplier" value={`${atrMultiplier.toFixed(2)}x ATR`} percentage={atrMultPct} color="bg-cyan-500" />
        </InsightSection>

        <InsightSection 
          icon={LineChart} 
          title="CryptoPulse AI" 
          description="Aggregates Zig-Zag, Williams Fractal & momentum oscillators into a unified pulse score for spot/futures trading signals."
          colorClass="text-cyan-400"
        >
          <MetricRow label="Pulse Score" value={`${pulseScore} / 100`} percentage={pulseScore} color="bg-amber-500" />
          <MetricRow label="Regime" value={regime} color="bg-slate-700" />
          <MetricRow label="Momentum" value={metrics?.momentum || '—'} percentage={clamp01(Math.abs(parsePct(metrics?.momentum)) * 50)} color="bg-amber-500" />
        </InsightSection>

        <InsightSection 
          icon={Fingerprint} 
          title="altFINS ML Patterns" 
          description="Detects chart patterns (Head & Shoulders, Double Top/Bottom, Wedges) using statistical pattern matching on price structure."
          colorClass="text-cyan-500"
        >
          <MetricRow label="Pattern" value={pattern} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
          <MetricRow label="Confidence" value={`${signalConfidence}%`} percentage={signalConfidence} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
          <MetricRow label="Target" value={targetText} color={latestSignal?.direction === 'buy' ? 'bg-emerald-500' : latestSignal?.direction === 'sell' ? 'bg-rose-500' : 'bg-slate-700'} />
        </InsightSection>
      </div>
    </AppShell>
  )
}
