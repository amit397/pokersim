# Poker Equity Visualizer — Implementation Plan

## Part 1: Spec Addendum

The following are overrides, clarifications, and additions to `poker-equity-visualizer-spec.md`. Where this addendum conflicts with the original spec, this addendum wins.

---

### A1. Stack Decisions

| Decision | Resolution |
|---|---|
| Next.js version | **14** (App Router). Pin `next@14` in `package.json`. |
| Web Worker bundling | Webpack 5 native: `new Worker(new URL('./equity.worker.ts', import.meta.url))`. Add `config.resolve.fallback = { fs: false }` to `next.config.js` only if needed. No Comlink, no worker-loader. |
| State management | Single custom hook `usePokerState` in `hooks/usePokerState.ts` using `useReducer` internally. No external state libraries. All game state flows through this hook. `page.tsx` calls the hook and passes props down. |
| Animation library | **Framer Motion everywhere** — equity bar, card flips, number counters, screen shake, result banner entrance, sparkline path draw. No raw CSS `@keyframes` or `requestAnimationFrame` for any user-facing animation. |

### A2. Framer Motion Specifics

**Card flip** — Implement with `motion.div` using `initial={{ rotateY: 90, scale: 0.88, opacity: 0 }}` and `animate={{ rotateY: 0, scale: 1, opacity: 1 }}` with `transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}`. Flop stagger: use `custom` prop with index (0, 1, 2) and `delay: custom * 0.16`.

**Equity bar** — `motion.div` with `animate={{ width: \`${equity}%\` }}` and `transition={{ type: "spring", stiffness: 80, damping: 14 }}`. This gives the overshoot-then-settle feel. The segmented multi-player bar uses the same spring per segment.

**Number counter** — Use `useSpring(equityValue, { stiffness: 80, damping: 20 })` piped through `useTransform(spring, v => Math.round(v))`. Render the transformed value. This is GPU-composited and causes zero layout thrash.

**Equity bar flash on dramatic swing (>25% change):**
```tsx
// On the bar's motion.div:
animate={{
  width: `${equity}%`,
  filter: isFlash ? "brightness(1.6)" : "brightness(1)"
}}
// isFlash is set true for 120ms via useEffect when |delta| > 25
```

**Equity bar pulse on extremes:**
- Hero < 15%: bar background briefly flashes `var(--red-suit)` for 300ms (opacity 0 → 0.4 → 0)
- Hero > 85%: bar briefly flashes `var(--gold)` at brightness 1.8 for 300ms

**Screen shake** — `motion.div` wrapper on page content:
```tsx
const shakeVariants = {
  idle: { x: 0 },
  badBeat: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  twoOuter: {
    x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0],
    transition: { duration: 0.7, ease: "easeInOut" }
  }
}
```

**Result banner** — `motion.div` with `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.5, ease: "easeOut" }}`.

### A3. Additional Player Colors (Noir Palette)

The spec lists player colors as "teal, coral, violet, slate" for P3–P6 but gives no hex values. Here are the prescribed values, tuned to sit on dark felt:

```css
--teal:       #4a9e8a;   /* P3 accent */
--teal-dim:   #2d6b5c;
--coral:      #b06050;   /* P4 accent */
--coral-dim:  #7a4238;
--violet:     #9080b8;   /* P5 accent */
--violet-dim: #635890;
--slate:      #8894a0;   /* P6 accent */
--slate-dim:  #5c6670;
```

Player color map (used everywhere):
```ts
const PLAYER_COLORS: Record<string, { main: string; dim: string }> = {
  hero: { main: 'var(--gold)',   dim: 'var(--gold-dim)' },
  p2:   { main: 'var(--steel)',  dim: 'var(--steel-dim)' },
  p3:   { main: 'var(--teal)',   dim: 'var(--teal-dim)' },
  p4:   { main: 'var(--coral)',  dim: 'var(--coral-dim)' },
  p5:   { main: 'var(--violet)', dim: 'var(--violet-dim)' },
  p6:   { main: 'var(--slate)',  dim: 'var(--slate-dim)' },
}
```

### A4. Responsive Breakpoint

**Single breakpoint: `768px` (Tailwind `md`).** Below 768px = mobile layout. Above = desktop.

- Mobile: cards at 52px wide, equity numbers at 48px, board + hole cards stack vertically
- Desktop: cards at 70px wide, equity numbers at 64px, layout as in spec diagram

No intermediate breakpoints. Two modes only.

### A5. Card Picker Modal Behavior

- **Desktop (≥768px):** centered overlay dialog with semi-transparent felt backdrop (`rgba(7, 22, 10, 0.85)`)
- **Mobile (<768px):** full-screen overlay, grid fills viewport with comfortable touch targets (min 44px per cell)
- Dismiss: click outside (desktop) or tap a dedicated `✕` close button (always present)
- The picker receives `outsCards: Card[]` as a prop. Out cards render with a 2px ring in the color of the player they benefit. This is a display-only prop — no computation happens inside the picker.

### A6. Outs Computation Strategy

Outs are computed **inside the Web Worker** alongside equity, not in a separate pass. The worker already iterates remaining cards for Monte Carlo; computing outs adds negligible overhead.

**Worker request/response protocol:**

```ts
// Request
type EquityRequest = {
  id: number                // correlation ID for async matching
  players: [number, string][][] // Card as [rank, suit] tuples (structured cloneable)
  board: [number, string][]
  iterations: number        // default 4000
}

// Response
type EquityResponse = {
  id: number
  equity: number[]          // one per player, sums to ~100
  outs: [number, string][]  // cards that flip the current leader
  outsBeneficiary: string[] // parallel array: player ID who benefits from each out
}
```

**Why tuples instead of objects:** `postMessage` uses structured clone. Plain arrays (`[14, 'h']`) clone faster than objects (`{ r: 14, s: 'h' }`). Convert at the boundary.

### A7. "Calculating..." Pulse

No minimum display time. The pulse appears when the worker starts and disappears when the response arrives. Since computation is <100ms, the pulse will be a brief flash — that's fine. It signals responsiveness without artificial delay.

Implementation: a `isCalculating` boolean from `useEquity` hook. When true, the equity numbers show a subtle Framer Motion pulse animation (opacity oscillation 1 → 0.5 → 1, duration 600ms, repeat). It will naturally interrupt when the value arrives.

### A8. URL Schema

```
?p=AhAd,KsKc&b=2h5dJsTs9c
```

- `p` — comma-separated players, each player is two cards concatenated (e.g., `AhAd`). First player is always Hero.
- `b` — board cards concatenated in deal order (first 3 = flop, 4th = turn, 5th = river). 0–5 cards.
- Heads-up shorthand `?h=AhAd&v=KsKc&b=...` also supported for backwards compatibility (converted to `p=` format internally).

**On load with URL params:**
1. Parse and validate (fallback to AA vs KK on any error)
2. Set hole cards immediately (no animation — they're "already known")
3. Auto-deal: flop at 0ms, turn at 1200ms, river at 2400ms — with full card flip + equity bar animations
4. Show result banner after river settles (~3000ms from load)

### A9. "Full Table" Preset

The "Full Table" (AA vs 5 random) preset generates **truly random** hands on each selection. The 5 opponents get random undealt cards. No seed, no determinism.

### A10. Felt Grain Texture

SVG `<feTurbulence>` filter applied via a pseudo-element overlay on the body/main container:

```tsx
// In globals.css or as an inline SVG in layout.tsx
<svg width="0" height="0" style={{ position: 'absolute' }}>
  <filter id="felt-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
  </filter>
</svg>

// Applied via CSS pseudo-element on .felt-bg::after
.felt-bg::after {
  content: '';
  position: fixed;
  inset: 0;
  filter: url(#felt-grain);
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
}
```

### A11. Text Shorthand Input

Build fully as spec'd. Parser in `lib/parseCards.ts`:

```ts
function parseCardString(input: string): [Card, Card] | null
// Accepts: "AhKd", "Ah Kd", "ah kd", "A♥ K♦", "AH KD"
// Returns null on invalid input
```

- Input sits below each player's hole cards as a small monospace text field
- On valid parse: update cards, rerun Monte Carlo
- On invalid: field shakes (Framer Motion `x: [0, -4, 4, -4, 4, 0]` over 300ms), text reverts to current cards after 1s
- Field auto-formats to `Ah Kd` style on blur

### A12. File Structure Override

Add `hooks/` directory to the spec's file structure:

```
├── hooks/
│   ├── usePokerState.ts    # Game state reducer + actions
│   └── useEquity.ts        # Web Worker communication
```

### A13. Scenario Data — Complete Player Definitions

Every scenario must include full `Player[]` arrays with IDs and colors pre-assigned. The `Scenario` type:

```ts
type Scenario = {
  id: string              // url-safe slug: "aa-vs-kk"
  name: string            // display: "AA vs KK"
  players: PlayerInit[]   // 2–6 players
  story: string           // "Cooler — 80/20 preflop"
}

type PlayerInit = {
  id: string              // "hero" | "p2" | "p3" | "p4" | "p5" | "p6"
  label: string           // "Hero" | "Player 2" ...
  cards: [Card, Card]
}
```

Colors are not stored per scenario — they're derived from `id` via the `PLAYER_COLORS` map.

---

## Part 2: Task Breakdown

### Phase 1 — Foundation (no UI, no browser)

---

**Task 1: Project Scaffolding**

**File(s):** `package.json`, `next.config.js`, `tsconfig.json`, `.gitignore`, `tailwind.config.ts`, `postcss.config.js`

**Depends on:** none

**What to build:**

Initialize a Next.js 14 App Router project with TypeScript and Tailwind CSS. Specific steps:

1. Run `npx create-next-app@14 . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-npm` (or manually create the files if running the CLI is not available in the agent context)
2. Install Framer Motion: `npm install framer-motion`
3. Install Google Fonts helper: `npm install @next/font` (or use `next/font/google` which is built in to Next 14)
4. In `next.config.js`, set:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     webpack: (config) => {
       config.resolve.fallback = { ...config.resolve.fallback, fs: false };
       return config;
     },
   };
   module.exports = nextConfig;
   ```
5. In `tsconfig.json`, ensure `"strict": true` and `"paths": { "@/*": ["./*"] }`.
6. Create empty directories: `lib/`, `components/`, `hooks/`, `workers/`.
7. Delete any boilerplate files from create-next-app that are not needed (e.g., `app/favicon.ico` can stay, but delete default page content, default globals.css content, etc.)

**Reference from prototype:** N/A — scaffolding only.

**Done when:** `npm run dev` starts without errors and shows a blank page. `tsconfig.json` has `strict: true`. `framer-motion` is in `package.json` dependencies. The directories `lib/`, `components/`, `hooks/`, `workers/` exist.

---

**Task 2: Global Styles — CSS Variables, Felt Background, Grain Texture, Typography**

**File(s):** `app/globals.css`, `app/layout.tsx`

**Depends on:** Task 1

**What to build:**

**`app/globals.css`:**

Define all CSS custom properties on `:root`:

```css
:root {
  --felt:        #07160a;
  --felt-mid:    #0e2210;
  --felt-light:  #152d17;
  --gold:        #b8943a;
  --gold-dim:    #7a5f22;
  --steel:       #4a85b0;
  --steel-dim:   #2d5570;
  --teal:        #4a9e8a;
  --teal-dim:    #2d6b5c;
  --coral:       #b06050;
  --coral-dim:   #7a4238;
  --violet:      #9080b8;
  --violet-dim:  #635890;
  --slate:       #8894a0;
  --slate-dim:   #5c6670;
  --ivory:       #f6f0e2;
  --ivory-dim:   #e8dfc8;
  --parchment:   #ddd5bc;
  --ghost:       #4a6650;
  --red-suit:    #b52b2b;
  --black-suit:  #111111;
}
```

Set `body` background to `var(--felt)`, color to `var(--parchment)`, and `min-height: 100vh`.

Add the felt grain overlay. Place an inline SVG with the `<feTurbulence>` filter in `layout.tsx` (inside the `<body>`, before `{children}`):

```tsx
<svg width="0" height="0" style={{ position: 'absolute' }}>
  <filter id="felt-grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="saturate" values="0" />
  </filter>
