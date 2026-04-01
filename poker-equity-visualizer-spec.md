# Poker Equity Visualizer — Product Spec

## What this is

A browser-based interactive tool that shows real-time win probability for two poker hands as community cards are revealed one street at a time. The animation of the equity bar reacting to each card IS the product. No game loop, no betting, no score — purely a learning and "aha" tool.

**Core insight:** Everyone who has watched poker on TV has wondered why the commentator says "she's a 72% favorite" and then she loses. This makes that visible and visceral.

---

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + custom CSS variables for the felt/noir palette
- **Animation:** Framer Motion for equity bar + card flips
- **Math:** Pure JS, no libraries — hand evaluator + Monte Carlo in a Web Worker
- **Deploy:** Vercel (zero config)
- **No backend, no database, no auth**

---

## Aesthetic Direction: Cinematic Poker Noir

This is the single most important thing to get right. The visual language should feel like an HBO poker documentary, not a casino app or a tutorial site.

### Color palette (CSS variables)
```css
--felt:        #07160a   /* near-black green — main background */
--felt-mid:    #0e2210   /* card table surface */
--felt-light:  #152d17   /* elevated surfaces */
--gold:        #b8943a   /* Hero accent — warm amber gold */
--gold-dim:    #7a5f22   /* muted gold for secondary elements */
--steel:       #4a85b0   /* Villain accent — cool blue steel */
--steel-dim:   #2d5570   /* muted steel */
--ivory:       #f6f0e2   /* card face background */
--ivory-dim:   #e8dfc8   /* card text, headings */
--parchment:   #ddd5bc   /* body text */
--ghost:       #4a6650   /* muted labels, tertiary text */
--red-suit:    #b52b2b   /* hearts and diamonds */
--black-suit:  #111111   /* spades and clubs */
```

### Typography
- **Display/numbers:** `Playfair Display` (Google Fonts) — serif, gives equity numbers weight and gravitas
- **Labels/UI:** `JetBrains Mono` or `IBM Plex Mono` — monospace, gives it a data/terminal feel
- **Body:** System serif fallback

### Key aesthetic rules
- Background is always `--felt`, never white or gray
- Cards are ivory with subtle inner shadow — they look physical
- Equity numbers are huge (64px+), center stage, not tucked in a corner
- The bar lives between the two numbers and is the visual centerpiece
- No rounded pill buttons — sharp rectangular borders only
- Grain texture overlay on the felt (SVG noise filter or CSS) at 3–5% opacity

---

## Layout

### Single page, three zones stacked vertically:

```
┌─────────────────────────────────────┐
│  HEADER                             │
│  "Every Card Changes Everything"    │
│  Scenario pills                     │
├─────────────────────────────────────┤
│  EQUITY ZONE                        │
│  72%  [═══════════════░░░░░]  28%   │
│  Hero              Villain          │
│  "Pocket Aces"     "Cowboys"        │
├─────────────────────────────────────┤
│  BOARD                              │
│  [card][card][card] [card] [card]   │
│   ─── flop ───      turn    river   │
├─────────────────────────────────────┤
│  HOLE CARDS                         │
│  [A♥][A♦]    vs    [K♠][K♣]        │
├─────────────────────────────────────┤
│  RESULT BANNER (appears on river)   │
│  "Hero wins — Full House"           │
├─────────────────────────────────────┤
│  CONTROLS                           │
│  [Deal Flop]  [Reset]               │
└─────────────────────────────────────┘
```

### Responsive behavior
- Mobile: same layout, cards scale down to ~52px wide
- Cards never wrap — they scale to fit viewport width
- Equity numbers stay large on mobile (48px minimum)

---

## Core Features (v1)

### 1. Scenario selector
5 preset matchups shown as pill buttons above the equity zone:

| Label | Hero | Villain | Story |
|---|---|---|---|
| AA vs KK | A♥A♦ | K♠K♣ | Cooler — 80/20 preflop |
| AKs vs QQ | A♠K♠ | Q♥Q♣ | Classic coin flip setup |
| Coin Flip | A♥9♦ | 7♠7♣ | Literally a flip |
| Set-up | T♥T♦ | 9♠8♣ | Overpair vs open-ender |
| Kicker War | A♥T♣ | A♦5♥ | Same pair, kicker decides |

