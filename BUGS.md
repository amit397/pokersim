# Bugs & Implementation Plans

---

## Bug 1: Share Link Only Replays Through the Flop

**Severity:** High
**Reproducible:** Always
**Location:** `app/page.tsx` lines 46-67

### Symptom
When a user shares a hand (after river), the recipient opens the URL and only sees the flop dealt. Turn and river cards are never dealt, even though the URL contains all 5 board cards.

### Root Cause
The URL replay `useEffect` captures a **stale closure** over `deal`. The `deal` callback (from `usePokerState`) is a `useCallback` that depends on `state`. Since the `useEffect` has `[]` deps, it captures the initial `deal` reference where `state.street === 0`.

All three `setTimeout` calls invoke the same stale `deal`:

```javascript
// All three calls see state.street === 0 from the initial closure
setTimeout(() => deal(), 100)        // computes fullBoard.slice(0, 3) = flop
setTimeout(() => deal(), 1300)       // STILL sees street 0 → computes flop again
setTimeout(() => deal(), 2500)       // STILL sees street 0 → computes flop again
```

Each call computes `newBoard = fullBoard.slice(0, 3)` because the closed-over `state.street` is always `0`. The reducer increments the real `street` correctly (0→1→2→3), but the board data dispatched is always the 3-card flop.

Additionally, the URL-decoded board cards are never used as community cards. The replay generates a **new random** `fullBoard` (via `UPDATE_CARD` dispatches), so the shared board doesn't match what the sender saw.

### Fix

**Step 1:** Add a new reducer action `LOAD_SHARED_HAND` in `hooks/usePokerState.ts`:

```typescript
// New action type
| { type: 'LOAD_SHARED_HAND'; players: Player[]; board: Card[]; fullBoard: Card[] }

// In the reducer:
case 'LOAD_SHARED_HAND': {
  return {
    ...state,
    players: action.players.map(p => ({ ...p, equity: 0 })),
    board: [],
    fullBoard: action.fullBoard,
    street: 0,
    isDealing: false,
    activeScenarioId: null,
    equityHistory: [],
    result: null,
    pickerTarget: null,
    outs: [],
    outsBeneficiary: [],
    calcTriggerKey: state.calcTriggerKey + 1,
  }
}
```

**Step 2:** Expose a `loadSharedHand` dispatch wrapper from `usePokerState`, and a `dealRef` that always points to the latest `deal`:

```typescript
// Inside usePokerState:
const dealRef = useRef(deal)
dealRef.current = deal

// Return:
loadSharedHand: (players: Player[], board: Card[], fullBoard: Card[]) =>
  dispatch({ type: 'LOAD_SHARED_HAND', players, board, fullBoard }),
dealRef,
```

**Step 3:** Rewrite the URL replay in `app/page.tsx`:

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return
  const decoded = decodeHandState(new URLSearchParams(window.location.search))
  if (!decoded) return

  // Build players from decoded data
  const playerIds = ['hero', 'p2', 'p3', 'p4', 'p5', 'p6']
  const players = decoded.players.map((cards, i) => ({
    id: playerIds[i],
    label: i === 0 ? 'Hero' : (decoded.players.length === 2 ? 'Villain' : `Player ${i + 1}`),
    cards: cards as [Card, Card],
    equity: 0,
  }))

  // Use decoded board as the start of fullBoard, fill remaining randomly
  const dead = [...decoded.players.flat(), ...decoded.board]
  const remaining = shuf(strip(mkDeck(), dead)).slice(0, 5 - decoded.board.length)
  const fullBoard = [...decoded.board, ...remaining]

  // Load everything in one dispatch — board cards come from URL, not random
  loadSharedHand(players, decoded.board, fullBoard)

  // Chain deals using dealRef so each call uses fresh state
  const boardLen = decoded.board.length
  if (boardLen >= 3) {
    setTimeout(() => dealRef.current(), 100)
    if (boardLen >= 4) setTimeout(() => dealRef.current(), 1300)
    if (boardLen === 5) setTimeout(() => dealRef.current(), 2500)
  }
}, [])
```

**Key points:**
- `fullBoard` is constructed from the **URL-decoded board** + random remaining cards (not fully random)
- `dealRef.current()` always calls the latest `deal`, avoiding the stale closure
- The decoded board cards are what the sender actually saw

---

## Bug 2: CardInput Text Doesn't Update on Scenario Switch

**Severity:** Medium
**Reproducible:** Always — switch between any two scenario pills
**Location:** `components/CardInput.tsx` line 15

### Symptom
When switching between preset scenarios (e.g., "AA vs KK" to "Coin Flip"), the visual Card components update correctly, but the text input boxes still show the old scenario's card shorthand (e.g., "Ah Ad" instead of "Ah 9d").

### Root Cause
`CardInput` initializes local state from props but never syncs:

```typescript
const [value, setValue] = useState(formatCards(cards))  // only runs once on mount
```

`useState` initializer runs only on the first render. When the parent passes new `cards` (via scenario switch, randomize, or card picker), the local `value` stays stale.

### Fix

**Option A — `useEffect` sync (preferred, minimal change):**

Add a sync effect in `CardInput`:

```typescript
// After the existing useState on line 15:
const [value, setValue] = useState(formatCards(cards))