</svg>
```

Add the pseudo-element in `globals.css`:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  filter: url(#felt-grain);
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
}
```

**`app/layout.tsx`:**

- Import `Playfair_Display` and `JetBrains_Mono` from `next/font/google`.
  - `Playfair_Display`: weights `[400, 700]`, subsets `['latin']`, variable `--font-display`
  - `JetBrains_Mono`: weights `[400, 500]`, subsets `['latin']`, variable `--font-mono`
- Apply both font variables to the `<html>` element's `className`.
- Set `<html lang="en">`.
- Metadata: `title: "Poker Equity Visualizer"`, `description: "Watch probability shift with every card."`.
- Import `./globals.css`.
- Include the felt-grain SVG element inside `<body>` as described above.

In `globals.css`, set font-family usage:
```css
body {
  font-family: var(--font-display), Georgia, serif;
}

.font-mono {
  font-family: var(--font-mono), 'IBM Plex Mono', monospace;
}
```

Also add a Tailwind `@layer base` reset: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`.

**Reference from prototype:** Lines 1–3 (background, font-family, color). The prototype uses `Georgia, serif` and `monospace` — we're upgrading to Google Fonts with the same fallbacks.

**Done when:** The page renders with a near-black green background (`#07160a`), a subtle grain texture overlay is visible on close inspection, the browser tab shows "Poker Equity Visualizer", and inspecting the `<html>` element in devtools shows both `--font-display` and `--font-mono` CSS variables active.

---

**Task 3: Deck Utilities**

**File(s):** `lib/deck.ts`

**Depends on:** Task 1

**What to build:**

Port the deck utility functions from the prototype with full TypeScript types.

```ts
export type Suit = 'h' | 'd' | 'c' | 's'
export type Card = { r: number; s: Suit }

// Human-readable suit symbols
export const SUIT_SYMBOLS: Record<Suit, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }

// Rank display labels
export const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }

// Suits that render in red
export const RED_SUITS: Set<Suit> = new Set(['h', 'd'])

// Display a rank as string: 2-10 as-is, 11='J', 12='Q', 13='K', 14='A'
export function rankLabel(r: number): string

// Unique string key for a card, used for Set/Map operations: e.g. "14_h"
export function cardKey(c: Card): string

// Create a standard 52-card deck, ordered by suit then rank
export function mkDeck(): Card[]

// Fisher-Yates shuffle, returns a NEW array (does not mutate input)
export function shuf(deck: Card[]): Card[]

// Remove dead cards from a deck, returns a NEW array
// Uses cardKey for matching
export function strip(deck: Card[], dead: Card[]): Card[]

// Generate all C(n,k) combinations from an array
export function combos<T>(arr: T[], k: number): T[][]

// Convert Card to a wire-safe tuple for postMessage: [rank, suitChar]
export function cardToTuple(c: Card): [number, string]

// Convert tuple back to Card
export function tupleToCard(t: [number, string]): Card
```

Port the implementations exactly from the prototype (lines 90–107). The `combos` function uses the recursive approach from the prototype. `shuf` must return a new array (the prototype already spreads: `d=[...d]`). Add `cardToTuple` and `tupleToCard` as thin converters.

**Reference from prototype:** `mkDeck` (line 97), `shuf` (line 98), `strip` (line 99), `combos` (lines 101–106), `rl` (line 95), `ck` (line 96).

**Done when:** All functions are exported and typed. `mkDeck()` returns exactly 52 cards. `shuf(mkDeck())` returns 52 cards in a different order (with high probability). `strip(mkDeck(), [{r:14,s:'h'}])` returns 51 cards. `combos([1,2,3,4], 2)` returns 6 combinations. `cardToTuple({r:14,s:'h'})` returns `[14,'h']` and `tupleToCard([14,'h'])` returns `{r:14,s:'h'}`. TypeScript compiles with no errors.

---

**Task 4: Hand Evaluator**

**File(s):** `lib/evaluator.ts`

**Depends on:** Task 3

**What to build:**

Port `eval5` and `best` from the prototype.

```ts
import { Card, combos } from './deck'

// Hand rank names, indexed 0-8
export const HAND_NAMES: string[] = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'
]

export type HandResult = {
  hr: number    // 0-8 hand rank index
  score: number // numeric score encoding rank + kickers for tiebreaking
}

// Evaluate exactly 5 cards. Returns hand rank and a numeric score.
// Score formula: hr * 1e10 + tiebreakers in base-100 positional notation.
export function eval5(cards: Card[]): HandResult

// Find the best 5-card hand from hole cards + board cards.
// Generates all C(n,5) combinations where n = hole.length + board.length.
// Returns the HandResult with the highest score.
export function best(hole: Card[], board: Card[]): HandResult
```

Port the logic exactly from the prototype (lines 109–138). Key details to preserve:
- Straight detection: standard (high card - low card === 4, all unique ranks) AND wheel (A-2-3-4-5 where stH=5)
- Rank counting: `Object.entries(rc).sort((a,b) => b[1]-a[1] || +b[0]-+a[0])` — sort by count descending, then rank descending. Note the prototype compares keys as strings, which works because single-digit vs double-digit sorting still yields correct results for poker ranks 2-14 when parsed to numbers.
- Score encoding: `hr * 1e10 + tb.reduce((a, v, i) => a + v * Math.pow(100, 4-i), 0)`

**IMPORTANT:** Do not modify the evaluation logic. It is proven correct in the prototype. Port it character-for-character, adding only TypeScript types.

**Reference from prototype:** `eval5` (lines 109–131), `best` (lines 133–138).

**Done when:** `eval5([{r:14,s:'h'},{r:14,s:'d'},{r:14,s:'c'},{r:13,s:'h'},{r:13,s:'d'}])` returns `{ hr: 6, score: ... }` (full house). `best([{r:14,s:'h'},{r:14,s:'d'}], [{r:14,s:'c'},{r:13,s:'h'},{r:13,s:'d'},{r:2,s:'s'},{r:7,s:'c'}])` returns the best 5-card hand (full house aces full of kings, hr=6). `eval5` with a royal flush in spades returns `hr: 8`. TypeScript compiles with zero errors and no `any` types.

---

**Task 5: Monte Carlo Engine**

**File(s):** `lib/monteCarlo.ts`

**Depends on:** Task 3, Task 4

**What to build:**

Port and generalize the Monte Carlo simulation to support N players.

```ts
import { Card, mkDeck, shuf, strip } from './deck'
import { best } from './evaluator'

export type MonteCarloResult = {
  equity: number[]   // one per player, each 0-100, sums to ~100
}

// Run Monte Carlo simulation for N players.
// players: array of hole card pairs, e.g. [[heroCard1, heroCard2], [villainCard1, villainCard2]]
// board: 0-5 community cards already dealt
// n: number of iterations (default 4000)
//
// For each iteration:
//   1. Strip all known cards (all players' hole cards + board) from a fresh deck
//   2. Shuffle the remaining deck
//   3. Deal (5 - board.length) cards to complete the board
//   4. Evaluate best() for each player against the complete board
//   5. Find the winner(s) — highest score wins; ties split equally
//   6. Tally results
//
// Returns equity as percentages.
export function monteCarlo(
  players: Card[][],
  board: Card[],
  n: number = 4000
): MonteCarloResult
```

Key implementation details:
- Dead cards = all hole cards from all players + board cards
- Each iteration: shuffle remaining deck, take first `(5 - board.length)` cards as the runout
- Winner determination: find max score among all players. All players with that max score split the pot equally (1/numWinners each)
- Return value: `equity[i] = (wins[i] + splitShares[i]) / n * 100`

Also add the outs computation function in the same file:

```ts
export type OutsResult = {
  outs: Card[]          // cards that change the current leader
  beneficiary: string[] // parallel array: player ID who benefits from each out card
}

// Compute which remaining deck cards would change the current leader.
// Only meaningful when board has 3 or 4 cards (after flop or turn).
// players: array of hole card pairs
// playerIds: parallel array of player IDs (e.g. ["hero", "p2", "p3"])
// board: current 3 or 4 community cards
//
// Algorithm:
//   1. Find current leader by evaluating best() for each player with current board
//      (For 3-card board, this is approximate — based on current best 5-card combo available)
//      Actually, for outs we need to complete the board to 5. The "current leader" is determined
//      by running a quick eval with the current partial board. Wait — that doesn't work for
//      3-card boards since you can't make 5-card hands with only 5 cards (2 hole + 3 board).
//
//      CORRECTION: "Current leader" means the player currently ahead in equity (highest equity%).
//      Pass the current equity array to this function instead of recomputing.
//      Outs = cards where adding that card to the board would flip who has the highest best() hand
//      when the board is extended by that one card.
//
//      For a 3-card board (flop): test each remaining card as a 4th card, evaluate best()
//        for each player with the 4-card board (C(6,5)=6 combos per player). Compare leaders.
//      For a 4-card board (turn): test each remaining card as the 5th card, evaluate best()
//        for each player with the complete 5-card board. Compare leaders.
export function computeOuts(
  players: Card[][],
  playerIds: string[],
  board: Card[]
): OutsResult
```

Implementation of `computeOuts`:
1. Find current leader: evaluate `best(player, board)` for each player (works because `best` generates combos from all available hole+board cards — with 5 total cards it's just those 5, with 6 it's C(6,5)=6, etc.)
2. Get remaining deck: `strip(mkDeck(), [...allHoleCards, ...board])`
3. For each remaining card: create `testBoard = [...board, card]`, evaluate `best()` for each player, find new leader
4. If new leader differs from current leader, add card to outs, record the new leader's ID as beneficiary

**Reference from prototype:** `monteCarlo` (lines 140–150). The prototype is heads-up only; this version generalizes to N players.

