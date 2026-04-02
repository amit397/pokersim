import { Card, combos } from './deck'

export const HAND_NAMES: string[] = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'
]

export type HandResult = {
  hr: number    // 0-8 hand rank index
  score: number // numeric score encoding rank + kickers for tiebreaking
}

export function eval5(cards: Card[]): HandResult {
  const rs = cards.map(c => c.r).sort((a, b) => b - a)
  const suits = cards.map(c => c.s)
  const isF = suits.every(s => s === suits[0])
  let isSt = false, stH = 0
  if (rs[0] - rs[4] === 4 && new Set(rs).size === 5) { isSt = true; stH = rs[0] }
  if (rs[0] === 14 && rs[1] === 5 && rs[2] === 4 && rs[3] === 3 && rs[4] === 2) { isSt = true; stH = 5 }
  const rc: Record<number, number> = {}
  rs.forEach(r => rc[r] = (rc[r] || 0) + 1)
  const cts = Object.values(rc).sort((a, b) => b - a)
  const crs = Object.entries(rc)
    .sort((a, b) => b[1] - a[1] || +b[0] - +a[0])
    .map(e => +e[0])
  let hr: number, tb: number[]
  if (isF && isSt) { hr = 8; tb = [stH] }
  else if (cts[0] === 4) { hr = 7; tb = crs }
  else if (cts[0] === 3 && cts[1] === 2) { hr = 6; tb = crs }
  else if (isF) { hr = 5; tb = rs }
  else if (isSt) { hr = 4; tb = [stH] }
  else if (cts[0] === 3) { hr = 3; tb = crs }
  else if (cts[0] === 2 && cts[1] === 2) { hr = 2; tb = crs }
  else if (cts[0] === 2) { hr = 1; tb = crs }
  else { hr = 0; tb = rs }
  const score = hr * 1e10 + tb.reduce((a, v, i) => a + v * Math.pow(100, 4 - i), 0)
  return { hr, score }
}

export function best(hole: Card[], board: Card[]): HandResult {
  const all = [...hole, ...board]
  const cs = combos(all, 5)
  let b: HandResult | null = null
  cs.forEach(c => {
    const v = eval5(c)
    if (!b || v.score > b.score) b = v
  })
  return b!
}
