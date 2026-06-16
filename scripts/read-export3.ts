import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'

const wb = XLSX.read(readFileSync(process.argv[2]), { type: 'buffer' })
const trades = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets['Trades'], { defval: '' })
const num = (x: any) => (typeof x === 'number' ? x : parseFloat(x) || 0)
const closed = trades.filter((t) => t.Result !== 'open')

// ── 1. TP sweep from MFE: TP at T R → any closed trade whose MFE >= T wins +T, else -1R ──
console.log('=== TP-LEVEL RESIM (from MFE, closed trades only, R units) ===')
console.log('   (current: SL 1.5% / TP 5% = 3.33R target)')
for (const T of [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 3.33]) {
  let wins = 0, losses = 0
  for (const t of closed) {
    if (num(t['MFE (R)']) >= T) wins++
    else losses++
  }
  const totalR = wins * T - losses
  const wr = (100 * wins) / closed.length
  const beWr = 100 / (1 + T)
  console.log(`  TP ${T.toFixed(2)}R → win% ${wr.toFixed(1).padStart(5)} (need ${beWr.toFixed(1)})  R = ${totalR.toFixed(1).padStart(7)}  (${wins}W/${losses}L)`)
}

// ── 2. TP sweep + breakeven stop after +A R (loser with MFE>=A scratches at 0) ──
console.log('\n=== TP x BREAKEVEN-ARM RESIM ===')
for (const T of [1.0, 1.5, 2.0, 2.5, 3.33]) {
  for (const A of [0.5, 0.75, 1.0]) {
    if (A >= T) continue
    let r = 0, w = 0, sc = 0, l = 0
    for (const t of closed) {
      const mfe = num(t['MFE (R)'])
      if (mfe >= T) { r += T; w++ }
      else if (mfe >= A) { sc++ }       // armed BE, scratched ~0
      else { r -= 1; l++ }
    }
    console.log(`  TP ${T.toFixed(2)}R + BE@${A}R → R = ${r.toFixed(1).padStart(7)}  (${w}W / ${sc}BE / ${l}L)`)
  }
}

// ── 3. Direction × day (UTC) — regime check ──
console.log('\n=== DIRECTION x DAY ===')
const byDay: Record<string, Record<string, { n: number; w: number; r: number }>> = {}
for (const t of closed) {
  const day = String(t['Open Time']).slice(0, 10)
  const d = String(t.Direction)
  byDay[day] = byDay[day] || {}
  byDay[day][d] = byDay[day][d] || { n: 0, w: 0, r: 0 }
  byDay[day][d].n++; if (t.Result === 'win') byDay[day][d].w++; byDay[day][d].r += num(t.R)
}
for (const day of Object.keys(byDay).sort()) {
  const parts = Object.entries(byDay[day]).map(([d, v]) => `${d}: n=${v.n} win%=${(100*v.w/v.n).toFixed(0)} R=${v.r.toFixed(1)}`)
  console.log(`  ${day}  ${parts.join('  |  ')}`)
}

// ── 4. Signals column — what checks fired ──
console.log('\n=== SIGNALS STRINGS (top 12 distinct) ===')
const sigCount: Record<string, { n: number; w: number; r: number }> = {}
for (const t of closed) {
  const s = String(t.Signals)
  sigCount[s] = sigCount[s] || { n: 0, w: 0, r: 0 }
  sigCount[s].n++; if (t.Result === 'win') sigCount[s].w++; sigCount[s].r += num(t.R)
}
for (const [s, v] of Object.entries(sigCount).sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
  console.log(`  [n=${v.n} win%=${(100*v.w/v.n).toFixed(0)} R=${v.r.toFixed(1)}]  ${s.slice(0, 110)}`)
}

// ── 5. Per-direction MFE profile — does the BE/TP fix differ by side? ──
console.log('\n=== PER-DIRECTION TP RESIM (TP 1.5R) ===')
for (const dir of ['buy', 'sell']) {
  const f = closed.filter((t) => t.Direction === dir)
  for (const T of [1.0, 1.5]) {
    const w = f.filter((t) => num(t['MFE (R)']) >= T).length
    const r = w * T - (f.length - w)
    console.log(`  ${dir.padEnd(5)} TP ${T}R → win% ${(100*w/f.length).toFixed(1).padStart(5)}  R = ${r.toFixed(1).padStart(7)}  (n=${f.length})`)
  }
}

// ── 6. Volume regime tag in signals (LOW/MEDIUM/HIGH VOL) ──
console.log('\n=== VOL REGIME TAG ===')
const volTag: Record<string, { n: number; w: number; r: number }> = {}
for (const t of closed) {
  const m = String(t.Signals).match(/\[(LOW|MEDIUM|HIGH) VOL\]/)
  const k = m ? m[1] : 'none'
  volTag[k] = volTag[k] || { n: 0, w: 0, r: 0 }
  volTag[k].n++; if (t.Result === 'win') volTag[k].w++; volTag[k].r += num(t.R)
}
for (const [k, v] of Object.entries(volTag)) console.log(`  ${k.padEnd(8)} n=${String(v.n).padStart(4)}  win%=${(100*v.w/v.n).toFixed(1)}  R=${v.r.toFixed(1)}`)