**Done when:** `monteCarlo([[{r:14,s:'h'},{r:14,s:'d'}], [{r:13,s:'s'},{r:13,s:'c'}]], []).equity` returns two numbers summing to ~100 with the first (AA) being roughly 80. `monteCarlo` with 3 players returns 3 equity values summing to ~100. `computeOuts` with 2 players and a 3-card board returns an array of `Card` objects and parallel `beneficiary` strings. TypeScript compiles with no errors.

---

**Task 6: Web Worker**

**File(s):** `workers/equity.worker.ts`

**Depends on:** Task 3, Task 5

**What to build:**

A Web Worker that receives equity computation requests and returns results off the main thread.

```ts
// workers/equity.worker.ts
// This file runs in a Worker context. No DOM access, no React, no imports from 'next'.

import { tupleToCard, Card } from '../lib/deck'
import { monteCarlo, computeOuts } from '../lib/monteCarlo'

export type WorkerRequest = {
  id: number
  players: [number, string][][]   // Each player: array of [rank, suit] tuples
  board: [number, string][]       // Board card tuples
  playerIds: string[]             // Parallel array of player IDs
  iterations?: number             // Default 4000
}

export type WorkerResponse = {
  id: number
  equity: number[]
  outs: [number, string][]        // Out cards as tuples
  outsBeneficiary: string[]       // Parallel: who benefits from each out
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, players, board, playerIds, iterations = 4000 } = e.data

  // Convert tuples back to Card objects
  const playerCards: Card[][] = players.map(p => p.map(tupleToCard))
  const boardCards: Card[] = board.map(tupleToCard)

  // Run Monte Carlo
  const result = monteCarlo(playerCards, boardCards, iterations)

  // Compute outs if board has 3 or 4 cards
  let outs: Card[] = []
  let outsBeneficiary: string[] = []
  if (boardCards.length === 3 || boardCards.length === 4) {
    const outsResult = computeOuts(playerCards, playerIds, boardCards)
    outs = outsResult.outs
    outsBeneficiary = outsResult.beneficiary
  }

  const response: WorkerResponse = {
    id,
    equity: result.equity,
    outs: outs.map(c => [c.r, c.s] as [number, string]),
    outsBeneficiary,
  }

  self.postMessage(response)
}
```

**IMPORTANT Webpack 5 note:** The worker will be instantiated from the hook (Task 8) using:
```ts
const workerRef = useRef<Worker>()
useEffect(() => {
  workerRef.current = new Worker(new URL('../workers/equity.worker.ts', import.meta.url))
  return () => workerRef.current?.terminate()
}, [])
```

This pattern works with Next.js 14's built-in Webpack 5 worker support. No additional config needed beyond what Task 1 already set up.

**Reference from prototype:** The prototype runs Monte Carlo synchronously on the main thread (line 239: `const eq=monteCarlo(sc.hero,sc.villain,[])` called inline). This task moves it off-thread.

**Done when:** The file compiles with TypeScript. The `onmessage` handler correctly converts tuples to Cards, runs monteCarlo, runs computeOuts for 3/4-card boards, and posts back a well-typed response. (Full integration test comes in Task 8 when the hook connects.)

---

**Task 7: Scenario Data**

**File(s):** `lib/scenarios.ts`

**Depends on:** Task 3

**What to build:**

Define all 8 preset scenarios (5 heads-up + 3 multi-way) AND the player color map.

```ts
import { Card } from './deck'

// Player color map — used by every component that renders player-specific colors.
// Keys match player IDs. Values are CSS variable names.
export const PLAYER_COLORS: Record<string, { main: string; dim: string }> = {
  hero: { main: 'var(--gold)',   dim: 'var(--gold-dim)' },
  p2:   { main: 'var(--steel)',  dim: 'var(--steel-dim)' },
  p3:   { main: 'var(--teal)',   dim: 'var(--teal-dim)' },
  p4:   { main: 'var(--coral)',  dim: 'var(--coral-dim)' },
  p5:   { main: 'var(--violet)', dim: 'var(--violet-dim)' },
  p6:   { main: 'var(--slate)',  dim: 'var(--slate-dim)' },
}

// Ordered list of player IDs for assigning new players
export const PLAYER_IDS = ['hero', 'p2', 'p3', 'p4', 'p5', 'p6'] as const
export const PLAYER_LABELS: Record<string, string> = {
  hero: 'Hero', p2: 'Player 2', p3: 'Player 3',
  p4: 'Player 4', p5: 'Player 5', p6: 'Player 6',
}

export type PlayerInit = {
  id: string       // "hero" | "p2" | "p3" | "p4" | "p5" | "p6"
  label: string    // "Hero" | "Player 2" | etc.
  cards: [Card, Card]
}

export type Scenario = {
  id: string        // url-safe slug
  name: string      // display name for pill button
  players: PlayerInit[]
  story: string     // one line shown below the equity bar
}

// Helper to construct Card concisely
function c(r: number, s: 'h' | 'd' | 'c' | 's'): Card { return { r, s } }

export const SCENARIOS: Scenario[] = [
  {
    id: 'aa-vs-kk',
    name: 'AA vs KK',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2', label: 'Villain', cards: [c(13,'s'), c(13,'c')] },
    ],
    story: 'Cooler — 80/20 preflop',
  },
  {
    id: 'aks-vs-qq',
    name: 'AKs vs QQ',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'s'), c(13,'s')] },
      { id: 'p2', label: 'Villain', cards: [c(12,'h'), c(12,'c')] },
    ],
    story: 'Classic coin flip setup',
  },
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(9,'d')] },
      { id: 'p2', label: 'Villain', cards: [c(7,'s'), c(7,'c')] },
    ],
    story: 'Literally a flip',
  },
  {
    id: 'set-up',
    name: 'Set-up',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(10,'h'), c(10,'d')] },
      { id: 'p2', label: 'Villain', cards: [c(9,'s'), c(8,'c')] },
    ],
    story: 'Overpair vs open-ender',
  },
  {
    id: 'kicker-war',
    name: 'Kicker War',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(10,'c')] },
      { id: 'p2', label: 'Villain', cards: [c(14,'d'), c(5,'h')] },
    ],
    story: 'Same pair, kicker decides',
  },
  {
    id: '3-way-all-in',
    name: '3-Way All-In',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2', label: 'Player 2', cards: [c(13,'s'), c(13,'c')] },
      { id: 'p3', label: 'Player 3', cards: [c(12,'h'), c(12,'d')] },
    ],
    story: 'Classic tournament cooler',
  },
  {
    id: 'dominated',
    name: 'Dominated',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(13,'d')] },
      { id: 'p2', label: 'Player 2', cards: [c(14,'s'), c(12,'c')] },
      { id: 'p3', label: 'Player 3', cards: [c(14,'d'), c(2,'h')] },
    ],
    story: 'Kicker hierarchy fully visible',
  },
  // "Full Table" is special — it generates random hands at selection time.
  // Store it with placeholder cards that get replaced by usePokerState on selection.
  {
    id: 'full-table',
    name: 'Full Table',
    players: [
      { id: 'hero', label: 'Hero', cards: [c(14,'h'), c(14,'d')] },
      { id: 'p2', label: 'Player 2', cards: [c(0,'h'), c(0,'h')] }, // placeholder
      { id: 'p3', label: 'Player 3', cards: [c(0,'h'), c(0,'h')] },
      { id: 'p4', label: 'Player 4', cards: [c(0,'h'), c(0,'h')] },
      { id: 'p5', label: 'Player 5', cards: [c(0,'h'), c(0,'h')] },
      { id: 'p6', label: 'Player 6', cards: [c(0,'h'), c(0,'h')] },
    ],
    story: 'How much equity do aces really have?',
  },
]

// Sentinel value: any card with r===0 is a placeholder that must be replaced with a random card.
export function isPlaceholder(card: Card): boolean {
  return card.r === 0
}
```

**Reference from prototype:** `SCENS` array (lines 152–158). The prototype has 5 heads-up scenarios. This adds 3 multi-way ones per the spec.

**Done when:** `SCENARIOS` exports 8 items. Each has valid `id`, `name`, `players`, and `story`. The `full-table` scenario has 6 players with placeholder cards (`r: 0`). `isPlaceholder` returns true for `{r:0, s:'h'}` and false for `{r:14, s:'h'}`. `PLAYER_COLORS` exports a map with 6 entries (hero through p6). `PLAYER_IDS` and `PLAYER_LABELS` are exported. TypeScript compiles cleanly.

---

### Phase 2 — Core UI Components

---

**Task 8: useEquity Hook (Worker Communication)**

**File(s):** `hooks/useEquity.ts`

**Depends on:** Task 6

**What to build:**

A React hook that manages the Web Worker lifecycle and provides an async interface for equity computation.

```ts
import { useRef, useEffect, useCallback, useState } from 'react'
import { Card, cardToTuple } from '@/lib/deck'
import type { WorkerRequest, WorkerResponse } from '@/workers/equity.worker'

export type EquityResult = {
  equity: number[]
  outs: Card[]
  outsBeneficiary: string[]
}

export function useEquity(): {
  result: EquityResult | null
  isCalculating: boolean
  calculate: (players: Card[][], playerIds: string[], board: Card[]) => void
}
```

Implementation details:

1. On mount, create the worker: `new Worker(new URL('../workers/equity.worker.ts', import.meta.url))`. Store in a `useRef`. Terminate on unmount.
2. Maintain an incrementing `requestId` ref. Each `calculate` call increments it and posts to the worker.
3. The worker's `onmessage` handler checks if `response.id === latestRequestId` (to discard stale results from superseded calculations).
4. State: `result: EquityResult | null` (converted from tuples back to Card objects), `isCalculating: boolean` (set true on `calculate`, false on response).
5. The `calculate` function converts Card objects to tuples before posting (structured clone optimization).

**Reference from prototype:** The prototype calls `monteCarlo()` synchronously inline. This hook makes it async + off-thread.

**Done when:** The hook can be called in a component. `calculate(players, ids, board)` posts a message to the worker. When the worker responds, `result` updates with equity percentages and outs. `isCalculating` toggles correctly. Stale responses (from superseded calculations) are discarded. No memory leaks on unmount.

---

**Task 9: Card Component**

**File(s):** `components/Card.tsx`

**Depends on:** Task 2, Task 3

**What to build:**

A single playing card component with Framer Motion flip animation and interactive hover states.

```tsx
import { motion } from 'framer-motion'
import { Card as CardType, SUIT_SYMBOLS, RANK_LABELS, RED_SUITS, rankLabel } from '@/lib/deck'

type CardProps = {
  card: CardType
  animate?: boolean      // true = flip in, false = render static (no animation)
  delay?: number         // stagger delay in seconds (e.g., 0.16 for flop cards)
  size?: 'sm' | 'md'    // 'sm' = 52px wide (mobile), 'md' = 70px wide (desktop)
  interactive?: boolean  // true = show hover lift + pointer cursor (for hole cards)
  onClick?: () => void
}
```