// Add:
useEffect(() => {
  setValue(formatCards(cards))
}, [cards[0].r, cards[0].s, cards[1].r, cards[1].s])
```

Use the individual card fields as deps (not the cards array reference) to avoid unnecessary re-syncs.

**Option B — `key` prop on the parent (simpler but heavier):**

In `PlayerPanel.tsx`, add a key to CardInput that changes when cards change:

```tsx
<CardInput
  key={`${cards[0].r}${cards[0].s}-${cards[1].r}${cards[1].s}`}
  cards={cards}
  onChange={onCardsChange}
  deadCards={deadCards}
/>
```

This remounts CardInput whenever cards change, re-initializing useState. Slightly heavier (destroys/recreates DOM) but zero risk of stale state.

**Recommendation:** Use Option A. It's a 3-line change and preserves DOM/focus state.

---

## Bug 3: Move Result Banner Below Board (Feature)

**Severity:** Low (cosmetic / UX improvement)
**Location:** `app/page.tsx` lines 296-301

### Current Layout Order
```
Equity bar/numbers
Street info text
Board (community cards)
Outs tray
Sparkline graph          ← graph appears after all 5 cards dealt
Players grid
Result banner            ← currently here, far below
Share button
Controls
```

### Desired
The result banner ("Hero wins — Pair") should appear **directly underneath the Board**, above the outs tray and sparkline. It only appears after river (street === 3), so there's no conflict with outs (which hide on river).

### Fix

Move the `<ResultBanner>` block from its current position (after AddPlayerButton, line 296) to directly after the `<Board>` component (after line 256):

```tsx
{/* Board */}
<Board board={board} />

{/* Result Banner — directly under community cards, visible only after river */}
<ResultBanner
  visible={result !== null}
  text={result?.text ?? ''}
  type={result?.type ?? 'hero'}
/>

{/* Outs Tray */}
<OutsTray ... />
```

Delete the old `<ResultBanner>` block from its original position (around line 296-301).

**Note:** `ResultBanner` has `minHeight: 56` which reserves space even when hidden. Consider adding `{street === 3 && <ResultBanner ... />}` instead so it doesn't consume vertical space before river, or set `minHeight: 0` when not visible.

---

## Bug 4: Flop Card Rendering Failure on Deployed Site (Vercel)

**Severity:** High
**Reproducible:** Intermittent — more likely on fast connections/hardware
**Location:** `components/Board.tsx` (prevCountRef logic) + `components/Card.tsx` (animation props)

### Symptom
On the deployed Vercel site, one or more flop cards occasionally fail to render (appear invisible/blank). The card slot exists in the DOM but the card face is not visible.

### Root Cause: Animation Race Condition

The Board component uses a ref to track which cards are "newly dealt" and should animate:

```typescript
// Board.tsx
const prevCountRef = useRef(0)
const prevCount = prevCountRef.current
prevCountRef.current = board.length

// ...
const isNewlyDealt = card !== undefined && i >= prevCount
```

The Card component's animation starts at **opacity: 0**:

```typescript
// Card.tsx
initial: { rotateY: 90, scale: 0.88, opacity: 0 },
animate: { rotateY: 0, scale: 1, opacity: 1 },
```

**Race condition sequence:**

1. `DEAL_COMPLETE` dispatched → `board` changes from `[]` to `[c1, c2, c3]`
2. Board renders: `prevCount = 0`, sets ref to `3`, all 3 cards get `animate=true`
3. Framer Motion applies `initial: { opacity: 0 }` and starts transitioning to `animate: { opacity: 1 }`
4. **Within milliseconds**, equity Web Worker returns → `SET_EQUITY` dispatched → parent re-renders
5. Board re-renders: `prevCount = 3` (ref already updated), `isNewlyDealt = false` for all cards
6. `animate=false` → `motionProps = {}` — Framer Motion loses its `animate` target **mid-animation**
7. Card is stuck at or near `opacity: 0` (invisible)

This is worse in production (Vercel) because:
- Optimized bundles execute faster, making the race tighter
- No React StrictMode overhead to slow re-renders
- Web Workers may initialize and respond faster

### Fix

**Option A — Stable animation via mounting key (recommended):**

In `Board.tsx`, give each card a key that forces a fresh mount when it first appears. This way the animation runs on mount and subsequent re-renders don't interfere:

```tsx
{Array.from({ length: 5 }, (_, i) => {
  const card = board[i]
  if (card) {
    // Key changes when this slot transitions from empty to filled,
    // triggering a fresh mount with animation
    return (
      <Card
        key={`${i}-${card.r}${card.s}`}
        card={card}
        animate={true}          // always animate on mount
        delay={getDelay(i)}
        size={size}
      />
    )
  }
  return <CardSlot key={`empty-${i}`} size={size} />
})}
```

Then **remove the prevCountRef logic entirely** — it's no longer needed. Cards animate on mount (when they first appear), and re-renders don't change the key, so Framer Motion continues the animation uninterrupted.

**Adjust `getDelay`** to not depend on prevCount:

```typescript
const getDelay = (index: number): number => {
  // Stagger only the first 3 cards (flop)
  if (index < 3 && board.length <= 3) return index * 0.16
  return 0
}
```

**Option B — Guard animation with a timeout ref:**

Keep prevCountRef but add a "recently dealt" timeout that prevents re-renders from clearing animation:

```typescript
const recentlyDealtRef = useRef(false)

