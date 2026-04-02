# Planned Changes

## State Shape (verified)

```
equityHistory: number[][]
```

- Up to 4 entries: `[preflopEquities, flopEquities, turnEquities, riverEquities]`
- Each inner array has one value per player, indexed parallel to `players[]`
- Example (3 players): `[[45, 30, 25], [52, 28, 20], [60, 22, 18], [100, 0, 0]]`
- `PLAYER_COLORS` maps player IDs → `{ main: string, dim: string }` using CSS vars

No state changes needed — the existing shape already supports all-player sparklines.

---

## Change 1: Rewrite EquitySparkline for all players

**File:** `components/EquitySparkline.tsx`

**What changes:**
- **Props:** Replace `history: number[]` with `equityHistory: number[][]` (the full history) and `players: { id: string; label: string; color: string }[]`
- **One line per player:** Draw a separate `<motion.path>` for each player, colored with their `PLAYER_COLORS.main`
- **Labeled Y-axis:** Add tick marks/labels on the left: `0%`, `50%`, `100%`. Faint horizontal gridlines at those values.
- **Labeled X-axis:** Always show all 4 labels: `Pre`, `Flop`, `Turn`, `River` along the bottom (dimmed if that street hasn't been reached yet — but the sparkline only shows after river, so all 4 are active)
- **Bigger and clearer:** Increase viewBox height from 48 to ~120. Add left padding (~30px) for Y-axis labels. Increase strokeWidth to 2. Dots at each data point in player color with radius 4.
- **Only visible after river:** Component returns `null` unless `equityHistory.length === 4`
- **Smooth entrance:** Wrap in `AnimatePresence` + `motion.div` that fades + slides up on mount (`initial: { opacity: 0, y: 16 }`, `animate: { opacity: 1, y: 0 }`, `transition: { duration: 0.5, ease: 'easeOut' }`)
- **Legend:** Small inline legend below the chart showing player name + color dot for each player (reuse the same data)

## Change 2: Move sparkline position & update page.tsx wiring

**File:** `app/page.tsx`

**What changes:**
- **Remove** the current sparkline rendering from between the equity bar and street info text
- **Add** the new sparkline **between the Board and the PlayersGrid** (after `<Board />` and `<OutsTray />`, before `<PlayersGrid />`)
- **Update props:** Pass `equityHistory` (the full `number[][]`) and a `players` array with `{ id, label, color }` for each player instead of the current `sparklineHistory: number[]`
- Remove the `sparklineHistory` derived variable (no longer needed)

## Change 3: Add tooltip to CardInput

**File:** `components/CardInput.tsx`

**What changes:**
- Add a tooltip that appears on **hover and focus** of the input, stays visible as long as hovering/focused
- Tooltip content (two sections):
  - **Text shorthand:** "Type two cards like `As Kh` — ranks: 2-9, T, J, Q, K, A — suits: s ♠, h ♥, d ♦, c ♣"
  - **Card picker:** "Or click any card above to open the visual picker"
- Tooltip styling: dark background (`var(--felt-deep)` or similar), `var(--parchment)` text, mono font, subtle border, positioned above the input, small arrow/pointer at bottom center
- Implementation: CSS-only or state-driven. Use a `useState<boolean>` for visibility, toggled by `onMouseEnter`/`onMouseLeave` and `onFocus`/`onBlur` on the input. Tooltip stays as long as either hover or focus is active.
- Tooltip uses `position: absolute` relative to a wrapper div with `position: relative`

## Change 4: Randomize All Cards button

**File:** `hooks/usePokerState.ts` (new action), `components/Controls.tsx` or new `RandomizeButton.tsx`, `app/page.tsx`

**What changes:**

### usePokerState.ts
- Add new action type: `RANDOMIZE_ALL`
- Reducer handler: for each player, deal 2 fresh random cards from a shrinking deck (no duplicates). Then build a new `fullBoard` from the remaining deck. Reset board, street, equityHistory, result, outs — same as `UPDATE_CARD` does but for all players at once.
- Expose `randomizeAll` function from the hook

### New component or addition to Controls
- Add a "Randomize" button next to the existing Deal/Reset buttons (or as a standalone button near the player area)
- Styled consistently with Controls: mono font, uppercase, bordered, ghost color, hover brightens
- Icon/label: "🎲 Randomize" or just "Randomize" (no emoji per project convention)

### app/page.tsx
- Wire `randomizeAll` from `usePokerState` to the new button
- Place the button near the Add Player button or in the controls area

---

## File change summary

| File | Type of change |
|------|---------------|
| `components/EquitySparkline.tsx` | Rewrite — all-player lines, labeled axes, bigger, post-river only |
| `app/page.tsx` | Move sparkline, update props, wire randomize button |
| `components/CardInput.tsx` | Add hover/focus tooltip explaining shorthand + picker |
| `hooks/usePokerState.ts` | Add `RANDOMIZE_ALL` action + `randomizeAll` exposed function |
| `components/Controls.tsx` | Add Randomize button (or create separate component) |

## Order of implementation

1. `hooks/usePokerState.ts` — add RANDOMIZE_ALL action
2. `components/EquitySparkline.tsx` — full rewrite
3. `components/CardInput.tsx` — add tooltip
4. `components/Controls.tsx` — add Randomize button
5. `app/page.tsx` — wire everything together, move sparkline
6. `npm run build` — verify clean
7. `npm test` — verify tests still pass
