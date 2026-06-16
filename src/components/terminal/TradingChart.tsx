import React, { useEffect, useRef, memo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  SeriesMarker,
  Time
} from 'lightweight-charts';
import { formatPrice } from '@/utils/format';

interface PriceLine {
  price: number;
  color: string;
  label: string;
}

interface TradingChartProps {
  candles: CandlestickData<Time>[];
  markers?: SeriesMarker<Time>[];
  indicators?: {
    bb?: { upper: LineData<Time>[]; middle: LineData<Time>[]; lower: LineData<Time>[] };
    ema1?: LineData<Time>[];
    ema2?: LineData<Time>[];
  };
  tradeSetup?: {
    entry: number;
    sl: number;
    tp1: number;
    tp2: number;
  } | null;
  theme?: 'dark';
}

const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  markers = [],
  indicators = {},
  tradeSetup = null,
  theme = 'dark'
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  // Indicator series refs
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Trade Setup Series Refs
  const entrySeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const slSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const tp1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const tp2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#94a3b8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#161B22' },
        horzLines: { color: '#161B22' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      localization: {
        timeFormatter: (time: number) => {
          const d = new Date(time * 1000)
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          const mo = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return `${mo}/${dd} ${hh}:${mm}`
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 20,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000)
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          const mo = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return hh === '00' && mm === '00' ? `${mo}/${dd}` : `${hh}:${mm}`
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Add indicator series - Hidden from axis
    bbUpperSeriesRef.current = chart.addLineSeries({ color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    bbMiddleSeriesRef.current = chart.addLineSeries({ color: 'rgba(56, 189, 248, 0.2)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    bbLowerSeriesRef.current = chart.addLineSeries({ color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    ema1SeriesRef.current = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    ema2SeriesRef.current = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    // Initialize Trade Setup Series - No axis labels, strictly inside the chart
    entrySeriesRef.current = chart.addLineSeries({ color: '#00f2ff', lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    slSeriesRef.current = chart.addLineSeries({ color: '#ff3366', lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    tp1SeriesRef.current = chart.addLineSeries({ color: '#00ff88', lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    tp2SeriesRef.current = chart.addLineSeries({ color: '#ffcc00', lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (candlestickSeriesRef.current && candles.length > 0) {
      candlestickSeriesRef.current.setData(candles);
    }
    
    if (indicators.bb) {
      bbUpperSeriesRef.current?.setData(indicators.bb.upper);
      bbMiddleSeriesRef.current?.setData(indicators.bb.middle);
      bbLowerSeriesRef.current?.setData(indicators.bb.lower);
    }
    if (indicators.ema1) ema1SeriesRef.current?.setData(indicators.ema1);
    if (indicators.ema2) ema2SeriesRef.current?.setData(indicators.ema2);
  }, [candles, indicators]);

  // Update Markers
  useEffect(() => {
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setMarkers(markers);
    }
  }, [markers]);

  // Update Price Lines (Entry, SL, TP1, TP2) - Positioned in the future margin
  useEffect(() => {
    if (!candles.length) return;

    const lastCandle = candles[candles.length - 1];
    const lastTime = lastCandle.time as number;
    
    // Determine step size (assume 15m if not detectable, but candles.length > 1 usually gives it)
    const step = candles.length > 1 ? (lastTime - (candles[candles.length - 2].time as number)) : 900;
    
    // Define range: From last candle to 10 candles in the future
    const startOffset = 0;
    const endOffset = 10;
    
    const futureData = (price: number) => [
      { time: lastTime as Time, value: price },
      { time: (lastTime + step * endOffset) as Time, value: price },
    ];

    if (tradeSetup) {
      entrySeriesRef.current?.setData(futureData(tradeSetup.entry));
      slSeriesRef.current?.setData(futureData(tradeSetup.sl));
      tp1SeriesRef.current?.setData(futureData(tradeSetup.tp1));
      tp2SeriesRef.current?.setData(futureData(tradeSetup.tp2));

      const setupMarkers: SeriesMarker<Time>[] = [
        { time: (lastTime + step * endOffset) as Time, position: 'inBar', color: '#00f2ff', shape: 'square', text: `ENTRY $${formatPrice(tradeSetup.entry)}` },
        { time: (lastTime + step * endOffset) as Time, position: 'inBar', color: '#ff3366', shape: 'square', text: `SL $${formatPrice(tradeSetup.sl)}` },
        { time: (lastTime + step * endOffset) as Time, position: 'inBar', color: '#00ff88', shape: 'square', text: `TP1 $${formatPrice(tradeSetup.tp1)}` },
        { time: (lastTime + step * endOffset) as Time, position: 'inBar', color: '#ffcc00', shape: 'square', text: `TP2 $${formatPrice(tradeSetup.tp2)}` },
      ];
      
      entrySeriesRef.current?.setMarkers([setupMarkers[0]]);
      slSeriesRef.current?.setMarkers([setupMarkers[1]]);
      tp1SeriesRef.current?.setMarkers([setupMarkers[2]]);
      tp2SeriesRef.current?.setMarkers([setupMarkers[3]]);
    } else {
      entrySeriesRef.current?.setData([]);
      slSeriesRef.current?.setData([]);
      tp1SeriesRef.current?.setData([]);
      tp2SeriesRef.current?.setData([]);
    }
  }, [candles, tradeSetup]);

  return (
    <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default memo(TradingChart);
