import AppShell from '@/components/layout/AppShell'
import { FilterForm } from "@/components/filters/FilterForm"
import { FilterSettings, DEFAULT_ECB_FILTERS, DEFAULT_ERR_FILTERS, DEFAULT_BR_FILTERS, DEFAULT_CM_FILTERS, DEFAULT_FG_FILTERS, DEFAULT_ST_FILTERS, DEFAULT_BBSSD_FILTERS, DEFAULT_SQZ_FILTERS, useTradingStore } from '@/stores/tradingStore'
import Button from '@/components/ui/Button'
import { useEffect, useMemo, useState, useRef } from 'react'

export default function SignalFilters() {
  const selectedStrategy = useTradingStore((s) => s.selectedStrategy)
  const ecbFilters      = useTradingStore((s) => s.ecbFilters)
  const errFilters      = useTradingStore((s) => s.errFilters)
  const brFilters       = useTradingStore((s) => s.brFilters)
  const cmFilters       = useTradingStore((s) => s.cmFilters)
  const fgFilters       = useTradingStore((s) => s.fgFilters)
  const stFilters       = useTradingStore((s) => s.stFilters)
  const bbssdFilters    = useTradingStore((s) => s.bbssdFilters)
  const sqzFilters      = useTradingStore((s) => s.sqzFilters)
  const setStrategyFilters = useTradingStore((s) => s.setStrategyFilters)
  const filterBlockCounts  = useTradingStore((s) => s.filterBlockCounts)
  const resetFilterBlocks  = useTradingStore((s) => s.resetFilterBlocks)

  const [viewedTab, setViewedTab] = useState<'ecb' | 'err' | 'br' | 'cm' | 'fg' | 'st' | 'bbssd' | 'sqz'>(
    selectedStrategy === 'Breakout Retest'
      ? 'br'
      : selectedStrategy === 'Elite Retest Reversal'
        ? 'err'
        : selectedStrategy === 'Confirmation Model'
          ? 'cm'
          : selectedStrategy === 'FluxGate Dual Engine'
            ? 'fg'
          : selectedStrategy === 'Supertrend + RelVol'
            ? 'st'
          : selectedStrategy === 'BB Stoch S/D'
            ? 'bbssd'
          : selectedStrategy === 'Squeeze Momentum'
            ? 'sqz'
          : 'ecb',
  )

  const activeTabFilters: FilterSettings =
    viewedTab === 'ecb'
      ? ecbFilters
      : viewedTab === 'err'
        ? errFilters
        : viewedTab === 'br'
          ? brFilters
          : viewedTab === 'cm'
            ? cmFilters
            : viewedTab === 'fg'
              ? fgFilters
              : viewedTab === 'st'
                ? stFilters
              : viewedTab === 'bbssd'
                ? bbssdFilters
              : sqzFilters
  const [draft, setDraft] = useState<FilterSettings>(activeTabFilters)
  const [savedNonce, setSavedNonce] = useState(0)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      filters: { ecb: ecbFilters, err: errFilters, br: brFilters, cm: cmFilters, fg: fgFilters, st: stFilters, bbssd: bbssdFilters, sqz: sqzFilters },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cryptopredict-filters-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const f = data?.filters
        if (!f || typeof f !== 'object') throw new Error('Invalid file')
        if (f.ecb)   setStrategyFilters('ecb',   f.ecb)
        if (f.err)   setStrategyFilters('err',   f.err)
        if (f.br)    setStrategyFilters('br',    f.br)
        if (f.cm)    setStrategyFilters('cm',    f.cm)
        if (f.fg)    setStrategyFilters('fg',    f.fg)
        if (f.st)    setStrategyFilters('st',    f.st)
        if (f.bbssd) setStrategyFilters('bbssd', f.bbssd)
        if (f.sqz)   setStrategyFilters('sqz',   f.sqz)
        setImportMsg('Imported successfully')
        setTimeout(() => setImportMsg(null), 3000)
      } catch {
        setImportMsg('Invalid file')
        setTimeout(() => setImportMsg(null), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  useEffect(() => {
    setDraft(
      viewedTab === 'ecb'
        ? ecbFilters
        : viewedTab === 'err'
          ? errFilters
          : viewedTab === 'br'
            ? brFilters
            : viewedTab === 'cm'
              ? cmFilters
              : viewedTab === 'fg'
                ? fgFilters
                : viewedTab === 'st'
                  ? stFilters
                : viewedTab === 'bbssd'
                  ? bbssdFilters
                : sqzFilters,
    )
  }, [viewedTab, ecbFilters, errFilters, brFilters, cmFilters, fgFilters, stFilters, bbssdFilters, sqzFilters])

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(activeTabFilters),
    [draft, activeTabFilters],
  )

  const apply = () => {
    setStrategyFilters(viewedTab, draft)
    setSavedNonce((n) => n + 1)
  }

  const reset = () => setDraft(activeTabFilters)

  const resetToDefault = () =>
    setDraft(
      viewedTab === 'ecb'
        ? DEFAULT_ECB_FILTERS
        : viewedTab === 'err'
          ? DEFAULT_ERR_FILTERS
          : viewedTab === 'br'
            ? DEFAULT_BR_FILTERS
            : viewedTab === 'cm'
              ? DEFAULT_CM_FILTERS
              : viewedTab === 'fg'
                ? DEFAULT_FG_FILTERS
                : viewedTab === 'st'
                  ? DEFAULT_ST_FILTERS
                : viewedTab === 'bbssd'
                  ? DEFAULT_BBSSD_FILTERS
                : DEFAULT_SQZ_FILTERS,
    )

  const handleTabSwitch = (key: 'ecb' | 'err' | 'br' | 'cm' | 'fg' | 'st' | 'bbssd' | 'sqz') => {
    setViewedTab(key)
    setSavedNonce(0)
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold text-slate-100">Signal Filters</div>
              <div className="text-xs text-slate-500">Independent filter settings per strategy.</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs font-mono">
                <span className="text-slate-500">Confluence:</span>{' '}
                <span className={draft.isConfluence ? 'text-emerald-400' : 'text-rose-400'}>
                  {draft.isConfluence ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {savedNonce > 0 && !isDirty && <div className="text-xs font-mono text-emerald-400">Saved</div>}
              {importMsg && (
                <div className={`text-xs font-mono ${importMsg.startsWith('Invalid') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {importMsg}
                </div>
              )}
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button variant="secondary" className="h-9 border-slate-800" onClick={() => importRef.current?.click()}>
                Import
              </Button>
              <Button variant="secondary" className="h-9 border-slate-800" onClick={handleExport}>
                Export
              </Button>
              <Button variant="secondary" className="h-9 border-slate-800" onClick={resetFilterBlocks}>
                Reset Counters
              </Button>
              <Button variant="secondary" className="h-9 border-slate-800" onClick={resetToDefault}>
                Defaults
              </Button>
              <Button variant="secondary" className="h-9 border-slate-800" onClick={reset} disabled={!isDirty}>
                Revert
              </Button>
              <Button className="h-9 px-4 font-bold" onClick={apply} disabled={!isDirty}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Strategy tab switcher */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {(['ecb', 'err', 'br', 'cm', 'fg', 'st', 'bbssd', 'sqz'] as const).map((key) => {
            const label =
              key === 'ecb'
                ? 'Elite Context Breakout'
                : key === 'err'
                  ? 'Elite Retest Reversal'
                  : key === 'br'
                    ? 'Breakout Retest'
                    : key === 'cm'
                      ? 'Confirmation Model'
                      : key === 'fg'
                        ? 'FluxGate Dual Engine'
                        : key === 'st'
                          ? 'Supertrend + RelVol'
                          : key === 'bbssd'
                            ? 'BB Stoch S/D'
                            : 'Squeeze Momentum'
            const isActive =
              (key === 'ecb' && selectedStrategy === 'Elite Context Breakout') ||
              (key === 'err' && selectedStrategy === 'Elite Retest Reversal') ||
              (key === 'br' && selectedStrategy === 'Breakout Retest') ||
              (key === 'cm' && selectedStrategy === 'Confirmation Model') ||
              (key === 'fg' && selectedStrategy === 'FluxGate Dual Engine') ||
              (key === 'st' && selectedStrategy === 'Supertrend + RelVol') ||
              (key === 'bbssd' && selectedStrategy === 'BB Stoch S/D') ||
              (key === 'sqz' && selectedStrategy === 'Squeeze Momentum')
            return (
              <button
                key={key}
                onClick={() => handleTabSwitch(key)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewedTab === key
                    ? 'border-blue-600 bg-blue-600/20 text-blue-300'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {label}
                {isActive && (
                  <span className="rounded bg-emerald-900/80 px-1 py-0.5 text-[10px] font-bold text-emerald-400">
                    ACTIVE
                  </span>
                )}
              </button>
            )
          })}
          <div className="ml-2 text-xs text-slate-600">
            {viewedTab !== (
              selectedStrategy === 'Breakout Retest'
                ? 'br'
                : selectedStrategy === 'Elite Retest Reversal'
                  ? 'err'
                  : selectedStrategy === 'Confirmation Model'
                    ? 'cm'
                    : selectedStrategy === 'FluxGate Dual Engine'
                      ? 'fg'
                    : selectedStrategy === 'Supertrend + RelVol'
                      ? 'st'
                    : selectedStrategy === 'BB Stoch S/D'
                      ? 'bbssd'
                    : selectedStrategy === 'Squeeze Momentum'
                      ? 'sqz'
                    : 'ecb'
            ) && (
              <span className="text-amber-500">Editing inactive strategy filters</span>
            )}
          </div>
        </div>

        <FilterForm viewedTab={viewedTab} draft={draft} setDraft={setDraft} filterBlockCounts={filterBlockCounts} />
      </div>
    </AppShell>
  )
}
