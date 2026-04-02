import { Card, Suit } from './deck'

// ---- Player Color Map ----
// Keys match player IDs. Values are CSS variable name strings.
export const PLAYER_COLORS: Record<string, { main: string; dim: string }> = {
  hero: { main: 'var(--gold)',   dim: 'var(--gold-dim)' },
  p2:   { main: 'var(--steel)',  dim: 'var(--steel-dim)' },
  p3:   { main: 'var(--teal)',   dim: 'var(--teal-dim)' },
  p4:   { main: 'var(--coral)',  dim: 'var(--coral-dim)' },
  p5:   { main: 'var(--violet)', dim: 'var(--violet-dim)' },
  p6:   { main: 'var(--slate)',  dim: 'var(--slate-dim)' },
}

export const PLAYER_IDS = ['hero', 'p2', 'p3', 'p4', 'p5', 'p6'] as const
export type PlayerId = typeof PLAYER_IDS[number]

export const PLAYER_LABELS: Record<string, string> = {
  hero: 'Hero',
  p2: 'Player 2',
  p3: 'Player 3',
  p4: 'Player 4',
  p5: 'Player 5',
  p6: 'Player 6',
}

// ---- Types ----

export type PlayerInit = {
  id: string
  label: string
  cards: [Card, Card]
}

export type Scenario = {
  id: string          // url-safe slug, e.g. "aa-vs-kk"
  name: string        // display name for pill button
  players: PlayerInit[]
  story: string       // one line shown below the equity bar
}

// ---- Helper ----
function c(r: number, s: Suit): Card { return { r, s } }

// ---- Scenarios ----
// Sentinel: any card with r === 0 is a placeholder to be replaced with a random card at runtime
export const SCENARIOS: Scenario[] = [
  {
    id: 'aa-vs-kk',
    name: 'AA vs KK',
    players: [
      { id: 'hero', label: 'Hero',    cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2',   label: 'Villain', cards: [c(13,'s'), c(13,'c')] },
    ],
    story: 'Cooler — 80/20 preflop',
  },
  {
    id: 'aks-vs-qq',
    name: 'AKs vs QQ',
    players: [
      { id: 'hero', label: 'Hero',    cards: [c(14,'s'), c(13,'s')] },
      { id: 'p2',   label: 'Villain', cards: [c(12,'h'), c(12,'c')] },
    ],
    story: 'Classic coin flip setup',
  },
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    players: [
      { id: 'hero', label: 'Hero',    cards: [c(14,'h'), c(9,'d')] },
      { id: 'p2',   label: 'Villain', cards: [c(7,'s'),  c(7,'c')] },
    ],
    story: 'Literally a flip',
  },
  {
    id: 'set-up',
    name: 'Set-up',
    players: [
      { id: 'hero', label: 'Hero',    cards: [c(10,'h'), c(10,'d')] },
      { id: 'p2',   label: 'Villain', cards: [c(9,'s'),  c(8,'c')]  },
    ],
    story: 'Overpair vs open-ender',
  },
  {
    id: 'kicker-war',
    name: 'Kicker War',
    players: [
      { id: 'hero', label: 'Hero',    cards: [c(14,'h'), c(10,'c')] },
      { id: 'p2',   label: 'Villain', cards: [c(14,'d'), c(5,'h')]  },
    ],
    story: 'Same pair, kicker decides',
  },
  {
    id: '3-way-all-in',
    name: '3-Way All-In',
    players: [
      { id: 'hero', label: 'Hero',     cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2',   label: 'Player 2', cards: [c(13,'s'), c(13,'c')] },
      { id: 'p3',   label: 'Player 3', cards: [c(12,'h'), c(12,'d')] },
    ],
    story: 'Classic tournament cooler',
  },
  {
    id: 'dominated',
    name: 'Dominated',
    players: [
      { id: 'hero', label: 'Hero',     cards: [c(14,'h'), c(13,'d')] },
      { id: 'p2',   label: 'Player 2', cards: [c(14,'s'), c(12,'c')] },
      { id: 'p3',   label: 'Player 3', cards: [c(14,'d'), c(2,'h')]  },
    ],
    story: 'Kicker hierarchy fully visible',
  },
  {
    id: 'full-table',
    name: 'Full Table',
    players: [
      { id: 'hero', label: 'Hero',     cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2',   label: 'Player 2', cards: [c(0,'h'),  c(0,'h')]  },
      { id: 'p3',   label: 'Player 3', cards: [c(0,'h'),  c(0,'h')]  },
      { id: 'p4',   label: 'Player 4', cards: [c(0,'h'),  c(0,'h')]  },
      { id: 'p5',   label: 'Player 5', cards: [c(0,'h'),  c(0,'h')]  },
      { id: 'p6',   label: 'Player 6', cards: [c(0,'h'),  c(0,'h')]  },
    ],
    story: 'How much equity do aces really have?',
  },
]

// Returns true if a card is a placeholder (r === 0) that must be replaced with a random card at runtime
export function isPlaceholder(card: Card): boolean {
  return card.r === 0
}
