import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('usage: tsx read-export.ts <file.xlsx>'); process.exit(1) }

const wb = XLSX.read(readFileSync(file), { type: 'buffer' })
const S = (n: string) => XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[n], { defval: '' })

const summary = S('Summary')[0]
const diag = S('Diagnostics')[0]
const settings = S('Settings')
const trades = S('Trades')
const symbols = S('Per-Symbol')

console.log('========== SUMMARY ==========')
console.log(JSON.stringify(summary, null, 2))
console.log('\n========== DIAGNOSTICS ==========')
console.log(JSON.stringify(diag, null, 2))

console.log('\n========== SETTINGS (non-empty) ==========')
// Settings sheet is a matrix: col __EMPTY headers. Print as key/value where the 2nd col has data.
for (const r of settings) {
  const vals = Object.values(r)
  const line = vals.map((v) => (v === '' ? '·' : v)).join(' | ')
  console.log(line)
}

// ---- Trade aggregates ----
const num = (x: any) => (typeof x === 'number' ? x : parseFloat(x) || 0)
const wins = trades.filter((t) => t.Result === 'win')
const losses = trades.filter((t) => t.Result === 'loss')
const sumR = trades.reduce((s, t) => s + num(t.R), 0)

// by close reason
const byReason: Record<string, { n: number; r: number }> = {}
for (const t of trades) {
  const k = String(t['Close Reason'])
  byReason[k] = byReason[k] || { n: 0, r: 0 }
  byReason[k].n++; byReason[k].r += num(t.R)
}
// by direction
const byDir: Record<string, { n: number; w: number; r: number }> = {}
for (const t of trades) {
  const k = String(t.Direction)
  byDir[k] = byDir[k] || { n: 0, w: 0, r: 0 }
  byDir[k].n++; if (t.Result === 'win') byDir[k].w++; byDir[k].r += num(t.R)
}
// by quality and confluence
const byQ: Record<string, { n: number; w: number; r: number }> = {}
for (const t of trades) {
  const k = String(t.Quality)
  byQ[k] = byQ[k] || { n: 0, w: 0, r: 0 }
  byQ[k].n++; if (t.Result === 'win') byQ[k].w++; byQ[k].r += num(t.R)
}
const byC: Record<string, { n: number; w: number; r: number }> = {}
for (const t of trades) {
  const k = String(t.Confluence)
  byC[k] = byC[k] || { n: 0, w: 0, r: 0 }
  byC[k].n++; if (t.Result === 'win') byC[k].w++; byC[k].r += num(t.R)
}

// MFE/MAE behaviour
const avgMfeLoss = losses.length ? losses.reduce((s, t) => s + num(t['MFE (R)']), 0) / losses.length : 0
const avgMaeWin = wins.length ? wins.reduce((s, t) => s + num(t['MAE (R)']), 0) / wins.length : 0

console.log('\n========== TRADE AGGREGATES ==========')
console.log(`Total trades: ${trades.length} | wins ${wins.length} | losses ${losses.length} | sumR ${sumR.toFixed(2)}`)
console.log('\nBy close reason:')
for (const [k, v] of Object.entries(byReason)) console.log(`  ${k.padEnd(12)} n=${String(v.n).padStart(4)}  R=${v.r.toFixed(2)}`)
console.log('\nBy direction:')
for (const [k, v] of Object.entries(byDir)) console.log(`  ${k.padEnd(6)} n=${String(v.n).padStart(4)}  win%=${(100*v.w/v.n).toFixed(1)}  R=${v.r.toFixed(2)}`)
console.log('\nBy quality:')
for (const [k, v] of Object.entries(byQ).sort((a,b)=>+a[0]-+b[0])) console.log(`  q${k}  n=${String(v.n).padStart(4)}  win%=${(100*v.w/v.n).toFixed(1)}  R=${v.r.toFixed(2)}  avgR=${(v.r/v.n).toFixed(3)}`)
console.log('\nBy confluence:')
for (const [k, v] of Object.entries(byC).sort((a,b)=>+a[0]-+b[0])) console.log(`  c${k}  n=${String(v.n).padStart(4)}  win%=${(100*v.w/v.n).toFixed(1)}  R=${v.r.toFixed(2)}  avgR=${(v.r/v.n).toFixed(3)}`)
console.log(`\nAvg MFE on LOSSES: ${avgMfeLoss.toFixed(2)}R  (how far losers ran in profit before reversing)`)
console.log(`Avg MAE on WINS:   ${avgMaeWin.toFixed(2)}R  (how deep winners drew down before working)`)

// ---- Per-symbol ----
const traded = symbols.filter((s) => num(s.Trades) > 0)
const sorted = [...traded].sort((a, b) => num(b['Total R']) - num(a['Total R']))
console.log('\n========== PER-SYMBOL ==========')
console.log(`Symbols with >=1 trade: ${traded.length} of ${symbols.length}`)
console.log('\nTop 15 by R:')
for (const s of sorted.slice(0, 15)) console.log(`  ${String(s.Symbol).padEnd(12)} n=${String(s.Trades).padStart(3)}  win%=${String(s['Win Rate %']).padStart(5)}  R=${num(s['Total R']).toFixed(2)}`)
console.log('\nBottom 15 by R:')
for (const s of sorted.slice(-15)) console.log(`  ${String(s.Symbol).padEnd(12)} n=${String(s.Trades).padStart(3)}  win%=${String(s['Win Rate %']).padStart(5)}  R=${num(s['Total R']).toFixed(2)}`)

const zero = traded.filter((s) => num(s['Win Rate %']) === 0)
const perfect = traded.filter((s) => num(s['Win Rate %']) === 100)
const losers = traded.filter((s) => num(s['Total R']) < 0)
console.log(`\n0% winrate symbols: ${zero.length} (total R ${zero.reduce((a,s)=>a+num(s['Total R']),0).toFixed(2)})`)
console.log(`100% winrate symbols: ${perfect.length} (total R ${perfect.reduce((a,s)=>a+num(s['Total R']),0).toFixed(2)})`)
console.log(`Net-negative symbols: ${losers.length} (total R ${losers.reduce((a,s)=>a+num(s['Total R']),0).toFixed(2)})`)
const winnersR = traded.filter(s=>num(s['Total R'])>0).reduce((a,s)=>a+num(s['Total R']),0)
console.log(`Net-positive symbols: ${traded.filter(s=>num(s['Total R'])>0).length} (total R ${winnersR.toFixed(2)})`)