Selecting a pill: resets board, recalculates preflop equity, animates numbers in.

### 2. Preflop equity display
On load/scenario select, run Monte Carlo (4,000 iterations) immediately and display starting equity. Show a subtle "calculating..." pulse while running (it's fast — under 100ms — but the feedback matters).

### 3. Street-by-street dealing
Button states:
- Initial: "Deal Flop"
- After flop: "Deal Turn"  
- After turn: "Deal River"
- After river: disabled / shows result

Each deal:
1. Cards animate in one at a time (flop: 3 cards with 150ms stagger)
2. After cards settle (~400ms), run new Monte Carlo with known board
3. Equity bar animates to new position with spring physics
4. Numbers count up/down to new value (animated counter)
5. Street label updates ("After flop · 68% Hero")

### 4. Equity bar animation — THE HERO MOMENT
This is the most important interaction in the product. Get this right above everything else.

- Bar represents Hero equity left-to-right (gold fill from left)
- Width transitions with `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot spring
- On a dramatic swing (>20% change): bar briefly flashes before settling
- If Hero equity collapses below 15%: bar pulses red once
- If Hero equity surges above 85%: bar pulses gold once
- Numbers animate with a 400ms counter animation (not instant jump)

### 5. River result banner
After river card dealt, evaluate actual winner:
- Full hand name: "Hero wins — Full House, Tens over Eights"
- Split: "Chopped pot — Both have Broadway"
- Equity snaps to 100/0 (or 50/50 for split)
- Banner fades in with slight upward motion

### 6. Custom hand entry — Card Picker UI

Each player's hole cards are clickable. Clicking either card opens a **card picker modal** overlaid on the felt.

**Card picker design:**
- 4 rows (one per suit: ♠ ♥ ♦ ♣) × 13 columns (2–A)
- Each cell is a mini card button showing rank + suit
- Already-dealt cards (board or other players' hands) are dimmed and unselectable
- Currently selected card is highlighted in the player's accent color (gold for Hero, steel for Villain, distinct color per additional player)
- Clicking a card: closes picker, updates that slot, reruns Monte Carlo immediately
- Clicking outside: dismisses with no change

**Picker trigger:** clicking directly on a hole card — the card lifts slightly (scale 1.05, subtle glow) to signal it's interactive. Cursor changes to pointer.

**State constraint:** the engine must treat all assigned cards as dead before running simulation. If a user picks a card already held by another player, show a brief shake animation on the target card and block the selection.

**Text shorthand input (secondary):** small text input below each hand showing e.g. `Ah Kd` — user can type directly. Parser accepts: `AhKd`, `Ah Kd`, `ah kd`, `A♥ K♦`. Invalid input shakes and reverts. This is a power-user shortcut, not the primary interaction.

### 7. Multi-player mode — Add / Remove Players

**Add player button:** a `+ Add Player` button sits below the hole cards row, visible when fewer than 6 players are in the hand. Clicking adds a new player with two random undealt hole cards assigned automatically.

**Maximum players:** 6 (deck constraint — 2 hole cards × 6 = 12 cards, leaves 40 for board + simulation breathing room).

**Removing a player:** each non-Hero player has a small `×` dismiss button in their header. Hero cannot be removed (always player 1). Removing a player reassigns their cards back to the available pool and reruns Monte Carlo.

**Equity display with 3+ players:**

The two-number equity bar doesn't scale past heads-up. When 3+ players are active, the layout switches:

```
┌─────────────────────────────────────────┐
│  EQUITY BAR (segmented, not binary)     │
│  [══Hero 48%══|═P2 31%═|═P3 21%═]      │
│  Gold         Steel      Teal           │
└─────────────────────────────────────────┘
```

- Bar becomes segmented — each player gets a colored segment proportional to their equity
- Each segment labeled with player name + % inline if wide enough, tooltip if too narrow
- Player color assignment: Hero = gold, P2 = steel blue, P3 = teal, P4 = coral, P5 = violet, P6 = slate
- Numbers shown as a horizontal legend below the bar when 4+ players (inline gets too cramped)

**Hole card row with 3+ players:**

Cards wrap into a 2-column or 3-column grid below the board rather than a single horizontal row. Each player panel has:
- Player label ("Hero", "Player 2", etc.) in their accent color
- Two hole cards (clickable to edit)
- Their current equity % in large type
- `×` button (non-Hero only)

**Monte Carlo with multiple players:**

The engine change is minimal — `monteCarlo` already supports N players, just pass an array of hole card pairs instead of two fixed arguments:

```ts
function monteCarlo(players: Card[][], board: Card[], n = 4000): number[]
// Returns array of equity percentages, one per player, summing to 100
```

Each simulation runout evaluates `best()` for all players against the completed board, tallies the winner (or splits equity equally on tie).

**Multi-player preset scenarios:**

Add 3 multi-way presets to the pill selector:

| Label | Setup | Story |
|---|---|---|
| 3-Way All-In | AA vs KK vs QQ | Classic tournament cooler |
| Dominated | AK vs AQ vs A2 | Kicker hierarchy fully visible |
| Full Table | AA vs 5 random | How much equity do aces really have? |

**Performance note:** with 6 players, Monte Carlo stays fast — evaluation per runout is O(players × 21) which is trivial. Keep n=4000. No change needed to the Web Worker interface.

### 8. Outs Visualization

After each street (flop and turn), compute which remaining deck cards would flip the current leader. Display these as a dedicated **Outs Tray** that appears below the board.

**How it works:**
```ts
function computeOuts(players: Card[][], board: Card[]): OutsResult {
  const remaining = strip(mkDeck(), [...allHoleCards, ...board])
  const currentLeader = getCurrentLeader(players, board)
  const outs: Card[] = []

  remaining.forEach(card => {
    const testBoard = [...board, card]
    const newLeader = getCurrentLeader(players, testBoard)
    if (newLeader !== currentLeader) outs.push(card)
  })

  return { outs, count: outs.length }
}
```

**Outs Tray UI:**
- Appears between the board and the hole cards after the flop is dealt
- Shows a compact row of mini cards — the actual suit/rank cards that flip the lead
- Each out card glows in the color of the player who benefits (gold if it helps Hero, steel if it helps Villain)
- Label: "9 outs — cards that change the lead"
- On the river, outs tray disappears (no more cards to come)
- In multi-player mode, outs are colored per the player they benefit most

**Also surface outs in the Card Picker:** when the picker is open after a street is dealt, out cards get a subtle colored ring so users can see "these are the cards that would have saved me" while browsing the full deck.

**`useEquity` hook** — extend the Web Worker message to return outs alongside equity:
```ts
// Worker returns:
{ equity: number[], outs: Card[], outsCount: number }
```

### 9. Equity Sparkline

A thin line chart tracking Hero's equity % across all streets, drawn directly below the equity bar. Tells the full story of the hand at a glance.

**Data points:** Preflop → Flop → Turn → River (up to 4 points depending on how many streets have been dealt). Points are added live as each street is dealt.

**Visual spec:**
- `--gold` stroke, 1.5px line weight, no fill under the line
- Chart height: 48px, full width of the equity bar
- X axis: 4 equally spaced positions labeled Pre / Flop / Turn / River in `--ghost` monospace at 10px
- Y axis: implicit 0–100%, no gridlines — just the line itself
- Each data point is a 4px circle dot in `--gold`
- Line draws itself with a path animation when a new point is added (stroke-dashoffset trick, 400ms)
- On a bad beat (equity drops >40% in one street), the new line segment draws in `--red-suit` before fading to `--gold` over 800ms

**Implementation:** SVG drawn in JS/React, no charting library needed. 4 points is trivial to plot manually.

**Sparkline component:** `components/EquitySparkline.tsx` — takes `history: number[]` prop (array of equity values, one per street dealt so far).

### 10. Bad Beat Screen Shake

When the river card produces a bad beat — defined as the leading player at turn had >80% equity and loses — trigger a screen shake animation on the main container.

**Trigger condition:**
```ts
const isBadBeat = turnEquity[leaderId] >= 80 && riverWinner !== leaderId
const is2Outer = turnEquity[leaderId] >= 95 && riverWinner !== leaderId
```

**Animation:**
```ts
// Framer Motion variant on the page wrapper
const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5, ease: "easeInOut" }
  }
}
```

- Standard bad beat (≥80% → loss): 0.5s shake, amplitude 8px
- 2-outer (≥95% → loss): 0.7s shake, amplitude 14px, slight red flash on the felt background (`rgba(180,40,40,0.08)`) that fades over 1.5s
- No sound, no haptics — visual only

**The felt flash:** on a 2-outer, the `--felt` background briefly warms toward red using a CSS transition on a pseudo-element overlay. Subtle — the user should feel it before they consciously notice it.

### 11. Shareable URL

After a hand is complete (river dealt), a **Share** button appears in the result banner. Clicking it encodes the full hand state into the URL and copies it to clipboard.

**URL format:**
```
visualizer.com/?h=AhKd&v=QsQc&b=2h5dJsTs9c
```

For multi-player:
```
visualizer.com/?p=AhKd,QsQc,7h7d&b=2h5dJsTs9c
```

**Encoding:** plain query string, no Base64 needed. Cards encoded as rank+suit shorthand (`Ah`, `Kd`, `Ts`). Board cards comma or space separated.

**On load with URL params:**
1. Parse cards from query string
2. Validate all cards exist and are unique (no duplicates)
3. Deal the board automatically with full animations — flop at 0ms, turn at 1200ms, river at 2400ms — so the recipient watches the hand play out
4. Show result banner at the end

**Share button UI:** appears inline in the result banner — `[ Share this hand ]` in monospace, sharp border, copies URL and briefly changes text to `[ Copied ]` for 1.5s.

**Parser utility:** `lib/parseUrl.ts` — handles malformed input gracefully (missing cards, invalid ranks, duplicate cards) with a fallback to the default AA vs KK scenario.

---

## Engine (copy directly from prototype)

### Hand evaluator
Evaluates any 5 cards into a score. Checks in order:
1. Straight flush
2. Four of a kind
3. Full house
4. Flush
5. Straight (including wheel A-2-3-4-5)
6. Three of a kind
7. Two pair
8. Pair
9. High card

Returns `{hr: 0-8, score: number}` where score encodes rank + kickers for tiebreaking.

### Best hand finder
`best(holeCards, boardCards)` — generates all C(n,5) combinations from hole+board, returns highest scoring 5-card hand.

### Monte Carlo
```js
function monteCarlo(hero, villain, board, n = 4000) {
  // Strip known cards from deck
  // For each simulation:
  //   Shuffle remaining deck
  //   Complete board to 5 cards
  //   Evaluate best hand for each player
  //   Tally win/loss/split
  // Return { hero: %, villain: % }
}
```

Run in a **Web Worker** so the UI never blocks. Post message in, post result out.

### Deck utilities
```js
mkDeck()     // 52-card array {r: 2-14, s: h/d/c/s}
shuf(deck)   // Fisher-Yates in-place shuffle
strip(deck, deadCards)  // remove known cards
combos(arr, k)          // C(n,k) combinations
```

---

## Animation Spec

### Card flip
```css
@keyframes cardFlip {
  from { transform: rotateY(90deg) scale(0.88); opacity: 0; }
  to   { transform: rotateY(0deg)  scale(1);    opacity: 1; }
}
/* Duration: 380ms, easing: cubic-bezier(0.23, 1, 0.32, 1) */
```

Flop cards stagger: card 1 at 0ms, card 2 at 160ms, card 3 at 320ms.

### Equity bar
```css
transition: width 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

