import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { FilterSettings } from '@/stores/tradingStore'
import type { StrategyEditorKey } from '@/stores/tradingStore'

type FilterBlockCounts = Record<string, number>

function Toggle({
  label,
  checked,
  onChange,
  desc,
  count,
  disabled,
  disabledReason,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  desc?: string
  count?: number
  disabled?: boolean
  disabledReason?: string
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`flex w-full items-start justify-between rounded-md border px-3 py-2 text-left transition-opacity ${
        disabled
          ? 'cursor-not-allowed border-slate-900 bg-slate-950 opacity-40'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-200">{label}</div>
          {disabled && (
            <div className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
              N/A
            </div>
          )}
          {!disabled && typeof count === 'number' && (
            <div className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              {count}
            </div>
          )}
        </div>
        {disabled && disabledReason
          ? <div className="text-xs text-slate-600">{disabledReason}</div>
          : desc ? <div className="text-xs text-slate-500">{desc}</div> : null}
      </div>
      <span className={checked && !disabled ? 'h-4 w-4 rounded-sm bg-blue-600' : 'h-4 w-4 rounded-sm border border-slate-700'} />
    </button>
  )
}

export function FilterForm({ viewedTab, draft, setDraft, filterBlockCounts = {} }: {
  viewedTab: StrategyEditorKey
  draft: FilterSettings
  setDraft: React.Dispatch<React.SetStateAction<FilterSettings>>
  filterBlockCounts?: FilterBlockCounts
}) {
  const isECB = viewedTab === 'ecb'
  const isERR = viewedTab === 'err'
  const isBR = viewedTab === 'br'
  const isCM = viewedTab === 'cm'
  const isFG = viewedTab === 'fg'
  const isST = viewedTab === 'st'
  const isBBSSD = viewedTab === 'bbssd'
  const isSqz = viewedTab === 'sqz'
  const showEssential = !isFG && !isBBSSD && !isST && !isSqz
  void isCM
  return (
    <>
        <Card className="border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Filter Toggles</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 pt-4 lg:grid-cols-2">
            {isBBSSD && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">BB Stoch S/D — Mean-Reversion Confluence</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Three-pillar mean-reversion model: price taps a key location (Supply/Demand zone → falls back to Order Block → then FVG), prints a Bollinger Band extreme, and Stochastic crosses out of overbought/oversold. Best for ranging/choppy regimes (ADX &lt; 30) on 15m–1h crypto.
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Toggle
                    label="Pillar 1: Require Location"
                    checked={draft.bbssdRequireZone ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireZone: v }))}
                    desc="Master gate for the location filter. ON: price must be at a structural level (S/D zone, and optionally OB/FVG — see fallback toggle). OFF: skip location entirely — signal can fire anywhere on the chart based on BB + Stoch + RSI alone."
                  />
                  <Toggle
                    label="Fresh Zones Only"
                    checked={draft.bbssdZoneFreshOnly ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdZoneFreshOnly: v }))}
                    disabled={!(draft.bbssdRequireZone ?? true)}
                    disabledReason="Enable Zone Tap"
                    desc="Reject zones already retested >2 times — fresh zones (0–2 retests) have higher reaction rate."
                  />
                  <Toggle
                    label="Allow OB / FVG Fallback"
                    checked={draft.bbssdAllowObFvgFallback ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdAllowObFvgFallback: v }))}
                    disabled={!(draft.bbssdRequireZone ?? true)}
                    disabledReason="Enable Pillar 1"
                    desc="Controls strictness of Pillar 1. ON: price qualifies if inside S/D zone OR Order Block OR unmitigated FVG (more signals). OFF: only S/D zones qualify — OB and FVG are ignored (fewer, higher-quality signals)."
                  />
                  <Toggle
                    label="Pillar 2: Require BB Band Tag"
                    checked={draft.bbssdRequireBBTag ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireBBTag: v }))}
                    desc="Hard gate: lower wick must touch/pierce BB lower (long) or upper wick must touch/pierce BB upper (short) within lookback window."
                  />
                  <Toggle
                    label="Require BB Rejection (close back inside)"
                    checked={draft.bbssdRequireBBReject ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireBBReject: v }))}
                    disabled={!(draft.bbssdRequireBBTag ?? true)}
                    disabledReason="Enable BB Band Tag"
                    desc="ON: bar must tag the band AND close back inside (rejection). OFF: tag-only — fires the moment price touches the band. Rejection mode boosts win rate by filtering knife-catches."
                  />
                  <Toggle
                    label="Pillar 3: Require Stoch Cross from Extreme"
                    checked={draft.bbssdRequireStochCross ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireStochCross: v }))}
                    desc="Hard gate: %K must cross %D up from <OS (long) or down from >OB (short). When OFF, only requires %K to have hit the OS/OB zone."
                  />
                  <Toggle
                    label="Require Reversal Candle"
                    checked={draft.bbssdRequireReversalCandle ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireReversalCandle: v }))}
                    desc="Hard gate: bullish hammer/engulfing for longs, bearish star/engulfing for shorts. Tighter signals at the cost of frequency."
                  />
                  <Toggle
                    label="Require Entry Confirmation (break prior bar)"
                    checked={draft.bbssdRequireEntryConfirm ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireEntryConfirm: v }))}
                    desc="ON: current bar's close must break the PRIOR bar's high (longs) or low (shorts) — same-bar price-action confirmation with no entry delay. Works on fast timeframes (5m/15m) without sacrificing entry speed."
                  />
                  <Toggle
                    label="Require HTF EMA200 Bias"
                    checked={draft.bbssdHtfEma200 ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdHtfEma200: v }))}
                    desc="Hard gate: longs only when HTF close > EMA200, shorts only when below. Macro trend filter."
                  />
                  <Toggle
                    label="Mean-Reversion Guard (Max ADX)"
                    checked={draft.bbssdUseMaxAdx ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdUseMaxAdx: v }))}
                    desc={`Reject signals when ADX(14) > ${(draft.bbssdMaxAdx ?? 22).toFixed(0)}. Mean reversion fails in strong trends.`}
                  />
                  <Toggle
                    label="Volume Confirmation"
                    checked={draft.bbssdUseVolume ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdUseVolume: v }))}
                    desc={`Hard gate: rejection candle volume ≥ ${(draft.bbssdMinVolumeRatio ?? 1.2).toFixed(2)}× SMA(20) of volume.`}
                  />
                  <Toggle
                    label="Truly Fresh Zones (0 retests)"
                    checked={draft.bbssdFreshZonesOnly ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdFreshZonesOnly: v }))}
                    disabled={!(draft.bbssdZoneFreshOnly ?? true)}
                    disabledReason="Enable Fresh Zones Only"
                    desc="Tightens 'Fresh Zones Only' from ≤2 retests to 0 retests. Untouched zones react ~2× harder than retested ones — fewer signals, higher quality."
                  />
                  <Toggle
                    label="Require RSI Divergence"
                    checked={draft.bbssdRequireRsiDiv ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireRsiDiv: v }))}
                    desc="Hard gate: bullish RSI divergence at the BB tag for longs, bearish divergence for shorts. One of the strongest mean-reversion confluences — major win-rate boost at the cost of frequency."
                  />
                  <Toggle
                    label="Require Liquidity Sweep"
                    checked={draft.bbssdRequireLiqSweep ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, bbssdRequireLiqSweep: v }))}
                    desc="Hard gate: a wick must sweep a recent swing low (longs) or swing high (shorts) within the last 20 bars and close back inside. The 'stop hunt + reversal' pattern — significantly raises the quality of S/D + BB rejection setups."
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Bollinger Bands</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Period</div>
                        <input type="number" min={5} step={1}
                          value={draft.bbssdLength ?? 20}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdLength: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Std Dev</div>
                        <input type="number" min={0.5} step={0.1}
                          value={draft.bbssdStdDev ?? 2.0}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStdDev: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Stochastic (%K, %D, Smooth)</div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">K Period</div>
                        <input type="number" min={3} step={1}
                          value={draft.bbssdStochK ?? 14}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStochK: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">D Period</div>
                        <input type="number" min={1} step={1}
                          value={draft.bbssdStochD ?? 3}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStochD: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Smooth</div>
                        <input type="number" min={1} step={1}
                          value={draft.bbssdStochSmooth ?? 3}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStochSmooth: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Oversold (long)</div>
                        <input type="number" min={5} max={49} step={1}
                          value={draft.bbssdStochOS ?? 20}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStochOS: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Overbought (short)</div>
                        <input type="number" min={51} max={95} step={1}
                          value={draft.bbssdStochOB ?? 80}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdStochOB: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">S/D Zone Detection</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Min Leg Strength (×ATR)</div>
                        <input type="number" min={1.0} step={0.1}
                          value={draft.bbssdMinLegAtr ?? 2.0}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdMinLegAtr: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Zone Tolerance (×ATR)</div>
                        <input type="number" min={0.05} step={0.05}
                          value={draft.bbssdZoneTolAtrMult ?? 0.3}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdZoneTolAtrMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                    <div className="text-xs text-slate-500">A demand/supply zone requires a tight base (≤3 bars, range ≤1.4×ATR) followed by a leg ≥ Min Leg×ATR away from the base.</div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Trigger / Regime</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Lookback Bars</div>
                        <input type="number" min={1} max={10} step={1}
                          value={draft.bbssdLookbackBars ?? 3}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdLookbackBars: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Max ADX</div>
                        <input type="number" min={15} max={50} step={1}
                          value={draft.bbssdMaxAdx ?? 22}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdMaxAdx: Number(e.target.value) }))}
                          disabled={!(draft.bbssdUseMaxAdx ?? true)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Min Volume Ratio</div>
                        <input type="number" min={0.5} step={0.05}
                          value={draft.bbssdMinVolumeRatio ?? 1.2}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdMinVolumeRatio: Number(e.target.value) }))}
                          disabled={!(draft.bbssdUseVolume ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Reversal Wick %</div>
                        <select
                          value={draft.bbssdRevWickPct ?? 70}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdRevWickPct: Number(e.target.value) }))}
                          disabled={!(draft.bbssdRequireReversalCandle ?? true)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                        >
                          <option value={50}>50% (loose)</option>
                          <option value={60}>60% (balanced)</option>
                          <option value={70}>70% (strict)</option>
                        </select>
                      </label>
                    </div>
                    <div className="text-xs text-slate-500">Lookback = how many recent bars to scan for BB tag and Stoch cross. Reversal Wick % = minimum wick length (lower wick for hammer / upper wick for shooting star) as fraction of candle range.</div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2 lg:col-span-2">
                    <div className="text-sm font-semibold text-slate-200">RSI Gates</div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Long RSI Min</div>
                        <input type="number" min={0} max={100} step={1}
                          value={draft.bbssdRsiLongMin ?? 30}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdRsiLongMin: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Long RSI Max</div>
                        <input type="number" min={0} max={100} step={1}
                          value={draft.bbssdRsiLongMax ?? 45}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdRsiLongMax: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Short RSI Min</div>
                        <input type="number" min={0} max={100} step={1}
                          value={draft.bbssdRsiShortMin ?? 55}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdRsiShortMin: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Short RSI Max</div>
                        <input type="number" min={0} max={100} step={1}
                          value={draft.bbssdRsiShortMax ?? 70}
                          onChange={(e) => setDraft((d) => ({ ...d, bbssdRsiShortMax: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                    <div className="text-xs text-slate-500">Hard gate: RSI must be within range. Tight defaults (30–45 long / 55–70 short) keep signals to actual oversold/overbought zones — biggest hidden win-rate lever.</div>
                  </div>
                </div>
              </div>
            )}
            {isFG && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">FluxGate Dual Engine — Gates</div>
                  <div className="mt-1 text-xs text-slate-500">9 hard gates (Guide-based). Cost/Execution use ATR-based proxies because spread/slippage and fills are not available in OHLCV.</div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Toggle
                    label="Gate 1: Regime (ADX)"
                    checked={draft.fgUseADX ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseADX: v }))}
                    desc={`Requires ADX(14) ≥ ${(draft.fgAdxMin ?? 22).toFixed(0)}`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">ADX Min</div>
                    <input
                      type="number"
                      min={5}
                      step={1}
                      value={draft.fgAdxMin ?? 22}
                      onChange={(e) => setDraft((d) => ({ ...d, fgAdxMin: Number(e.target.value) }))}
                      disabled={!(draft.fgUseADX ?? true)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <Toggle
                    label="Gate 2: Session (UTC)"
                    checked={draft.fgUseSession ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseSession: v }))}
                    desc={`Only allow signals between ${String(draft.fgSessionStartUtc ?? 8).padStart(2, '0')}:00–${String(draft.fgSessionEndUtc ?? 12).padStart(2, '0')}:00 UTC`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Session Start (UTC hour)</div>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        step={1}
                        value={draft.fgSessionStartUtc ?? 8}
                        onChange={(e) => setDraft((d) => ({ ...d, fgSessionStartUtc: Number(e.target.value) }))}
                        disabled={!(draft.fgUseSession ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Session End (UTC hour)</div>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        step={1}
                        value={draft.fgSessionEndUtc ?? 12}
                        onChange={(e) => setDraft((d) => ({ ...d, fgSessionEndUtc: Number(e.target.value) }))}
                        disabled={!(draft.fgUseSession ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <Toggle
                    label="Gate 4: Structure (HTF Zone)"
                    checked={draft.fgUseStructure ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseStructure: v }))}
                    desc={`Requires price within ${(draft.fgStructureTolAtrMult ?? 0.25).toFixed(2)}×ATR(HTF) of zone`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Zone Tolerance (ATR×)</div>
                    <input
                      type="number"
                      min={0.05}
                      step={0.05}
                      value={draft.fgStructureTolAtrMult ?? 0.25}
                      onChange={(e) => setDraft((d) => ({ ...d, fgStructureTolAtrMult: Number(e.target.value) }))}
                      disabled={!(draft.fgUseStructure ?? true)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <Toggle
                    label="Gate 5: Momentum Confirmation"
                    checked={draft.fgUseMomentum ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseMomentum: v }))}
                    desc="Uses Stochastic cross and/or RSI divergence"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Toggle
                      label="Stoch Cross"
                      checked={draft.fgUseStochCross ?? true}
                      onChange={(v) => setDraft((d) => ({ ...d, fgUseStochCross: v }))}
                      disabled={!(draft.fgUseMomentum ?? true)}
                      disabledReason="Enable Momentum gate"
                    />
                    <Toggle
                      label="RSI Divergence"
                      checked={draft.fgUseRsiDivergence ?? false}
                      onChange={(v) => setDraft((d) => ({ ...d, fgUseRsiDivergence: v }))}
                      disabled={!(draft.fgUseMomentum ?? true)}
                      disabledReason="Enable Momentum gate"
                    />
                  </div>
                  <Toggle
                    label="Stoch must be extreme"
                    checked={draft.fgStochExtreme ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, fgStochExtreme: v }))}
                    disabled={!(draft.fgUseMomentum ?? true) || !(draft.fgUseStochCross ?? true)}
                    disabledReason="Enable Momentum + Stoch"
                    desc={`Cross must originate from < ${(draft.fgStochOS ?? 30).toFixed(0)} (long) or > ${(draft.fgStochOB ?? 70).toFixed(0)} (short)`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Stoch Oversold</div>
                      <input
                        type="number"
                        min={1}
                        max={49}
                        step={1}
                        value={draft.fgStochOS ?? 30}
                        onChange={(e) => setDraft((d) => ({ ...d, fgStochOS: Number(e.target.value) }))}
                        disabled={!(draft.fgStochExtreme ?? false) || !(draft.fgUseMomentum ?? true) || !(draft.fgUseStochCross ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Stoch Overbought</div>
                      <input
                        type="number"
                        min={51}
                        max={99}
                        step={1}
                        value={draft.fgStochOB ?? 70}
                        onChange={(e) => setDraft((d) => ({ ...d, fgStochOB: Number(e.target.value) }))}
                        disabled={!(draft.fgStochExtreme ?? false) || !(draft.fgUseMomentum ?? true) || !(draft.fgUseStochCross ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>
                  <Toggle
                    label="Gate 6: Volume Confirmation"
                    checked={draft.fgUseVolume ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseVolume: v }))}
                    desc={`Requires volume ≥ ${(draft.fgMinVolumeRatio ?? 1.5).toFixed(2)}×SMA(20)`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Min Volume Ratio</div>
                      <input
                        type="number"
                        min={0.5}
                        step={0.05}
                        value={draft.fgMinVolumeRatio ?? 1.5}
                        onChange={(e) => setDraft((d) => ({ ...d, fgMinVolumeRatio: Number(e.target.value) }))}
                        disabled={!(draft.fgUseVolume ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <Toggle
                      label="Require Expanding Volume"
                      checked={draft.fgRequireVolumeExpanding ?? false}
                      onChange={(v) => setDraft((d) => ({ ...d, fgRequireVolumeExpanding: v }))}
                      disabled={!(draft.fgUseVolume ?? true)}
                      disabledReason="Enable Volume gate"
                    />
                  </div>
                  <Toggle
                    label="Gate 8: Correlation (HTF EMA200)"
                    checked={draft.fgUseHTFAlign ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseHTFAlign: v }))}
                    desc="Blocks longs when HTF is bearish; blocks shorts when HTF is bullish"
                  />
                  <Toggle
                    label="Gate 7: Cost (proxy)"
                    checked={draft.fgUseCost ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseCost: v }))}
                    desc="Uses candle range vs ATR as a slippage/spread proxy"
                  />
                  <Toggle
                    label="Gate 9: Execution (proxy)"
                    checked={draft.fgUseExecution ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, fgUseExecution: v }))}
                    desc="Uses recent average candle range vs ATR as a fills-quality proxy"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Engine Sensitivity</div>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Base Length (Long)</div>
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={draft.fgBaseLenLong ?? 34}
                        onChange={(e) => setDraft((d) => ({ ...d, fgBaseLenLong: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Base Length (Short)</div>
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={draft.fgBaseLenShort ?? 34}
                        onChange={(e) => setDraft((d) => ({ ...d, fgBaseLenShort: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Threshold K (Long)</div>
                      <input
                        type="number"
                        min={0.2}
                        step={0.1}
                        value={draft.fgThresholdKLong ?? 1.0}
                        onChange={(e) => setDraft((d) => ({ ...d, fgThresholdKLong: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Threshold K (Short)</div>
                      <input
                        type="number"
                        min={0.2}
                        step={0.1}
                        value={draft.fgThresholdKShort ?? 1.0}
                        onChange={(e) => setDraft((d) => ({ ...d, fgThresholdKShort: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                    <Toggle
                      label="Require Threshold Cross"
                      checked={draft.fgUseCross ?? true}
                      onChange={(v) => setDraft((d) => ({ ...d, fgUseCross: v }))}
                      desc="When OFF, allows signals as long as score stays beyond threshold (more frequent)"
                    />
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Driver Windows</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Guide EMA Len</div>
                        <input
                          type="number"
                          min={3}
                          step={1}
                          value={draft.fgGuideEmaLen ?? 20}
                          onChange={(e) => setDraft((d) => ({ ...d, fgGuideEmaLen: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Vol Len</div>
                        <input
                          type="number"
                          min={5}
                          step={1}
                          value={draft.fgVolLen ?? 20}
                          onChange={(e) => setDraft((d) => ({ ...d, fgVolLen: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Persistence Len</div>
                        <input
                          type="number"
                          min={3}
                          step={1}
                          value={draft.fgPersLen ?? 10}
                          onChange={(e) => setDraft((d) => ({ ...d, fgPersLen: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Curvature Len</div>
                        <input
                          type="number"
                          min={5}
                          step={1}
                          value={draft.fgCurvLen ?? 20}
                          onChange={(e) => setDraft((d) => ({ ...d, fgCurvLen: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isST && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Supertrend + Relative Volume (rVol)</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Supertrend is the trend gate. rVol filters for participation. Optional kernel smoothing is one-sided (non-repainting).
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Toggle
                    label="Require Supertrend flip"
                    checked={draft.stRequireFlip ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, stRequireFlip: v }))}
                    desc="When OFF, allows entries while Supertrend stays bullish/bearish (more trades)."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">ATR Period</div>
                      <input
                        type="number"
                        min={2}
                        step={1}
                        value={draft.stAtrPeriod ?? 10}
                        onChange={(e) => setDraft((d) => ({ ...d, stAtrPeriod: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">ATR Mult</div>
                      <input
                        type="number"
                        min={0.5}
                        step={0.1}
                        value={draft.stAtrMult ?? 3}
                        onChange={(e) => setDraft((d) => ({ ...d, stAtrMult: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="Use Relative Volume (rVol)"
                    checked={draft.stUseRelVol ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseRelVol: v }))}
                    desc={`Requires volume ≥ ${(draft.stRelVolMin ?? 1.5).toFixed(2)}×SMA(${(draft.stRelVolLen ?? 20).toFixed(0)})`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">rVol Len</div>
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={draft.stRelVolLen ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, stRelVolLen: Number(e.target.value) }))}
                        disabled={!(draft.stUseRelVol ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">rVol Min</div>
                      <input
                        type="number"
                        min={0.5}
                        step={0.05}
                        value={draft.stRelVolMin ?? 1.5}
                        onChange={(e) => setDraft((d) => ({ ...d, stRelVolMin: Number(e.target.value) }))}
                        disabled={!(draft.stUseRelVol ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="Use Kernel Smoothing"
                    checked={draft.stUseKernel ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseKernel: v }))}
                    desc="Smooths HL2 before Supertrend bands."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Kernel Lookback</div>
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={draft.stKernelLookback ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, stKernelLookback: Number(e.target.value) }))}
                        disabled={!(draft.stUseKernel ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Kernel Bandwidth</div>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={draft.stKernelBandwidth ?? 6}
                        onChange={(e) => setDraft((d) => ({ ...d, stKernelBandwidth: Number(e.target.value) }))}
                        disabled={!(draft.stUseKernel ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="HTF EMA Bias Filter"
                    checked={draft.stUseHTFAlign ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseHTFAlign: v }))}
                    desc={`Longs only when HTF close > EMA${(draft.stHtfEmaLen ?? 200).toFixed(0)}; shorts only when below.`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">HTF EMA Len</div>
                    <input
                      type="number"
                      min={20}
                      step={10}
                      value={draft.stHtfEmaLen ?? 200}
                      onChange={(e) => setDraft((d) => ({ ...d, stHtfEmaLen: Number(e.target.value) }))}
                      disabled={!(draft.stUseHTFAlign ?? true)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <Toggle
                    label="HTF EMA Slope Gate"
                    checked={draft.stUseHtfEmaSlope ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseHtfEmaSlope: v }))}
                    desc={`Longs only when HTF EMA slope > ${(draft.stHtfEmaSlopeMinPctPerBar ?? 0).toFixed(3)}%/bar; shorts only when slope < −that.`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Slope Lookback (bars)</div>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={draft.stHtfEmaSlopeLookback ?? 3}
                        onChange={(e) => setDraft((d) => ({ ...d, stHtfEmaSlopeLookback: Number(e.target.value) }))}
                        disabled={!(draft.stUseHtfEmaSlope ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Min Slope (%/bar)</div>
                      <input
                        type="number"
                        min={0}
                        step={0.001}
                        value={draft.stHtfEmaSlopeMinPctPerBar ?? 0}
                        onChange={(e) => setDraft((d) => ({ ...d, stHtfEmaSlopeMinPctPerBar: Number(e.target.value) }))}
                        disabled={!(draft.stUseHtfEmaSlope ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="EMA Distance Gate"
                    checked={draft.stUseEmaDistance ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseEmaDistance: v }))}
                    desc={`Requires |price − HTF EMA| ≥ ${(draft.stEmaDistAtrMin ?? 0.6).toFixed(2)}×ATR(${(draft.stAtrPeriod ?? 10).toFixed(0)})`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Min Distance (ATR)</div>
                    <input
                      type="number"
                      min={0}
                      step={0.05}
                      value={draft.stEmaDistAtrMin ?? 0.6}
                      onChange={(e) => setDraft((d) => ({ ...d, stEmaDistAtrMin: Number(e.target.value) }))}
                      disabled={!(draft.stUseEmaDistance ?? false)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <Toggle
                    label="Impulse Candle Gate"
                    checked={draft.stUseImpulse ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseImpulse: v }))}
                    desc={`Requires body ≥ ${(draft.stImpulseBodyMinPct ?? 55).toFixed(0)}% of range and close near extreme (wick ≤ ${(draft.stImpulseWickMaxPct ?? 30).toFixed(0)}%)`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Body Min %</div>
                      <input
                        type="number"
                        min={10}
                        max={95}
                        step={1}
                        value={draft.stImpulseBodyMinPct ?? 55}
                        onChange={(e) => setDraft((d) => ({ ...d, stImpulseBodyMinPct: Number(e.target.value) }))}
                        disabled={!(draft.stUseImpulse ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Wick Max %</div>
                      <input
                        type="number"
                        min={5}
                        max={90}
                        step={1}
                        value={draft.stImpulseWickMaxPct ?? 30}
                        onChange={(e) => setDraft((d) => ({ ...d, stImpulseWickMaxPct: Number(e.target.value) }))}
                        disabled={!(draft.stUseImpulse ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="KDE Regime Gate"
                    checked={draft.stUseKdeRegime ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseKdeRegime: v }))}
                    desc={`Allows trades when return concentration ≤ ${(draft.stKdeRegimeMaxConcentration ?? 0.55).toFixed(2)} (LB ${(draft.stKdeRegimeLookback ?? 200).toFixed(0)}, BW ${(draft.stKdeRegimeBandwidth ?? 0.8).toFixed(2)})`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KDE LB (Regime)</div>
                      <input
                        type="number"
                        min={50}
                        step={10}
                        value={draft.stKdeRegimeLookback ?? 200}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeRegimeLookback: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeRegime ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KDE BW (Regime)</div>
                      <input
                        type="number"
                        min={0.1}
                        step={0.05}
                        value={draft.stKdeRegimeBandwidth ?? 0.8}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeRegimeBandwidth: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeRegime ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">Max Concentration</div>
                      <input
                        type="number"
                        min={0.05}
                        max={0.95}
                        step={0.01}
                        value={draft.stKdeRegimeMaxConcentration ?? 0.55}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeRegimeMaxConcentration: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeRegime ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="KDE Value Area Gate"
                    checked={draft.stUseKdeValueArea ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseKdeValueArea: v }))}
                    desc={`Avoids high-density price areas: density ≤ ${(draft.stKdeValueAreaMaxDensity ?? 0.6).toFixed(2)} (LB ${(draft.stKdeValueAreaLookback ?? 260).toFixed(0)}, BW ${(draft.stKdeValueAreaBandwidth ?? 0.8).toFixed(2)})`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KDE LB (Value)</div>
                      <input
                        type="number"
                        min={80}
                        step={10}
                        value={draft.stKdeValueAreaLookback ?? 260}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeValueAreaLookback: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeValueArea ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KDE BW (Value)</div>
                      <input
                        type="number"
                        min={0.1}
                        step={0.05}
                        value={draft.stKdeValueAreaBandwidth ?? 0.8}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeValueAreaBandwidth: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeValueArea ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">Max Density</div>
                      <input
                        type="number"
                        min={0.05}
                        max={0.95}
                        step={0.01}
                        value={draft.stKdeValueAreaMaxDensity ?? 0.6}
                        onChange={(e) => setDraft((d) => ({ ...d, stKdeValueAreaMaxDensity: Number(e.target.value) }))}
                        disabled={!(draft.stUseKdeValueArea ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="ADX Regime Gate"
                    checked={draft.stUseAdx ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseAdx: v }))}
                    desc={`Requires ADX(${(draft.stAdxPeriod ?? 14).toFixed(0)}) ≥ ${(draft.stAdxMin ?? 22).toFixed(0)}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">ADX Period</div>
                      <input
                        type="number"
                        min={2}
                        step={1}
                        value={draft.stAdxPeriod ?? 14}
                        onChange={(e) => setDraft((d) => ({ ...d, stAdxPeriod: Number(e.target.value) }))}
                        disabled={!(draft.stUseAdx ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">ADX Min</div>
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={draft.stAdxMin ?? 22}
                        onChange={(e) => setDraft((d) => ({ ...d, stAdxMin: Number(e.target.value) }))}
                        disabled={!(draft.stUseAdx ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <Toggle
                    label="DI Alignment Gate"
                    checked={draft.stUseDiAlign ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseDiAlign: v }))}
                    desc="Longs only when DI+ > DI−; shorts only when DI− > DI+."
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">DI Period</div>
                    <input
                      type="number"
                      min={2}
                      step={1}
                      value={draft.stDiPeriod ?? 14}
                      onChange={(e) => setDraft((d) => ({ ...d, stDiPeriod: Number(e.target.value) }))}
                      disabled={!(draft.stUseDiAlign ?? false)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>

                  <Toggle
                    label="Manual SL / TP"
                    checked={draft.stUseManualSlTp ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, stUseManualSlTp: v }))}
                    desc="Override ATR-based exits with fixed % levels. Takes priority over global Fixed % SL/TP."
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">SL %</div>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={draft.stManualSlPct ?? 1.5}
                        onChange={(e) => setDraft((d) => ({ ...d, stManualSlPct: Number(e.target.value) }))}
                        disabled={!(draft.stUseManualSlTp ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">TP1 %</div>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={draft.stManualTp1Pct ?? 2.0}
                        onChange={(e) => setDraft((d) => ({ ...d, stManualTp1Pct: Number(e.target.value) }))}
                        disabled={!(draft.stUseManualSlTp ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">TP2 %</div>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={draft.stManualTp2Pct ?? 4.0}
                        onChange={(e) => setDraft((d) => ({ ...d, stManualTp2Pct: Number(e.target.value) }))}
                        disabled={!(draft.stUseManualSlTp ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
            {isSqz && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Squeeze Momentum (TTM)</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Fires when Bollinger Bands release from inside the Keltner Channel (volatility expansion)
                    in the direction of the momentum oscillator. Tuned for 5m. Fewer, higher-quality breakouts.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {/* Squeeze detection */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">BB Length</div>
                      <input type="number" min={2} step={1} value={draft.sqzBbLen ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzBbLen: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">BB Std Dev</div>
                      <input type="number" min={0.5} step={0.1} value={draft.sqzBbStd ?? 2.0}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzBbStd: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KC Length</div>
                      <input type="number" min={2} step={1} value={draft.sqzKcLen ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzKcLen: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">KC ATR Mult</div>
                      <input type="number" min={0.5} step={0.1} value={draft.sqzKcMult ?? 1.5}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzKcMult: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                    </label>
                  </div>

                  <Toggle
                    label="Require squeeze release"
                    checked={draft.sqzRequireRelease ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, sqzRequireRelease: v }))}
                    desc="When ON, only enters on the bar the squeeze fires (BB expands out of KC). OFF = any bar while volatility is expanded."
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Momentum Length</div>
                      <input type="number" min={2} step={1} value={draft.sqzMomLen ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzMomLen: Number(e.target.value) }))}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Min Squeeze Bars</div>
                      <input type="number" min={1} step={1} value={draft.sqzMinSqueezeBars ?? 2}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzMinSqueezeBars: Number(e.target.value) }))}
                        disabled={!(draft.sqzRequireRelease ?? true)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                    </label>
                  </div>

                  <Toggle
                    label="Require momentum rising"
                    checked={draft.sqzRequireMomRising ?? true}
                    onChange={(v) => setDraft((d) => ({ ...d, sqzRequireMomRising: v }))}
                    desc="Longs need momentum increasing, shorts need it decreasing (not just sign)."
                  />

                  {/* Confluence filters */}
                  <Toggle
                    label="HTF EMA trend filter"
                    checked={draft.sqzUseHtfAlign ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, sqzUseHtfAlign: v }))}
                    desc={`Only longs above / shorts below HTF EMA(${(draft.sqzHtfEmaLen ?? 200).toFixed(0)}).`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">HTF EMA Length</div>
                    <input type="number" min={20} step={1} value={draft.sqzHtfEmaLen ?? 200}
                      onChange={(e) => setDraft((d) => ({ ...d, sqzHtfEmaLen: Number(e.target.value) }))}
                      disabled={!(draft.sqzUseHtfAlign ?? false)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                  </label>

                  <Toggle
                    label="ADX minimum"
                    checked={draft.sqzUseAdx ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, sqzUseAdx: v }))}
                    desc={`Requires ADX(14) ≥ ${(draft.sqzAdxMin ?? 18).toFixed(0)}.`}
                  />
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">ADX Min</div>
                    <input type="number" min={1} step={1} value={draft.sqzAdxMin ?? 18}
                      onChange={(e) => setDraft((d) => ({ ...d, sqzAdxMin: Number(e.target.value) }))}
                      disabled={!(draft.sqzUseAdx ?? false)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                  </label>

                  <Toggle
                    label="Volume expansion"
                    checked={draft.sqzUseVolume ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, sqzUseVolume: v }))}
                    desc={`Requires volume ≥ ${(draft.sqzMinVolumeRatio ?? 1.2).toFixed(2)}×SMA(${(draft.sqzVolLen ?? 20).toFixed(0)}) on the firing bar.`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Vol Len</div>
                      <input type="number" min={5} step={1} value={draft.sqzVolLen ?? 20}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzVolLen: Number(e.target.value) }))}
                        disabled={!(draft.sqzUseVolume ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                    </label>
                    <label className="block">
                      <div className="text-xs text-slate-400 mb-1">Vol Min ×</div>
                      <input type="number" min={0.5} step={0.05} value={draft.sqzMinVolumeRatio ?? 1.2}
                        onChange={(e) => setDraft((d) => ({ ...d, sqzMinVolumeRatio: Number(e.target.value) }))}
                        disabled={!(draft.sqzUseVolume ?? false)}
                        className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                    </label>
                  </div>

                  {/* Risk model */}
                  <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Risk Model (ATR-based)</div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">SL × ATR</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzSlAtrMult ?? 1.5}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzSlAtrMult: Number(e.target.value) }))}
                          disabled={(draft.sqzUseManualSlTp ?? false) || (draft.filterFixedPctSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 × ATR</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzTp1AtrMult ?? 3.0}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzTp1AtrMult: Number(e.target.value) }))}
                          disabled={(draft.sqzUseManualSlTp ?? false) || (draft.filterFixedPctSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP2 × ATR</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzTp2AtrMult ?? 5.0}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzTp2AtrMult: Number(e.target.value) }))}
                          disabled={(draft.sqzUseManualSlTp ?? false) || (draft.filterFixedPctSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                    </div>
                    <Toggle
                      label="Use manual % SL/TP"
                      checked={draft.sqzUseManualSlTp ?? false}
                      onChange={(v) => setDraft((d) => ({ ...d, sqzUseManualSlTp: v }))}
                      desc="Override ATR risk model with fixed percentages off entry."
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">SL %</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzManualSlPct ?? 1.5}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzManualSlPct: Number(e.target.value) }))}
                          disabled={!(draft.sqzUseManualSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 %</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzManualTp1Pct ?? 3.0}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzManualTp1Pct: Number(e.target.value) }))}
                          disabled={!(draft.sqzUseManualSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP2 %</div>
                        <input type="number" min={0.1} step={0.1} value={draft.sqzManualTp2Pct ?? 5.0}
                          onChange={(e) => setDraft((d) => ({ ...d, sqzManualTp2Pct: Number(e.target.value) }))}
                          disabled={!(draft.sqzUseManualSlTp ?? false)}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isECB && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Elite Context Breakout — Engine Parameters</div>
                  <div className="mt-1 text-xs text-slate-500">These values tune ECB grading, risk model, and quality gates.</div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Breakout Grading</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">A Body % (High vol)</div>
                        <input type="number" min={10} max={90} step={1}
                          value={Number.isFinite(draft.ecbAGradeBodyMinPctHighVol) ? draft.ecbAGradeBodyMinPctHighVol : 70}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbAGradeBodyMinPctHighVol: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">A Body % (Other)</div>
                        <input type="number" min={10} max={90} step={1}
                          value={Number.isFinite(draft.ecbAGradeBodyMinPctOther) ? draft.ecbAGradeBodyMinPctOther : 65}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbAGradeBodyMinPctOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">A Vol ×</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbAGradeVolMinMult) ? draft.ecbAGradeVolMinMult : 2.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbAGradeVolMinMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <div />
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">B Body % (Medium vol)</div>
                        <input type="number" min={10} max={90} step={1}
                          value={Number.isFinite(draft.ecbBGradeBodyMinPctMedium) ? draft.ecbBGradeBodyMinPctMedium : 55}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBGradeBodyMinPctMedium: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">B Body % (Other)</div>
                        <input type="number" min={10} max={90} step={1}
                          value={Number.isFinite(draft.ecbBGradeBodyMinPctOther) ? draft.ecbBGradeBodyMinPctOther : 45}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBGradeBodyMinPctOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">B Vol × (Medium vol)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbBGradeVolMinMultMedium) ? draft.ecbBGradeVolMinMultMedium : 2.0}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBGradeVolMinMultMedium: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">B Vol × (Other)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbBGradeVolMinMultOther) ? draft.ecbBGradeVolMinMultOther : 1.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBGradeVolMinMultOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Gates</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Retest ATR Tol (×)</div>
                        <input type="number" min={0.05} step={0.05}
                          value={Number.isFinite(draft.ecbRetestAtrTolMult) ? draft.ecbRetestAtrTolMult : 0.3}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRetestAtrTolMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Retest EMA20 Max Dist %</div>
                        <input type="number" min={0.05} step={0.05}
                          value={Number.isFinite(draft.ecbRetestEma20MaxDistPct) ? draft.ecbRetestEma20MaxDistPct : 0.3}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRetestEma20MaxDistPct: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Retest Vol Max (frac)</div>
                        <input type="number" min={0.1} max={2} step={0.05}
                          value={Number.isFinite(draft.ecbRetestVolMaxFracOfBreak) ? draft.ecbRetestVolMaxFracOfBreak : 0.7}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRetestVolMaxFracOfBreak: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Max EMA50 Dist (ATR ×)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbMaxEma50DistanceAtrMult) ? draft.ecbMaxEma50DistanceAtrMult : 3}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbMaxEma50DistanceAtrMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Min Consolid Bars</div>
                        <input type="number" min={1} max={20} step={1}
                          value={Number.isFinite(draft.ecbMinConsolidBars) ? draft.ecbMinConsolidBars : 5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbMinConsolidBars: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Max Break Range (ATR ×)</div>
                        <input type="number" min={0.5} step={0.25}
                          value={Number.isFinite(draft.ecbMaxBreakCandleRangeAtrMult) ? draft.ecbMaxBreakCandleRangeAtrMult : 4}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbMaxBreakCandleRangeAtrMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Bull Close ≥ % of Range</div>
                        <input type="number" min={50} max={99} step={1}
                          value={Number.isFinite(draft.ecbBreakClosePosBullMinPct) ? draft.ecbBreakClosePosBullMinPct : 75}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBreakClosePosBullMinPct: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Bear Close ≤ % of Range</div>
                        <input type="number" min={1} max={50} step={1}
                          value={Number.isFinite(draft.ecbBreakClosePosBearMaxPct) ? draft.ecbBreakClosePosBearMaxPct : 25}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbBreakClosePosBearMaxPct: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">RSI Gates</div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Long Min (Mid A)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiLongMinMediumAGrade) ? draft.ecbRsiLongMinMediumAGrade : 55}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiLongMinMediumAGrade: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Long Min (Mid B)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiLongMinMediumBGrade) ? draft.ecbRsiLongMinMediumBGrade : 52}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiLongMinMediumBGrade: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Long Min (Other)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiLongMinOther) ? draft.ecbRsiLongMinOther : 50}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiLongMinOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Short Max (Mid A)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiShortMaxMediumAGrade) ? draft.ecbRsiShortMaxMediumAGrade : 45}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiShortMaxMediumAGrade: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Short Max (Mid B)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiShortMaxMediumBGrade) ? draft.ecbRsiShortMaxMediumBGrade : 48}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiShortMaxMediumBGrade: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Short Max (Other)</div>
                        <input type="number" min={0} max={100} step={1}
                          value={Number.isFinite(draft.ecbRsiShortMaxOther) ? draft.ecbRsiShortMaxOther : 50}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbRsiShortMaxOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">SL/TP Model</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">SL ATR × (A High)</div>
                        <input type="number" min={0.2} step={0.1}
                          value={Number.isFinite(draft.ecbSlAtrMultAGradeHigh) ? draft.ecbSlAtrMultAGradeHigh : 1.2}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbSlAtrMultAGradeHigh: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">SL ATR × (A Other)</div>
                        <input type="number" min={0.2} step={0.1}
                          value={Number.isFinite(draft.ecbSlAtrMultAGradeOther) ? draft.ecbSlAtrMultAGradeOther : 1.0}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbSlAtrMultAGradeOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">SL ATR × (B)</div>
                        <input type="number" min={0.2} step={0.1}
                          value={Number.isFinite(draft.ecbSlAtrMultBGrade) ? draft.ecbSlAtrMultBGrade : 1.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbSlAtrMultBGrade: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <div />
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 RR (A High)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbTp1RRMultAGradeHigh) ? draft.ecbTp1RRMultAGradeHigh : 2.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbTp1RRMultAGradeHigh: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 RR (A Other)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbTp1RRMultAGradeOther) ? draft.ecbTp1RRMultAGradeOther : 2.0}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbTp1RRMultAGradeOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 RR (B Mid)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbTp1RRMultBGradeMedium) ? draft.ecbTp1RRMultBGradeMedium : 2.0}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbTp1RRMultBGradeMedium: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP1 RR (B Other)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbTp1RRMultBGradeOther) ? draft.ecbTp1RRMultBGradeOther : 1.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbTp1RRMultBGradeOther: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">Measured Move Min (ATR ×)</div>
                        <input type="number" min={0.5} step={0.1}
                          value={Number.isFinite(draft.ecbMeasuredMoveMinAtrMult) ? draft.ecbMeasuredMoveMinAtrMult : 2.5}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbMeasuredMoveMinAtrMult: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                      <label className="block">
                        <div className="text-xs text-slate-400 mb-1">TP2 Extra RR</div>
                        <input type="number" min={0} step={0.5}
                          value={Number.isFinite(draft.ecbTp2ExtraRR) ? draft.ecbTp2ExtraRR : 2}
                          onChange={(e) => setDraft((d) => ({ ...d, ecbTp2ExtraRR: Number(e.target.value) }))}
                          className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {isBR && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-sm font-semibold text-slate-200">Entry Model</div>
                <div className="mt-1 text-xs text-slate-500">Controls how Breakout Retest triggers an entry.</div>
                <div className="mt-2">
                  <select
                    value={draft.entryModel}
                    onChange={(e) => setDraft((d) => ({ ...d, entryModel: e.target.value as FilterSettings['entryModel'] }))}
                    className="h-9 w-full max-w-sm rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                  >
                    <option value="retest_confirm">Retest + Confirmation (Conservative)</option>
                    <option value="retest_hold">Retest Hold (Medium)</option>
                    <option value="breakout_close">Breakout Close (Aggressive)</option>
                  </select>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Min ATR% (volatility)</div>
                    <input
                      type="number"
                      min={0}
                      step={0.05}
                      value={draft.brMinAtrPct ?? 0.4}
                      onChange={(e) => setDraft((d) => ({ ...d, brMinAtrPct: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Max Candle Range (ATR ×)</div>
                    <input
                      type="number"
                      min={0.5}
                      step={0.25}
                      value={draft.brMaxRangeAtrMult ?? 3}
                      onChange={(e) => setDraft((d) => ({ ...d, brMaxRangeAtrMult: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">EMA Slope Lookback (bars)</div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draft.brEmaSlopeLookback ?? 10}
                      onChange={(e) => setDraft((d) => ({ ...d, brEmaSlopeLookback: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">ADX Min</div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draft.brAdxMin ?? 25}
                      onChange={(e) => setDraft((d) => ({ ...d, brAdxMin: Number(e.target.value) }))}
                      disabled={!draft.filterADXRegime}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>
            )}
            {isCM && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Setup Rating (Minimum Quality)</div>
                  <div className="mt-1 text-xs text-slate-500">Each check below awards 1 point (max 7): Liquidity Sweep · HTF Delivery · iFVG · CISD · RSI Divergence · Internal Sweep · Clear Target. Set the minimum points needed to fire a signal. On 1h+ timeframes iFVG does not count, so max is 6.</div>
                  <div className="mt-2">
                    <select
                      value={draft.minQuality}
                      onChange={(e) => setDraft((d) => ({ ...d, minQuality: Number(e.target.value) }))}
                      className="h-9 w-full max-w-sm rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    >
                      <option value={3}>B (3 checks)</option>
                      <option value={4}>B+ (4 checks)</option>
                      <option value={6}>A (6 checks)</option>
                      <option value={7}>A+ (7 checks)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Toggle
                    label="Require Liquidity Sweep"
                    checked={draft.filterLiquiditySweep}
                    onChange={(v) => setDraft((d) => ({ ...d, filterLiquiditySweep: v }))}
                    desc="Hard gate: price must have swept equal highs/lows (stop hunt) within the last 25 bars before the signal. Also counts as 1 quality point."
                  />
                  <Toggle
                    label="Require HTF Delivery"
                    checked={draft.filterFVG}
                    onChange={(v) => setDraft((d) => ({ ...d, filterFVG: v }))}
                    desc="Hard gate: a higher-timeframe candle must tap into an HTF FVG then close back out of it (rejection/delivery). Also counts as 1 quality point."
                  />
                  <Toggle
                    label="Require iFVG (LTF gate)"
                    checked={draft.filterPapRequireRetest}
                    onChange={(v) => setDraft((d) => ({ ...d, filterPapRequireRetest: v }))}
                    desc="Hard gate: a candle must close through an opposing FVG within recent bars. Active on 1m/5m (6-bar window) and 15m (12-bar window). 1h+ is not gated — iFVG there only adds quality points."
                  />
                  <Toggle
                    label="Require iFVG (force on all timeframes)"
                    checked={draft.filterIFVG}
                    onChange={(v) => setDraft((d) => ({ ...d, filterIFVG: v }))}
                    desc="Overrides the LTF-only gate above — forces iFVG as a hard requirement on every timeframe including 1h and 4h. Turn this ON if you want 1h+ to also require iFVG."
                  />
                  <Toggle
                    label="Require CISD Retest"
                    checked={draft.filterCisdRetest}
                    onChange={(v) => setDraft((d) => ({ ...d, filterCisdRetest: v }))}
                    desc="After CISD fires, price must pull back to the broken level and hold within 5 bars. Reduces false entries but delays signal — best used on 1m/5m."
                  />
                  <Toggle
                    label="Require Clear Target"
                    checked={draft.filterClearTarget}
                    onChange={(v) => setDraft((d) => ({ ...d, filterClearTarget: v }))}
                    desc="Hard gate: a visible liquidity pool (equal highs/lows or unmitigated FVG) must exist at least 0.5% above (bull) or below (bear) current price within the last 120 bars. Trades without a clear target often stall with no momentum to reach TP."
                  />
                  <Toggle
                    label="Require HTF EMA50 Trend"
                    checked={draft.filterHtfEma50}
                    onChange={(v) => setDraft((d) => ({ ...d, filterHtfEma50: v }))}
                    desc="Hard gate: longs only when current price is above the higher-timeframe EMA50, shorts only when below. Filters out counter-trend setups in the macro direction."
                  />
                  <Toggle
                    label="NY/London Session Only"
                    checked={draft.filterCmSession ?? false}
                    onChange={(v) => setDraft((d) => ({ ...d, filterCmSession: v }))}
                    desc="Hard gate: only signal during 08:00–11:00 UTC (London) and 13:00–17:00 UTC (NY). ICT plays rely on session liquidity — Asia-session signals at low volume historically underperform."
                  />
                  <Toggle
                    label="CISD (always on)"
                    checked={true}
                    onChange={() => void 0}
                    desc="A strong candle closes through the high/low of 2–6 consecutive opposing candles. This is the core entry trigger and cannot be disabled."
                    disabled
                    disabledReason="CISD is always required — it is the entry trigger for this strategy"
                  />
                </div>
              </div>
            )}
            {isERR && (
              <div className="lg:col-span-2 rounded-md border border-slate-800 bg-slate-900/40 p-3 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Elite Retest Reversal — Optional Quality Boosts</div>
                  <div className="mt-1 text-xs text-slate-500">All toggles below are off by default. Enable any of them to tighten ERR signal quality without affecting other strategies.</div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <Toggle
                    label="A-Grade Breakout Boost"
                    checked={draft.errAGradeBoost}
                    onChange={(v) => setDraft((d) => ({ ...d, errAGradeBoost: v }))}
                    desc="When the breakout that ERR is reversing on is A-grade (body ≥65%, vol ≥2.5x), extend TP1 to 3.0R (from 2.5R) and TP2 to 6R (from 5R). Lets your strongest setups run further."
                  />
                  <Toggle
                    label="Stochastic Confirmation"
                    checked={draft.errStochConfirm}
                    onChange={(v) => setDraft((d) => ({ ...d, errStochConfirm: v }))}
                    desc="Hard gate: longs require Stoch %K crossing up from <30 (oversold reversal). Shorts require Stoch %K crossing down from >70 (overbought reversal). Filters out counter-momentum entries."
                  />
                  <Toggle
                    label="HTF EMA200 Alignment Bonus"
                    checked={draft.errHtfEma200}
                    onChange={(v) => setDraft((d) => ({ ...d, errHtfEma200: v }))}
                    desc="Quality bonus (+5 points): adds an extra check that HTF close is above EMA200 for longs, below EMA200 for shorts. Macro trend filter, not a hard gate."
                  />
                  <Toggle
                    label="Multi-Retest Required"
                    checked={draft.errMultiRetest}
                    onChange={(v) => setDraft((d) => ({ ...d, errMultiRetest: v }))}
                    desc="Hard gate: the broken swing level must have been touched at least 2 times within the last 30 bars (within ATR × 0.3 tolerance). Stronger S/R confirmation."
                  />
                  <Toggle
                    label="A-Grade Breakout Required"
                    checked={draft.errAGradeRequired}
                    onChange={(v) => setDraft((d) => ({ ...d, errAGradeRequired: v }))}
                    desc="Hard gate: the breakout being retested must be A-grade (body ≥65%, volume ≥2.5x). Best for 15m/1h where weak breakouts rarely follow through."
                  />
                  <Toggle
                    label="HTF EMA50 Required (ERR)"
                    checked={draft.errHtfEma50Required}
                    onChange={(v) => setDraft((d) => ({ ...d, errHtfEma50Required: v }))}
                    desc="Hard gate: HTF close must be above EMA50 for longs / below EMA50 for shorts. ERR-specific macro trend filter — separate from CM's HTF EMA50 toggle."
                  />
                  <Toggle
                    label="Retest Within N Bars"
                    checked={draft.errRetestMaxBarsEnabled}
                    onChange={(v) => setDraft((d) => ({ ...d, errRetestMaxBarsEnabled: v }))}
                    desc="Hard gate: retest must happen within N bars after breakout. Stale retests (10+ bars later) often fail. Set the limit below."
                  />
                  <Toggle
                    label="Min RR Filter"
                    checked={draft.errMinRREnabled}
                    onChange={(v) => setDraft((d) => ({ ...d, errMinRREnabled: v }))}
                    desc="Hard gate: TP1 distance / SL distance must be at least the value set below. Rejects setups where SL is too wide for the available move."
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Retest Max Bars (after breakout)</div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draft.errRetestMaxBars}
                      onChange={(e) => setDraft((d) => ({ ...d, errRetestMaxBars: Number(e.target.value) }))}
                      disabled={!draft.errRetestMaxBarsEnabled}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Min RR (TP1/SL ratio)</div>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={draft.errMinRR}
                      onChange={(e) => setDraft((d) => ({ ...d, errMinRR: Number(e.target.value) }))}
                      disabled={!draft.errMinRREnabled}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Reversal Body Min %</div>
                    <input
                      type="number"
                      min={10}
                      max={90}
                      step={1}
                      value={Number.isFinite(draft.errReversalBodyMinPct) ? draft.errReversalBodyMinPct : 50}
                      onChange={(e) => setDraft((d) => ({ ...d, errReversalBodyMinPct: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Retest Tolerance (ATR ×)</div>
                    <input
                      type="number"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={Number.isFinite(draft.errRetestAtrTolMult) ? draft.errRetestAtrTolMult : 0.3}
                      onChange={(e) => setDraft((d) => ({ ...d, errRetestAtrTolMult: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Stoch OS Level</div>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={Number.isFinite(draft.errStochOS) ? draft.errStochOS : 30}
                      onChange={(e) => setDraft((d) => ({ ...d, errStochOS: Number(e.target.value) }))}
                      disabled={!draft.errStochConfirm}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Stoch OB Level</div>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      value={Number.isFinite(draft.errStochOB) ? draft.errStochOB : 70}
                      onChange={(e) => setDraft((d) => ({ ...d, errStochOB: Number(e.target.value) }))}
                      disabled={!draft.errStochConfirm}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Multi-Retest Lookback (bars)</div>
                    <input
                      type="number"
                      min={5}
                      max={200}
                      step={1}
                      value={Number.isFinite(draft.errMultiRetestLookbackBars) ? draft.errMultiRetestLookbackBars : 30}
                      onChange={(e) => setDraft((d) => ({ ...d, errMultiRetestLookbackBars: Number(e.target.value) }))}
                      disabled={!draft.errMultiRetest}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">Multi-Retest Min Touches</div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={Number.isFinite(draft.errMultiRetestMinTouches) ? draft.errMultiRetestMinTouches : 2}
                      onChange={(e) => setDraft((d) => ({ ...d, errMultiRetestMinTouches: Number(e.target.value) }))}
                      disabled={!draft.errMultiRetest}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">A-Grade Body Min %</div>
                    <input
                      type="number"
                      min={40}
                      max={90}
                      step={1}
                      value={Number.isFinite(draft.errAGradeBodyMinPct) ? draft.errAGradeBodyMinPct : 65}
                      onChange={(e) => setDraft((d) => ({ ...d, errAGradeBodyMinPct: Number(e.target.value) }))}
                      disabled={!(draft.errAGradeBoost || draft.errAGradeRequired)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">A-Grade Vol Min (×avg)</div>
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.1}
                      value={Number.isFinite(draft.errAGradeVolMinMult) ? draft.errAGradeVolMinMult : 2.5}
                      onChange={(e) => setDraft((d) => ({ ...d, errAGradeVolMinMult: Number(e.target.value) }))}
                      disabled={!(draft.errAGradeBoost || draft.errAGradeRequired)}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">TP1 R (Default)</div>
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.1}
                      value={Number.isFinite(draft.errTp1MultDefault) ? draft.errTp1MultDefault : 2.5}
                      onChange={(e) => setDraft((d) => ({ ...d, errTp1MultDefault: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">TP2 R (Default)</div>
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={Number.isFinite(draft.errTp2MultDefault) ? draft.errTp2MultDefault : 5}
                      onChange={(e) => setDraft((d) => ({ ...d, errTp2MultDefault: Number(e.target.value) }))}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">TP1 R (A-Grade Boost)</div>
                    <input
                      type="number"
                      min={0.5}
                      max={10}
                      step={0.1}
                      value={Number.isFinite(draft.errTp1MultBoost) ? draft.errTp1MultBoost : 3.0}
                      onChange={(e) => setDraft((d) => ({ ...d, errTp1MultBoost: Number(e.target.value) }))}
                      disabled={!draft.errAGradeBoost}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-slate-400 mb-1">TP2 R (A-Grade Boost)</div>
                    <input
                      type="number"
                      min={0.5}
                      max={25}
                      step={0.5}
                      value={Number.isFinite(draft.errTp2MultBoost) ? draft.errTp2MultBoost : 6}
                      onChange={(e) => setDraft((d) => ({ ...d, errTp2MultBoost: Number(e.target.value) }))}
                      disabled={!draft.errAGradeBoost}
                      className="h-9 w-full rounded border border-slate-800 bg-slate-950 px-2 text-xs text-slate-200 disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>
            )}
            {showEssential && <div className="lg:col-span-2 text-sm font-semibold text-slate-200">Essential Filters</div>}
            {showEssential && (
            <Toggle
              label="Higher Timeframe Alignment"
              checked={draft.filterHTFAlignment}
              onChange={(v) => setDraft((d) => ({ ...d, filterHTFAlignment: v }))}
              count={filterBlockCounts.htfAlignment}
            />
            )}
            {showEssential && (
            <Toggle
              label="BTC Alignment"
              checked={draft.filterBTCAlignment}
              onChange={(v) => setDraft((d) => ({ ...d, filterBTCAlignment: v }))}
              desc="Blocks longs when BTC trend is bearish, and shorts when BTC trend is bullish"
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Entry Confirmation"
              checked={draft.filterEntryConfirmation}
              onChange={(v) => setDraft((d) => ({ ...d, filterEntryConfirmation: v }))}
              desc="Parent of Break+Retest and Strong Close — those filters do nothing when this is OFF"
              count={filterBlockCounts.entryConfirmation}
            />
            )}
            {showEssential && !isERR && (
            <Toggle
              label="ATR Entry Buffer"
              checked={draft.filterAtrEntryBuffer}
              onChange={(v) => setDraft((d) => ({ ...d, filterAtrEntryBuffer: v }))}
              desc="Adds ATR-based buffer to break/retest levels — affects Break+Retest detection"
              count={filterBlockCounts.atrEntryBuffer}
            />
            )}
            {showEssential && !isERR && !isECB && (
            <Toggle
              label="Strong Close"
              checked={draft.filterStrongClose}
              onChange={(v) => setDraft((d) => ({ ...d, filterStrongClose: v }))}
              desc={isBR ? `Candle body must be ≥ ${draft.strongCloseBodyPct}% of range` : (draft.filterEntryConfirmation ? `Candle body must be ≥ ${draft.strongCloseBodyPct}% of range` : 'No effect — enable Entry Confirmation first')}
              count={filterBlockCounts.strongClose}
            />
            )}
            {showEssential && (
            <Toggle
              label="Cooldown (Anti-Flip)"
              checked={draft.filterCooldown}
              onChange={(v) => setDraft((d) => ({ ...d, filterCooldown: v }))}
              desc={`Blocks opposite-direction signals for ${draft.cooldownBars} bars after a signal`}
              count={filterBlockCounts.cooldown}
            />
            )}
            {showEssential && !isERR && !isECB && (
            <Toggle
              label="ADX Regime Filter"
              checked={draft.filterADXRegime}
              onChange={(v) => setDraft((d) => ({ ...d, filterADXRegime: v }))}
              desc={isBR ? `Requires ADX ≥ ${(draft.brAdxMin ?? 25).toFixed(0)} for valid trend — filters ranging markets` : 'Requires ADX ≥ 25 for valid trend — filters ranging markets'}
              count={filterBlockCounts.adxRegime}
            />
            )}
            {showEssential && !isERR && !isECB && (
            <Toggle
              label="Volume Confirmation"
              checked={draft.filterVolumeConfirmation}
              onChange={(v) => setDraft((d) => ({ ...d, filterVolumeConfirmation: v }))}
              desc={isBR ? `Requires breakout volume ≥ ${(draft.minVolumeRatio ?? 2).toFixed(2)}× avg` : 'Requires volume ≥ Min Volume Ratio on breakout candle'}
              count={filterBlockCounts.volumeConfirmation}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Elite Session Filter"
              checked={draft.filterEliteSession}
              onChange={(v) => setDraft((d) => ({ ...d, filterEliteSession: v }))}
              desc="When ON, Elite strategies only fire during London (4–7 PM PHT) and New York (9 PM–1 AM PHT) sessions"
              disabled={isBR || isCM}
              disabledReason={isCM ? "Not used by Confirmation Model" : "Breakout Retest uses ATR-based volatility instead"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Liquidity Sweep"
              checked={draft.filterLiquiditySweep}
              onChange={(v) => setDraft((d) => ({ ...d, filterLiquiditySweep: v }))}
              desc="Requires price to have swept a recent swing high/low (stop hunt) before the breakout"
              disabled={isBR || isCM}
              disabledReason={isCM ? "Configured in the Confirmation Model section above" : "Breakout Retest uses volume-based confirmation instead"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Require Order Block"
              checked={draft.filterRequireOrderBlock}
              onChange={(v) => setDraft((d) => ({ ...d, filterRequireOrderBlock: v }))}
              desc="Requires a valid order block behind the breakout/reversal level"
              disabled={isBR}
              disabledReason="Not used by Breakout Retest"
            />
            )}
            {showEssential && !isBR && !isCM && (
            <Toggle
              label="Require FVG (Fair Value Gap)"
              checked={draft.filterFVG}
              onChange={(v) => setDraft((d) => ({ ...d, filterFVG: v }))}
              desc="Requires an unmitigated Fair Value Gap in the trade direction"
              disabled={isBR || isCM}
              disabledReason={isCM ? "Configured as HTF Delivery in the Confirmation Model section above" : "Not used by Breakout Retest"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Require Retest"
              checked={draft.filterPapRequireRetest}
              onChange={(v) => setDraft((d) => ({ ...d, filterPapRequireRetest: v }))}
              desc="When ON, PA Breakout Pro only fires after price retests the broken swing level"
              disabled={isERR || isBR || isCM}
              disabledReason={isCM ? "Configured as iFVG gate in the Confirmation Model section above" : "PA Breakout Pro only"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Elite: Require Retest (All Grades)"
              checked={draft.filterEliteRequireRetest}
              onChange={(v) => setDraft((d) => ({ ...d, filterEliteRequireRetest: v }))}
              desc="When ON, Elite Context Breakout requires a retest for every signal"
              disabled={isERR || isBR || isCM}
              disabledReason={isCM ? "Not used by Confirmation Model" : "ECB only"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Elite: Require HTF EMA200 Agreement"
              checked={draft.filterEliteHTFEMA}
              onChange={(v) => setDraft((d) => ({ ...d, filterEliteHTFEMA: v }))}
              desc="When ON, Elite Context Breakout requires price to be above/below HTF EMA200"
              disabled={isERR || isBR || isCM}
              disabledReason={isCM ? "Not used by Confirmation Model" : "ECB only"}
            />
            )}
            {showEssential && !isBR && (
            <Toggle
              label="Elite: Block Overextended Moves"
              checked={draft.filterEliteMaxEmaDistance}
              onChange={(v) => setDraft((d) => ({ ...d, filterEliteMaxEmaDistance: v }))}
              desc="When ON, rejects signals where price is >3×ATR from EMA50"
              disabled={isERR || isBR || isCM}
              disabledReason={isCM ? "Not used by Confirmation Model" : "ECB only"}
            />
            )}
            {showEssential && !isBR && (
            <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
              <div className="text-sm font-semibold text-slate-200 mb-1">Elite: Min Volatility Regime</div>
              <div className="text-xs text-slate-500 mb-2">Only fire signals in the selected ATR% regime or higher. Low &lt;0.4% · Mid 0.4–1.2% · High &gt;1.2%</div>
              <div className="flex gap-2">
                {(['any', 'medium', 'high'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setDraft((d) => ({ ...d, eliteMinVolRegime: v }))}
                    className={draft.eliteMinVolRegime === v ? 'rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white' : 'rounded border border-slate-700 px-3 py-1 text-xs text-slate-300'}
                  >
                    {v === 'any' ? 'Any' : v === 'medium' ? 'Mid + High' : 'High Only'}
                  </button>
                ))}
              </div>
            </div>
            )}
            <Toggle
              label="Fixed % SL/TP (all strategies)"
              checked={draft.filterFixedPctSlTp}
              onChange={(v) => setDraft((d) => ({ ...d, filterFixedPctSlTp: v }))}
              desc="When ON, overrides ATR-based SL/TP with fixed percentages from entry. Gives identical risk on every coin regardless of volatility."
            />
            {draft.filterFixedPctSlTp && (
              <div className="flex gap-4 pl-1 pt-1">
                <div>
                  <div className="text-xs text-slate-500 mb-1">SL %</div>
                  <input
                    type="number" min={0.1} max={10} step={0.1}
                    value={draft.fixedSlPct}
                    onChange={(e) => setDraft((d) => ({ ...d, fixedSlPct: Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1)) }))}
                    className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">TP %</div>
                  <input
                    type="number" min={0.1} max={50} step={0.1}
                    value={draft.fixedTpPct}
                    onChange={(e) => setDraft((d) => ({ ...d, fixedTpPct: Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 2)) }))}
                    className="h-8 w-24 rounded border border-slate-800 bg-slate-900 px-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-end pb-1 text-xs text-slate-500">
                  RR: 1:{(draft.fixedTpPct / draft.fixedSlPct).toFixed(1)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4 border-slate-800 bg-slate-950">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-100">Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Confluence</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="rounded border border-slate-800 px-2 py-1 text-xs" onClick={() => setDraft((d) => ({ ...d, isConfluence: !d.isConfluence }))}>
                  {draft.isConfluence ? 'ON' : 'OFF'}
                </button>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <button
                    key={n}
                    className={n === draft.minConfluence ? 'rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white' : 'rounded border border-slate-800 px-2 py-1 text-xs text-slate-300'}
                    onClick={() => setDraft((d) => ({ ...d, minConfluence: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-mono text-slate-500">
                Blocked: <span className="text-slate-300">{filterBlockCounts.minConfluence}</span>
              </div>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Signal Quality Min</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    title={
                      isCM && n > 7 ? 'Unreachable — CM max is 7 (1m/5m/15m) or 6 (1h+)'
                      : !isCM && n > 6 ? 'Unreachable — max quality is 6 for this strategy'
                      : undefined
                    }
                    className={
                      n === draft.minQuality
                        ? 'rounded bg-cyan-600 px-2 py-1 text-xs font-bold text-white'
                        : (isCM ? n > 7 : n > 6)
                          ? 'rounded border border-rose-900 px-2 py-1 text-xs text-rose-600 line-through'
                          : 'rounded border border-slate-800 px-2 py-1 text-xs text-slate-300'
                    }
                    onClick={() => setDraft((d) => ({ ...d, minQuality: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {!isCM && draft.minQuality > 6 && (
                <div className="mt-2 text-[11px] text-rose-500">
                  Quality {draft.minQuality} is unreachable — max is 6. No signals will fire.
                </div>
              )}
              {isCM && draft.minQuality > 7 && (
                <div className="mt-2 text-[11px] text-rose-500">
                  Quality {draft.minQuality} is unreachable — CM max is 7. No signals will fire.
                </div>
              )}
              {isCM && draft.minQuality === 7 && (
                <div className="mt-2 text-[11px] text-amber-500">
                  A+ (7/7) is only reachable on 1m/5m/15m where iFVG counts. On 1h+ the max is 6.
                </div>
              )}
              <div className="mt-2 text-[11px] font-mono text-slate-500">
                Blocked: <span className="text-slate-300">{filterBlockCounts.minQuality}</span>
              </div>
            </div>

            {showEssential && !isERR && !isECB && (
              <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">Volume Confirmation Min Ratio</div>
                <input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={Number.isFinite(draft.minVolumeRatio) ? draft.minVolumeRatio : 1.1}
                  onChange={(e) => setDraft((d) => ({ ...d, minVolumeRatio: Number(e.target.value) }))}
                  className="mt-2 h-9 w-full rounded border border-slate-800 bg-slate-900 px-3 text-sm text-slate-200"
                />
              </div>
            )}

            {showEssential && !isERR && (
              <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">ATR Entry Buffer (ATR Mult)</div>
                <input
                  type="number"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={Number.isFinite(draft.entryAtrBufferAtrMult) ? draft.entryAtrBufferAtrMult : 0.1}
                  onChange={(e) => setDraft((d) => ({ ...d, entryAtrBufferAtrMult: Number(e.target.value) }))}
                  className="mt-2 h-9 w-full rounded border border-slate-800 bg-slate-900 px-3 text-sm text-slate-200"
                />
              </div>
            )}

            {showEssential && !isERR && !isECB && (
              <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">Strong Close Body %</div>
                <input
                  type="number"
                  min={10}
                  max={90}
                  step={1}
                  value={Number.isFinite(draft.strongCloseBodyPct) ? draft.strongCloseBodyPct : 50}
                  onChange={(e) => setDraft((d) => ({ ...d, strongCloseBodyPct: Number(e.target.value) }))}
                  className="mt-2 h-9 w-full rounded border border-slate-800 bg-slate-900 px-3 text-sm text-slate-200"
                />
              </div>
            )}

            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Cooldown Bars</div>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                value={Number.isFinite(draft.cooldownBars) ? draft.cooldownBars : 3}
                onChange={(e) => setDraft((d) => ({ ...d, cooldownBars: Number(e.target.value) }))}
                className="mt-2 h-9 w-full rounded border border-slate-800 bg-slate-900 px-3 text-sm text-slate-200"
              />
            </div>
          </CardContent>
        </Card>
    </>
  )
}
