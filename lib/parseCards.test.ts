import { describe, it, expect } from 'vitest'
import { parseCardString, formatCards } from './parseCards'
import { type Card } from './deck'

function c(r: number, s: 'h' | 'd' | 'c' | 's'): Card {
  return { r, s }
}

describe('parseCardString', () => {
  it('parses compact "AhKd"', () => {
    const result = parseCardString('AhKd')
    expect(result).toEqual([c(14,'h'), c(13,'d')])
  })

  it('parses spaced "Ah Kd"', () => {
    const result = parseCardString('Ah Kd')
    expect(result).toEqual([c(14,'h'), c(13,'d')])
  })

  it('parses lowercase "ah kd"', () => {
    const result = parseCardString('ah kd')
    expect(result).toEqual([c(14,'h'), c(13,'d')])
  })

  it('parses Unicode suits "A♥ K♦"', () => {
    const result = parseCardString('A♥ K♦')
    expect(result).toEqual([c(14,'h'), c(13,'d')])
  })

  it('parses "T" as 10 (compact Ts2h)', () => {
    const result = parseCardString('Ts2h')
    expect(result).toEqual([c(10,'s'), c(2,'h')])
  })

  it('parses Jack, Queen', () => {
    const result = parseCardString('JcQs')
    expect(result).toEqual([c(11,'c'), c(12,'s')])
  })

  it('parses two cards with different suits', () => {
    const result = parseCardString('2h2d')
    expect(result).toEqual([c(2,'h'), c(2,'d')])
  })

  it('returns null for identical cards', () => {
    expect(parseCardString('AhAh')).toBeNull()
  })

  it('returns null for invalid input', () => {
    expect(parseCardString('XhAd')).toBeNull()
    expect(parseCardString('')).toBeNull()
    expect(parseCardString('Ah')).toBeNull()
    expect(parseCardString('garbage')).toBeNull()
  })

  it('parses "♠♣" style with ranks', () => {
    const result = parseCardString('A♠ K♣')
    expect(result).toEqual([c(14,'s'), c(13,'c')])
  })
})

describe('formatCards', () => {
  it('formats ace and king', () => {
    expect(formatCards([c(14,'h'), c(13,'d')])).toBe('Ah Kd')
  })

  it('formats ten as T', () => {
    expect(formatCards([c(10,'s'), c(2,'h')])).toBe('Ts 2h')
  })

  it('formats numbered ranks', () => {
    expect(formatCards([c(7,'c'), c(3,'s')])).toBe('7c 3s')
  })

  it('formats Jack/Queen/King', () => {
    expect(formatCards([c(11,'h'), c(12,'d')])).toBe('Jh Qd')
  })
})

describe('parseCardString / formatCards round-trip', () => {
  const pairs: [Card, Card][] = [
    [c(14,'h'), c(13,'d')],
    [c(10,'s'), c(2,'h')],
    [c(11,'c'), c(12,'s')],
  ]
  pairs.forEach(pair => {
    it(`round-trips ${formatCards(pair)}`, () => {
      const formatted = formatCards(pair)
      const parsed = parseCardString(formatted)
      expect(parsed).toEqual(pair)
    })
  })
})