On dramatic swing (>25%), add a 120ms flash:
```js
bar.classList.add('flash')
setTimeout(() => bar.classList.remove('flash'), 120)
```

### Number counter
Animate equity number from old value to new over 500ms using `requestAnimationFrame`. Easing: ease-out. Always shows integers (Math.round).

### Scenario pill select
New hand loads with:
1. Board slots fade out (100ms)
2. Hole cards crossfade (200ms)
3. Equity numbers count to new values (400ms)
4. Result banner hidden

---

## File Structure

```
/
├── app/
│   ├── page.tsx              # Main page (single route)
│   ├── layout.tsx            # Font loading, metadata
│   └── globals.css           # CSS variables, felt background, grain
├── components/
│   ├── EquityBar.tsx         # Bar — binary (2P) or segmented (3P+)
│   ├── EquityLegend.tsx      # Player % breakdown for 4+ players
│   ├── Card.tsx              # Single card with flip + interactive states
│   ├── Board.tsx             # 5 community card slots
│   ├── PlayerPanel.tsx       # Hole cards + equity + label for one player
│   ├── PlayersGrid.tsx       # Lays out N PlayerPanels responsively
│   ├── CardPicker.tsx        # Modal grid for selecting a card
│   ├── AddPlayerButton.tsx   # + Add Player control (hidden at 6 players)
│   ├── ScenarioPills.tsx     # Preset selector (heads-up + multi-way)
│   ├── EquitySparkline.tsx   # Gold line chart Pre→Flop→Turn→River
│   ├── OutsTray.tsx          # Cards that flip the lead post-flop/turn
│   ├── ResultBanner.tsx      # Winner announcement + Share button
│   └── Controls.tsx          # Deal/Reset buttons
├── lib/
│   ├── evaluator.ts          # Hand evaluator + best() function
│   ├── monteCarlo.ts         # Simulation engine
│   ├── deck.ts               # Deck utilities
│   ├── scenarios.ts          # Preset matchup data
│   └── parseUrl.ts           # URL state encoder/decoder for sharing

└── workers/
    └── equity.worker.ts      # Web Worker wrapper for Monte Carlo
```

