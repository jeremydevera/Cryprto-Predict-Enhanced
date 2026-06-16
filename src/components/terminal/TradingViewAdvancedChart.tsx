import { useEffect, useMemo, useRef } from 'react'

type Props = {
  symbol: string
  exchange: 'binance' | 'bybit'
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  theme?: 'dark' | 'light'
}

const timeframeToInterval: Record<Props['timeframe'], string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
}

function toTvSymbol(exchange: Props['exchange'], symbol: string) {
  const raw = symbol.replace('/', '').toUpperCase()
  if (exchange === 'bybit') {
    return raw.endsWith('USDT') ? `BYBIT:${raw}.P` : `BYBIT:${raw}`
  }
  return `BINANCE:${raw}`
}

export default function TradingViewAdvancedChart({
  symbol,
  exchange,
  timeframe,
  theme = 'dark',
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  const interval = timeframeToInterval[timeframe]
  const tvSymbol = useMemo(() => toTvSymbol(exchange, symbol), [exchange, symbol])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    while (root.firstChild) root.removeChild(root.firstChild)

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container h-full w-full'

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget h-full w-full'
    const containerId = `tv_${Math.random().toString(36).slice(2)}`
    widget.id = containerId

    container.appendChild(widget)

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: 'Asia/Manila',
      theme,
      style: '1',
      locale: 'en',
      withdateranges: true,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      support_host: 'https://www.tradingview.com',
      container_id: containerId,
    })

    container.appendChild(script)
    root.appendChild(container)

    return () => {
      try {
        while (root.firstChild) root.removeChild(root.firstChild)
      } catch {
        void 0
      }
    }
  }, [interval, theme, tvSymbol])

  return <div ref={rootRef} className="h-full w-full" />
}

