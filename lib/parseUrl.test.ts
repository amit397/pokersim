import { describe, it, expect } from 'vitest'
import { encodeCard, decodeCard, encodeHandState, decodeHandState } from './parseUrl'
import { type Card } from './deck'

function c(r: number, s: 'h' | 'd' | 'c' | 's'): Card {
  return { r, s }
}

describe('encodeCard', () => {
  it('encodes Ace of hearts', () => expect(encodeCard(c(14,'h'))).toBe('Ah'))
  it('encodes King of spades', () => expect(encodeCard(c(13,'s'))).toBe('Ks'))
  it('encodes Ten', () => expect(encodeCard(c(10,'d'))).toBe('Td'))
  it('encodes Two', () => expect(encodeCard(c(2,'c'))).toBe('2c'))
  it('encodes Jack', () => expect(encodeCard(c(11,'h'))).toBe('Jh'))
  it('encodes Queen', () => expect(encodeCard(c(12,'d'))).toBe('Qd'))
})

describe('decodeCard', () => {
  it('decodes "Ah" → {r:14,s:"h"}', () => expect(decodeCard('Ah')).toEqual(c(14,'h')))
  it('decodes "Ks" → {r:13,s:"s"}', () => expect(decodeCard('Ks')).toEqual(c(13,'s')))
  it('decodes "Td" → {r:10,s:"d"}', () => expect(decodeCard('Td')).toEqual(c(10,'d')))
  it('decodes "2c" → {r:2,s:"c"}', () => expect(decodeCard('2c')).toEqual(c(2,'c')))
  it('decodes lowercase "ah" → {r:14,s:"h"}', () => expect(decodeCard('ah')).toEqual(c(14,'h')))
  it('returns null for invalid rank', () => expect(decodeCard('Xh')).toBeNull())
  it('returns null for invalid suit', () => expect(decodeCard('Ax')).toBeNull())
  it('returns null for empty string', () => expect(decodeCard('')).toBeNull())
  it('returns null for single char', () => expect(decodeCard('A')).toBeNull())
})

describe('encodeCard / decodeCard round-trip', () => {
  const cards: Card[] = [
    c(14,'h'), c(13,'s'), c(12,'d'), c(11,'c'),
    c(10,'h'), c(9,'s'), c(2,'d'), c(7,'c')
  ]
  cards.forEach(card => {
    it(`round-trips ${encodeCard(card)}`, () => {
      expect(decodeCard(encodeCard(card))).toEqual(card)
    })
  })
})

describe('encodeHandState', () => {
  it('produces a p= param string', () => {
    const encoded = encodeHandState([[c(14,'h'), c(14,'d')], [c(13,'s'), c(13,'c')]], [])
    expect(encoded).toContain('p=')
    expect(encoded).toContain('AhAd')
    expect(encoded).toContain('KsKc')
  })

  it('includes b= param when board has cards', () => {
    const encoded = encodeHandState([[c(14,'h'), c(14,'d')], [c(13,'s'), c(13,'c')]], [c(2,'h'), c(5,'d'), c(9,'c')])
    expect(encoded).toContain('b=')
    expect(encoded).toContain('2h')
    expect(encoded).toContain('5d')
    expect(encoded).toContain('9c')
  })

  it('omits b= when board is empty', () => {
    const encoded = encodeHandState([[c(14,'h'), c(14,'d')], [c(13,'s'), c(13,'c')]], [])
    expect(encoded).not.toContain('b=')
  })
})

describe('decodeHandState', () => {
  it('decodes a valid hand state', () => {
    const params = new URLSearchParams('p=AhAd,KsKc&b=2h5d9c')
    const result = decodeHandState(params)
    expect(result).not.toBeNull()
    expect(result!.players).toHaveLength(2)
    expect(result!.players[0]).toEqual([c(14,'h'), c(14,'d')])
    expect(result!.players[1]).toEqual([c(13,'s'), c(13,'c')])
    expect(result!.board).toHaveLength(3)
    expect(result!.board[0]).toEqual(c(2,'h'))
  })

  it('handles 5-card board', () => {
    const params = new URLSearchParams('p=AhAd,KsKc&b=2h5d9cTsJh')
    const result = decodeHandState(params)
    expect(result!.board).toHaveLength(5)
  })

  it('handles empty board', () => {
    const params = new URLSearchParams('p=AhAd,KsKc')
    const result = decodeHandState(params)
    expect(result!.board).toHaveLength(0)
  })

  it('decodes legacy h=/v= format', () => {
    const params = new URLSearchParams('h=AhAd&v=KsKc')
    const result = decodeHandState(params)
    expect(result).not.toBeNull()
    expect(result!.players).toHaveLength(2)
  })

  it('returns null for duplicate cards', () => {
    const params = new URLSearchParams('p=AhAh,KsKc')
    expect(decodeHandState(params)).toBeNull()
  })

  it('returns null for invalid card', () => {
    const params = new URLSearchParams('p=XhAd,KsKc')
    expect(decodeHandState(params)).toBeNull()
  })

  it('returns null for fewer than 2 players', () => {
    const params = new URLSearchParams('p=AhAd')
    expect(decodeHandState(params)).toBeNull()
  })

  it('returns null for odd-length board string', () => {
    const params = new URLSearchParams('p=AhAd,KsKc&b=2h5')
    expect(decodeHandState(params)).toBeNull()
  })

  it('round-trips through encode/decode', () => {
    const players = [[c(14,'h'), c(14,'d')], [c(13,'s'), c(13,'c')]]
    const board = [c(2,'h'), c(5,'d'), c(9,'c')]
    const encoded = encodeHandState(players, board)
    const decoded = decodeHandState(new URLSearchParams(encoded))
    expect(decoded).not.toBeNull()
    expect(decoded!.players).toEqual(players)
    expect(decoded!.board).toEqual(board)
  })

  it('handles multi-player (3 players)', () => {
    const params = new URLSearchParams('p=AhAd,KsKc,QhQd')
    const result = decodeHandState(params)
    expect(result!.players).toHaveLength(3)
  })
})