Visual spec (port from prototype lines 22–31):
- Card dimensions: `md` = 70×98px, `sm` = 52×73px (maintain 5:7 ratio)
- Background: `var(--ivory)` (`#f6f0e2`)
- Border radius: 8px (md), 6px (sm)
- Subtle inner shadow: `inset 0 1px 3px rgba(0,0,0,0.08)` — makes the card look physical
- Top-left corner: rank + suit (stacked vertically)
- Center: large suit symbol at 30px (md) / 22px (sm), opacity 0.1
- Bottom-right corner: rank + suit, rotated 180deg
- Red suits (`h`, `d`): text color `var(--red-suit)`
- Black suits (`c`, `s`): text color `var(--black-suit)`

Framer Motion flip animation (when `animate` is true):
```tsx
<motion.div
  initial={{ rotateY: 90, scale: 0.88, opacity: 0 }}
  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
  transition={{
    duration: 0.38,
    ease: [0.23, 1, 0.32, 1],
    delay: delay ?? 0,
  }}
>
```

Interactive state (when `interactive` is true):
- On hover: `scale: 1.05`, subtle glow via `boxShadow: '0 0 12px rgba(184,148,58,0.25)'`
- Cursor: `pointer`
- Use `whileHover` from Framer Motion

When `animate` is false, render with no `initial`/`animate` — just the static card face.

**Reference from prototype:** `cardHTML` function (line 162–165) for the DOM structure. `.card` CSS (lines 22–23) for dimensions and animation. `.cr`, `.br`, `.rk`, `.st`, `.cs` classes (lines 25–31) for the card face layout.

**Done when:** `<Card card={{r:14,s:'h'}} animate={true} />` renders an Ace of Hearts that flips in with a 380ms rotateY animation. The card shows `A` and `♥` in red (`#b52b2b`). `<Card card={{r:7,s:'s'}} animate={false} />` renders a static 7 of Spades in black. When `interactive` is true, hovering the card scales it to 1.05 with a gold glow. The `size="sm"` prop renders at 52×73px.

---

**Task 10: Empty Card Slot Component**

**File(s):** `components/CardSlot.tsx`

**Depends on:** Task 2

**What to build:**

An empty placeholder for where a card will be dealt. Used in the board before cards are dealt.

```tsx
type CardSlotProps = {
  size?: 'sm' | 'md'   // matches Card sizes
}
```

Visual spec (from prototype line 21):
- Same dimensions as `Card` for the given size
- Border radius: 8px (md), 6px (sm)
- Background: `rgba(255, 255, 255, 0.03)`
- Border: `1px solid rgba(255, 255, 255, 0.07)`
- No content inside

**Reference from prototype:** `.slot` class (line 21).

**Done when:** The slot renders as a subtle outlined rectangle that matches the card dimensions exactly. It visually reads as "a card goes here" without being distracting.

---

**Task 11: Board Component**

**File(s):** `components/Board.tsx`

**Depends on:** Task 9, Task 10

**What to build:**

The 5 community card slots, showing dealt cards with flip animations and empty slots for undealt positions.

```tsx
import { Card as CardType } from '@/lib/deck'

type BoardProps = {
  board: CardType[]     // 0-5 cards dealt so far
  street: number        // 0=preflop, 1=flop dealt, 2=turn dealt, 3=river dealt
}
```

Layout:
- Horizontal flex row, centered, gap of 10px (md) / 7px (sm)
- 5 positions total
- Positions 0-2 are the flop (deal together with stagger), position 3 is turn, position 4 is river
- Undealt positions show `<CardSlot />`
- Dealt positions show `<Card card={board[i]} animate={true} delay={...} />`

Stagger logic for flop (when board goes from 0 to 3 cards):
- Card 0: delay 0s
- Card 1: delay 0.16s
- Card 2: delay 0.32s

Turn and river cards: delay 0s (single card, no stagger needed).

**Key animation concern:** Cards should only animate when they are *newly* dealt, not on re-render. Track which cards have already been animated using a ref that stores the count of previously rendered cards. If `board.length` increases, the new cards get `animate={true}`, existing cards get `animate={false}`.

Below the cards, show a centered label in `--ghost` color, monospace 10px, uppercase, letter-spacing 3px:
- Preflop (0 cards): "Community Cards"
- After flop: "Flop"
- After turn: "Turn"
- After river: "River"

Responsive: use `md` size cards above 768px, `sm` below.

**Reference from prototype:** `.board` container (line 20), the `deal()` function's stagger logic (lines 192–224), `.board-lbl` (line 19).

**Done when:** With `board={[]}`, 5 empty slots render. With `board={[card1, card2, card3]}` (flop), 3 cards animate in with stagger and 2 empty slots remain. Adding a 4th card (turn) animates only the new card. Label updates to match the current street.

---

**Task 12: Equity Bar Component**

**File(s):** `components/EquityBar.tsx`

**Depends on:** Task 2

**What to build:**

The equity bar — the visual centerpiece. Has two modes: binary (2 players) and segmented (3+ players).

```tsx
import { motion, useSpring, useTransform } from 'framer-motion'

type PlayerEquity = {
  id: string
  equity: number       // 0-100
  color: string        // CSS variable name, e.g. "--gold"
}

type EquityBarProps = {
  players: PlayerEquity[]
  previousEquity?: number[]  // previous frame's equity, for detecting dramatic swings
}
```

**Binary mode (2 players):**

A single bar where Hero's gold fill extends from the left:

```
[═══════gold══════════░░░░░░steel░░░░░]
```

- Container: height 11px, background `rgba(255,255,255,0.06)`, border-radius 6px, overflow hidden
- Fill: `motion.div`, height 100%, background `var(--gold)`, border-radius 6px
- Width animated with spring: `transition: { type: "spring", stiffness: 80, damping: 14 }`
- The remaining space implicitly represents the villain's equity (no separate fill needed — container bg acts as the villain's portion)

**Segmented mode (3+ players):**

Multiple adjacent `motion.div` segments inside the same container, each with width proportional to that player's equity:

```
[══gold══|═steel═|═teal═]
```

- Each segment is a `motion.div` with `background: var(${player.color})`
- Width: `${player.equity}%` animated with the same spring
- No border-radius on inner edges — only first segment gets left radius, last gets right radius
- Each segment shows the player's equity percentage inline (white text, monospace, 10px) if the segment is wider than 60px. Otherwise, hide inline text (legend below handles it).

**Dramatic swing flash (both modes):**

Detect when any single player's equity changes by more than 25 percentage points:

```ts
const maxDelta = Math.max(...players.map((p, i) =>
  Math.abs(p.equity - (previousEquity?.[i] ?? p.equity))
))
const isFlash = maxDelta > 25
```

When `isFlash`, the bar container briefly brightens: apply `filter: brightness(1.6)` for 120ms then back to 1.

**Extreme equity pulses:**
- Hero equity < 15%: flash bar background with `var(--red-suit)` at opacity 0.4, fade out over 300ms
- Hero equity > 85%: flash gold fill at brightness 1.8, fade out over 300ms

Use Framer Motion's `animate` for both effects, triggered by `useEffect` watching `players[0].equity`.

**Reference from prototype:** `.bar-wrap` and `.bar-fill` (lines 17-18), the spring transition value `cubic-bezier(0.34, 1.56, 0.64, 1)` — we're replacing this with a Framer spring that produces a similar overshoot.

**Done when:** With 2 players at 80/20, the bar fills 80% with gold. Changing to 45/55 animates with a spring overshoot. With 3 players at 50/30/20, three colored segments appear. A swing from 80 to 40 triggers a brightness flash. Hero at 10% triggers a red pulse. The bar looks polished and the spring animation has a satisfying overshoot-then-settle feel.

---

**Task 13: Animated Equity Numbers**

**File(s):** `components/EquityNumber.tsx`

**Depends on:** Task 2

**What to build:**

A single animated equity percentage number using Framer Motion springs.

```tsx
import { motion, useSpring, useTransform } from 'framer-motion'

type EquityNumberProps = {
  value: number          // 0-100
  color: string          // CSS variable, e.g. "--gold"
  size?: 'lg' | 'md'    // 'lg' = 64px (desktop) / 48px (mobile), 'md' = 32px
  isCalculating?: boolean // show subtle pulse when true
}
```

- Use `useSpring(value, { stiffness: 80, damping: 20 })` to create a spring-animated motion value
- Use `useTransform(springValue, latest => Math.round(latest))` to get the integer display value
- Use `motion.span` or `motion.div` to render the transformed value with a `%` suffix
- Font: `Playfair Display`, weight 700, tabular-nums
- Color: `var(${color})` (e.g., `var(--gold)`)
- Size `lg`: 64px on desktop, 48px on mobile (below 768px). Size `md`: 32px.

**Calculating pulse:**
When `isCalculating` is true, apply a Framer Motion animation:
```tsx
animate={{ opacity: [1, 0.5, 1] }}
transition={{ duration: 0.6, repeat: Infinity }}
```

When `isCalculating` becomes false (value arrives), the number snaps to the normal opacity and the spring animates to the new value.

**Reference from prototype:** `.eq-num` class (line 13) — 52px in prototype, we're scaling up to 64px as spec says "64px+".

**Done when:** The number spring-animates from one value to another (e.g., 80 → 45) with a visible overshoot. It always displays as an integer with `%`. The calculating pulse is visible. The font is Playfair Display with tabular-nums.

---

**Task 14: Scenario Pills**

**File(s):** `components/ScenarioPills.tsx`

**Depends on:** Task 7

**What to build:**

A row of pill buttons for selecting preset scenarios.

```tsx
import { Scenario } from '@/lib/scenarios'

type ScenarioPillsProps = {
  scenarios: Scenario[]
  activeId: string | null      // currently selected scenario ID
  onSelect: (scenario: Scenario) => void
}
```

Visual spec (from prototype lines 6-8):
- Horizontal flex row, centered, flex-wrap, gap 7px
- Each pill: background `var(--felt-mid)`, border `1px solid rgba(184,148,58,0.18)`, color `var(--ghost)`, padding `5px 14px`, border-radius `20px`, font-family monospace (`font-mono` class), font-size 11px, letter-spacing 1px, white-space nowrap
- Hover state: border-color `var(--gold)`, color `var(--gold)`, background `rgba(184,148,58,0.08)`
- Active state (when `scenario.id === activeId`): same as hover state, persistent
- Transition: all properties 200ms ease
- Cursor: pointer

Separate heads-up (2-player) and multi-way (3+ player) pills visually with a subtle `|` divider or small gap. Check `scenario.players.length > 2` to determine which group.

**Reference from prototype:** `.pills`, `.pill`, `.pill:hover`, `.pill.on` (lines 6-8). Prototype's `load(idx)` toggle logic (line 231).

**Done when:** 8 pills render. Clicking a pill calls `onSelect` with the scenario. The active pill is highlighted in gold. Heads-up and multi-way scenarios are visually grouped.

---

**Task 15: Player Panel**

**File(s):** `components/PlayerPanel.tsx`

**Depends on:** Task 9, Task 13

**What to build:**

A panel showing one player's hole cards, label, equity, and optional remove button.