useEffect(() => {
  if (board.length > 0) {
    recentlyDealtRef.current = true
    const timer = setTimeout(() => { recentlyDealtRef.current = false }, 800)
    return () => clearTimeout(timer)
  }
}, [board.length])

// In the render:
const isNewlyDealt = card !== undefined && i >= prevCount
const shouldAnimate = isNewlyDealt || (recentlyDealtRef.current && i < board.length)
```

**Recommendation:** Use Option A. It eliminates the race condition entirely by aligning animation lifecycle with component mount lifecycle.

---

## Bug 5: SSR Hydration Mismatch for Random-Card Scenarios

**Severity:** Medium
**Reproducible:** Always on scenarios with placeholder cards (Full Table)
**Location:** `hooks/usePokerState.ts` → `buildInitialState()` → `resolveScenarioPlayers()`

### Symptom
On first load of the deployed site, scenarios with random placeholder cards (e.g., "Full Table" where players 2-6 have `r: 0` placeholder cards) may flash incorrect cards briefly, or produce React hydration warnings in the console.

### Root Cause
`buildInitialState()` calls `resolveScenarioPlayers()` which uses `shuf()` (`Math.random()`) to fill placeholder cards. This runs during:
1. **Server-side render** → generates random set A
2. **Client hydration** → `useReducer` initializer runs again → generates random set B

Since `Math.random()` produces different values on server vs client, the HTML from SSR doesn't match the client state, causing a hydration mismatch.

The default scenario ("AA vs KK") has no placeholders so it's unaffected on initial load. But `buildFullBoard()` also uses `shuf()` for community cards — though `fullBoard` isn't rendered initially so it doesn't cause a visible mismatch.

### Fix

Suppress initial render of random content until client mount:

```typescript
// In app/page.tsx, add a mounted guard:
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

// Wrap the main content:
if (!mounted) {
  return <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
    {/* Minimal skeleton: header only, no cards */}
    <p className="font-mono" style={{ textAlign: 'center', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
      Poker Equity Visualizer
    </p>
  </div>
}
```

This ensures no random-generated content renders on the server. The client mount is near-instant so there's no perceptible delay.

**Alternative:** Make `buildInitialState()` deterministic by using the first scenario's hardcoded cards and a fixed seed for `fullBoard`. Since `fullBoard` isn't visible until deal, it doesn't need to match between SSR and client.

---

## Summary Table

| # | Bug | File(s) | Type | Fix Complexity |
|---|-----|---------|------|----------------|
| 1 | Share link only shows flop | `page.tsx`, `usePokerState.ts` | Stale closure + missing reducer action | Medium — new action + ref |
| 2 | CardInput text stale on scenario switch | `CardInput.tsx` | useState not syncing with props | Easy — 3-line useEffect |
| 3 | Move result banner below board | `page.tsx` | Layout reorder (feature) | Easy — move JSX block |
| 4 | Flop cards invisible on deployed site | `Board.tsx`, `Card.tsx` | Animation race condition | Medium — change key strategy |
| 5 | SSR hydration mismatch | `page.tsx`, `usePokerState.ts` | Server/client random divergence | Easy — mounted guard |

### Recommended Implementation Order
1. **Bug 2** (CardInput sync) — easiest, 3 lines
2. **Bug 3** (Result banner position) — cut-paste JSX
3. **Bug 4** (Flop animation race) — Board.tsx key rewrite
4. **Bug 5** (Hydration mismatch) — mounted guard
5. **Bug 1** (Share link) — largest change, new reducer action + page.tsx rewrite
