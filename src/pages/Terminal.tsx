import AppShell from '@/components/layout/AppShell'
import ChartCard from '@/components/terminal/ChartCard'
import ConfluenceCard from '@/components/terminal/ConfluenceCard'
import IndicatorsCard from '@/components/terminal/IndicatorsCard'
import AIRegimeCard from '@/components/terminal/AIRegimeCard'
import AIInsightsCard from '@/components/terminal/AIInsightsCard'
import SignalsCard from '@/components/terminal/SignalsCard'
import MarketMetricsCard from '@/components/terminal/MarketMetricsCard'
import ProToolbar from '@/components/terminal/ProToolbar'
import MarketSummaryBar from '@/components/terminal/MarketSummaryBar'
import TradeSetupCard from '@/components/terminal/TradeSetupCard'
import ChartSignalLog from '@/components/terminal/ChartSignalLog'
import BreakoutRetestCard from '@/components/terminal/BreakoutRetestCard'
import { useEffect } from 'react'
import { useTradingStore } from '@/stores/tradingStore'

export default function Terminal() {
  const symbol = useTradingStore((s) => s.symbol)
  const setPrice = useTradingStore((s) => s.setPrice)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchPrice = async () => {
      try {
        // Fetch from our new local API
        const response = await fetch(`/api/prices/ticker?symbol=${symbol}`)
        const json = await response.json()
        if (json.success) {
          setPrice(Number(json.data.price), 0)
        }
      } catch (err) {
        console.error('Failed to fetch price:', err)
      }
    }

    fetchPrice()
    interval = setInterval(fetchPrice, 5000) // update every 5s

    return () => clearInterval(interval)
  }, [symbol, setPrice])

  return (
    <AppShell>
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#08080a]">
        <ProToolbar />
        <MarketSummaryBar />
        
        <div className="flex-1 p-4 grid grid-cols-1 gap-4 2xl:grid-cols-[280px_1fr_360px] xl:grid-cols-[260px_1fr_340px]">
          <div className="space-y-4">
            <ConfluenceCard />
            <IndicatorsCard />
            <AIRegimeCard />
            <AIInsightsCard />
          </div>

          <div className="space-y-4 lg:col-span-1 2xl:col-span-1">
            <ChartCard />
            <ChartSignalLog />
          </div>

          <div className="space-y-4">
            <SignalsCard />
            <BreakoutRetestCard />
            <TradeSetupCard />
            <MarketMetricsCard />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