---

## Scenarios Data Shape

```ts
type Card = { r: number; s: 'h' | 'd' | 'c' | 's' }

type Player = {
  id: string           // "hero" | "p2" | "p3" ...
  label: string        // "Hero" | "Player 2" ...
  color: string        // CSS var name e.g. "--gold"
  cards: [Card, Card]
  equity: number       // 0–100, updated after each street
}

type Scenario = {
  name: string
  players: Player[]    // 2–6 players
  story: string        // one line shown below the bar
  isMultiway: boolean  // true for 3+ player presets
}
```

---

## What NOT to build in v1

- No betting / pot size
- No hand history
- No mobile app
- No user accounts
- No "play against the computer"
- No leaderboard / streak tracking
- No more than 6 players (deck math breaks down for learning purposes)

The product is a visualizer. The moment you add a game loop you're competing with PokerStars.

---

## Portfolio talking points

When showing this to a recruiter:

1. **"The engine"** — real hand evaluator, not a lookup table. Evaluates C(7,5)=21 combinations per hand, real Monte Carlo with 4,000 runouts in <100ms, scales to N players with no performance hit
2. **"The product decision"** — deliberately removed the game loop. The insight was that the learning moment is watching equity change, not playing cards
3. **"The animation as information"** — the bar spring physics aren't decorative. The overshoot visually communicates volatility. A pot-committed 80% favorite losing is a common poker outcome — the physics make that feel right
4. **"Web Worker"** — Monte Carlo runs off the main thread so the UI never freezes during calculation
5. **"The card picker UX"** — the constraint system (dead card tracking across all players + board) is a non-trivial state management problem. Every card change reruns the simulation and updates all players simultaneously
6. **"Segmented bar"** — the equity bar component has two render modes that switch dynamically. Adding a third player doesn't break the UI, it transforms it — that's a product-thinking decision, not just an engineering one
7. **"Outs computation"** — after each street, loop the remaining ~45 cards through the evaluator to find which ones flip the lead. Surfaces the result inline in the card picker UI — same data, two surfaces
8. **"Shareable URL with auto-replay"** — no backend, no database. Full hand state encoded in query params. On load, the board deals itself out automatically so the recipient watches the suckout happen live

---

## Prototype code (from Claude artifact)

The working prototype is vanilla HTML/CSS/JS in a single file. All four engine pieces (evaluator, Monte Carlo, deck utils, animation) are implemented and correct. Use this as the direct reference for the TypeScript port into Next.js — the logic is identical, just needs typing and componentization.

Key functions to port 1:1:
- `eval5(cards)` → `lib/evaluator.ts`
- `best(hole, board)` → `lib/evaluator.ts`
- `monteCarlo(hero, villain, board, n)` → `workers/equity.worker.ts`
- `mkDeck / shuf / strip / combos` → `lib/deck.ts`
- `cardHTML` → `components/Card.tsx`
- `load(scenarioIndex)` → page state management in `page.tsx`
- `deal()` → street progression logic in `page.tsx`
