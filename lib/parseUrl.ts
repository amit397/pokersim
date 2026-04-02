import { Card, Suit } from './deck'

// Rank encoding: 2-9 as digit char, T=10, J=11, Q=12, K=13, A=14
const RANK_ENCODE: Record<number, string> = {
  2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9',
  10:'T', 11:'J', 12:'Q', 13:'K', 14:'A'
}
const RANK_DECODE: Record<string, number> = Object.fromEntries(
  Object.entries(RANK_ENCODE).map(([k, v]) => [v, Number(k)])
)
const VALID_SUITS = new Set<string>(['h','d','c','s'])

/**
 * Encode a card to a 2-char string: rank + suit
 * e.g. {r:14,s:'h'} → "Ah", {r:10,s:'s'} → "Ts"
 */
export function encodeCard(card: Card): string {
  return (RANK_ENCODE[card.r] ?? String(card.r)) + card.s
}

/**
 * Decode a 2-char string to Card, or null if invalid.
 * Accepts "Ah", "ah" (case-insensitive rank), "2h" etc.
 */
export function decodeCard(str: string): Card | null {
  if (!str || str.length < 2) return null
  const rankChar = str[0].toUpperCase()
  const suitChar = str[str.length - 1].toLowerCase()
  const r = RANK_DECODE[rankChar]
  if (r === undefined) return null
  if (!VALID_SUITS.has(suitChar)) return null
  return { r, s: suitChar as Suit }
}

/**
 * Encode full hand state to URL search params string (no leading ?).
 * Format: p=AhAd,KsKc&b=2h5dJs
 * players: array of hole card pairs (each player = 2 cards)
 * board: 0-5 community cards in deal order
 */
export function encodeHandState(players: Card[][], board: Card[]): string {
  const p = players.map(pair => pair.map(encodeCard).join('')).join(',')
  const b = board.map(encodeCard).join('')
  const params = new URLSearchParams()
  params.set('p', p)
  if (b) params.set('b', b)
  return params.toString()
}

/**
 * Decode URL search params to hand state.
 * Supports both:
 *   p=AhAd,KsKc&b=2h5dJs  (multi-player format)
 *   h=AhAd&v=KsKc&b=...   (legacy heads-up format)
 *
 * Returns null if parsing fails: invalid cards, duplicates, wrong card count per player.
 */
export function decodeHandState(params: URLSearchParams): {
  players: Card[][]
  board: Card[]
} | null {
  try {
    let playerStrings: string[] = []

    const pParam = params.get('p')
    if (pParam) {
      playerStrings = pParam.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      // Legacy format
      const h = params.get('h')
      const v = params.get('v')
      if (h) playerStrings.push(h)
      if (v) playerStrings.push(v)
    }

    if (playerStrings.length < 2) return null

    // Parse each player's cards — each player string is exactly 4 chars (2 cards × 2 chars)
    const players: Card[][] = []
    for (const ps of playerStrings) {
      if (ps.length !== 4) return null
      const c1 = decodeCard(ps.slice(0, 2))
      const c2 = decodeCard(ps.slice(2, 4))
      if (!c1 || !c2) return null
      players.push([c1, c2])
    }

    // Parse board
    const boardParam = params.get('b') ?? ''
    if (boardParam.length % 2 !== 0) return null
    const board: Card[] = []
    for (let i = 0; i < boardParam.length; i += 2) {
      const card = decodeCard(boardParam.slice(i, i + 2))
      if (!card) return null
      board.push(card)
    }
    if (board.length > 5) return null

    // Validate uniqueness — no card can appear twice
    const allCards = [...players.flat(), ...board]
    const seen = new Set<string>()
    for (const card of allCards) {
      const key = `${card.r}_${card.s}`
      if (seen.has(key)) return null
      seen.add(key)
    }

    return { players, board }
  } catch {
    return null
  }
}
