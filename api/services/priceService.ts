import axios from 'axios';

export interface PriceData {
  symbol: string;
  price: number;
  source: 'binance' | 'bybit' | 'coingecko' | 'coinmarketcap';
  timestamp: number;
  vol24h?: string;
  mktCap?: string;
}

/**
 * Service to fetch prices from multiple crypto exchanges and aggregators
 */
export class PriceService {
  private static symbolsCache: Partial<Record<'binance' | 'bybit', { expiresAt: number; symbols: string[] }>> = {};

  /**
   * Fetch 24h ticker data from Binance Futures (includes volume)
   */
  static async getBinanceTicker24h(symbol: string) {
    try {
      const ticker = symbol.replace('/', '').toUpperCase();
      // Use fapi for futures
      const response = await axios.get(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${ticker}`);
      
      const vol = parseFloat(response.data.quoteVolume);
      const formattedVol = vol > 1000000000 
        ? (vol / 1000000000).toFixed(2) + 'B' 
        : vol > 1000000 
          ? (vol / 1000000).toFixed(1) + 'M' 
          : (vol / 1000).toFixed(0) + 'K';

      // Mock Market Cap for major pairs
      const mktCaps: Record<string, string> = {
        'BTCUSDT': '1.85T',
        'ETHUSDT': '450B',
        'SOLUSDT': '92B',
        'BNBUSDT': '85B',
        'XRPUSDT': '32B'
      };
      
      return {
        symbol,
        price: parseFloat(response.data.lastPrice),
        vol24h: formattedVol,
        mktCap: mktCaps[ticker] || '—',
        source: 'binance',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Binance Futures 24h ticker error:', error);
      // Fallback to spot if futures fails
      try {
        const ticker = symbol.replace('/', '').toUpperCase();
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}`);
        const vol = parseFloat(response.data.quoteVolume);
        return {
          symbol,
          price: parseFloat(response.data.lastPrice),
          vol24h: (vol / 1000000).toFixed(1) + 'M',
          mktCap: '—',
          source: 'binance',
          timestamp: Date.now()
        };
      } catch (e) {
        throw error;
      }
    }
  }

  /**
   * Fetch price from Binance Futures Public API
   */
  static async getBinancePrice(symbol: string): Promise<PriceData> {
    try {
      const ticker = symbol.replace('/', '').toUpperCase();
      const response = await axios.get(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${ticker}`);
      
      return {
        symbol,
        price: parseFloat(response.data.price),
        source: 'binance',
        timestamp: Date.now()
      };
    } catch (error) {
      // Fallback to spot
      try {
        const ticker = symbol.replace('/', '').toUpperCase();
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`);
        return {
          symbol,
          price: parseFloat(response.data.price),
          source: 'binance',
          timestamp: Date.now()
        };
      } catch (e) {
        throw error;
      }
    }
  }

  /**
   * Fetch price from Bybit Public API
   */
  static async getBybitPrice(symbol: string): Promise<PriceData> {
    try {
      const ticker = symbol.replace('/', '').toUpperCase();
      const response = await axios.get(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${ticker}`);
      
      if (response.data.result.list.length === 0) {
        throw new Error('Symbol not found on Bybit');
      }

      return {
        symbol,
        price: parseFloat(response.data.result.list[0].lastPrice),
        source: 'bybit',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Bybit fetch error:', error);
      throw new Error(`Failed to fetch price from Bybit for ${symbol}`);
    }
  }

  /**
   * Fetch price from CoinGecko Public API
   */
  static async getCoinGeckoPrice(id: string = 'bitcoin'): Promise<PriceData> {
    try {
      // CoinGecko uses coin IDs like 'bitcoin', 'ethereum'
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
      
      if (!response.data[id]) {
        throw new Error('Coin ID not found on CoinGecko');
      }

      return {
        symbol: id.toUpperCase(),
        price: response.data[id].usd,
        source: 'bybit', // Mapping as per CoinGecko source type
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('CoinGecko fetch error:', error);
      throw new Error(`Failed to fetch price from CoinGecko for ${id}`);
    }
  }

  /**
   * Get the best available price across multiple sources (Fall-back logic)
   */
  static async getAggregatePrice(symbol: string): Promise<PriceData> {
    // Try Binance 24h ticker first to get volume/mktcap
    try {
      return await this.getBinanceTicker24h(symbol) as PriceData;
    } catch (e) {
      // Fallback to simple price if ticker fails
      try {
        return await this.getBinancePrice(symbol);
      } catch (e2) {
        // Fallback to Bybit
        try {
          return await this.getBybitPrice(symbol);
        } catch (e3) {
          // Fallback to CoinGecko
          const symbolMap: Record<string, string> = {
            'BTCUSDT': 'bitcoin',
            'ETHUSDT': 'ethereum',
            'SOLUSDT': 'solana',
            'BNBUSDT': 'binancecoin',
            'XRPUSDT': 'ripple'
          };
          const cleanSymbol = symbol.replace('/', '').toUpperCase();
          const id = symbolMap[cleanSymbol] || 'bitcoin';
          return await this.getCoinGeckoPrice(id);
        }
      }
    }
  }

  /**
   * Fetch all tradable USDT futures pairs from Binance
   */
  static async getAllSymbols(exchange: 'binance' | 'bybit' | 'all' = 'binance'): Promise<string[]> {
    if (exchange === 'all') {
      const [binance, bybit] = await Promise.all([
        this.getAllSymbols('binance'),
        this.getAllSymbols('bybit'),
      ])
      return Array.from(new Set([...binance, ...bybit])).sort()
    }

    const cached = this.symbolsCache[exchange]
    if (cached && cached.expiresAt > Date.now()) return cached.symbols

    try {
      if (exchange === 'binance') {
        const response = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo');
        const symbols = response.data.symbols
          .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL')
          .map((s: any) => s.symbol)
          .sort();

        this.symbolsCache.binance = { expiresAt: Date.now() + 30 * 60_000, symbols }
        return symbols;
      }

      const symbols: string[] = []
      let cursor: string | undefined
      for (;;) {
        const url = cursor
          ? `https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000&cursor=${encodeURIComponent(cursor)}`
          : 'https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000'

        const response = await axios.get(url)
        const list = response.data?.result?.list
        if (!Array.isArray(list) || list.length === 0) break

        for (const item of list) {
          const s = String(item?.symbol || '').toUpperCase()
          if (!s) continue

          const quote = String(item?.quoteCoin || '').toUpperCase()
          const status = String(item?.status || '').toLowerCase()
          const isTrading = !status || status === 'trading'
          const isUsdt = quote ? quote === 'USDT' : s.endsWith('USDT')

          if (isTrading && isUsdt) symbols.push(s)
        }

        const next = response.data?.result?.nextPageCursor
        if (!next) break
        cursor = String(next)
      }

      const unique = Array.from(new Set(symbols)).sort()
      this.symbolsCache.bybit = { expiresAt: Date.now() + 30 * 60_000, symbols: unique }
      return unique
    } catch (error) {
      console.error(`${exchange} symbols fetch error:`, error);
      if (exchange === 'binance') {
        try {
          const response = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
          const symbols = response.data.symbols
            .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
            .map((s: any) => s.symbol)
            .sort();
          return symbols;
        } catch (e) {
          // Binance geo-blocks some regions (HTTP 451). Fall back to MEXC's full contract list
          // so the symbol universe isn't reduced to a tiny hardcoded set.
          try {
            const mexc = await axios.get('https://contract.mexc.com/api/v1/contract/detail');
            const data = mexc.data?.data
            if (Array.isArray(data)) {
              const symbols = data
                .map((c: any) => String(c?.symbol || '').replace('_', ''))
                .filter((s: string) => s.endsWith('USDT'))
                .sort();
              if (symbols.length > 0) {
                this.symbolsCache.binance = { expiresAt: Date.now() + 30 * 60_000, symbols }
                return symbols;
              }
            }
          } catch { /* fall through to hardcoded */ }
          return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
        }
      }

      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
    }
  }
}
