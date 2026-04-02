export type Suit = 'h' | 'd' | 'c' | 's'
export type Card = { r: number; s: Suit }

export const SUIT_SYMBOLS: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }

export const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }

export const RED_SUITS: Set<Suit> = new Set<Suit>(['h', 'd'])

export function rankLabel(r: number): string {
  return RANK_LABELS[r] ?? String(r)
}

export function cardKey(c: Card): string {
  return `${c.r}_${c.s}`
}

export function mkDeck(): Card[] {
  const d: Card[] = []
  const suits: Suit[] = ['h', 'd', 'c', 's']
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  suits.forEach(s => ranks.forEach(r => d.push({ r, s })))
  return d
}

export function shuf(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function strip(deck: Card[], dead: Card[]): Card[] {
  const s = new Set(dead.map(cardKey))
  return deck.filter(c => !s.has(cardKey(c)))
}

export function combos<T>(arr: T[], k: number): T[][] {
  if (k === arr.length) return [arr]
  if (k === 1) return arr.map(x => [x])
  const res: T[][] = []
  for (let i = 0; i <= arr.length - k; i++) {
    combos(arr.slice(i + 1), k - 1).forEach(c => res.push([arr[i], ...c]))
  }
  return res
}

export function cardToTuple(c: Card): [number, string] {
  return [c.r, c.s]
}

export function tupleToCard(t: [number, string]): Card {
  return { r: t[0], s: t[1] as Suit }
}