```tsx
type PlayerPanelProps = {
  id: string                // "hero" | "p2" | etc.
  label: string             // "Hero" | "Player 2" | etc.
  cards: [Card, Card]
  equity: number            // 0-100
  color: string             // CSS variable name, e.g. "--gold"
  isCalculating: boolean
  isHero: boolean           // if true, cannot be removed
  onCardClick: (cardIndex: 0 | 1) => void   // opens card picker
  onRemove?: () => void     // only for non-Hero players
}
```

Layout:
- Player label at top: monospace, 10px, letter-spacing 3px, uppercase, color `var(${color})`
- Two hole cards side by side with 7px gap, each with `interactive={true}` and `onClick`
- Equity number below cards: `<EquityNumber value={equity} color={color} size="md" />`
- Remove button (`×`): positioned top-right of the panel, small (16px circle), only shown if `!isHero`, color `var(--ghost)`, hover `var(--parchment)`. Calls `onRemove`.

On desktop, this is a vertical column. On mobile, same layout but slightly more compact.

**Reference from prototype:** `.hand`, `.hl`, `.hc` (lines 33-37). The prototype has Hero and Villain hard-coded; this component is reusable per player.

**Done when:** A player panel renders with label, two cards, equity number, and optional remove button. Cards are clickable (calls `onCardClick`). Remove button shows for non-Hero players. The label color matches the player's accent color.

---

**Task 16: Players Grid**

**File(s):** `components/PlayersGrid.tsx`

**Depends on:** Task 15

**What to build:**

Lays out N PlayerPanels responsively, with a "vs" divider for heads-up and a grid for multi-player.

```tsx
type PlayersGridProps = {
  players: Array<{
    id: string
    label: string
    cards: [Card, Card]
    equity: number
    color: string
  }>
  isCalculating: boolean
  onCardClick: (playerId: string, cardIndex: 0 | 1) => void
  onRemovePlayer: (playerId: string) => void
}
```

**Heads-up (2 players):**
- Horizontal flex row: Hero panel — "vs" divider — Villain panel
- "vs" text: 18px, bold, italic, `var(--ghost)`, opacity 0.4
- Panels flex: `flex: 1`, aligned to edges (Hero left-aligned, Villain right-aligned)

**Multi-player (3+ players):**
- On desktop (≥768px): horizontal flex row, evenly spaced, each panel in a column
- On mobile (<768px): 2-column grid (or 3-column if 5-6 players), gap 12px
- No "vs" divider
- Each panel has the player's accent color

**Reference from prototype:** `.hands` container (line 32), `.vs` (line 38). Prototype is heads-up only.

**Done when:** With 2 players, shows Hero — vs — Villain horizontally. With 3 players, shows 3 panels in a row (desktop) or 2-column grid (mobile). With 6 players, all 6 panels fit with proper wrapping.

---

**Task 17: Controls Component**

**File(s):** `components/Controls.tsx`

**Depends on:** Task 2

**What to build:**

Deal and Reset buttons.

```tsx
type ControlsProps = {
  street: number          // 0=preflop, 1=flop, 2=turn, 3=river
  isDealing: boolean      // true while cards are animating in
  onDeal: () => void
  onReset: () => void
}
```

**Deal button:**
- Text changes by street: `["Deal Flop", "Deal Turn", "Deal River"][street]`
- After river (`street === 3`): text becomes "River Dealt", button is disabled
- While dealing (`isDealing`): disabled
- Style: transparent bg, `1px solid var(--gold)`, color `var(--gold)`, padding `10px 26px`, border-radius 4px, monospace, 11px, letter-spacing 2px, uppercase
- Hover: `background: rgba(184,148,58,0.09)`
- Active: `transform: scale(0.97)`
- Disabled: opacity 0.22, cursor not-allowed

**Reset button ("New Hand"):**
- Style: same shape but border `rgba(255,255,255,0.15)`, color `var(--ghost)`
- Hover: `background: rgba(255,255,255,0.04)`

Horizontal flex row, centered, gap 10px.

**Reference from prototype:** `.btns`, `.btn`, `.btn.sec` (lines 45-51), `updateBtn` (lines 175-180).

**Done when:** At street 0, shows "Deal Flop" (active) and "New Hand". At street 1, "Deal Turn". At street 3, "River Dealt" (disabled). Clicking Deal calls `onDeal`. Clicking Reset calls `onReset`.

---

**Task 18: Result Banner**

**File(s):** `components/ResultBanner.tsx`

**Depends on:** Task 2

**What to build:**

The winner announcement that appears after the river.

```tsx
import { motion, AnimatePresence } from 'framer-motion'

type ResultBannerProps = {
  visible: boolean
  text: string            // e.g. "Hero wins — Full House, Tens over Eights"
  type: 'hero' | 'villain' | 'split' // determines color scheme
}
```

**Animation:** Framer Motion `AnimatePresence` wrapper. When `visible` becomes true:
```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
```

**Styling by type:**
- `hero`: bg `rgba(184,148,58,0.12)`, border `1px solid rgba(184,148,58,0.3)`, color `var(--gold)`
- `villain`: bg `rgba(74,133,176,0.12)`, border `1px solid rgba(74,133,176,0.3)`, color `var(--steel)`
- `split`: bg `rgba(255,255,255,0.05)`, border `1px solid rgba(255,255,255,0.1)`, color `var(--parchment)`

Padding: 9px 22px, border-radius 6px, font-size 16px, font-weight 700, italic. Centered.

**Reference from prototype:** `.wt`, `.wt.show`, `.wt.gw`, `.wt.bw`, `.wt.tw` (lines 40-44), `showWinner` (lines 184-190).

**Done when:** When `visible` is true, the banner fades in with upward motion. Text is styled in the correct color scheme. When `visible` becomes false, it fades out. The AnimatePresence handles mount/unmount gracefully.

---

### Phase 3 — State Management & Page Assembly

---

**Task 19: usePokerState Hook**

**File(s):** `hooks/usePokerState.ts`

**Depends on:** Task 3, Task 7, Task 8

**What to build:**

The central game state hook that manages all poker state via `useReducer`.

```ts
import { Card, mkDeck, shuf, strip } from '@/lib/deck'
import { best, HAND_NAMES, HandResult } from '@/lib/evaluator'
import { Scenario, SCENARIOS, isPlaceholder } from '@/lib/scenarios'
import { useEquity, EquityResult } from '@/hooks/useEquity'

// ---- State Shape ----

type Player = {
  id: string
  label: string
  cards: [Card, Card]
  equity: number         // 0-100, updated after each street
}

type GameState = {
  players: Player[]
  board: Card[]          // 0-5 dealt community cards
  fullBoard: Card[]      // 5 pre-shuffled community cards (from available deck)
  street: number         // 0=preflop, 1=flop dealt, 2=turn dealt, 3=river
  isDealing: boolean     // true while card animations are in progress
  activeScenarioId: string | null
  equityHistory: number[][] // history[streetIndex] = equity array at that street
  result: {
    text: string
    type: 'hero' | 'villain' | 'split'
  } | null
}

// ---- Actions ----

type Action =
  | { type: 'SELECT_SCENARIO'; scenario: Scenario }
  | { type: 'DEAL' }             // advance to next street
  | { type: 'DEAL_COMPLETE' }    // card animations finished, recalculate
  | { type: 'RESET' }           // reset current scenario
  | { type: 'SET_EQUITY'; equity: number[]; outs: Card[]; outsBeneficiary: string[] }
  | { type: 'UPDATE_CARD'; playerId: string; cardIndex: 0 | 1; newCard: Card }
  | { type: 'ADD_PLAYER' }
  | { type: 'REMOVE_PLAYER'; playerId: string }

// ---- Hook Return ----

export function usePokerState(): {
  // State
  players: Player[]
  board: Card[]
  street: number
  isDealing: boolean
  isCalculating: boolean
  activeScenarioId: string | null
  result: { text: string; type: 'hero' | 'villain' | 'split' } | null
  equityHistory: number[][]
  outs: Card[]
  outsBeneficiary: string[]
  turnEquity: number[] | null  // equity at the turn street, for bad beat detection

  // Actions
  selectScenario: (scenario: Scenario) => void
  deal: () => void
  reset: () => void
  updateCard: (playerId: string, cardIndex: 0 | 1, newCard: Card) => void
  addPlayer: () => void
  removePlayer: (playerId: string) => void

  // Derived
  allDeadCards: Card[]  // all cards currently in use (all players' holes + board)
  canAddPlayer: boolean // players.length < 6
}
```

Key logic:

**SELECT_SCENARIO:**
1. Take the scenario's players. For any placeholder cards (r===0, i.e., "Full Table"), deal random cards from the available deck.
2. Collect all players' hole cards as dead cards.
3. Shuffle remaining deck, take first 5 cards as `fullBoard`.
4. Set `street: 0`, `board: []`, `result: null`, `equityHistory: []`.
5. Immediately trigger equity calculation (preflop).

**DEAL:**
1. Set `isDealing: true`.
2. Based on current `street`:
   - street 0 → push `fullBoard[0..2]` to board (flop), set street to 1
   - street 1 → push `fullBoard[3]` to board (turn), set street to 2
   - street 2 → push `fullBoard[4]` to board (river), set street to 3
3. After a delay for animations (flop: 500ms for 3 cards to animate, turn/river: 400ms), dispatch `DEAL_COMPLETE`.

**DEAL_COMPLETE:**
1. Set `isDealing: false`.
2. If street < 3: trigger equity calculation with current board.
3. If street === 3 (river): evaluate `best()` for all players, determine winner, snap equity to 100/0 (or split), set `result`.

**SET_EQUITY:**
1. Update each player's `equity` from the array.
2. Push current equity array to `equityHistory`.
3. Store outs and outsBeneficiary.

