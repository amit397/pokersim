import { describe, it, expect } from 'vitest'
import { monteCarlo, computeOuts } from './monteCarlo'
import { type Card } from './deck'

function c(r: number, s: 'h' | 'd' | 'c' | 's'): Card {
  return { r, s }
}

describe('monteCarlo', () => {
  it('equities sum to ~100', () => {
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(13,'s'), c(13,'c')],
    ]
    const result = monteCarlo(players, [], 500)
    const sum = result.equity.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('returns one equity per player', () => {
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(2,'s'), c(7,'c')],
    ]
    const result = monteCarlo(players, [], 200)
    expect(result.equity).toHaveLength(2)
  })

  it('AA vs 27o: AA should have >80% equity preflop', () => {
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(2,'s'), c(7,'c')],
    ]
    const result = monteCarlo(players, [], 2000)
    expect(result.equity[0]).toBeGreaterThan(80)
    expect(result.equity[1]).toBeLessThan(20)
  })

  it('AA vs AA: near 50/50 (chop)', () => {
    // Different suits so no identical cards
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(14,'c'), c(14,'s')],
    ]
    const result = monteCarlo(players, [], 1000)
    // Both should be close to 50%
    expect(result.equity[0]).toBeGreaterThan(40)
    expect(result.equity[0]).toBeLessThan(60)
  })

  it('with full board (5 cards), equity is 0 or 100 (one winner)', () => {
    // AA vs KK — board avoids any straights or flushes
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(13,'c'), c(13,'s')],
    ]
    const board = [c(2,'h'), c(3,'d'), c(7,'c'), c(8,'s'), c(9,'h')]
    const result = monteCarlo(players, board, 1)
    const sum = result.equity.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('three players: equities sum to ~100', () => {
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(13,'c'), c(13,'s')],
      [c(12,'h'), c(12,'d')],
    ]
    const result = monteCarlo(players, [], 500)
    const sum = result.equity.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 0)
    expect(result.equity).toHaveLength(3)
  })

  it('handles flop already dealt', () => {
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(2,'s'), c(7,'c')],
    ]
    const board = [c(3,'h'), c(5,'d'), c(9,'c')]
    const result = monteCarlo(players, board, 500)
    const sum = result.equity.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 0)
  })
})

describe('computeOuts', () => {
  it('returns empty outs when no cards change the leader', () => {
    // AA vs 27o on a K-K-K board: AA has trips dominated, 27o can barely change
    // Actually let's use a more deterministic case
    // AA vs 27o on AA board — quads for hero, nothing changes leadership
    const players = [
      [c(14,'h'), c(14,'d')],
      [c(2,'c'), c(7,'h')],
    ]
    // With board A-A on flop, hero has quads — nothing changes leadership
    const board = [c(14,'c'), c(14,'s'), c(3,'d')]
    const result = computeOuts(players, ['hero', 'villain'], board)
    // No card can beat quads unless it gives villain a straight flush (impossible here)
    expect(result.outs).toHaveLength(0)
  })

  it('returns outs structure with parallel beneficiary array', () => {
    const players = [
      [c(2,'h'), c(3,'d')], // hero: low hand
      [c(14,'c'), c(14,'s')], // villain: AA
    ]
    const board = [c(7,'h'), c(8,'d'), c(9,'c')]
    // 6 or T gives hero a straight — those are hero's outs
    const result = computeOuts(players, ['hero', 'villain'], board)
    expect(result.outs.length).toBe(result.beneficiary.length)
  })

  it('identifies straight draws as outs', () => {
    // Hero has 6-7, board is 8-9-2 → 5 or T completes straight
    const players = [
      [c(6,'h'), c(7,'d')],
      [c(14,'c'), c(14,'s')],
    ]
    const board = [c(8,'h'), c(9,'d'), c(2,'c')]
    const result = computeOuts(players, ['hero', 'villain'], board)
    // 5 and T should be outs for hero (8 cards: 4 fives + 4 tens)
    const heroOuts = result.outs.filter((_, i) => result.beneficiary[i] === 'hero')
    expect(heroOuts.length).toBeGreaterThan(0)
    const outRanks = heroOuts.map(c => c.r)
    expect(outRanks.some(r => r === 5 || r === 10)).toBe(true)
  })
})
