import { simulatePaperBacktest } from '../src/hooks/useBacktestRunner.js'
const BASE='http://localhost:3017'; const rf=globalThis.fetch
;(globalThis as any).fetch=(i:any,init:any)=>rf(typeof i==='string'&&i.startsWith('/')?BASE+i:i,init)
async function main(){
  // Use the user's actually-traded symbols + recent window.
  const r=await rf(BASE+'/api/mexc-trader/closed-pnl?maxTrades=200'); const j=await r.json()
  const toSec=(n:number)=>n>1e12?Math.floor(n/1000):n
  const lt=(j.data.trades||[]).filter((t:any)=>t.closeTime>0)
  const syms=[...new Set(lt.map((t:any)=>t.symbol))].slice(0,60) as string[]
  const end=Math.max(...lt.map((t:any)=>toSec(t.closeTime)))
  const start=end-24*3600  // last 24h
  const base:any={enabledStrategies:['Supertrend + RelVol'],selectedStrategy:'Supertrend + RelVol',entryModel:'breakout_close',isConfluence:false,minConfluence:0,minQuality:0,filterFixedPctSlTp:false,stAtrPeriod:10,stAtrMult:3,stRequireFlip:true,stUseRelVol:true,stRelVolLen:20,stRelVolMin:1.5,stUseHTFAlign:true,stHtfEmaLen:200,stUseAdx:true,stAdxPeriod:14,stAdxMin:22,stUseManualSlTp:false,nearEntryOnly:false,nearEntryPct:100,lastSignalTimeSec:null,lastSignalDirection:null,lastCandleTimeSec:0,timeframe:'5m'}
  const opt:any={startingCapital:100,tradeAmount:1,leverage:20,marginMode:'cross',feeRatePct:0.02,maxOpenPositions:20,source:'mexc',windowStart:start,windowEnd:end}
  // Sweep grid: atrMult x adxMin x requireFlip
  const grid:any[]=[]
  for(const atrMult of [2,3,4]) for(const adxMin of [18,22,28]) for(const flip of [true,false])
    grid.push({atrMult,adxMin,flip})
  console.log(`sweeping ${grid.length} combos over ${syms.length} symbols, 24h window...\n`)
  const results:any[]=[]
  for(const g of grid){
    const bt=await simulatePaperBacktest({symbols:syms,timeframe:'5m',baseSettings:{...base,stAtrMult:g.atrMult,stAdxMin:g.adxMin,stRequireFlip:g.flip},options:opt,onProgress:()=>{}})
    const s=bt.summary
    results.push({...g,trades:s.totalTrades,winrate:+s.winrate.toFixed(1),net:+s.netPnl.toFixed(3),pf:+s.profitFactor.toFixed(2)})
  }
  results.sort((a,b)=>b.net-a.net)
  console.log('rank | atrMult adxMin flip | trades winrate% netPnl  PF')
  results.forEach((r,i)=>console.log(`${String(i+1).padStart(2)}  | ${r.atrMult}      ${r.adxMin}     ${r.flip?'Y':'N'}    | ${String(r.trades).padStart(4)}   ${String(r.winrate).padStart(5)}  ${String(r.net).padStart(7)} ${r.pf}`))
}
main().catch(e=>console.error('FAIL',e.message))
