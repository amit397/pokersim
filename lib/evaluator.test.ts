import { describe, it, expect } from 'vitest'
import { eval5, best, HAND_NAMES, type HandResult } from './evaluator'
import { type Card } from './deck'

function c(r: number, s: 'h' | 'd' | 'c' | 's'): Card {
  return { r, s }
}

describe('HAND_NAMES', () => {
  it('has 9 entries indexed 0-8', () => {
    expect(HAND_NAMES).toHaveLength(9)
  })
})

describe('eval5 — hand rankings', () => {
  it('detects Straight Flush (hr=8)', () => {
    const hand = [c(9,'h'), c(10,'h'), c(11,'h'), c(12,'h'), c(13,'h')]
    expect(eval5(hand).hr).toBe(8)
  })

  it('detects Royal Flush as Straight Flush (hr=8)', () => {
    const hand = [c(10,'s'), c(11,'s'), c(12,'s'), c(13,'s'), c(14,'s')]
    expect(eval5(hand).hr).toBe(8)
  })

  it('detects wheel straight flush A-2-3-4-5 (hr=8, stH=5)', () => {
    const hand = [c(14,'d'), c(2,'d'), c(3,'d'), c(4,'d'), c(5,'d')]
    const r = eval5(hand)
    expect(r.hr).toBe(8)
  })

  it('detects Four of a Kind (hr=7)', () => {
    const hand = [c(14,'h'), c(14,'d'), c(14,'c'), c(14,'s'), c(2,'h')]
    expect(eval5(hand).hr).toBe(7)
  })

  it('detects Full House (hr=6)', () => {
    const hand = [c(10,'h'), c(10,'d'), c(10,'c'), c(5,'h'), c(5,'d')]
    expect(eval5(hand).hr).toBe(6)
  })

  it('detects Flush (hr=5)', () => {
    const hand = [c(2,'h'), c(5,'h'), c(7,'h'), c(9,'h'), c(14,'h')]
    expect(eval5(hand).hr).toBe(5)
  })

  it('detects Straight (hr=4)', () => {
    const hand = [c(9,'h'), c(10,'d'), c(11,'c'), c(12,'s'), c(13,'h')]
    expect(eval5(hand).hr).toBe(4)
  })

  it('detects wheel straight A-2-3-4-5 (hr=4)', () => {
    const hand = [c(14,'h'), c(2,'d'), c(3,'c'), c(4,'s'), c(5,'h')]
    const r = eval5(hand)
    expect(r.hr).toBe(4)
  })

  it('detects Three of a Kind (hr=3)', () => {
    const hand = [c(7,'h'), c(7,'d'), c(7,'c'), c(2,'s'), c(4,'h')]
    expect(eval5(hand).hr).toBe(3)
  })

  it('detects Two Pair (hr=2)', () => {
    const hand = [c(10,'h'), c(10,'d'), c(5,'c'), c(5,'s'), c(3,'h')]
    expect(eval5(hand).hr).toBe(2)
  })

  it('detects One Pair (hr=1)', () => {
    const hand = [c(9,'h'), c(9,'d'), c(3,'c'), c(7,'s'), c(2,'h')]
    expect(eval5(hand).hr).toBe(1)
  })

  it('detects High Card (hr=0)', () => {
    const hand = [c(2,'h'), c(4,'d'), c(6,'c'), c(9,'s'), c(14,'h')]
    expect(eval5(hand).hr).toBe(0)
  })
})

describe('eval5 — tiebreaking', () => {
  it('AA > KK (pairs)', () => {
    const aaPair = eval5([c(14,'h'), c(14,'d'), c(2,'c'), c(3,'s'), c(4,'h')])
    const kkPair = eval5([c(13,'h'), c(13,'d'), c(2,'c'), c(3,'s'), c(4,'h')])
    expect(aaPair.score).toBeGreaterThan(kkPair.score)
  })

  it('QQ > JJ (pairs)', () => {
    const qq = eval5([c(12,'h'), c(12,'d'), c(2,'c'), c(3,'s'), c(4,'h')])
    const jj = eval5([c(11,'h'), c(11,'d'), c(2,'c'), c(3,'s'), c(4,'h')])
    expect(qq.score).toBeGreaterThan(jj.score)
  })

  it('Straight flush beats four of a kind', () => {
    const sf = eval5([c(9,'h'), c(10,'h'), c(11,'h'), c(12,'h'), c(13,'h')])
    const quads = eval5([c(14,'h'), c(14,'d'), c(14,'c'), c(14,'s'), c(2,'h')])
    expect(sf.score).toBeGreaterThan(quads.score)
  })

  it('full house beats flush', () => {
    const fh = eval5([c(3,'h'), c(3,'d'), c(3,'c'), c(6,'h'), c(6,'d')])
    const flush = eval5([c(2,'h'), c(5,'h'), c(7,'h'), c(9,'h'), c(14,'h')])
    expect(fh.score).toBeGreaterThan(flush.score)
  })
})

describe('best', () => {
  it('picks best 5 from 7 cards', () => {
    // AA on a AAAKK board = full house aces
    const hole: Card[] = [c(14,'h'), c(14,'d')]
    const board: Card[] = [c(14,'c'), c(14,'s'), c(13,'h'), c(2,'c'), c(3,'d')]
    const result = best(hole, board)
    expect(result.hr).toBe(7) // four of a kind
  })

  it('uses board when hole cards are weak', () => {
    const hole: Card[] = [c(2,'h'), c(3,'d')]
    const board: Card[] = [c(14,'c'), c(14,'s'), c(14,'h'), c(14,'d'), c(13,'h')]
    const result = best(hole, board)
    expect(result.hr).toBe(7) // four aces on board
  })

  it('prefers suited hole cards over offsuit for flush', () => {
    const hole: Card[] = [c(2,'h'), c(4,'h')]
    const board: Card[] = [c(7,'h'), c(9,'h'), c(11,'h'), c(13,'d'), c(14,'s')]
    const result = best(hole, board)
    expect(result.hr).toBe(5) // flush with hearts
  })
})
