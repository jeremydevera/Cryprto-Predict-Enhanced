import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'

const wb = XLSX.read(readFileSync(process.argv[2]), { type: 'buffer' })
const trades = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets['Trades'], { defval: '' })
const num = (x: any) => (typeof x === 'number' ? x : parseFloat(x) || 0)
const closed = trades.filter((t) => t.Result !== 'open')

// 1. direction x confluence
console.log('=== DIRECTION x CONFLUENCE (closed trades) ===')
const grid: Record<string, Record<string, { n: number; w: number; r: number }>> = {}
for (const t of closed) {
  const d = String(t.Direction), c = String(t.Confluence)
  grid[d] = grid[d] || {}
  grid[d][c] = grid[d][c] || { n: 0, w: 0, r: 0 }
  grid[d][c].n++; if (t.Result === 'win') grid[d][c].w++; grid[d][c].r += num(t.R)
}
for (const d of Object.keys(grid)) {
  console.log(`\n ${d}:`)
  for (const c of Object.keys(grid[d]).sort()) {
    const v = grid[d][c]
    console.log(`   c${c}  n=${String(v.n).padStart(3)}  win%=${(100*v.w/v.n).toFixed(1).padStart(5)}  R=${v.r.toFixed(2).padStart(7)}`)
  }
}

// 2. "what if" filters
function slice(pred: (t: Record<string, any>) => boolean, label: string) {
  const f = closed.filter(pred)
  const w = f.filter((t) => t.Result === 'win').length
  const r = f.reduce((s, t) => s + num(t.R), 0)
  const pf = (() => {
    const gp = f.filter(t=>num(t.R)>0).reduce((s,t)=>s+num(t.R),0)
    const gl = Math.abs(f.filter(t=>num(t.R)<0).reduce((s,t)=>s+num(t.R),0))
    return gl ? gp/gl : Infinity
  })()
  console.log(`  ${label.padEnd(34)} n=${String(f.length).padStart(4)}  win%=${f.length?(100*w/f.length).toFixed(1):'0'}  R=${r.toFixed(2)}  PF=${pf.toFixed(2)}`)
}
console.log('\n=== "WHAT IF" FILTERS (on closed trades) ===')
slice(() => true, 'baseline (all)')
slice((t) => num(t.Confluence) >= 5, 'confluence >= 5')
slice((t) => num(t.Confluence) >= 6, 'confluence >= 6')
slice((t) => num(t.Confluence) >= 7, 'confluence >= 7')
slice((t) => t.Direction === 'sell', 'short only')
slice((t) => t.Direction === 'buy', 'long only')
slice((t) => t.Direction === 'sell' && num(t.Confluence) >= 6, 'short + confluence>=6')
slice((t) => num(t.Confluence) >= 6 && t.Direction === 'buy', 'long + confluence>=6')

// 3. breakeven-stop rescue potential: losers whose MFE reached >= threshold
console.log('\n=== BREAKEVEN-STOP RESCUE POTENTIAL ===')
const losses = closed.filter((t) => t.Result === 'loss')
for (const thr of [0.5, 1.0, 1.5, 2.0]) {
  const ran = losses.filter((t) => num(t['MFE (R)']) >= thr)
  console.log(`  losers with MFE >= ${thr}R: ${ran.length} of ${losses.length} (${(100*ran.length/losses.length).toFixed(0)}%) — if scratched to 0R instead of -1R, +${ran.length}R recovered`)
}
const mfeBuckets: Record<string, number> = { '<0.5': 0, '0.5-1': 0, '1-1.5': 0, '1.5-2': 0, '>=2': 0 }
for (const t of losses) {
  const m = num(t['MFE (R)'])
  if (m < 0.5) mfeBuckets['<0.5']++
  else if (m < 1) mfeBuckets['0.5-1']++
  else if (m < 1.5) mfeBuckets['1-1.5']++
  else if (m < 2) mfeBuckets['1.5-2']++
  else mfeBuckets['>=2']++
}
console.log('  MFE distribution of losers:', JSON.stringify(mfeBuckets))
