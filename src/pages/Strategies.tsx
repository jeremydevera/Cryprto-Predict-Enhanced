import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { IMPLEMENTED_STRATEGIES, STRATEGIES, useTradingStore } from '@/stores/tradingStore'
import { useMemo, useState } from 'react'

// Effective-timeframe guidance per strategy, shown in the ⓘ modal.
const STRATEGY_INFO: Record<string, { best: string; why: string; avoid?: string }> = {
  'Elite Context Breakout': {
    best: '15m – 1h',
    why: 'Breakout entries qualified by higher-timeframe structure. Intraday TFs give enough breakouts to filter while the HTF context (4h/1d EMA + structure) stays meaningful.',
    avoid: '1d — too few breakout events per window; 1m–5m — context gates lag the move.',
  },
  'Elite Retest Reversal': {
    best: '15m – 1h',
    why: 'Needs a breakout, then a measurable retest leg. That two-phase structure forms cleanest on intraday bars during active sessions (London/NY overlap).',
    avoid: '4h+ — retest windows span days and the session gate thins signals further.',
  },
  'Breakout Retest': {
    best: '15m – 1h',
    why: 'Classic break-then-retest continuation. 1h gives the steadiest retests; 15m gives more setups at the cost of noise.',
    avoid: '1m–5m — the tight 0.5×ATR stop sits inside normal wick range and gets hunted.',
  },
  'Confirmation Model': {
    best: '5m – 15m',
    why: 'ICT-style sweep + CISD + FVG entry. The A+ grade (quality 7) is only reachable on 1m/5m/15m where the iFVG confirmation counts; on 1h+ max quality drops to 6.',
    avoid: '1h+ — structure goes stale faster than the model re-anchors; quality ceiling drops.',
  },
  'FluxGate Dual Engine': {
    best: '5m – 1h',
    why: 'Session-gated momentum/structure hybrid. The session gate keys off each bar\'s open hour, so it needs timeframes with many bars per session.',
    avoid: '4h/1d — the session gate rejects all 1d bars and ~5 of 6 4h bars. Effectively dead there until redesigned.',
  },
  'Supertrend + RelVol': {
    best: '1h – 4h',
    why: 'Trend-following ATR flip with volume + HTF EMA confirmation. Crypto trends are cleanest on 1h/4h; relative-volume spikes actually mean something there.',
    avoid: '1m–15m — ATR flips whipsaw in chop and fees/slippage eat the small per-trade moves at leverage.',
  },
  'BB Stoch S/D': {
    best: '15m – 1h',
    why: 'Mean reversion at supply/demand zones inside a ranging regime (ADX-gated). Intraday ranges develop full swings band-to-band, giving the reversion room to pay.',
    avoid: 'Strong trends (the ADX gate blocks them by design) and 4h/1d where qualifying bars are rare.',
  },
  'Squeeze Momentum': {
    best: '15m – 4h',
    why: 'Volatility-compression breakout (TTM squeeze). Compression→expansion cycles are robust across intraday-to-swing timeframes; 1h is the sweet spot.',
    avoid: '1m–5m — squeeze fires constantly on noise; most releases are fakeouts.',
  },
}

export default function Strategies() {
  const enabledStrategies = useTradingStore((s) => s.enabledStrategies)
  const saveEnabledStrategies = useTradingStore((s) => s.saveEnabledStrategies)
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const setStrategy = useTradingStore((s) => s.setStrategy)

  const [draftEnabled, setDraftEnabled] = useState<string[]>(enabledStrategies)
  const [savedNonce, setSavedNonce] = useState(0)
  const [infoStrategy, setInfoStrategy] = useState<string | null>(null)

  const enabledSet = useMemo(() => new Set(draftEnabled), [draftEnabled])
  const allEnabled = enabledSet.size === STRATEGIES.length

  const toggle = (name: string) => {
    setDraftEnabled((prev) => {
      const s = new Set(prev)
      if (s.has(name)) s.delete(name)
      else {
        s.add(name)
      }
      return Array.from(s)
    })
  }

  const toggleAll = () => {
    const next = allEnabled ? [] : [...STRATEGIES]
    setDraftEnabled(next)
  }

  const hasGhostSelected = draftEnabled.some((s) => !IMPLEMENTED_STRATEGIES.has(s))

  const save = () => {
    if (draftEnabled.length === 0) return
    saveEnabledStrategies(draftEnabled)
    setSavedNonce((n) => n + 1)
  }

  const columns = useMemo(() => {
    const mid = Math.ceil(STRATEGIES.length / 2)
    return [STRATEGIES.slice(0, mid), STRATEGIES.slice(mid)]
  }, [])

  const info = infoStrategy ? STRATEGY_INFO[infoStrategy] : null

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-slate-100">Strategies</div>
            <div className="text-xs text-slate-500">
              All strategies are active and generate signals.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">Active Strategy:</div>
            <select
              value={selectedStrategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200"
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" className="h-9 border-slate-800" onClick={toggleAll}>
            {allEnabled ? 'Disable All' : 'Enable All'}
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Enabled In Confluence</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {columns.map((col, idx) => (
                <div key={idx} className="space-y-2">
                  {col.map((name) => {
                    const checked = enabledSet.has(name)
                    return (
                      <button
                        key={name}
                        onClick={() => toggle(name)}
                        className="flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{name}</span>
                          {IMPLEMENTED_STRATEGIES.has(name) ? (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-900/60 text-emerald-400 border border-emerald-800">LIVE</span>
                          ) : (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">SOON</span>
                          )}
                          {STRATEGY_INFO[name] && (
                            <span
                              role="button"
                              tabIndex={0}
                              title="Effective timeframes"
                              onClick={(e) => { e.stopPropagation(); setInfoStrategy(name) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setInfoStrategy(name) } }}
                              className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] font-bold text-slate-400 hover:border-sky-500 hover:text-sky-400"
                            >
                              i
                            </span>
                          )}
                        </div>
                        <span
                          className={
                            checked
                              ? 'h-4 w-4 rounded-sm bg-blue-600'
                              : 'h-4 w-4 rounded-sm border border-slate-700'
                          }
                        />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {hasGhostSelected && (
              <div className="mt-4 rounded-md border border-amber-800/60 bg-amber-900/20 px-3 py-2 text-xs text-amber-400">
                Some selected strategies are not yet implemented and will not generate signals.
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {draftEnabled.length === 0 ? 'Select at least 1 strategy.' : `${draftEnabled.length} selected.`}
              </div>
              <div className="flex items-center gap-2">
                {savedNonce > 0 && <div className="text-xs font-mono text-emerald-400">Saved</div>}
                <Button
                  className="h-10 px-6 font-bold"
                  onClick={save}
                  disabled={draftEnabled.length === 0}
                >
                  Save Strategy Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Timeframe info modal ── */}
      {infoStrategy && info && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setInfoStrategy(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-100">{infoStrategy}</h2>
              <button
                onClick={() => setInfoStrategy(null)}
                className="rounded px-2 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Best timeframes</div>
                <div className="mt-0.5 font-mono text-base font-bold text-emerald-400">{info.best}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Why</div>
                <p className="mt-0.5 leading-relaxed text-slate-300">{info.why}</p>
              </div>
              {info.avoid && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Avoid</div>
                  <p className="mt-0.5 leading-relaxed text-amber-400/90">{info.avoid}</p>
                </div>
              )}
              <p className="border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">
                Guidance, not a rule — validate any timeframe with a backtest profile before trading it live.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