**UPDATE_CARD:**
1. Validate newCard is not already in use (check allDeadCards). If it is, reject (the UI should prevent this, but guard here too).
2. Update the specified player's card.
3. Re-shuffle fullBoard from newly available deck (strip all players' cards).
4. Reset board to [], street to 0, result to null.
5. Trigger preflop equity calculation.

**ADD_PLAYER:**
1. If players.length >= 6, no-op.
2. Determine next player ID/label (p3, p4, etc.)
3. Deal 2 random cards from available deck.
4. Add player to array.
5. Re-shuffle fullBoard.
6. Reset to preflop.
7. Trigger equity calculation.

**REMOVE_PLAYER:**
1. Remove player from array. Their cards return to available pool.
2. Re-shuffle fullBoard.
3. Reset to preflop.
4. Trigger equity calculation.

**River result logic:**
```ts
const results: HandResult[] = players.map(p => best(p.cards, board))
const maxScore = Math.max(...results.map(r => r.score))
const winners = players.filter((_, i) => results[i].score === maxScore)

if (winners.length > 1) {
  result = { text: `Split pot — ${HAND_NAMES[results[0].hr]}`, type: 'split' }
} else {
  const winnerIdx = results.findIndex(r => r.score === maxScore)
  const winner = players[winnerIdx]
  const handName = HAND_NAMES[results[winnerIdx].hr]
  result = {
    text: `${winner.label} wins — ${handName}`,
    type: winner.id === 'hero' ? 'hero' : 'villain'
  }
}
```

Store `turnEquity` (equity array at street 2) in a ref for bad beat detection in the page.

**Reference from prototype:** `ST` state object (line 160), `load()` (lines 227-244), `deal()` (lines 192-225), `showWinner()` (lines 184-190).

**Done when:** The hook manages the full game lifecycle: selecting scenarios, dealing streets, updating equity, handling card changes, adding/removing players. All state transitions are correct. The hook triggers equity calculations via `useEquity` at the right moments. `equityHistory` accumulates correctly across streets. River evaluation produces correct winner text. TypeScript compiles with no errors.

---

**Task 20: Page Assembly**

**File(s):** `app/page.tsx`

**Depends on:** Tasks 8-19 (all components + hook)

**What to build:**

The main page that wires everything together. This is a `'use client'` component.

```tsx
'use client'

import { motion } from 'framer-motion'
import { SCENARIOS } from '@/lib/scenarios'
import { usePokerState } from '@/hooks/usePokerState'
// ... import all components
```

**Layout structure** (matches the spec's ASCII diagram):

```tsx
<motion.div
  className="max-w-[800px] mx-auto px-4 py-6 md:px-6 md:py-8"
  variants={shakeVariants}
  animate={shakeState}  // "idle" | "badBeat" | "twoOuter"
>
  {/* Header */}
  <p className="font-mono text-[10px] tracking-[4px] uppercase text-center" style={{color:'var(--gold)'}}>
    Poker Equity Visualizer
  </p>
  <h1 className="text-center text-[22px] md:text-[26px] font-bold italic mb-5" style={{color:'var(--ivory-dim)'}}>
    Every Card Changes Everything.
  </h1>

  {/* Scenario Pills */}
  <ScenarioPills
    scenarios={SCENARIOS}
    activeId={activeScenarioId}
    onSelect={selectScenario}
  />

  {/* Equity Display */}
  {/* For 2 players: show EquityNumber — EquityBar — EquityNumber in a row */}
  {/* For 3+ players: show EquityBar (segmented) with numbers below */}
  <EquityDisplay ... />

  {/* Street info line */}
  <p className="font-mono text-[10px] tracking-[2px] uppercase text-center mb-2" style={{color:'var(--ghost)'}}>
    {streetInfoText}
  </p>

  {/* Board */}
  <Board board={board} street={street} />

  {/* Players */}
  <PlayersGrid ... />

  {/* Result Banner */}
  <ResultBanner visible={result !== null} text={result?.text ?? ''} type={result?.type ?? 'hero'} />

  {/* Controls */}
  <Controls street={street} isDealing={isDealing} onDeal={deal} onReset={reset} />
</motion.div>
```

**Screen shake logic:**
- After river is dealt, check: did the turn leader (player with highest equity at turn) lose?
- If `turnEquity[leaderId] >= 95` and they lost → `shakeState = "twoOuter"`, plus flash the felt red (CSS transition on a red overlay div, opacity 0 → 0.08 → 0 over 1.5s)
- If `turnEquity[leaderId] >= 80` and they lost → `shakeState = "badBeat"`
- Reset `shakeState` to `"idle"` after the animation completes (use `onAnimationComplete`)

**Shake variants** (on the main `motion.div`):
```ts
const shakeVariants = {
  idle: { x: 0 },
  badBeat: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  twoOuter: {
    x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0],
    transition: { duration: 0.7, ease: "easeInOut" }
  }
}
```

**Street info text:**
- Preflop calculating: `"Preflop · 4,000 simulations running..."`
- Preflop done: `"Preflop equity · {heroEq}% Hero / {villainEq}% Villain"` (or multi-player equivalent)
- After flop: `"After flop · {heroEq}% vs {villainEq}%"`
- After turn: `"After turn · {heroEq}% vs {villainEq}%"`
- After river: `"River · All 5 community cards dealt"`

**2-outer felt flash:** render a `div` with `position: fixed, inset: 0, background: rgba(180,40,40,0.08), pointerEvents: none, zIndex: 9998`. Animate opacity from 0 → 1 → 0 over 1.5s using Framer Motion. Only render when triggered.

**Reference from prototype:** The entire `<div class="tbl">` structure (lines 55-87), `load()` (lines 227-244) for initialization flow, `deal()` (lines 192-225) for deal flow.

**Done when:** The full page renders with header, pills, equity display, board, players, result banner, and controls. Selecting a scenario resets and recalculates. Dealing progresses through streets with animations. River shows the result banner. Bad beats trigger screen shake. The layout matches the spec's ASCII diagram. Everything works for 2-player mode.

---

### Phase 4 — Card Picker & Text Input

---

**Task 21: Card Picker Modal**

**File(s):** `components/CardPicker.tsx`

**Depends on:** Task 2, Task 3, Task 9

**What to build:**

A modal grid for selecting a specific card from the deck.

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Card, Suit, SUIT_SYMBOLS, rankLabel } from '@/lib/deck'

type CardPickerProps = {
  isOpen: boolean
  onSelect: (card: Card) => void
  onClose: () => void
  deadCards: Card[]           // cards already in use — shown dimmed, unselectable
  currentCard: Card | null    // the card being replaced — highlighted
  playerColor: string         // CSS var for the selecting player's accent
  outsCards?: Card[]          // cards that are outs — shown with colored ring
  outsBeneficiary?: string[]  // parallel: player ID each out benefits
}
```

**Layout: 4 rows × 13 columns grid**

Rows ordered: ♠ ♥ ♦ ♣ (spades, hearts, diamonds, clubs)
Columns ordered: 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A (left to right)

Each cell is a mini card button:
- Size: 40px × 54px (desktop), 36px × 48px (mobile)
- Shows rank (top-left) + suit symbol (center or below rank)
- Background: `var(--ivory)` for available cards
- Text color: `var(--red-suit)` for hearts/diamonds, `var(--black-suit)` for spades/clubs
- Border-radius: 4px

**Cell states:**
- **Available:** normal appearance, cursor pointer, hover brightness 1.1
- **Dead (in deadCards):** opacity 0.2, cursor not-allowed, no hover effect, pointer-events none
- **Current (matches currentCard):** border `2px solid var(${playerColor})`, subtle glow matching player color
- **Out card (in outsCards):** 2px ring in the color of the beneficiary player. Ring is outside the card (outline or box-shadow). This is additive — an out card that is also dead is still dimmed.

**Modal behavior:**
- Desktop (≥768px): centered overlay. Backdrop: `rgba(7, 22, 10, 0.85)`. Modal: `var(--felt-mid)` background, padding 20px, border-radius 8px, border `1px solid rgba(255,255,255,0.08)`.
- Mobile (<768px): full-screen overlay with same background. Close button (×) in top-right corner.
- Click backdrop (desktop) or × button: calls `onClose`.
- Click available card: calls `onSelect(card)`, which should also close the picker.

**Entrance animation (Framer Motion):**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
```

**Reference from prototype:** No card picker in the prototype — this is a new feature from the spec. Use the prototype's card color logic (`RED` set on line 92) for suit coloring.

**Done when:** The picker opens as a modal with 4×13 grid. Dead cards are dimmed and unclickable. The current card has a colored highlight. Out cards have colored rings. Selecting a card calls `onSelect`. Clicking outside (desktop) or × (mobile) closes it. On mobile, it's full-screen. The entrance/exit is animated.

---

**Task 22: Card Picker Integration**

**File(s):** `hooks/usePokerState.ts` (extend), `app/page.tsx` (extend)

**Depends on:** Task 19, Task 20, Task 21

**What to build:**

Wire the card picker into the game state and page.

**State additions to usePokerState:**
```ts
// Add to state shape:
pickerTarget: { playerId: string; cardIndex: 0 | 1 } | null

// Add actions:
| { type: 'OPEN_PICKER'; playerId: string; cardIndex: 0 | 1 }
| { type: 'CLOSE_PICKER' }
// UPDATE_CARD already exists from Task 19

// Add to hook return:
pickerTarget: { playerId: string; cardIndex: 0 | 1 } | null
openPicker: (playerId: string, cardIndex: 0 | 1) => void
closePicker: () => void
```

**Page wiring:**

When `pickerTarget` is not null:
1. Determine the player's color from `PLAYER_COLORS[pickerTarget.playerId]`
2. Determine the current card at that slot
3. Compute `allDeadCards` minus the current card (since the current card is being replaced, it should be selectable in the picker)
4. Render `<CardPicker>` with these props

On card select from picker:
1. Call `updateCard(pickerTarget.playerId, pickerTarget.cardIndex, selectedCard)`
2. Call `closePicker()`

**PlayerPanel connection:**
- `onCardClick` in PlayerPanel calls `openPicker(playerId, cardIndex)`

**Dead card validation:**
When `updateCard` is dispatched, the reducer must verify the new card is not in `allDeadCards` (excluding the card being replaced). If it is, reject the action (this is a safety guard — the picker UI should already prevent this).

**Reference from prototype:** No picker in prototype — this is new.

**Done when:** Clicking a hole card opens the picker. The picker shows the correct dead cards (all other players' cards + board cards, but NOT the card being replaced). Selecting a card updates the player's hand, closes the picker, resets the board, and triggers a preflop recalculation. The constraint system works: no card can appear in two places simultaneously.

---

**Task 23: Text Shorthand Input**

**File(s):** `components/CardInput.tsx`, `lib/parseCards.ts`

**Depends on:** Task 3, Task 15

**What to build:**

**`lib/parseCards.ts`:**

```ts
import { Card, Suit } from './deck'

// Parse a two-card string like "AhKd", "Ah Kd", "ah kd", "A♥ K♦", "AH KD"
// Returns [Card, Card] on success, null on failure.
export function parseCardString(input: string): [Card, Card] | null
```

Parser logic:
1. Normalize: uppercase the input, replace Unicode suit symbols with letters (♥→H, ♦→D, ♣→C, ♠→S), strip all whitespace
2. Should now be 4 characters: RankSuitRankSuit (e.g., "AHKD")
3. Parse rank: A=14, K=13, Q=12, J=11, T=10, 2-9 as numbers. "10" is two chars, but the compact format uses "T" for 10.
4. Parse suit: H/D/C/S → h/d/c/s
5. Validate: both cards must have valid rank (2-14) and suit. Both cards must be different.
6. Return `[Card, Card]` or `null`.

Also add:
```ts
// Format two cards back to display string: "Ah Kd"
export function formatCards(cards: [Card, Card]): string
```

**`components/CardInput.tsx`:**

```tsx
type CardInputProps = {
  cards: [Card, Card]
  onChange: (newCards: [Card, Card]) => void
  deadCards: Card[]    // for validation — don't allow cards that are dead
}
```

- Small text input below the hole cards: monospace, 11px, centered, width ~80px
- Shows formatted current cards (e.g., "Ah Kd")
- On change: parse input. If valid AND neither card is dead, call `onChange`. If invalid or dead card conflict, trigger shake animation and revert after 1s.
- Shake: Framer Motion `x: [0, -4, 4, -4, 4, 0]`, 300ms
- On blur: auto-format the display to canonical "Ah Kd" style
- Border: `1px solid rgba(255,255,255,0.08)`, background `var(--felt-mid)`, color `var(--parchment)`

**Reference from prototype:** No text input in prototype — new feature from spec.

**Done when:** Typing "AhKd" in the input updates the player's cards to Ace of hearts + King of diamonds. Typing "zz" shakes and reverts. Typing a card that another player holds shakes and reverts. The input auto-formats on blur.

---

### Phase 5 — Multi-Player Extensions

---

**Task 24: Add Player Button**

**File(s):** `components/AddPlayerButton.tsx`

**Depends on:** Task 2

**What to build:**

```tsx
type AddPlayerButtonProps = {
  visible: boolean    // false when 6 players already
  onClick: () => void
}
```

- Text: `"+ Add Player"`
- Style: matches the secondary button style (`.btn.sec` from prototype) — transparent bg, border `rgba(255,255,255,0.15)`, color `var(--ghost)`, monospace, 11px, uppercase, letter-spacing 2px
- Hover: `background: rgba(255,255,255,0.04)`
- When `visible` is false: render nothing (not just hidden — unmounted)

**Reference from prototype:** `.btn.sec` styling (lines 50-51).

**Done when:** Button renders when < 6 players, disappears at 6. Clicking calls `onClick`.

---

**Task 25: Equity Legend**

**File(s):** `components/EquityLegend.tsx`

**Depends on:** Task 2

**What to build:**

A horizontal legend showing each player's name and equity percentage, used below the equity bar when 4+ players make inline labels too cramped.

```tsx
type EquityLegendProps = {
  players: Array<{
    id: string
    label: string
    equity: number
    color: string      // CSS variable
  }>
}
```

- Horizontal flex row, centered, gap 16px, flex-wrap
- Each entry: a colored dot (8px circle in player's color) + label + equity%
- Font: monospace, 11px, color `var(--parchment)`
- Numbers: tabular-nums for alignment

Only rendered when `players.length >= 4`. For 2-3 players, the inline labels on EquityBar or the EquityNumber components are sufficient.

**Reference from prototype:** N/A — new component.

**Done when:** With 4 players, shows 4 colored dots with labels and percentages. Wraps gracefully if the row is too wide.

---

**Task 26: Multi-Player Full Integration**

**File(s):** `app/page.tsx` (extend), `components/EquityBar.tsx` (extend)

**Depends on:** Tasks 20, 24, 25, Task 19

**What to build:**

Wire the multi-player features into the page.

**Equity display switching:**
- 2 players: show `EquityNumber` (Hero, left) — `EquityBar` (binary) — `EquityNumber` (Villain, right) in a horizontal row. Story text below.
- 3 players: show `EquityBar` (segmented) with inline labels. Numbers for each player below in a row.
- 4+ players: show `EquityBar` (segmented, no inline labels) + `EquityLegend` below.

**Add Player button:** rendered below the PlayersGrid. Calls `addPlayer()` from `usePokerState`.

**Street info text for multi-player:** instead of "X% Hero / Y% Villain", show "Hero X% · P2 Y% · P3 Z%" etc.

**Scenario pills for multi-way:** when a multi-way scenario is selected (3-Way All-In, Dominated, Full Table), the layout should switch to multi-player mode seamlessly. The "Full Table" scenario replaces placeholder cards with random ones.

**Test the critical path:** Select "Full Table" → 6 players appear with random hands → equity bar shows 6 segments → deal flop → segments animate → deal turn → deal river → result banner shows winner.

**Reference from prototype:** Prototype is heads-up only. This task adds the multi-player layer on top.

**Done when:** Adding players (up to 6) works. Each has their accent color. The equity bar switches between binary and segmented modes. Removing a player recalculates. Multi-way scenarios work. The full deal cycle (preflop through river) works with 3-6 players.

---

### Phase 6 — Advanced Features

---

**Task 27: Outs Tray**

**File(s):** `components/OutsTray.tsx`

**Depends on:** Task 9, Task 19

**What to build:**

A compact row of mini cards showing which remaining deck cards would flip the current leader.

```tsx
type OutsTrayProps = {
  outs: Card[]
  outsBeneficiary: string[]   // parallel array: player ID each out benefits
  visible: boolean            // only visible after flop and turn (not preflop or river)
}
```

Layout:
- Appears between the Board and the PlayersGrid
- Label above: `"{count} outs — cards that change the lead"` in monospace 10px, `var(--ghost)`
- Row of mini cards: 28×38px each (smaller than regular cards), horizontal flex, flex-wrap, gap 4px, centered
- Each mini card shows rank + suit, colored by the beneficiary player:
  - Subtle glow/ring in the beneficiary player's color (2px box-shadow)
  - Card face colors remain standard (red/black suits)
- If no outs (current leader holds with every remaining card), show: `"No outs — current leader holds"` in `var(--ghost)`

**Animation:** Framer Motion `AnimatePresence` — tray slides in from below with `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -8 }}`, duration 300ms.

**Visibility logic (handled by parent):**
- `visible={street === 1 || street === 2}` — show after flop and turn only
- Preflop (street 0): no outs to show
- River (street 3): no more cards to come, hide the tray

**Reference from prototype:** No outs tray in prototype — new feature from spec.

**Done when:** After the flop, the outs tray appears with a list of mini cards that would change the leader. Each card has a colored ring matching the player it helps. After the river, the tray disappears. With no outs, shows the "no outs" message.

---

**Task 28: Outs in Card Picker**

**File(s):** `components/CardPicker.tsx` (extend), `app/page.tsx` (extend)

**Depends on:** Task 21, Task 22, Task 19

**What to build:**

When the card picker is open after the flop or turn has been dealt, out cards should have a visible colored ring.

**Page wiring:**
- Pass `outs` and `outsBeneficiary` from `usePokerState` to `CardPicker` as `outsCards` and `outsBeneficiary` props
- Only pass outs when `street === 1 || street === 2` (after flop or turn). Otherwise pass empty arrays.

**Picker rendering (already partially built in Task 21):**
- Out cards in the grid get a `2px` outline in the beneficiary player's color
- This is purely visual — it doesn't affect selectability. An out card that is not dead is still selectable.
- An out card that IS dead is still dimmed (dead state takes priority) but the ring is still faintly visible at reduced opacity

**Reference from prototype:** N/A — new feature.

**Done when:** Open the card picker after the flop. Cards that are outs show a colored ring indicating which player they help. Dead cards that are also outs show a faint ring but remain unselectable. Cards that are neither outs nor dead show no ring.

---

**Task 29: Equity Sparkline**

**File(s):** `components/EquitySparkline.tsx`

**Depends on:** Task 2, Task 19

**What to build:**

A thin SVG line chart showing Hero's equity across streets.

```tsx
type EquitySparklineProps = {
  history: number[]    // Hero's equity at each street dealt so far (1-4 values)
}
```

**Visual spec:**
- Width: 100% of the equity bar (use a matching container)
- Height: 48px
- SVG viewBox: `0 0 300 48` (or compute dynamically from container width)

**X axis:** 4 equally spaced positions at x = 0, 100, 200, 300 (in viewBox coords). Labels below in `var(--ghost)`, monospace, 10px: "Pre", "Flop", "Turn", "River". Only show labels for positions that have data + the next one.

**Y axis:** 0–100% mapped to 48px–0px (inverted — 100% is at top). No gridlines.

**Line:** `var(--gold)` stroke, 1.5px stroke-width, no fill. `stroke-linecap: round`, `stroke-linejoin: round`.

**Data points:** 4px radius circles in `var(--gold)` at each data point.

**Path animation:** When a new point is added, the new line segment draws itself using the `stroke-dashoffset` trick:
1. Calculate total path length
2. Set `stroke-dasharray` and `stroke-dashoffset` to the new segment's length
3. Animate `stroke-dashoffset` to 0 over 400ms

In Framer Motion, use `motion.path` with `pathLength`:
```tsx
<motion.path
  d={pathD}
  initial={{ pathLength: previousRatio }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
/>
```

Where `previousRatio` = (number of previous points - 1) / (current points - 1), so only the new segment animates.

**Bad beat coloring:** If the latest equity drop is > 40 points (e.g., hero goes from 85% to 40%), the new line segment draws in `var(--red-suit)` initially, then transitions to `var(--gold)` over 800ms. Use Framer Motion `animate={{ stroke: "var(--gold)" }}` with `transition={{ delay: 0.4, duration: 0.8 }}` starting from `initial={{ stroke: "var(--red-suit)" }}`.

**Placement:** directly below the equity bar, with 8px margin-top.

**Reference from prototype:** No sparkline in prototype — new feature from spec.

**Done when:** After preflop, one dot appears at the left. After the flop, a second dot appears and a gold line draws from dot 1 to dot 2 with a 400ms animation. After all 4 streets, the full line is visible with 4 dots. A >40-point drop renders the new segment in red before fading to gold. The SVG scales to container width.

---

**Task 30: Bad Beat Screen Shake & Felt Flash**

**File(s):** `app/page.tsx` (extend)

**Depends on:** Task 20

**What to build:**

The screen shake and felt flash were outlined in Task 20 as part of page assembly. This task ensures the full implementation is polished.

**Bad beat detection** (runs after river result is determined):

```ts
// In usePokerState or in page.tsx after river:
const turnEquity = equityHistory[2] // equity array at turn (index 2 = after turn dealt)
if (turnEquity) {
  const turnLeaderIdx = turnEquity.indexOf(Math.max(...turnEquity))
  const turnLeaderEquity = turnEquity[turnLeaderIdx]
  const riverWinnerIdx = // index of actual winner from result evaluation

  if (turnLeaderIdx !== riverWinnerIdx) {
    if (turnLeaderEquity >= 95) {
      // 2-outer: strong shake + felt flash
      setShakeState('twoOuter')
      setFeltFlash(true)
    } else if (turnLeaderEquity >= 80) {
      // Bad beat: standard shake
      setShakeState('badBeat')
    }
  }
}
```

**Felt flash (2-outer only):**
Render a div over the entire viewport:
```tsx
<AnimatePresence>
  {feltFlash && (
    <motion.div
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'rgba(180, 40, 40, 0.08)', zIndex: 9998 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={() => setFeltFlash(false)}
    />
  )}
</AnimatePresence>
```

**Reset:** After shake animation completes (`onAnimationComplete` on the main `motion.div`), set `shakeState` back to `"idle"`.

**Test scenario:** Use "AA vs KK". Deal flop, turn, river. If AA is at >80% after turn and KK wins on river, the shake should trigger. This won't happen every time (AA is usually the winner), so you may need to test by temporarily hardcoding a board that produces a bad beat. The logic itself must be correct regardless of test convenience.

**Reference from prototype:** No shake in prototype — new feature from spec.

**Done when:** When the turn leader had ≥80% equity and loses on the river, the page shakes. When the turn leader had ≥95% equity and loses, the page shakes harder and the felt briefly flashes red. The animations look smooth and cinematic. The shake resets after completion.

---

### Phase 7 — Sharing & Polish

---

**Task 31: URL Parser & Encoder**

**File(s):** `lib/parseUrl.ts`

**Depends on:** Task 3

**What to build:**

Encode and decode hand state to/from URL query parameters.

```ts
import { Card, Suit } from './deck'

// Encode a card to 2-char string: rank + suit
// Rank: 2-9 as digit, T=10, J=11, Q=12, K=13, A=14
// Suit: h, d, c, s
export function encodeCard(card: Card): string

// Decode a 2-char string to Card, or null if invalid
export function decodeCard(str: string): Card | null

// Encode full hand state to URL search params string (no leading ?)
// Format: p=AhAd,KsKc,QhQd&b=2h5dJsTs9c
export function encodeHandState(players: Card[][], board: Card[]): string

// Decode URL search params to hand state
// Returns null if parsing fails (invalid cards, duplicates, etc.)
export function decodeHandState(params: URLSearchParams): {
  players: Card[][]
  board: Card[]
} | null
```

**Encoding details:**
- Rank mapping: `{14:'A', 13:'K', 12:'Q', 11:'J', 10:'T'}`, 2-9 as digit character
- Suit: lowercase letter as-is
- Each player: two cards concatenated (e.g., `AhAd`)
- Players: comma-separated in `p` param
- Board: all cards concatenated (no separator) in `b` param. Board length determines how many streets to auto-deal.

**Decoding details:**
- Support both `p=...` format and legacy `h=...&v=...` format
- `h=AhAd&v=KsKc` → 2 players
- `p=AhAd,KsKc,QhQd` → 3 players
- Validate: all cards must be valid (rank 2-14, suit h/d/c/s), no duplicates across all players + board
- On any error: return `null` (caller falls back to default scenario)

**Reference from prototype:** No URL handling in prototype — new feature.

**Done when:** `encodeCard({r:14,s:'h'})` returns `"Ah"`. `decodeCard("Ah")` returns `{r:14,s:'h'}`. `encodeHandState([[{r:14,s:'h'},{r:14,s:'d'}],[{r:13,s:'s'},{r:13,s:'c'}]], [{r:2,s:'h'},{r:5,s:'d'},{r:11,s:'s'}])` returns `"p=AhAd,KsKc&b=2h5dJs"`. `decodeHandState(new URLSearchParams("h=AhAd&v=KsKc&b=2h5dJs"))` returns the correct players and board. Duplicate cards return null. Invalid input returns null.

---

**Task 32: Share Button & URL Auto-Replay**

**File(s):** `components/ShareButton.tsx`, `app/page.tsx` (extend), `hooks/usePokerState.ts` (extend)

**Depends on:** Task 31, Task 18, Task 20

**What to build:**

**ShareButton component:**

```tsx
type ShareButtonProps = {
  players: Card[][]
  board: Card[]
  visible: boolean    // only show after river
}
```

- Renders inline in the result banner area
- Text: `"Share this hand"` in monospace, sharp border (same style as `.btn`)
- On click:
  1. Encode state with `encodeHandState`
  2. Construct full URL: `${window.location.origin}${window.location.pathname}?${encoded}`
  3. Copy to clipboard via `navigator.clipboard.writeText(url)`
  4. Change button text to `"Copied"` for 1.5s, then revert

**URL auto-replay on page load:**

In `page.tsx` (or `usePokerState`), on mount:
1. Read `window.location.search`
2. Call `decodeHandState`. If null, load default scenario (AA vs KK).
3. If valid:
   a. Set players' hole cards (no flip animation — they're "already known")
   b. Auto-deal with delays:
      - Flop (first 3 board cards): deal at 0ms
      - Turn (4th card): deal at 1200ms after flop
      - River (5th card): deal at 1200ms after turn
   c. Each deal uses the normal card flip + equity bar animation
   d. Show result banner after river settles

Use `useEffect` with empty deps for the mount check. Use `setTimeout` for the auto-deal delays.

**After auto-replay completes,** clear the URL params (use `window.history.replaceState`) so that refreshing doesn't re-trigger the replay.

**Reference from prototype:** No sharing in prototype — new feature.

**Done when:** After a hand is complete, a "Share this hand" button appears. Clicking it copies a URL to clipboard. Opening that URL in a new tab auto-deals the hand with full animations. The result is the same hand replayed. Invalid URLs fall back to the default scenario gracefully.

---

**Task 33: Responsive Styling Pass**

**File(s):** `app/globals.css` (extend), all components as needed

**Depends on:** All previous tasks

**What to build:**

A focused responsive polish pass to ensure everything works at the `md` (768px) breakpoint.

**Checklist:**

1. **Cards:** `size` prop switches at 768px. Board cards: md=70px, sm=52px. Card picker cells: md=40px, sm=36px. Verify cards never overflow.

2. **Equity numbers:** `lg` size renders at 64px ≥768px, 48px <768px.

3. **Board:** All 5 cards fit in a single row at 320px viewport width with `sm` cards. Gap reduces to 6px on mobile. Verify: 5 × 52px + 4 × 6px = 284px < 320px. ✓

4. **Players grid:** At <768px with 3+ players, switches to 2-column grid. Verify 6 players fit without overflow.

5. **Card picker:** Full-screen at <768px. Touch targets ≥ 44px.

6. **Outs tray:** Mini cards wrap if more than ~8-10 on mobile.

7. **Scenario pills:** flex-wrap handles narrow viewports. Verify no horizontal scroll.

8. **Sparkline:** SVG scales to container width (use `width="100%" preserveAspectRatio`).

9. **Max-width container:** 800px centered. On mobile, full-width with 16px horizontal padding.

10. **Result banner + share button:** stack vertically on mobile if needed.

Use Tailwind responsive prefixes (`md:`) for all breakpoint-dependent styles. No JavaScript-based responsive logic — CSS/Tailwind only for layout responsiveness.

**Reference from prototype:** Prototype has no responsive styles. This is a new concern.

**Done when:** The app looks good and is fully functional at 375px (iPhone SE), 768px (tablet), and 1280px (desktop). No horizontal scrolling. No overflowing elements. Touch targets are accessible on mobile. Cards never wrap off-screen.

---

**Task 34: Final Animation & Polish Pass**

**File(s):** Various — all components

**Depends on:** All previous tasks

**What to build:**

A final sweep to ensure animation quality meets the "cinematic" bar.

**Checklist:**

1. **Equity bar spring:** verify the overshoot is visible but not cartoonish. Tune `stiffness: 80, damping: 14` if needed. The bar should overshoot by ~5-8% and settle in ~600ms.

2. **Card flip:** verify the 380ms rotateY animation looks physical, not digital. Cards should feel like they're flipping over on a table.

3. **Number counter:** verify the spring feels synced with the bar. Numbers and bar should arrive at their final values at roughly the same time.

4. **Flop stagger:** 160ms between cards should feel like a dealer sliding cards. Not too fast (they blur together) and not too slow (feels sluggish).

5. **Scenario crossfade:** when switching scenarios, the old state should fade out and new state fade in smoothly. Board clears, new hole cards appear, new equity animates in.

6. **Result banner:** entrance should feel weighty — the 12px upward motion + 500ms fade should give it gravitas.

7. **Grain texture:** verify it's visible at 4% opacity but doesn't interfere with card readability. Adjust `baseFrequency` if the pattern is too coarse or too fine.

8. **No animation jank:** verify no layout shifts during animations. All animated properties should be `transform` or `opacity` (GPU-composited) where possible. Width animations on the equity bar are necessary but should not cause reflow of other elements (the bar is in its own container with fixed height).

9. **Disabled state clarity:** disabled buttons should be obviously disabled (opacity 0.22 from spec).

10. **Card hover lift:** verify `scale: 1.05` with gold glow on interactive cards is subtle but discoverable.

**Reference from prototype:** Compare final app against the prototype's feel. The prototype's animation is basic but effective. The final app should feel noticeably more polished while maintaining the same timing.

**Done when:** All animations feel smooth, intentional, and cinematic. No jank. No flicker. The equity bar spring is the star — it overshoots satisfyingly on dramatic swings. The overall feel is "HBO poker documentary overlay", not "Bootstrap card game."

---

## Part 3: Agent Standing Instructions

Every Sonnet agent executing a task from this plan must follow these rules:

### 1. Handling Ambiguity
If a task description is unclear or seems to conflict with something you see in the codebase, **stop and flag the issue**. Do not guess. Do not make a "reasonable assumption." Write a comment at the top of the file you're working on with `// FLAG:` prefix describing the ambiguity, then complete as much of the task as possible without the ambiguous part.

### 2. Spec vs Prototype Conflicts
The spec addendum (Part 1 of this document) is the final authority. When the original spec says one thing and the prototype does another, follow the spec addendum. Specifically:
- **Animation:** Use Framer Motion everywhere, not CSS keyframes (even though prototype uses CSS)
- **State:** Use the `usePokerState` hook pattern, not inline state (even though prototype uses globals)
- **Monte Carlo:** Support N players, not just 2 (even though prototype is heads-up only)
- **Card data:** Use `{ r: number, s: Suit }` objects in app code, `[number, string]` tuples only for Worker messages

### 3. Code Style Rules
- TypeScript `strict: true` — no `any` types, no `@ts-ignore`, no `as` casts unless there's genuinely no alternative (and document why)
- Components: PascalCase filenames and export names (`EquityBar.tsx` exports `EquityBar`)
- Hooks: camelCase with `use` prefix (`usePokerState.ts` exports `usePokerState`)
- Lib functions: camelCase (`monteCarlo`, `eval5`, `parseCardString`)
- Use named exports everywhere, no default exports
- Props types: defined in the same file as the component, named `{ComponentName}Props`
- Tailwind for layout and spacing; CSS variables for colors and theming
- No inline styles for colors — always reference CSS variables via `style={{ color: 'var(--gold)' }}` or Tailwind arbitrary values `text-[var(--gold)]`
- No `console.log` in committed code (use `// FLAG:` comments for debugging concerns)

### 4. If "Done When" Is Not Achievable
If the "done when" criterion for your task is not achievable as written (e.g., it references a component that doesn't exist yet, or a browser behavior that doesn't match), **complete the task to the best of your ability**, document what's missing in a `// TODO:` comment, and report the discrepancy. Do not block on unachievable criteria.

### 5. Signaling Completion
When your task is complete:
1. Ensure all files compile with `npx tsc --noEmit` (no TypeScript errors)
2. List every file you created or modified
3. State which "done when" criteria you verified and how
4. Flag any concerns, ambiguities, or deviations from the task spec

### 6. What NOT To Do
- Do not modify files outside your task's listed file(s) unless absolutely necessary (e.g., adding an import to a parent component). If you must touch another file, document why.
- Do not install additional npm packages unless the task explicitly says to.
- Do not refactor code from previous tasks. If you see something wrong, flag it — don't fix it.
- Do not add features beyond what your task specifies. No "while I'm here" improvements.
- Do not add comments explaining obvious code. Only comment non-obvious logic.
- Do not add error boundaries, loading skeletons, or analytics unless your task specifies them.
