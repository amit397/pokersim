import { describe, it, expect } from 'vitest'
import { mkDeck, shuf, strip, combos, cardKey, cardToTuple, tupleToCard, rankLabel, type Card } from './deck'

describe('mkDeck', () => {
  it('returns 52 cards', () => {
    expect(mkDeck()).toHaveLength(52)
  })

  it('has 13 cards per suit', () => {
    const deck = mkDeck()
    const suits = ['h', 'd', 'c', 's']
    for (const s of suits) {
      expect(deck.filter(c => c.s === s)).toHaveLength(13)
    }
  })

  it('has 4 cards per rank', () => {
    const deck = mkDeck()
    for (let r = 2; r <= 14; r++) {
      expect(deck.filter(c => c.r === r)).toHaveLength(4)
    }
  })

  it('all ranks are 2–14', () => {
    const deck = mkDeck()
    const ranks = Array.from(new Set(deck.map(c => c.r))).sort((a, b) => a - b)
    expect(ranks).toEqual([2,3,4,5,6,7,8,9,10,11,12,13,14])
  })
})

describe('shuf', () => {
  it('returns same length', () => {
    const deck = mkDeck()
    expect(shuf(deck)).toHaveLength(52)
  })

  it('does not mutate original', () => {
    const deck = mkDeck()
    const first = deck[0]
    shuf(deck)
    expect(deck[0]).toEqual(first)
  })

  it('contains same cards as original', () => {
    const deck = mkDeck()
    const shuffled = shuf(deck)
    const toKey = (d: Card[]) => d.map(cardKey).sort().join(',')
    expect(toKey(shuffled)).toBe(toKey(deck))
  })
})

describe('strip', () => {
  it('removes dead cards', () => {
    const deck = mkDeck()
    const dead: Card[] = [{ r: 14, s: 'h' }, { r: 13, s: 's' }]
    const stripped = strip(deck, dead)
    expect(stripped).toHaveLength(50)
    expect(stripped.find(c => c.r === 14 && c.s === 'h')).toBeUndefined()
    expect(stripped.find(c => c.r === 13 && c.s === 's')).toBeUndefined()
  })

  it('returns full deck when no dead cards', () => {
    const deck = mkDeck()
    expect(strip(deck, [])).toHaveLength(52)
  })
})

describe('combos', () => {
  it('C(5,2) = 10', () => {
    expect(combos([1,2,3,4,5], 2)).toHaveLength(10)
  })

  it('C(52,5) = 2598960', () => {
    const deck = mkDeck()
    expect(combos(deck, 5)).toHaveLength(2598960)
  })

  it('each combo has k elements', () => {
    const result = combos([1,2,3,4,5], 3)
    result.forEach(c => expect(c).toHaveLength(3))
  })

  it('no duplicates within a combo', () => {
    const result = combos([1,2,3,4,5], 2)
    result.forEach(c => expect(new Set(c).size).toBe(2))
  })
})

describe('cardKey', () => {
  it('produces unique keys', () => {
    const deck = mkDeck()
    const keys = deck.map(cardKey)
    expect(new Set(keys).size).toBe(52)
  })
})

describe('cardToTuple / tupleToCard', () => {
  it('round-trips correctly', () => {
    const card: Card = { r: 14, s: 'h' }
    expect(tupleToCard(cardToTuple(card))).toEqual(card)
  })

  it('all deck cards round-trip', () => {
    const deck = mkDeck()
    deck.forEach(c => expect(tupleToCard(cardToTuple(c))).toEqual(c))
  })
})

describe('rankLabel', () => {
  it('returns J for 11', () => expect(rankLabel(11)).toBe('J'))
  it('returns Q for 12', () => expect(rankLabel(12)).toBe('Q'))
  it('returns K for 13', () => expect(rankLabel(13)).toBe('K'))
  it('returns A for 14', () => expect(rankLabel(14)).toBe('A'))
  it('returns string digit for 2-10', () => {
    for (let r = 2; r <= 10; r++) {
      expect(rankLabel(r)).toBe(String(r))
    }
  })
})
