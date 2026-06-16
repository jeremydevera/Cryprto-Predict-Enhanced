import { simulatePaperBacktest } from '../src/hooks/useBacktestRunner.js'
const BASE='http://localhost:3017'; const rf=globalThis.fetch
;(globalThis as any).fetch=(i:any,init:any)=>rf(typeof i==='string'&&i.startsWith('/')?BASE+i:i,init)
async function main(){
  const r=await rf(BASE+'/api/mexc-trader/closed-pnl?maxTrades=200'); const j=await r.json()
  const toSec=(n:number)=>n>1e12?Math.floor(n/1000):n
  const lt=(j.data.trades||[]).filter((t:any)=>t.closeTime>0).map((t:any)=>({symbol:t.symbol,side:t.side,openTime:toSec(t.openTime)}))
  const start=Math.min(...lt.map((t:any)=>t.openTime)), end=Math.max(...lt.map((t:any)=>t.openTime))
  const syms=[...new Set(lt.map((t:any)=>t.symbol))] as string[]
  const bt=await simulatePaperBacktest({symbols:syms,timeframe:'5m',baseSettings:{enabledStrategies:['Supertrend + RelVol'],selectedStrategy:'Supertrend + RelVol',entryModel:'breakout_close',isConfluence:false,minConfluence:0,minQuality:0,filterFixedPctSlTp:false,stAtrPeriod:10,stAtrMult:3,stRequireFlip:true,stUseRelVol:true,stRelVolLen:20,stRelVolMin:1.5,stUseHTFAlign:true,stHtfEmaLen:200,stUseAdx:true,stAdxPeriod:14,stAdxMin:22,stUseManualSlTp:false,nearEntryOnly:false,nearEntryPct:100,lastSignalTimeSec:null,lastSignalDirection:null,lastCandleTimeSec:0,timeframe:'5m'} as any,options:{startingCapital:27,tradeAmount:1,leverage:20,marginMode:'cross',feeRatePct:0.02,maxOpenPositions:20,source:'binance',windowStart:start,windowEnd:end},onProgress:()=>{}})
  const btTrades=bt.trades.filter((t:any)=>t.result!=='open').map((t:any)=>({symbol:t.symbol,dir:t.direction,openTime:t.openTime}))
  // For each LIVE trade, is there a backtest trade: same symbol, same direction, entry within TOL minutes?
  for(const TOL of [15,30,60]){
    let covered=0
    for(const l of lt){
      const lside=l.side.toLowerCase()==='long'?'buy':'sell'
      if(btTrades.some((b:any)=>b.symbol===l.symbol && b.dir===lside && Math.abs(b.openTime-l.openTime)<=TOL*60)) covered++
    }
    console.log(`TOL=${TOL}min: backtest reproduces ${covered}/${lt.length} live trades (${(covered/lt.length*100).toFixed(0)}%)`)
  }
  console.log(`\nlive trades: ${lt.length} | backtest trades: ${btTrades.length}`)
}
main().catch(e=>console.error('FAIL',e.message))
