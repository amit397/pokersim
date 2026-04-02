import { type Card, type Suit } from './deck'

/**
 * Parse a two-card shorthand string into [Card, Card].
 * Accepts: "AhKd", "Ah Kd", "ah kd", "A♥ K♦", "AH KD"
 * Returns null on invalid input.
 */
export function parseCardString(input: string): [Card, Card] | null {
  // 1. Normalize: uppercase, replace Unicode suits, strip whitespace
  const s = input.toUpperCase()
    .replace(/♥/g, 'H').replace(/♦/g, 'D').replace(/♣/g, 'C').replace(/♠/g, 'S')
    .replace(/\s+/g, '')

  // 2. Parse two cards from the normalized string
  // Handle "10" as a rank (e.g. "10H" = Ten of hearts) — but compact format uses T
  // Support both "T" and "10" for ten
  const rankMap: Record<string, number> = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    'T':10,'10':10,'J':11,'Q':12,'K':13,'A':14
  }
  const suitMap: Record<string, Suit> = { 'H':'h','D':'d','C':'c','S':'s' }

  function parseOne(str: string): Card | null {
    if (str.length < 2) return null
    const suit = suitMap[str[str.length - 1]]
    if (!suit) return null
    const rankStr = str.slice(0, -1)
    const rank = rankMap[rankStr]
    if (!rank) return null
    return { r: rank, s: suit }
  }

  // Try splitting as: first card = chars until we hit a suit letter, second card = rest
  // Strategy: try each possible split point
  for (let splitAt = 1; splitAt < s.length - 1; splitAt++) {
    const c1 = parseOne(s.slice(0, splitAt + 1))
    const c2 = parseOne(s.slice(splitAt + 1))
    if (c1 && c2 && !(c1.r === c2.r && c1.s === c2.s)) {
      return [c1, c2]
    }
  }
  return null
}

/**
 * Format two cards to display string: "Ah Kd"
 */
export function formatCards(cards: [Card, Card]): string {
  const rankLabel: Record<number, string> = { 10:'T',11:'J',12:'Q',13:'K',14:'A' }
  return cards.map(c => `${rankLabel[c.r] ?? c.r}${c.s}`).join(' ')
}
